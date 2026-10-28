"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {estimatedMeasurement,pixelDistance,planarPolygonArea} from "../../surveyGeometry";
import {survey2dDxf} from "../../surveyDxf";

const themes={background:"#f4f7fb",box:"#fff",line:"#d7e2ee",dark:"#123754",muted:"#61778a",accent:"#1669b1"};
const modes=[
 {id:"distance",title:"거리",helper:"두 끝점을 선택하고 실제 기준길이를 이용해 화면상 길이를 계산합니다."},
 {id:"area",title:"면적",helper:"같은 평면의 외곽점을 순서대로 지정해 다각형 면적을 추정합니다."},
 {id:"building",title:"건물",helper:"건물 외곽선을 직접 지정한 뒤 동일 평면의 외벽 면적을 참고 계산합니다. 자동 경계 검출은 AR 모듈 연동 전입니다."},
 {id:"room",title:"공간",helper:"실내 바닥 둘레를 같은 평면으로 기록합니다. 3D 공간 복원은 네이티브 ARCore 연동 단계입니다."},
 {id:"golf",title:"골프 거리",helper:"실제 길이를 아는 기준물로 보정한 근거리 연습 측정입니다. 그린·핀까지 장거리 거리는 GPS·레이저를 사용하세요."},
];
const button={background:"#edf5ff",border:"1px solid #b9d0e3",color:"#145287",fontSize:13,borderRadius:9,padding:"9px 12px",fontWeight:700,cursor:"pointer"};
function readImage(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>resolve({url,width:img.naturalWidth,height:img.naturalHeight});
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("이미지 형식이 지원되지 않습니다."));};
  img.src=url;
 });
}
export default function SurveyCamera(){
 const camera=useRef(null),stream=useRef(null),frozen=useRef(""),svg=useRef(null);
 const [active,setActive]=useState(false),[image,setImage]=useState("");
 const [imageAspect,setImageAspect]=useState(1);
 const [mode,setMode]=useState("distance");
 const [stage,setStage]=useState("reference"),[reference,setReference]=useState([]),[target,setTarget]=useState([]);
 const [known,setKnown]=useState("1"),[status,setStatus]=useState("카메라를 켜서 건물·공간을 비추세요. 측정 시에는 프레임을 고정하거나 사진을 불러옵니다.");
 const selected=modes.find(x=>x.id===mode);
 const areaMode=["area","building","room"].includes(mode);
 const computed=useMemo(()=>estimatedMeasurement({kind:areaMode?"area":"distance",reference,referenceLength:Number(known),points:target,imageAspectRatio:imageAspect}),[areaMode,reference,target,known,imageAspect]);
 const allPoints=stage==="reference"?reference:target;
 useEffect(()=>()=>{stream.current?.getTracks().forEach(t=>t.stop());if(frozen.current)URL.revokeObjectURL(frozen.current);},[]);
 async function start(){
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error("브라우저 카메라 미지원");
   const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
   stream.current=s;camera.current.srcObject=s;await camera.current.play();
   setActive(true);setStatus("실시간 카메라 미리보기 연결됨. AR 깊이 측정이 없는 웹에서는 프레임을 고정해야 좌표가 유지됩니다.");
  }catch(e){setStatus("카메라 접근 실패. HTTPS·권한을 확인해 주세요.");}
 }
 function stop(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(camera.current)camera.current.srcObject=null;setActive(false);}
 function clearMeasurements(){setReference([]);setTarget([]);setStage("reference");}
 function replaceImage(url,width=1,height=1){if(frozen.current)URL.revokeObjectURL(frozen.current);frozen.current=url;setImage(url);setImageAspect(width/Math.max(1,height));clearMeasurements();}
 function freeze(){
  if(!camera.current?.videoWidth)return;
  const canvas=document.createElement("canvas"),v=camera.current;
  canvas.width=v.videoWidth;canvas.height=v.videoHeight;
  canvas.getContext("2d").drawImage(v,0,0);
  canvas.toBlob(blob=>{if(blob){const u=URL.createObjectURL(blob);replaceImage(u,canvas.width,canvas.height);setStatus("현재 프레임이 고정되었습니다. 화면 위에 기준 길이와 측정 지점을 지정하세요.");}},"image/jpeg",.93);
 }
 async function upload(file){
  if(!file)return;
  try{const obj=await readImage(file);replaceImage(obj.url,obj.width,obj.height);setStatus("이미지를 불러왔습니다. 동일 평면의 기준물로 보정하세요.");}
  catch(e){setStatus(e.message);}
 }
 function clickAt(e){
  if(!image)return;
  const r=e.currentTarget.getBoundingClientRect();
  const p={x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))};
  if(stage==="reference"){
   if(reference.length===1){setReference(v=>[...v,p]);setStage("target");setStatus("기준 길이 두 점을 설정했습니다. 이제 측정할 지점을 탭하세요.");}
   else setReference([p]);
  }else{
   setTarget(v=>areaMode?[...v,p]:v.length>=2?[p]:[...v,p]);
  }
 }
 function exportJson(){
  const record={createdAt:new Date().toISOString(),mode,knownMeters:Number(known),reference,target,measurement:computed,origin:"2D camera calibrated photo",limitation:"현장 실측 아님·원근보정 미적용"};
  const blob=new Blob([JSON.stringify(record,null,2)],{type:"application/json"});
  const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="survey-reference-"+Date.now()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 }
 function exportDxf(){
   try{
     const content=survey2dDxf({reference,referenceLength:Number(known),points:target,imageAspectRatio:imageAspect,closed:areaMode});
     const u=URL.createObjectURL(new Blob([content],{type:"application/dxf;charset=utf-8"}));
     const a=document.createElement("a");a.href=u;a.download="camera-2d-reference-"+Date.now()+".dxf";a.click();
     setTimeout(()=>URL.revokeObjectURL(u),1000);
     setStatus("2D 사진 참고 측정 DXF가 저장되었습니다. 원근·렌즈 왜곡은 보정되지 않았으므로 CAD 도면을 현장 실측으로 검증하세요.");
   }catch(e){setStatus("DXF 저장 불가: "+e.message);}
 }

 function changeMode(id){setMode(id);clearMeasurements();}
 const samePlaneWarning="기준물과 측정 대상이 같은 평면·거리에 있어야 합니다. 원근과 렌즈 왜곡을 보정하지 않은 화면상 참고값이며, 법정 측량이나 감정평가 확정 규격으로 사용하지 마세요.";
 const format=computed?.value==null?"측정 준비":computed.value.toLocaleString("ko-KR",{maximumFractionDigits:2})+" "+computed.unit;
 return <main style={{background:themes.background,minHeight:"100vh",padding:12,color:themes.dark}}>
  <section style={{maxWidth:1080,margin:"auto"}}>
   <header style={{marginBottom:14}}>
    <h1 style={{fontSize:23,margin:"0 0 6px"}}>AI 카메라 · 측량</h1>
    <p style={{fontSize:13,margin:0,color:themes.muted}}>카메라 실시간 미리보기 + 거리·면적 측정 + 향후 3D AR 건물/공간 매핑</p>
    <nav style={{marginTop:10,fontSize:13}}><a href="/camera">카메라 홈</a> · <a href="/camera/trees">수목</a> · <a href="/camera/golf">골프</a></nav>
   </header>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
    {modes.map(x=><button type="button" key={x.id} onClick={()=>changeMode(x.id)} style={{...button,background:mode===x.id?"#0b62af":"#fff",color:mode===x.id?"#fff":themes.dark}}>{x.title}</button>)}
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:15,alignItems:"start"}}>
    <div style={{borderRadius:12,background:"#0a2235",overflow:"hidden",position:"relative"}}>
      <video ref={camera} playsInline muted autoPlay style={{width:"100%",display:active&&!image?"block":"none",maxHeight:550}}/>
      {image?<div style={{position:"relative"}}>
        <img src={image} alt="측정용으로 고정된 이미지" style={{display:"block",width:"100%"}}/>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" onClick={clickAt} role="img" aria-label="기준점과 측정점을 차례로 선택하는 화면" style={{position:"absolute",inset:0,width:"100%",height:"100%",cursor:"crosshair",touchAction:"manipulation"}}>
          {reference.length===2&&<line x1={reference[0].x*1000} y1={reference[0].y*1000} x2={reference[1].x*1000} y2={reference[1].y*1000} stroke="#ffd25b" strokeWidth="5" strokeDasharray="16 7"/>}
          {target.length>=2&&<polyline points={target.map(p=>(p.x*1000)+","+(p.y*1000)).join(" ")} stroke="#12f0d0" strokeWidth="5" fill="none"/>}
          {areaMode&&target.length>=3&&<polygon points={target.map(p=>(p.x*1000)+","+(p.y*1000)).join(" ")} fill="#12f0d0" fillOpacity=".15" stroke="#12f0d0" strokeWidth="4"/>}
          {reference.map((p,i)=><circle key={"ref"+i} cx={p.x*1000} cy={p.y*1000} r="12" fill="#ffd25b" stroke="#000" strokeWidth="2"/>)}
          {target.map((p,i)=><circle key={"tar"+i} cx={p.x*1000} cy={p.y*1000} r="13" fill="#12f0d0" stroke="#000" strokeWidth="2"/>)}
        </svg>
        <div style={{position:"absolute",left:9,right:9,bottom:9,padding:10,borderRadius:8,background:"#082739dd",color:"#fff",pointerEvents:"none"}}>
         {stage==="reference"?"노란 기준선 두 점 선택 · "+reference.length+"/2":"청록색 측정 지점 선택 · "+target.length+"점"} · {format}
        </div>
      </div>:!active?<div style={{minHeight:220,display:"grid",placeItems:"center",color:"#acc0cf",textAlign:"center",padding:15}}>실시간 카메라 화면 대기 중</div>:<div style={{position:"absolute",bottom:8,left:8,right:8,padding:9,background:"#082739dd",color:"#fff",fontSize:12,borderRadius:8}}>실시간 미리보기 · AR 자동 측량 미연결</div>}
    </div>
    <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid #d7e2ec"}}>
     <h2 style={{fontSize:19,margin:"0 0 8px"}}>{selected.title} 측정</h2>
     <p style={{fontSize:13,color:themes.muted}}>{selected.helper}</p>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"10px 0"}}>
      <button style={button} type="button" onClick={active?stop:start}>{active?"카메라 끄기":"카메라 켜기"}</button>
      <button style={button} type="button" onClick={freeze} disabled={!active}>측정용 프레임 고정</button>
      <button style={button} type="button" onClick={()=>{setImage("");clearMeasurements();}}>실시간 미리보기</button>
     </div>
     <label style={{display:"block",fontSize:13,margin:"10px 0"}}>기존 사진 불러오기<input type="file" accept="image/jpeg,image/png,image/webp" style={{display:"block",marginTop:6,maxWidth:"100%"}} onChange={e=>upload(e.target.files?.[0])}/></label>
     <label style={{display:"block",fontSize:13,margin:"12px 0"}}>기준물의 실제 길이 (m)
      <input type="number" aria-label="기준물 실제 길이" min=".01" step=".01" value={known} onChange={e=>setKnown(e.target.value)} style={{display:"block",padding:10,borderRadius:7,border:"1px solid #c7d5e0",width:"100%"}}/>
     </label>
     <p style={{fontSize:12,color:themes.muted}}>예: A4 가로 0.21m, 줄자 표시 1m. 사진의 같은 깊이·평면에 놓아야 합니다.</p>
     <div style={{padding:12,background:"#f0f6fc",borderRadius:9}}>
      <b>현재 측정값</b>
      <div style={{fontSize:26,fontWeight:800,margin:"6px 0",fontVariantNumeric:"tabular-nums"}}>{format}</div>
      <p style={{fontSize:12,margin:0}}>{computed?.error||computed?.warning}</p>
     </div>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
      <button style={button} type="button" onClick={()=>{setTarget([]);setStage("target");}} disabled={reference.length<2}>측정 점 다시 선택</button>
      <button style={button} type="button" onClick={clearMeasurements}>기준부터 초기화</button>
      <button style={button} type="button" onClick={exportJson} disabled={computed?.value==null}>측정 기록 저장</button>
      <button style={button} type="button" onClick={exportDxf} disabled={computed?.value==null}>2D CAD DXF 저장</button>
     </div>
    </div>
   </div>
   <p role="status" style={{padding:11,background:"#e8f2fc",borderRadius:9,fontSize:13}}>{status}</p>
   <section style={{padding:14,background:"#fff8ed",borderRadius:10,fontSize:13,color:"#76521e"}}>
    <b>측정값의 한계</b>
    <p>{samePlaneWarning}</p>
    <p>카메라만으로 측정하려면 ARCore Depth와 월드 좌표 추적이 필요합니다. 현재 웹 화면은 실제 사진 또는 고정 프레임에 기준물을 사용한 2D 참고측정입니다. 건물 자동 인식, 동영상 기반 3D 모델 재구성, 법정 측량 오차 기준 검증은 아직 연결되지 않았습니다.</p>
    <p style={{marginBottom:0}}>실내 공간은 바닥 면적, 벽 면적, 체적을 각각 구분해야 합니다. 외관 면적이 실제 건축면적이나 연면적과 동일하지 않습니다.</p>
   </section>
  </section>
 </main>;
}
