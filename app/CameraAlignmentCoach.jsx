"use client";
import {useEffect,useRef,useState} from "react";
function grade(v){const a=Math.abs(Number(v));return a<=3?"정렬 양호":a<=7?"조금 수정":"재정렬 필요"}
export default function CameraAlignmentCoach(){
 const video=useRef(null),stream=useRef(null);
 const [status,setStatus]=useState("카메라 대기"),[foot,setFoot]=useState(0),[shoulder,setShoulder]=useState(0),[face,setFace]=useState(0);
 async function start(){try{stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});video.current.srcObject=stream.current;await video.current.play();setStatus("카메라 연결됨")}catch(e){setStatus("카메라 권한/연결 확인 필요")}}
 function stop(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;setStatus("카메라 정지")}
 function speak(){if(!("speechSynthesis" in window))return;const msg=`발끝선 ${grade(foot)}, 어깨선 ${grade(shoulder)}, 클럽 페이스 ${grade(face)}입니다. 목표선과 평행하게 다시 확인하세요.`;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang="ko-KR";speechSynthesis.speak(u)}
 useEffect(()=>()=>stream.current?.getTracks().forEach(t=>t.stop()),[]);
 return <div className="strategyBox"><h4><span>▣</span> 카메라 어드레스 정렬 코치</h4><p>휴대폰을 공 뒤 목표선 연장선에 두고 후면 카메라를 켜세요. 중앙선은 목표선, 가로 기준선은 발·어깨 평행 확인용입니다.</p>
 <div style={{position:"relative",maxWidth:520,aspectRatio:"4/3",background:"#111",overflow:"hidden",borderRadius:12}}>
  <video ref={video} playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
  <div aria-label="카메라 목표선" style={{position:"absolute",left:"50%",top:0,bottom:0,borderLeft:"2px dashed white"}}/>
  <div style={{position:"absolute",left:"8%",right:"8%",top:"68%",borderTop:"2px solid white",transform:`rotate(${foot}deg)`}}/>
  <div style={{position:"absolute",left:"15%",right:"15%",top:"38%",borderTop:"2px solid white",transform:`rotate(${shoulder}deg)`}}/>
 </div>
 <div className="inline"><button className="primary" aria-label="정렬 카메라 시작" onClick={start}>카메라 시작</button><button aria-label="정렬 카메라 정지" onClick={stop}>정지</button><button aria-label="정렬 음성 피드백" onClick={speak}>음성 판정</button><small>{status}</small></div>
 <div className="formgrid">
  <label>발끝선 보정 {foot}°<input aria-label="발끝선 각도" type="range" min="-15" max="15" value={foot} onChange={e=>setFoot(e.target.value)}/><b>{grade(foot)}</b></label>
  <label>어깨선 보정 {shoulder}°<input aria-label="어깨선 각도" type="range" min="-15" max="15" value={shoulder} onChange={e=>setShoulder(e.target.value)}/><b>{grade(shoulder)}</b></label>
  <label>클럽페이스 보정 {face}°<input aria-label="클럽페이스 각도" type="range" min="-15" max="15" value={face} onChange={e=>setFace(e.target.value)}/><b>{grade(face)}</b></label>
 </div>
 <p className="warn">현재 버전의 각도선은 사용자가 화면에 맞춰 보정하는 실시간 가이드입니다. 사람 관절·클럽페이스 자동 영상인식 결과로 오인하지 않도록 분리했습니다.</p></div>
}
