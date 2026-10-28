"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const PHASES = ["어드레스", "테이크백", "백스윙 탑", "전환", "다운스윙", "임팩트", "피니시"];
const LINKS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const METRICS = [
  ["spine", "상체 기울기", "°"],
  ["shoulder", "어깨선 기울기", "°"],
  ["hip", "골반선 기울기", "°"],
  ["rightElbow", "오른팔꿈치 각도", "°"],
  ["leftKnee", "왼무릎 각도", "°"],
  ["rightKnee", "오른무릎 각도", "°"]
];
const box = {border:"1px solid #cad5dc",borderRadius:10,padding:14,background:"#fff",minWidth:0};
const btn = {border:"1px solid #91b3ce",background:"#f3f8ff",color:"#0753a2",padding:"9px 12px",borderRadius:7,cursor:"pointer",fontWeight:700};
const num = (v) => Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
const valid = (p) => Boolean(p && p.visibility !== 0 && (p.visibility == null || p.visibility >= .35));
function midpoint(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
function joint(a,b,c){
  if(!valid(a)||!valid(b)||!valid(c))return null;
  const ux=a.x-b.x,uy=a.y-b.y,vx=c.x-b.x,vy=c.y-b.y;
  const den=Math.hypot(ux,uy)*Math.hypot(vx,vy);
  return den>1e-7?num(Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/den)))*180/Math.PI):null;
}
function metricsFrom(p){
  const g=(i)=>p[i], shoulder=valid(g(11))&&valid(g(12))?midpoint(g(11),g(12)):null;
  const pelvis=valid(g(23))&&valid(g(24))?midpoint(g(23),g(24)):null;
  const signedLine=(a,b)=>valid(a)&&valid(b)?num(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI):null;
  return {
    spine:shoulder&&pelvis?num(Math.atan2(Math.abs(shoulder.x-pelvis.x),Math.abs(shoulder.y-pelvis.y))*180/Math.PI):null,
    shoulder:signedLine(g(11),g(12)),
    hip:signedLine(g(23),g(24)),
    rightElbow:joint(g(12),g(14),g(16)),
    leftKnee:joint(g(23),g(25),g(27)),
    rightKnee:joint(g(24),g(26),g(28))
  };
}
function drawPose(canvas,video,p){
  if(!canvas||!video?.videoWidth)return;
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const c=canvas.getContext("2d");c.clearRect(0,0,canvas.width,canvas.height);
  c.strokeStyle="#2df4c2";c.fillStyle="#ffdf6a";c.lineWidth=Math.max(3,canvas.width/350);
  LINKS.forEach(([a,b])=>{if(!valid(p[a])||!valid(p[b]))return;c.beginPath();c.moveTo(p[a].x*canvas.width,p[a].y*canvas.height);c.lineTo(p[b].x*canvas.width,p[b].y*canvas.height);c.stroke();});
  Array.from(new Set(LINKS.flat())).forEach(i=>{if(!valid(p[i]))return;c.beginPath();c.arc(p[i].x*canvas.width,p[i].y*canvas.height,Math.max(3,canvas.width/260),0,2*Math.PI);c.fill();});
}
function clearPose(canvas){if(canvas){canvas.getContext("2d")?.clearRect(0,0,canvas.width,canvas.height);}}
const MODEL_WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_ASSET="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export default function SwingStudio({standalone=false}){
  const [mine,setMine]=useState("");
  const [pro,setPro]=useState("");
  const fileUrls=useRef({mine:"",pro:""});
  const ownVideo=useRef(null),proVideo=useRef(null),liveVideo=useRef(null);
  const ownCanvas=useRef(null),proCanvas=useRef(null);
  const cameraStream=useRef(null),recorder=useRef(null),pieces=useRef([]);
  const poseModel=useRef(null);
  const [cameraOn,setCameraOn]=useState(false),[recording,setRecording]=useState(false);
  const [cameraFps,setCameraFps]=useState("미확인");
  const [status,setStatus]=useState("영상 파일을 선택하거나 웹 카메라를 켜세요.");
  const [phase,setPhase]=useState(PHASES[0]);
  const [club,setClub]=useState("7I"),[angle,setAngle]=useState("다운더라인");
  const [speed,setSpeed]=useState(.25),[sourceFps,setSourceFps]=useState(240);
  const [marks,setMarks]=useState({mine:{},pro:{}});
  const [analysis,setAnalysis]=useState({mine:null,pro:null});
  const [loadingPose,setLoadingPose]=useState(false);
  useEffect(()=>()=>{Object.values(fileUrls.current).forEach(u=>{if(u)URL.revokeObjectURL(u);});cameraStream.current?.getTracks().forEach(t=>t.stop());try{if(recorder.current?.state==="recording")recorder.current.stop();}catch{}poseModel.current?.close?.();},[]);
  useEffect(()=>{[ownVideo.current,proVideo.current].forEach(v=>{if(v)v.playbackRate=speed;});},[speed,mine,pro]);
  function selectVideo(kind,file){
    if(!file)return;
    if(!file.type.startsWith("video/")){setStatus("동영상 파일을 선택해 주세요.");return;}
    if(fileUrls.current[kind])URL.revokeObjectURL(fileUrls.current[kind]);
    const url=URL.createObjectURL(file);fileUrls.current[kind]=url;
    if(kind==="mine"){setMine(url);clearPose(ownCanvas.current);}else{setPro(url);clearPose(proCanvas.current);}
    setAnalysis(prev=>({...prev,[kind]:null}));
    setMarks(prev=>({...prev,[kind]:{}}));
    setStatus((kind==="mine"?"내 영상":"프로 참고 영상")+"을 불러왔습니다. 영상은 서버에 자동 업로드되지 않습니다.");
  }
  async function startCamera(){
    if(cameraStream.current)return;
    if(!navigator.mediaDevices?.getUserMedia){setStatus("HTTPS 환경의 카메라 지원 브라우저에서 실행해 주세요.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:60}}});
      cameraStream.current=stream;liveVideo.current.srcObject=stream;await liveVideo.current.play();
      setCameraFps(String(stream.getVideoTracks()[0].getSettings().frameRate||"기기 미제공"));
      setCameraOn(true);setStatus("웹 카메라 연결됨. 브라우저 촬영은 폴드7 기본 카메라의 240fps를 보장하지 않습니다.");
    }catch(e){setStatus("카메라 연결 실패: 권한·HTTPS·다른 앱의 사용 여부를 확인하세요.");}
  }
  function stopCamera(){
    if(recorder.current?.state==="recording")recorder.current.stop();
    cameraStream.current?.getTracks().forEach(t=>t.stop());cameraStream.current=null;
    if(liveVideo.current)liveVideo.current.srcObject=null;
    setCameraOn(false);setRecording(false);setCameraFps("미확인");
  }
  function startRecording(){
    if(!cameraStream.current || typeof MediaRecorder==="undefined"){setStatus("카메라 또는 녹화 API가 지원되지 않습니다.");return;}
    try{
      const prefer=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm","video/mp4"];
      const mime=prefer.find(t=>MediaRecorder.isTypeSupported(t));
      const rec=new MediaRecorder(cameraStream.current,mime?{mimeType:mime}:undefined);
      pieces.current=[];recorder.current=rec;
      rec.ondataavailable=e=>{if(e.data?.size)pieces.current.push(e.data);};
      rec.onstop=()=>{if(!pieces.current.length)return;const type=rec.mimeType||"video/webm";const ext=type.includes("mp4")?"mp4":"webm";const blob=new Blob(pieces.current,{type});selectVideo("mine",new File([blob],"golf-swing-"+Date.now()+"."+ext,{type}));};
      rec.start(250);setRecording(true);setStatus("스윙 녹화 중. 촬영 상태는 화면에 표시됩니다.");
    }catch(e){setStatus("이 브라우저에서 녹화를 시작할 수 없습니다.");}
  }
  function stopRecording(){if(recorder.current?.state==="recording")recorder.current.stop();setRecording(false);setStatus("녹화 저장 중입니다. 잠시 후 내 영상에 표시됩니다.");}
  function changeSpeed(v){setSpeed(v);}
  function frameStep(kind,d){
    const v=kind==="mine"?ownVideo.current:proVideo.current;
    if(!v||!Number.isFinite(v.duration))return;
    v.pause();v.currentTime=Math.max(0,Math.min(v.duration,v.currentTime+d/sourceFps));
    clearPose(kind==="mine"?ownCanvas.current:proCanvas.current);
  }
  function mark(kind){
    const v=kind==="mine"?ownVideo.current:proVideo.current;
    if(!v||!Number.isFinite(v.currentTime))return;
    setMarks(prev=>({...prev,[kind]:{...prev[kind],[phase]:v.currentTime}}));
    setStatus((kind==="mine"?"내 영상":"프로 영상")+"의 "+phase+" 위치를 저장했습니다.");
  }
  function goMarked(){
    for(const kind of ["mine","pro"]){
      const v=kind==="mine"?ownVideo.current:proVideo.current;
      const t=marks[kind][phase];
      if(v && Number.isFinite(t)){v.pause();v.currentTime=t;clearPose(kind==="mine"?ownCanvas.current:proCanvas.current);}
    }
  }
  function playBoth(){
    for(const v of [ownVideo.current,proVideo.current]){if(v){v.playbackRate=speed;v.play().catch(()=>{});}}
  }
  function pauseBoth(){[ownVideo.current,proVideo.current].forEach(v=>v?.pause());}
  async function analyzeFrame(kind){
    const video=kind==="mine"?ownVideo.current:proVideo.current;
    const canvas=kind==="mine"?ownCanvas.current:proCanvas.current;
    if(!video || video.readyState<2){setStatus("먼저 분석할 영상을 열어 주세요.");return;}
    video.pause();setLoadingPose(true);setStatus("2D 관절 위치를 분석하고 있습니다.");
    try{
      if(!poseModel.current){
        const mod=await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm");
        const fileset=await mod.FilesetResolver.forVisionTasks(MODEL_WASM);
        poseModel.current=await mod.PoseLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL_ASSET},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
      }
      const result=poseModel.current.detectForVideo(video,performance.now());
      const landmarks=result.landmarks?.[0];
      if(!landmarks){setAnalysis(prev=>({...prev,[kind]:null}));clearPose(canvas);setStatus("인물 관절을 찾지 못했습니다. 전신이 화면에 나오게 촬영해 주세요.");return;}
      drawPose(canvas,video,landmarks);
      setAnalysis(prev=>({...prev,[kind]:{time:video.currentTime,phase,metrics:metricsFrom(landmarks)}}));
      setStatus("분석 완료. 두 영상을 같은 스윙 단계와 카메라 각도에 맞춰 비교하세요.");
    }catch(e){setStatus("관절 분석 모델 연결 실패. 네트워크 연결과 브라우저 지원을 확인하세요.");}
    finally{setLoadingPose(false);}
  }
  const compare=useMemo(()=>{
    const a=analysis.mine,b=analysis.pro;if(!a||!b||a.phase!==b.phase)return [];
    return METRICS.map(([key,label,unit])=>{
      const x=a.metrics[key],y=b.metrics[key];
      return {key,label,unit,mine:x,pro:y,diff:x==null||y==null?null:num(Math.abs(x-y))};
    });
  },[analysis]);
  const largest=compare.filter(x=>x.diff!=null).sort((a,b)=>b.diff-a.diff)[0];
  const coaching=largest&&largest.diff>=7?largest.label+"이 비교 영상과 약 "+largest.diff+"° 다릅니다. 같은 촬영 각도에서 해당 동작부터 반복해 보세요.":"비교 가능한 관절각의 큰 차이가 확인되지 않았습니다. 촬영 각도와 다른 스윙 단계도 점검하세요.";
  function speakOne(){if(!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(coaching);u.lang="ko-KR";window.speechSynthesis.speak(u);}
  const videoFrame=(kind,src,videoRef,canvasRef)=>(
    <div style={box}>
      <h3 style={{margin:"0 0 10px"}}>{kind==="mine"?"내 스윙 영상":"프로 참고 영상"}</h3>
      <label style={{display:"block",marginBottom:10,fontSize:13}}>
        영상 불러오기
        <input style={{display:"block",width:"100%",marginTop:5}} type="file" accept="video/*" aria-label={kind==="mine"?"내 골프 스윙 영상":"프로 참고 골프 스윙 영상"} onChange={e=>selectVideo(kind,e.target.files?.[0])}/>
      </label>
      <div style={{position:"relative",background:"#102334",borderRadius:8,overflow:"hidden"}}>
        <video ref={videoRef} src={src||undefined} controls playsInline preload="metadata" style={{width:"100%",maxHeight:360,display:"block"}} onPlay={()=>clearPose(canvasRef.current)}/>
        <canvas ref={canvasRef} aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
        <button type="button" style={btn} onClick={()=>frameStep(kind,-1)}>◀ 1프레임</button>
        <button type="button" style={btn} onClick={()=>frameStep(kind,1)}>1프레임 ▶</button>
        <button type="button" style={btn} onClick={()=>mark(kind)}>현재 {phase} 저장</button>
        <button type="button" style={btn} disabled={loadingPose||!src} onClick={()=>analyzeFrame(kind)}>{loadingPose?"분석 중":"현재 프레임 AI 분석"}</button>
      </div>
      {src&&<a href={src} download={kind==="mine"?"my-golf-swing":"reference-golf-swing"} style={{fontSize:12,display:"inline-block",marginTop:8}}>영상 파일 저장</a>}
      {analysis[kind]&&<p style={{fontSize:12,color:"#37566b"}}>분석 위치 {analysis[kind].time.toFixed(2)}초 · {analysis[kind].phase} · 2D 추정</p>}
    </div>
  );
  return <div style={{maxWidth:1160,margin:"0 auto",padding:standalone?"20px 12px":"0"}}>
    <header style={{marginBottom:14}}>
      <h2 style={{fontSize:22,margin:"0 0 7px"}}>골프 AI 카메라 · 초슬로모션 스윙 비교</h2>
      <p style={{margin:"0 0 8px",fontSize:13,color:"#31516a"}}>고속 촬영 영상 불러오기 → 프레임 분석 → 프로 스윙과 같은 단계 비교 → 핵심 교정 1개 확인</p>
      {standalone?<a href="/" style={{color:"#0753a2"}}>골프 AI 홈으로 이동</a>:<a href="/camera/golf" style={{color:"#0753a2"}}>독립 AI 카메라 · 골프 화면 열기</a>}
    </header>
    <div style={{...box,marginBottom:12}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end"}}>
        <label>클럽<select value={club} onChange={e=>setClub(e.target.value)} style={{display:"block",padding:7}}>{["Driver","3W","7I","PW","48°","52°","56°","퍼터"].map(c=><option key={c}>{c}</option>)}</select></label>
        <label>촬영 방향<select value={angle} onChange={e=>setAngle(e.target.value)} style={{display:"block",padding:7}}><option>다운더라인</option><option>정면</option></select></label>
        <label>프레임 분석 기준 fps<select value={sourceFps} onChange={e=>setSourceFps(Number(e.target.value))} style={{display:"block",padding:7}}>{[240,120,60,30].map(n=><option key={n} value={n}>{n}fps</option>)}</select></label>
        <label>재생속도<select value={speed} onChange={e=>changeSpeed(Number(e.target.value))} style={{display:"block",padding:7}}>{[1,.5,.25,.125].map(n=><option key={n} value={n}>{n}배</option>)}</select></label>
        <label>비교 단계<select value={phase} onChange={e=>setPhase(e.target.value)} style={{display:"block",padding:7}}>{PHASES.map(p=><option key={p}>{p}</option>)}</select></label>
      </div>
      <p style={{fontSize:12,color:"#516875",marginBottom:0}}>폴드7 기본 카메라: FHD 240fps / UHD 120fps 촬영 가능. 여기서 선택한 fps는 영상 파일의 실제 속도를 자동 검증한 값이 아닙니다. 삼성 카메라에서 이미 30fps 슬로모션으로 저장한 파일이면 30fps를 선택하세요.</p>
    </div>
    <div style={{...box,marginBottom:12}}>
      <h3 style={{margin:"0 0 8px"}}>AI 카메라 · 웹 직접 촬영</h3>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"start"}}>
        <video ref={liveVideo} playsInline muted autoPlay style={{width:"min(100%,350px)",aspectRatio:"16/9",background:"#122537",borderRadius:8}}/>
        <div style={{display:"grid",gap:8}}>
          <span style={{fontSize:13}}>실제 브라우저 카메라: {cameraFps}fps {recording?"· 녹화 중":""}</span>
          <button style={btn} type="button" onClick={cameraOn?stopCamera:startCamera}>{cameraOn?"카메라 종료":"카메라 켜기"}</button>
          {cameraOn&&<button style={btn} type="button" onClick={recording?stopRecording:startRecording}>{recording?"■ 녹화 종료":"● 스윙 녹화"}</button>}
          <small style={{color:"#546974"}}>브라우저의 고속 촬영 지원은 기기마다 다릅니다. 실제 240fps 확보에는 삼성 카메라 촬영 후 영상 가져오기를 권장합니다.</small>
        </div>
      </div>
    </div>
    <div role="status" aria-live="polite" style={{fontSize:13,padding:"10px 12px",borderRadius:8,background:"#eaf3ff",color:"#174b78",marginBottom:12}}>{status}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,350px),1fr))",gap:12}}>
      {videoFrame("mine",mine,ownVideo,ownCanvas)}
      {videoFrame("pro",pro,proVideo,proCanvas)}
    </div>
    <div style={{...box,marginTop:12}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
        <button style={btn} type="button" onClick={goMarked}>선택 단계로 맞추기</button>
        <button style={btn} type="button" onClick={playBoth}>두 영상 동시에 재생</button>
        <button style={btn} type="button" onClick={pauseBoth}>두 영상 정지</button>
      </div>
      <p style={{fontSize:13,margin:0}}>먼저 두 영상에서 동일한 {phase} 순간을 멈춘 뒤 각자 '현재 {phase} 저장'을 누르세요. 카메라 방향과 촬영 높이를 통일해야 비교가 의미 있습니다.</p>
    </div>
    <section style={{...box,marginTop:12}}>
      <h3 style={{marginTop:0}}>프로와 내 스윙 · 같은 단계의 2D 관절각 비교</h3>
      {!analysis.mine||!analysis.pro?<p>좌우 영상에서 각각 프레임을 선택하고 '현재 프레임 AI 분석'을 누르면 수치가 표시됩니다.</p>:
        analysis.mine.phase!==analysis.pro.phase?<p>두 영상의 분석 단계가 다릅니다. 같은 단계를 선택하고 다시 분석하세요.</p>:
        <><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr><th style={{textAlign:"left"}}>분석 항목</th><th>내 자세</th><th>프로 영상</th><th>차이</th></tr></thead>
          <tbody>{compare.map(r=><tr key={r.key} style={{borderTop:"1px solid #dfe6eb"}}><td style={{padding:"9px 2px"}}>{r.label}</td><td style={{textAlign:"center"}}>{r.mine==null?"미검출":r.mine+r.unit}</td><td style={{textAlign:"center"}}>{r.pro==null?"미검출":r.pro+r.unit}</td><td style={{textAlign:"center"}}>{r.diff==null?"-":r.diff+r.unit}</td></tr>)}</tbody>
        </table></div><div style={{background:"#f1f8f4",padding:12,borderRadius:8,marginTop:10}}><b>이번 스윙의 우선 확인 항목 1개</b><p style={{margin:"6px 0"}}>{coaching}</p><button type="button" onClick={speakOne} style={btn}>한 문장 음성 코칭</button></div></>}
      <p style={{color:"#6b4d21",fontSize:12,marginBottom:0}}>분석은 단일 카메라 영상의 2D 자세 추정입니다. 절대 각도, 골반 실제 회전량, 체중 이동, 샤프트·클럽페이스, 타점, 생크·뒤땅의 원인은 이 값만으로 판정할 수 없습니다. 프로 영상도 개인 체형과 샷 목적에 따라 자세가 다를 수 있습니다.</p>
    </section>
  </div>;
}
