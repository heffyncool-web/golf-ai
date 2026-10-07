"use client";
import { useMemo, useState } from "react";
import {lessonScript,speakLesson,videoStoryboard} from "./mediaLessonEngine";

const LIES=[
  {id:"fairway",label:"보통 잔디"},{id:"tight",label:"잔디 거의 없음/맨땅"},{id:"rough",label:"깊은 러프"},
  {id:"bunker",label:"그린사이드 벙커"},{id:"highlip",label:"턱 바로 앞 벙커"},{id:"divot",label:"디봇"},
  {id:"uphill",label:"왼발 오르막"},{id:"downhill",label:"왼발 내리막"}
];
const DISTANCES=[5,10,15,20,30,40,50];

function advice(distance,lie,club){
  if(lie==="bunker"||lie==="highlip"){
    const hard=lie==="highlip";
    return {
      club:"56°", title: hard?"탈출 우선 · 로프트 최대 확보":"핀보다 안전한 그린 면 우선",
      setup: hard?"페이스를 충분히 열고 스탠스도 열어 로프트를 확보하세요. 체중은 왼쪽에 둡니다.":"페이스를 열고 볼은 중앙보다 약간 왼쪽, 체중은 왼쪽에 둡니다.",
      feel: hard?"거리 욕심보다 턱을 넘기는 높은 탄도를 먼저 만드세요. 공이 아니라 공 뒤 모래를 충분히 통과합니다.":`핀까지 ${distance}m라면 평지 어프로치보다 훨씬 큰 스윙이 필요합니다. 우선 ${Math.max(20,distance*2)}m 안팎의 평지 웨지 스윙 느낌에서 시작해 실제 모래 상태로 보정하세요.`,
      target: hard?"가장 낮은 턱과 넓은 그린 쪽":"핀보다 넓은 그린 중앙 쪽",
      avoid:"공만 직접 맞히려 하거나 감속하지 마세요. 정확한 모래 진입점은 연습 결과에 맞춰 개인화합니다."
    };
  }
  if(lie==="tight"){
    return {club:distance<=20?"PW":club,title:"바운스보다 정확한 컨택 우선",setup:"스탠스를 좁히고 볼을 중앙~약간 오른쪽에 둡니다. 손을 과도하게 앞으로 밀지 않습니다.",feel:distance<=15?`퍼팅 스트로크처럼 ${Math.max(2,Math.round(distance*.45))}m 캐리 지점을 보내고 나머지는 굴린다는 느낌부터 연습하세요.`:"작은 피치 스윙으로 공부터 맞히고 얕게 통과하세요.",target:"그린 앞의 평평한 착지점",avoid:"맨땅에서 56°를 과도하게 열어 바운스를 크게 쓰면 탑핑 위험이 커질 수 있습니다."};
  }
  if(lie==="rough"){
    return {club:"56°",title:"러프 저항을 이기는 탈출",setup:"그립 압력을 조금 높이고 페이스를 약간 열어 잔디 저항을 줄입니다.",feel:"런이 줄어드는 것을 감안해 평소보다 캐리를 더 확보합니다.",target:"핀보다 넓은 안전면",avoid:"볼이 떠 있다고 가정해 얇게 치지 말고 라이 깊이를 먼저 확인하세요."};
  }
  const usePW=distance<=20;
  return {club:usePW?"PW":club,title:usePW?"굴릴 수 있으면 굴리는 쉬운 공략":"캐리와 런을 분리해 거리 조절",setup:usePW?"퍼팅과 비슷하게 좁은 스탠스, 체중은 왼쪽, 손목 사용을 줄입니다.":"좁은 스탠스에서 일정한 템포로 스윙 크기를 조절합니다.",feel:usePW?`${distance}m라면 약 ${Math.max(2,Math.round(distance*.5))}m 캐리 후 굴린다는 느낌부터 시작하세요.`:`${distance}m 캐리 목표점을 먼저 정하고 스윙 크기를 기록하세요.`,target:"홀보다 착지점 먼저 보기",avoid:"거리만 보고 무조건 56°를 선택하지 말고 앞 장애물과 굴릴 공간을 확인하세요."};
}

