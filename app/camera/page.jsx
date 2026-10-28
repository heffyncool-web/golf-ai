"use client";
import {useState} from "react";
const tabs=[
 {name:"사진",sub:"AI 촬영·배율·뷰티",icon:"▣",state:"네이티브 앱 개발 대상",href:null},
 {name:"동영상",sub:"화질·소음·필터",icon:"▶",state:"네이티브 앱 개발 대상",href:null},
 {name:"책·문서",sub:"OCR·제본 PDF",icon:"▤",state:"스캔 엔진 미연결",href:null},
 {name:"수목",sub:"실시간 수종 후보·R·B",icon:"♣",state:"웹 시안 구현",href:"/camera/trees"},
 {name:"골프",sub:"초슬로·프로 스윙 비교",icon:"⚑",state:"웹 시안 구현",href:"/camera/golf"},
 {name:"측량",sub:"거리·면적·건물 외곽",icon:"⌖",state:"2D 참고 측정 구현",href:"/camera/survey"},
 {name:"번역",sub:"외국어 글씨·자막",icon:"文",state:"앱 개발 대상",href:null}
];
export default function CameraHub(){
 const [active,setActive]=useState(3);
 const item=tabs[active];
 return <main style={{background:"#f2f6fa",minHeight:"100vh",padding:14,color:"#17344b"}}>
  <div style={{maxWidth:930,margin:"0 auto"}}>
   <h1 style={{fontSize:26,margin:"8px 0"}}>AI 카메라 통합</h1>
   <p style={{fontSize:13,color:"#536b7a"}}>사진 · 영상 · 책 · 수목 · 골프 · 측량 · 번역</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9,marginTop:18}}>
    {tabs.map((x,i)=><button key={x.name} type="button" aria-pressed={active===i} onClick={()=>setActive(i)} style={{border:"1px solid "+(active===i?"#0d66b2":"#cfdee9"),background:active===i?"#e5f1ff":"#fff",borderRadius:12,padding:12,minHeight:110,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}}>
     <span aria-hidden="true" style={{fontSize:28}}>{x.icon}</span><b>{x.name}</b><small style={{fontSize:11,color:"#627485"}}>{x.sub}</small>
    </button>)}
   </div>
   <section style={{border:"1px solid #dae4ee",background:"#fff",borderRadius:12,padding:18,marginTop:16}}>
    <h2 style={{margin:"0 0 7px"}}>{item.name} 모드</h2>
    <p style={{fontSize:13,color:"#526d82"}}>{item.sub} · {item.state}</p>
    {item.href?<a href={item.href} style={{display:"inline-block",background:"#0c65ae",color:"#fff",textDecoration:"none",borderRadius:9,padding:"12px 16px",fontWeight:700}}>현재 기능 화면 열기</a>:<p style={{padding:12,background:"#fff7e8",borderRadius:8,fontSize:13}}>구현 완료로 표시하지 않습니다. 이 모드는 Android 네이티브 개발과 기기 검증이 필요합니다.</p>}
   </section>
   <section style={{marginTop:12,fontSize:13,color:"#60788b",lineHeight:1.8}}>
    <b>사용 안내</b>
    <p>현재 웹 개발본에서 골프 스윙 영상 비교, 수종 인식 API 연결용 카메라, 기준물 기반 거리·면적 측정의 소스가 구현되어 있습니다. 실제 AI 수종 판독에는 외부 서비스 키, 고속 촬영·AR 자동측량·백그라운드 녹화에는 별도 Android 앱과 권한/기기 검증이 필요합니다.</p>
    <a href="/">기존 Golf AI 홈</a>
   </section>
  </div>
 </main>;
}
