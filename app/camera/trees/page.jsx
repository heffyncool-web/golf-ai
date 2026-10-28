"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {referenceDiameterCm,TREE_FIELDS} from "../../treeMeasurements";

const surface={padding:14,border:"1px solid #d6e2ea",borderRadius:12,background:"#fff",marginBottom:12};
const control={borderRadius:8,border:"1px solid #b2c7d9",padding:"9px 12px",background:"#f1f7ff",color:"#15528b",fontWeight:700,cursor:"pointer"};
const labelStyle={display:"block",fontWeight:700,margin:"6px 0"};
const colors=["#1b9a6b","#e2ac4e","#da6b47","#d95883"];
const cm=(a,b)=>a&&b?Math.hypot((a.x-b.x),(a.y-b.y)):null;

export default function TreeCamera(){
 const video=useRef(null),stream=useRef(null),autoTimer=useRef(null),image=useRef(null);
 const blobUrl=useRef(""),lastRequest=useRef(0),requestCount=useRef(0),busy=useRef(false);
 const [camera,setCamera]=useState(false),[auto,setAuto]=useState(false),[busyState,setBusyState]=useState(false);
 const [message,setMessage]=useState("카메라를 켜고 나무를 화면 중앙에 맞추세요.");
 const [result,setResult]=useState(null),[photo,setPhoto]=useState("");
 const [points,setPoints]=useState([]),[measureMode,setMeasureMode]=useState("B"),[knownCm,setKnownCm]=useState(21);
 const [inputName,setInputName]=useState(""),[history,setHistory]=useState([]);
 useEffect(()=>()=>{stopInternal();if(blobUrl.current)URL.revokeObjectURL(blobUrl.current);},[]);
 function stopInternal(){
   if(autoTimer.current)clearInterval(autoTimer.current);autoTimer.current=null;
   stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
   if(video.current)video.current.srcObject=null;
 }
 const turnOn=async()=>{
   try{
     if(!navigator.mediaDevices?.getUserMedia)throw new Error("카메라 접근 기능이 없는 브라우저입니다.");
     const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
     stream.current=s;
     if(video.current){video.current.srcObject=s;await video.current.play();}
     setCamera(true);setMessage("카메라 연결됨. 실시간 수종 식별은 사용자가 켠 경우에만 주기적으로 수행됩니다.");
   }catch(e){setMessage("카메라를 사용할 수 없습니다. HTTPS와 카메라 권한을 확인하세요.");}
 };
 const turnOff=()=>{stopInternal();setCamera(false);setAuto(false);setMessage("카메라가 중지되었습니다.");};
 function takeBlob(){
   if(!video.current?.videoWidth)return Promise.resolve(null);
   const canvas=document.createElement("canvas");
   canvas.width=Math.min(1200,video.current.videoWidth);
   canvas.height=Math.round(canvas.width*video.current.videoHeight/video.current.videoWidth);
   canvas.getContext("2d").drawImage(video.current,0,0,canvas.width,canvas.height);
   return new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.87));
 }
 const analyze=useCallback(async(blob,source="camera")=>{
   if(!blob||busy.current)return;
   if(Date.now()-lastRequest.current<5000){setMessage("중복 요청을 줄이기 위해 잠깐 간격을 두고 분석하세요.");return;}
   if(requestCount.current>=15){setAuto(false);setMessage("한 번의 촬영에서 15회 분석 제한에 도달했습니다.");return;}
   busy.current=true;lastRequest.current=Date.now();requestCount.current++;setBusyState(true);
   setMessage("나무 수종을 분석하고 있습니다. 촬영한 이미지가 외부 식물 식별 서비스로 전송될 수 있습니다.");
   try{
     const fd=new FormData();fd.set("image",new File([blob],"tree.jpg",{type:"image/jpeg"}));
     const response=await fetch("/api/tree-identify",{method:"POST",body:fd});
     const json=await response.json();
     if(!response.ok)throw new Error(json.error||"수종 분석 실패");
     setResult({...json,capturedAt:new Date().toISOString()});setMessage(json.candidates?.length?"수종 추정 완료. 잎과 수피를 가까이 찍으면 판별력이 높아질 수 있습니다.":"식물 후보가 확인되지 않았습니다. 다시 촬영하세요.");
     if(source==="camera"&&!photo){
       const url=URL.createObjectURL(blob);if(blobUrl.current)URL.revokeObjectURL(blobUrl.current);
       blobUrl.current=url;setPhoto(url);
     }
   }catch(e){setMessage(e.message||"서버 응답을 확인하세요.");}
   finally{busy.current=false;setBusyState(false);}
 },[photo]);
 const scan=async()=>{const blob=await takeBlob();if(!blob){setMessage("카메라를 먼저 시작하세요.");return;}await analyze(blob);};
 useEffect(()=>{
   if(auto&&camera){
     autoTimer.current=setInterval(async()=>{
       if(document.visibilityState!=="visible"||busy.current)return;
       const blob=await takeBlob();if(blob)await analyze(blob);
     },18000);
     return()=>{clearInterval(autoTimer.current);autoTimer.current=null;};
   }
 },[auto,camera,analyze]);
 const upload=async(file)=>{
   if(!file)return;if(!["image/jpeg","image/png"].includes(file.type)){setMessage("JPEG 또는 PNG를 선택하세요.");return;}
   if(blobUrl.current)URL.revokeObjectURL(blobUrl.current);
   const url=URL.createObjectURL(file);blobUrl.current=url;setPhoto(url);setPoints([]);setResult(null);
   const converted=await new Promise(resolve=>{
     const img=new Image();
     img.onload=()=>{const c=document.createElement("canvas");c.width=Math.min(1200,img.naturalWidth);c.height=Math.round(c.width*img.naturalHeight/img.naturalWidth);c.getContext("2d").drawImage(img,0,0,c.width,c.height);c.toBlob(resolve,"image/jpeg",.87);};
     img.onerror=()=>resolve(null);img.src=url;
   });
   if(converted)await analyze(converted,"upload");else setMessage("사진을 읽을 수 없습니다.");
 };
 const pickPoint=(e)=>{
   const rect=e.currentTarget.getBoundingClientRect();
   const p={x:Math.min(1,Math.max(0,(e.clientX-rect.left)/rect.width)),y:Math.min(1,Math.max(0,(e.clientY-rect.top)/rect.height))};
   setPoints(old=>old.length>=4?[p]:[...old,p]);
 };
 const reference=cm(points[0],points[1]);
 const trunk=cm(points[2],points[3]);
 const diameter=referenceDiameterCm({referenceCm:knownCm,referencePixels:reference,trunkPixels:trunk});
 const primary=result?.candidates?.[0];
 const save=()=>{
   const item={at:new Date().toISOString(),name:inputName||primary?.name||"수종 미확정",latin:primary?.scientificName||"",score:primary?.score??null,field:measureMode,diameter:diameter||null,method:diameter?"참조물 동일면 사진 비율":"미측정",note:"현장 조사 전 AI 참고값. 실측검증 필요"};
   setHistory(rows=>[item,...rows].slice(0,100));setMessage("현재 세션의 수목 조사표에 추가했습니다. 페이지를 닫으면 보존되지 않으므로 CSV로 내려받으세요.");
 };
 const download=()=>{
   const esc=v=>'"'+String(v??"").replaceAll('"','""')+'"';
   const headings=["일시","수종","학명","모델점수","측정종류","추정직경(cm)","측정방법","주의사항"];
   const rows=history.map(x=>[x.at,x.name,x.latin,x.score,x.field,x.diameter,x.method,x.note]);
   const csv="\uFEFF"+[headings,...rows].map(r=>r.map(esc).join(",")).join("\r\n");
   const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
   const a=document.createElement("a");a.href=url;a.download="tree-survey.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <main style={{maxWidth:900,margin:"0 auto",padding:"16px 12px",background:"#f3f7fa",minHeight:"100vh",color:"#122e44"}}>
   <header style={{marginBottom:12}}>
     <h1 style={{fontSize:22,margin:"0 0 7px"}}>AI 카메라 · 수종 인식·수목 규격</h1>
     <p style={{margin:"0 0 8px",fontSize:13}}>실시간 수종 후보 표시 · 사진 기반 직경 참고측정 · 향후 ARCore 자동 규격 연동</p>
     <a href="/camera/golf" style={{fontSize:13}}>골프 카메라로 이동</a> · <a href="/" style={{fontSize:13}}>Golf AI 홈</a>
   </header>
   <section style={surface}>
     <div style={{position:"relative",background:"#0b2330",borderRadius:10,overflow:"hidden"}}>
       <video ref={video} playsInline muted autoPlay style={{display:camera?"block":"none",width:"100%",maxHeight:500,objectFit:"contain"}}/>
       {!camera&&<div style={{minHeight:160,display:"grid",placeItems:"center",color:"#b5c6d1"}}>카메라를 시작하면 실시간 미리보기가 나타납니다.</div>}
       {camera&&<div style={{position:"absolute",left:10,right:10,bottom:10,background:"#0d2638df",color:"#fff",padding:"9px 11px",borderRadius:8,fontSize:13}}>
          {busyState?"수종 분석 중…":primary?((primary.score!=null&&primary.score<.5?"신뢰도 낮음 · 재촬영 권장":"마지막 분석 · "+(primary.name||"수종 추정"))+(primary.score==null?"":(" · 모델 점수 "+Math.round(primary.score*100)+"%"))):"수종 미확인 · 분석을 눌러주세요"}
       </div>}
     </div>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
       <button style={control} type="button" onClick={camera?turnOff:turnOn}>{camera?"카메라 종료":"카메라 켜기"}</button>
       <button style={control} type="button" disabled={!camera||busyState} onClick={scan}>지금 수종 인식</button>
       <label style={{...labelStyle,alignSelf:"center",fontWeight:500}}><input type="checkbox" disabled={!camera} checked={auto} onChange={e=>setAuto(e.target.checked)}/> 18초 간격 자동 수종 인식</label>
     </div>
     <p style={{fontSize:12,color:"#576f80",marginBottom:4}}>자동 분석을 켜면 촬영 화면이 정기적으로 외부 식물 식별 서비스로 전송될 수 있습니다. 주변 사람·위치정보가 사진에 포함되지 않게 주의하세요. 외부 서비스 키 미연결 시 분석되지 않습니다.</p>
     <p role="status" style={{background:"#eaf3ff",padding:9,borderRadius:8,fontSize:13}}>{message}</p>
   </section>
   <section style={surface}>
     <h2 style={{fontSize:17,marginTop:0}}>AI 수종 후보</h2>
     {!result?<p style={{fontSize:13,color:"#576f80"}}>실제 AI 분석 연결 후 후보를 표시합니다. '소나무'라고 임의로 판정하지 않습니다.</p>:result.candidates?.length?result.candidates.map((c,i)=><div key={i} style={{borderTop:"1px solid #d9e3eb",padding:"8px 2px"}}>
       <b>{i+1}. {c.name}</b> <small>{c.scientificName}</small>
       <div style={{fontSize:12,color:"#546c80"}}>모델 점수: {c.score==null?"미제공":(c.score*100).toFixed(1)+"%"}</div>
     </div>):<p>수종을 인식하지 못했습니다.</p>}
     <p style={{fontSize:12,color:"#72572a"}}>모델 점수는 현장 판별 정확도를 보장하지 않습니다. 잎·수피·열매를 함께 확인하세요.</p>
   </section>
   <section style={surface}>
     <h2 style={{fontSize:17,marginTop:0}}>줄기 지름 측정 · 참조물 사용</h2>
     <p style={{fontSize:13}}>사진만으로 실제 크기의 절대값을 알 수 없으므로, 임시 웹 시안에서는 동일 거리·평면의 눈금자 또는 A4 용지 너비(21cm)를 기준으로 사용합니다. 카메라만으로 H·B·R·W를 자동 측정하는 기능은 폴드7용 ARCore 네이티브 모듈이 필요합니다.</p>
     <label style={labelStyle}>측정 항목</label>
     <select style={{padding:9,width:"100%"}} value={measureMode} onChange={e=>{setMeasureMode(e.target.value);setPoints([]);}}>
       {TREE_FIELDS.map(f=><option key={f.key} value={f.key}>{f.key} · {f.name} ({f.method})</option>)}
     </select>
     <label style={{...labelStyle,marginTop:12}}>수목 사진 불러오기</label>
     <input type="file" accept="image/jpeg,image/png" onChange={e=>upload(e.target.files?.[0])}/>
     <p style={{fontSize:12}}>직경을 측정하려면 사진을 탭해 참조물 양끝 두 점, 그 다음 줄기 양끝 두 점을 지정하세요. 참조물과 줄기가 카메라에서 같은 거리에 있어야 합니다.</p>
     {photo&&<div style={{position:"relative",maxWidth:650,margin:"12px auto",cursor:"crosshair"}}>
       <img ref={image} src={photo} alt="수목 측정 대상" onClick={pickPoint} style={{display:"block",width:"100%",borderRadius:10}}/>
       {points.map((p,i)=><div key={i} style={{position:"absolute",pointerEvents:"none",left:(100*p.x)+"%",top:(100*p.y)+"%",width:15,height:15,marginLeft:-7,marginTop:-7,borderRadius:40,border:"2px solid white",background:colors[i],color:"#fff",fontSize:10,textAlign:"center"}}>{i+1}</div>)}
     </div>}
     <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
       <label>참조물 실제 너비 (cm) <input style={{width:80,padding:7}} type="number" min="1" max="200" step=".1" value={knownCm} onChange={e=>setKnownCm(e.target.value)}/></label>
       <button style={control} type="button" onClick={()=>setPoints([])}>점 다시 선택</button>
     </div>
     <div style={{background:"#f0f7f2",borderRadius:8,padding:12,marginTop:10}}>
       <b>{measureMode==="B"?"흉고직경 B":measureMode==="R"?"근원직경 R":measureMode==="H"?"수고 H":"수관폭 W"} 참고 결과: {["B","R"].includes(measureMode)&&diameter?diameter+"cm (참조물 기반 추정)":"미측정"}</b>
       <p style={{fontSize:12,margin:"7px 0 0"}}>{["B","R"].includes(measureMode)?"원근 차이, 나무의 비원형 단면, 측정점 위치에 따라 오차가 발생합니다. 실제 보상평가용 수치는 줄자·캘리퍼스 등으로 검증하세요.":"높이·수관폭은 실제 3D 좌표와 거리 정보 없이는 수치로 제공하지 않습니다."}</p>
     </div>
   </section>
   <section style={surface}>
     <h2 style={{fontSize:17,marginTop:0}}>현장 수목 조사표</h2>
     <label style={labelStyle}>수종 수동 수정 <input value={inputName} placeholder="AI 추정과 다른 경우 직접 입력" onChange={e=>setInputName(e.target.value)} style={{width:"100%",padding:9}}/></label>
     <button type="button" style={control} onClick={save}>현재 추정 기록 추가</button> <button type="button" style={control} disabled={!history.length} onClick={download}>조사표 CSV 저장</button>
     <p style={{fontSize:12}}>{history.length}건의 참고 기록 · 다운로드 전에는 현재 세션에서만 유지됩니다.</p>
   </section>
 </main>;
}