export function getShortGameAdvice(distance,lie,club="56°"){ return advice(Number(distance),lie,club); }

export default function ShortGameAcademy(){
  const [distance,setDistance]=useState(10),[lie,setLie]=useState("fairway"),[club,setClub]=useState("56°");
  const [tab,setTab]=useState("situation"),[records,setRecords]=useState([]);
  const a=useMemo(()=>advice(Number(distance),lie,club),[distance,lie,club]);
  const lesson=lessonScript({title:`${distance}미터 어프로치 레슨`,situation:LIES.find(x=>x.id===lie)?.label,club:a.club,setup:a.setup,target:a.target,feel:a.feel,avoid:a.avoid,drill:"같은 거리 5구를 기록하고 캐리와 총거리를 비교하세요."}),storyboard=videoStoryboard({situation:LIES.find(x=>x.id===lie)?.label,club:a.club,setup:a.setup,target:a.target,feel:a.feel,avoid:a.avoid,drill:"5구 반복 후 결과를 기록"});
  const addRecord=()=>setRecords(r=>[{id:Date.now(),distance:Number(distance),lie,club:a.club,result:"성공"},...r].slice(0,30));
  return <div className="panel">
    <h2>상황별 공략 · 어프로치 아카데미</h2>
    <p className="ok">PW와 56°를 중심으로 쉬운 공략 → 셋업 → 캐리/런 → 실수 방지 → 연습 → 복기까지 연결합니다.</p>
    <div className="modeTabs">
      <button className={tab==="situation"?"active":""} onClick={()=>setTab("situation")}>상황별 공략</button>
      <button className={tab==="practice"?"active":""} onClick={()=>setTab("practice")}>거리별 연습</button>
      <button className={tab==="golfzon"?"active":""} onClick={()=>setTab("golfzon")}>Golfzon 데이터</button>
      <button className={tab==="media"?"active":""} onClick={()=>setTab("media")}>MP3 · MP4 레슨</button>
    </div>
    {tab==="situation"&&<>
      <div className="formgrid">
        <label>남은 거리<select value={distance} onChange={e=>setDistance(Number(e.target.value))}>{DISTANCES.map(d=><option key={d} value={d}>{d}m</option>)}</select></label>
        <label>현재 라이<select value={lie} onChange={e=>setLie(e.target.value)}>{LIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label>주력 웨지<select value={club} onChange={e=>setClub(e.target.value)}><option>PW</option><option>56°</option></select></label>
      </div>
      <div className="cards">
        <div className="card selected"><small>추천 클럽</small><b>{a.club}</b><span>{a.title}</span></div>
        <div className="card"><small>목표</small><b>{a.target}</b></div>
        <div className="card"><small>거리</small><b>{distance}m</b><span>{LIES.find(x=>x.id===lie)?.label}</span></div>
      </div>
      <div className="strategyBox"><h4><span>1</span> 셋업</h4><p>{a.setup}</p></div>
      <div className="strategyBox"><h4><span>2</span> 거리감 / 스윙 느낌</h4><p>{a.feel}</p></div>
      <div className="strategyBox"><h4><span>3</span> 실수 방지</h4><p>{a.avoid}</p></div>
      <p className="warn">거리감 환산은 출발값입니다. 실제 캐리·런·모래 상태·그린 속도에 따라 개인 기록으로 보정해야 합니다.</p>
      <button className="primary" onClick={addRecord}>이 상황 연습기록 추가</button>
      {records.slice(0,5).map(r=><div className="task" key={r.id}>{r.distance}m · {LIES.find(x=>x.id===r.lie)?.label} · {r.club} · {r.result}</div>)}
    </>}
    {tab==="practice"&&<>
      <h3>PW · 56° 거리 매트릭스</h3>
      <div className="scoregrid">{DISTANCES.map(d=><div className="scorecell" key={d}><b>{d}m</b><small>PW / 56°</small><span>① 캐리 착지점 5구</span><span>② 총거리 5구</span><span>③ 랜덤 5구</span><span>④ 성공률 기록</span></div>)}</div>
      <div className="strategyBox"><h4><span>✓</span> 추천 순서</h4><p>5·10·15·20m는 먼저 PW 굴리기와 56° 띄우기를 모두 연습하고, 30·40·50m는 56°의 스윙 크기별 캐리를 기록하세요. 마지막에는 거리를 보지 않고 랜덤 호출로 테스트합니다.</p></div>
    </>}
    {tab==="golfzon"&&<>
      <h3>Golfzon 데이터 보는 법</h3>
      <div className="strategyBox"><h4><span>1</span> 방향과 분산</h4><p>평균거리보다 좌우 분산과 반복되는 미스 방향을 먼저 봅니다. AI 캐디 목표점 보정에 사용합니다.</p></div>
      <div className="strategyBox"><h4><span>2</span> 캐리와 총거리</h4><p>클럽별 캐리와 총거리를 구분해 기록합니다. 장애물을 넘길 때는 최고거리가 아니라 반복 가능한 캐리를 사용합니다.</p></div>
      <div className="strategyBox"><h4><span>3</span> 숏게임</h4><p>PW·56°의 거리별 결과를 따로 기록해 10·20·30·40·50m 성공률 표를 만들고 실제 라운드 추천에 연결합니다.</p></div>
      <p className="warn">Golfzon 화면/내보내기 형식이 확보되면 자동 가져오기 단계로 확장합니다.</p>
    </>}
    {tab==="media"&&<>
      <h3>듣기 · 보기 레슨 라이브러리</h3><div className="inline"><button className="primary" aria-label="현재 레슨 음성 재생" onClick={()=>speakLesson(lesson)}>현재 레슨 음성 재생</button><button aria-label="현재 레슨 대본 저장" onClick={()=>{const b=new Blob([lesson],{type:"text/plain"}),u=URL.createObjectURL(b),x=document.createElement("a");x.href=u;x.download=`golf-lesson-${distance}m.txt`;x.click();setTimeout(()=>URL.revokeObjectURL(u),500)}}>대본 저장</button></div><div className="strategyBox"><h4><span>▶</span> MP4 제작 스토리보드</h4>{storyboard.map(x=><p key={x.scene}><b>{x.scene}. {x.title}</b> · {x.text||"-"}</p>)}</div>
      <div className="cards">
        <div className="card"><small>오디오</small><b>운동 중 듣기</b><span>10m PW 퍼팅형 · 20m 벙커 · 맨땅 어프로치</span></div>
        <div className="card"><small>영상</small><b>짧은 MP4 레슨</b><span>셋업 → 목표점 → 스윙 느낌 → 실수 방지</span></div>
        <div className="card"><small>라운드 전</small><b>5분 복습</b><span>오늘 필요한 상황만 묶어 재생</span></div><div className="card"><small>정렬 루틴</small><b>목표선에 똑바로 서기</b><span>GPS 목표방위 → 휴대폰 나침반 → 발끝선·어깨선 평행 → 클럽페이스 목표 → 카메라 확인</span></div>
      </div>
      <div className="strategyBox"><h4><span>⌖</span> MP3·MP4 공통 정렬 챕터</h4><p>① 공 뒤에서 목표점을 정합니다. ② GPS로 목표 방위각을 확인합니다. ③ 휴대폰을 목표선과 평행하게 두어 나침반 각도를 맞춥니다. ④ 클럽페이스를 목표에 먼저 맞춥니다. ⑤ 발끝선과 어깨선은 목표선에 평행하게 섭니다. ⑥ 카메라를 뒤쪽에 두고 발·어깨·클럽페이스를 최종 확인합니다. GPS의 이동 heading만으로 정지한 골퍼의 몸 방향을 판정하지 않습니다.</p></div><p className="warn">현재 브라우저 한국어 음성 재생과 MP4 제작용 장면별 스토리보드까지 구현했습니다. 실제 MP3/MP4 파일 렌더링·보관은 미디어 서버 연결이 필요합니다.</p>
    </>}
  </div>
}
