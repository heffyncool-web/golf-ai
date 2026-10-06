"use client";

import { useEffect, useMemo, useState } from "react";
import { builtInCourses, getCourseById } from "../data/courses";

const NAV = [
  ["home","홈"],["schedule","라운드 일정"],["caddie","AI 캐디"],["score","스코어카드"],
  ["courses","골프장 DB"],["swing","스윙 분석"],["practice","연습/코칭"],["equipment","장비/클럽"],
  ["weather","날씨/바람"],["settings","설정"]
];

const DEFAULT_CLUBS = { Driver:220,"3W":200,"5W":180,Utility:170,"5I":160,"6I":150,"7I":140,"8I":130,"9I":120,PW:105,AW:90,SW:80 };

function useStoredState(key, initial) {
  const [value,setValue] = useState(initial);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) { try { setValue(JSON.parse(raw)); } catch {} }
  }, [key]);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key,value]);
  return [value,setValue];
}

function nearestClub(clubs, distance) {
  return Object.entries(clubs).sort((a,b) => Math.abs(a[1]-distance)-Math.abs(b[1]-distance))[0]?.[0] || "-";
}

export default function Page(){
  const [view,setView]=useState("caddie");
  const [clubs,setClubs]=useStoredState("golfClubsV2",DEFAULT_CLUBS);
  const [scores,setScores]=useStoredState("golfScoresV2",Array.from({length:18},()=>({strokes:"",putts:"",penalty:""})));
  const [customCourses,setCustomCourses]=useStoredState("golfCustomCourses",[]);
  const [courseId,setCourseId]=useStoredState("golfCourseId","grace-cc");
  const [step,setStep]=useState(0);
  const [tab,setTab]=useState("ai");
  const [round,setRound]=useStoredState("golfRound",{date:"2026-10-19",time:"13:10",players:4,fee:150000,caddie:"정규캐디"});
  const [weather,setWeather]=useStoredState("golfWeather",{temp:22,wind:2,direction:"앞바람"});
  const [memo,setMemo]=useStoredState("golfMemo","");
  const [practice,setPractice]=useStoredState("golfPractice",[]);
  const course=useMemo(()=>getCourseById(courseId,customCourses),[courseId,customCourses]);
  const rotation=course.defaultRotation || Object.keys(course.courses || {});
  const currentCourseName=rotation[Math.floor(step/9)] || rotation[0];
  const holeNo=(step%9)+1;
  const currentHole=course.courses?.[currentCourseName]?.[holeNo-1];
  const driver=clubs.Driver||0;
  const remain=currentHole?Math.max(0,currentHole.distance-driver):0;
  const second=nearestClub(clubs,Math.min(180,remain));
  const totalScore=scores.reduce((n,s)=>n+(Number(s.strokes)||0),0);

  function setScoreField(index,key,val){ setScores(prev=>prev.map((s,i)=>i===index?{...s,[key]:val}:s)); }
  function next(){ setStep(s=>Math.min(17,s+1)); }
  function prev(){ setStep(s=>Math.max(0,s-1)); }

  function addCourse(e){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const name=String(fd.get("name")||"").trim(), region=String(fd.get("region")||"").trim();
    if(!name) return;
    const id="custom-"+Date.now();
    setCustomCourses(prev=>[...prev,{id,name,region,venueType:"사용자 추가",defaultRotation:["Course A","Course B"],courses:{"Course A":Array.from({length:9},(_,i)=>({hole:i+1,par:4,distance:0,title:"데이터 입력 필요",hazards:[],strategy:"홀 정보를 입력해 주세요."})),"Course B":Array.from({length:9},(_,i)=>({hole:i+1,par:4,distance:0,title:"데이터 입력 필요",hazards:[],strategy:"홀 정보를 입력해 주세요."}))}}]);
    e.currentTarget.reset();
  }

  function exportData(){
    const blob=new Blob([JSON.stringify({customCourses,clubs,scores,round,weather},null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="golf-ai-data.json"; a.click(); URL.revokeObjectURL(a.href);
  }

  function importData(file){
    const r=new FileReader(); r.onload=()=>{try{const d=JSON.parse(r.result); if(d.customCourses)setCustomCourses(d.customCourses); if(d.clubs)setClubs(d.clubs); if(d.scores)setScores(d.scores); if(d.round)setRound(d.round); if(d.weather)setWeather(d.weather);}catch{alert("JSON 파일을 확인해 주세요.");}}; r.readAsText(file);
  }

  return <div className="shell">
    <aside className="side">
      <div className="logo">⛳ Golf AI<small>AI CADDIE & COACH</small></div>
      <div className="nav">{NAV.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</div>
      <div className="clubmini"><b>내 클럽 거리</b>{Object.entries(clubs).map(([k,v])=><span key={k}>{k}<em>{v}m</em></span>)}</div>
    </aside>

    <main className="main">
      <header className="top">
        <div className="date">{round.date}<b>{round.time}</b></div>
        <div className="title">{course.name}<small>{course.region}</small></div>
        <div className="stat">인원<b>{round.players}인</b></div>
        <div className="stat">그린피<b>{Number(round.fee).toLocaleString()}원</b></div>
        <div className="stat">캐디<b>{round.caddie}</b></div>
        <select value={courseId} onChange={e=>{setCourseId(e.target.value);setStep(0);}}>{[...builtInCourses,...customCourses].map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </header>

      <section className="view">
        {view==="home" && <Home round={round} course={course} totalScore={totalScore} setView={setView}/>}
        {view==="schedule" && <Schedule round={round} setRound={setRound}/>}
        {view==="caddie" && <Caddie course={course} rotation={rotation} step={step} setStep={setStep} tab={tab} setTab={setTab} currentCourseName={currentCourseName} hole={currentHole} driver={driver} remain={remain} second={second} weather={weather} clubs={clubs} memo={memo} setMemo={setMemo} score={scores[step]} setScore={(k,v)=>setScoreField(step,k,v)} next={next} prev={prev}/>}
        {view==="score" && <Score scores={scores} setScoreField={setScoreField}/>}
        {view==="courses" && <Courses builtInCourses={builtInCourses} customCourses={customCourses} addCourse={addCourse} setCustomCourses={setCustomCourses}/>}
        {view==="swing" && <Swing/>}
        {view==="practice" && <Practice items={practice} setItems={setPractice}/>}
        {view==="equipment" && <Equipment clubs={clubs} setClubs={setClubs}/>}
        {view==="weather" && <Weather value={weather} setValue={setWeather}/>}
        {view==="settings" && <Settings exportData={exportData} importData={importData} reset={()=>{if(confirm("저장 데이터를 초기화할까요?")){localStorage.clear();location.reload();}}}/>}
      </section>
    </main>
  </div>
}

function Home({round,course,totalScore,setView}){return <div className="panel"><h2>라운드 대시보드</h2><div className="cards"><Card t="다음 라운드" v={round.date+" "+round.time}/><Card t="골프장" v={course.name}/><Card t="현재 입력 스코어" v={totalScore||"-"}/></div><button className="primary" onClick={()=>setView("caddie")}>AI 캐디 시작</button></div>}
function Card({t,v}){return <div className="card"><small>{t}</small><b>{v}</b></div>}

function Schedule({round,setRound}){return <div className="panel"><h2>라운드 일정</h2><div className="formgrid">{Object.entries({date:"날짜",time:"티타임",players:"인원",fee:"그린피",caddie:"캐디"}).map(([k,l])=><label key={k}>{l}<input value={round[k]} type={k==="date"?"date":k==="time"?"time":k==="players"||k==="fee"?"number":"text"} onChange={e=>setRound({...round,[k]:e.target.value})}/></label>)}</div><p className="ok">입력값은 브라우저에 자동 저장됩니다.</p></div>}

function Caddie({course,rotation,step,setStep,tab,setTab,currentCourseName,hole,driver,remain,second,weather,clubs,memo,setMemo,score,setScore,next,prev}){
  return <div>
    <div className="tabs">{["info","rotation","score","ai","memo"].map(x=><button key={x} className={tab===x?"on":""} onClick={()=>setTab(x)}>{({info:"골프장 정보",rotation:"코스 로테이션",score:"스코어",ai:"AI 공략 추천",memo:"메모/사진"})[x]}</button>)}</div>
    <div className="rotation">{rotation.map((r,ri)=><div className={"rot "+(ri?"orange":"")} key={r}><b>{ri?"후반":"전반"} · {r}</b><div className="holes">{Array.from({length:9},(_,i)=><button key={i} className={step===ri*9+i?"on":""} onClick={()=>setStep(ri*9+i)}>{i+1}</button>)}</div></div>)}</div>
    {tab==="info" && <div className="panel"><h2>{course.name}</h2><p>{course.region} · {course.venueType}</p><p>현재 선택 코스: <b>{currentCourseName}</b></p></div>}
    {tab==="rotation" && <div className="panel"><h2>코스 로테이션</h2><p>{rotation.join(" → ")}</p><p className="warn">당일 운영에 따라 변경될 수 있으므로 스타트하우스에서 최종 확인하세요.</p></div>}
    {tab==="score" && <div className="panel"><h2>{currentCourseName} {hole?.hole}H 스코어</h2><div className="formgrid"><label>타수<input type="number" value={score.strokes} onChange={e=>setScore("strokes",e.target.value)}/></label><label>퍼트<input type="number" value={score.putts} onChange={e=>setScore("putts",e.target.value)}/></label><label>벌타<input type="number" value={score.penalty} onChange={e=>setScore("penalty",e.target.value)}/></label></div></div>}
    {tab==="ai" && hole && <div className="board"><div className="boardhead">{currentCourseName.toUpperCase()} {hole.hole}H <small>Par {hole.par} · {hole.distance||"-"}m</small></div><div className="boardbody"><HoleMap hole={hole} driver={driver}/><div className="strategy"><h3>{hole.title}</h3><p>{hole.strategy}</p><div className="chips">{hole.hazards.map(h=><span key={h}>{h}</span>)}</div><div className="recommend"><b>티샷</b> {hole.par===3?nearestClub(clubs,hole.distance):"Driver"} · 예상 {driver}m<br/><b>예상 잔여</b> {remain}m · <b>다음 추천</b> {second}<br/><b>바람</b> {weather.direction} {weather.wind}m/s</div></div></div></div>}
    {tab==="memo" && <div className="panel"><h2>홀 메모/사진</h2><textarea value={memo} onChange={e=>setMemo(e.target.value)} placeholder="핀 위치, 캐디 조언, 미스 방향 등을 기록하세요."/><input type="file" accept="image/*" onChange={e=>{if(e.target.files?.[0]) alert("사진이 선택되었습니다. 서버 저장은 추후 계정 연동 단계에서 추가합니다.");}}/></div>}
    <div className="bottomnav"><button onClick={prev} disabled={step===0}>◀ 이전 홀</button><b>{step+1}/18</b><button onClick={next} disabled={step===17}>다음 홀 ▶</button></div>
  </div>
}

function HoleMap({hole,driver}){const bend=((hole.hole%5)-2)*4;return <div className="map"><div className="water"/><div className="fair" style={{transform:`rotate(${bend}deg)`}}/><div className="green"/><div className="bunker b1"/><div className="bunker b2"/><div className="tee"/><div className="aimline"/><div className="landing" style={{bottom:`${Math.min(74,38+driver/8)}%`}}/><span className="m200">200m</span><span className="m150">150m</span></div>}

function Score({scores,setScoreField}){const total=scores.reduce((n,s)=>n+(Number(s.strokes)||0),0);return <div className="panel"><h2>18홀 스코어카드</h2><div className="scoregrid">{scores.map((s,i)=><div className="scorecell" key={i}><b>{i+1}H</b><input type="number" placeholder="타수" value={s.strokes} onChange={e=>setScoreField(i,"strokes",e.target.value)}/><input type="number" placeholder="퍼트" value={s.putts} onChange={e=>setScoreField(i,"putts",e.target.value)}/></div>)}</div><h3>합계 {total||"-"}</h3></div>}

function Courses({builtInCourses,customCourses,addCourse,setCustomCourses}){return <div className="panel"><h2>골프장 DB</h2><p>현재 기본 데이터와 사용자가 추가한 골프장을 같은 구조로 관리합니다. 향후 외부 데이터 공급자를 연결할 수 있도록 골프장과 코스를 분리했습니다.</p><div className="cards">{[...builtInCourses,...customCourses].map(c=><div className="card" key={c.id}><b>{c.name}</b><small>{c.region} · {Object.keys(c.courses||{}).join(", ")}</small>{c.id.startsWith("custom-")&&<button onClick={()=>setCustomCourses(p=>p.filter(x=>x.id!==c.id))}>삭제</button>}</div>)}</div><h3>새 골프장 추가</h3><form onSubmit={addCourse} className="formgrid"><label>골프장명<input name="name" required/></label><label>지역<input name="region"/></label><button className="primary">추가</button></form></div>}

function Swing(){const [src,setSrc]=useState("");return <div className="panel"><h2>스윙 분석</h2><input type="file" accept="video/*,image/*" onChange={e=>{const f=e.target.files?.[0];if(f)setSrc(URL.createObjectURL(f));}}/>{src&&<video className="preview" src={src} controls/>}<p className="warn">현재는 업로드·재생·메모 단계입니다. 실제 AI 자세 추정/프레임 분석 모델은 별도 연결이 필요합니다.</p></div>}

function Practice({items,setItems}){const [text,setText]=useState("");return <div className="panel"><h2>연습/코칭</h2><div className="inline"><input value={text} onChange={e=>setText(e.target.value)} placeholder="예: 드라이버 20구 우측 미스 체크"/><button className="primary" onClick={()=>{if(text.trim()){setItems([...items,{id:Date.now(),text,done:false}]);setText("");}}}>추가</button></div>{items.map(x=><label className="task" key={x.id}><input type="checkbox" checked={x.done} onChange={()=>setItems(items.map(y=>y.id===x.id?{...y,done:!y.done}:y))}/>{x.text}</label>)}</div>}

function Equipment({clubs,setClubs}){return <div className="panel"><h2>장비/클럽</h2><div className="clubgrid">{Object.entries(clubs).map(([k,v])=><label key={k}>{k}<input type="number" value={v} onChange={e=>setClubs({...clubs,[k]:Number(e.target.value)||0})}/><span>m</span></label>)}</div><p className="ok">거리 입력 즉시 AI 캐디 계산에 반영됩니다.</p></div>}

function Weather({value,setValue}){return <div className="panel"><h2>날씨/바람</h2><div className="formgrid"><label>기온<input type="number" value={value.temp} onChange={e=>setValue({...value,temp:Number(e.target.value)})}/></label><label>풍속 m/s<input type="number" value={value.wind} onChange={e=>setValue({...value,wind:Number(e.target.value)})}/></label><label>바람<select value={value.direction} onChange={e=>setValue({...value,direction:e.target.value})}><option>앞바람</option><option>뒷바람</option><option>좌→우</option><option>우→좌</option></select></label></div><p>현재 수동 입력값이 AI 캐디 화면에 반영됩니다. 실시간 기상 API는 다음 외부연동 단계에서 연결합니다.</p></div>}

function Settings({exportData,importData,reset}){return <div className="panel"><h2>설정</h2><div className="settings"><button onClick={exportData}>내 데이터 JSON 백업</button><label className="filebtn">JSON 복원<input type="file" accept=".json" onChange={e=>e.target.files?.[0]&&importData(e.target.files[0])}/></label><button className="danger" onClick={reset}>로컬 데이터 초기화</button></div></div>}
