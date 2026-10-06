"use client";

import { useEffect, useMemo, useState } from "react";
import { builtInCourses, getCourseById } from "../data/courses";

const NAV = [
  ["home","홈"],["schedule","라운드 일정"],["caddie","AI 캐디"],["score","스코어카드"],
  ["courses","골프장 DB"],["swing","스윙 분석"],["practice","연습/코칭"],["equipment","장비/클럽"],
  ["weather","날씨/GPS"],["settings","설정"]
];

const DEFAULT_CLUBS = { Driver:220,"3W":200,"5W":180,Utility:170,"5I":160,"6I":150,"7I":140,"8I":130,"9I":120,PW:105,AW:90,SW:80 };
const EMPTY_SHOTS = Array.from({length:18},()=>[]);
const MISSES = ["정타","좌","우","짧음","김","OB","해저드","벙커"];
const RELATIONS = ["자동","앞바람","뒷바람","좌→우","우→좌"];

function useStoredState(key, initial) {
  const [value,setValue] = useState(initial);
  const [ready,setReady] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) { try { setValue(JSON.parse(raw)); } catch {} }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) localStorage.setItem(key, JSON.stringify(value));
  }, [key,value,ready]);
  return [value,setValue];
}

function nearestClub(clubs, distance) {
  const valid=Object.entries(clubs).filter(([,v])=>Number(v)>0);
  return valid.sort((a,b) => Math.abs(Number(a[1])-distance)-Math.abs(Number(b[1])-distance))[0]?.[0] || "-";
}
function rad(v){return v*Math.PI/180}
function distanceMeters(a,b){
  if(!a||!b?.lat||!b?.lng)return null;
  const R=6371000,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(x)));
}
function bearing(a,b){
  if(!a||!b?.lat||!b?.lng)return null;
  const y=Math.sin(rad(b.lng-a.lng))*Math.cos(rad(b.lat));
  const x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lng-a.lng));
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function windRelation(windFrom,bearingToTarget){
  if(windFrom==null||bearingToTarget==null)return null;
  const d=((windFrom-bearingToTarget+540)%360)-180;
  const a=Math.abs(d);
  if(a<=45)return "앞바람";
  if(a>=135)return "뒷바람";
  return d>0?"우→좌":"좌→우";
}
function compass(deg){
  if(deg==null)return "-";
  const dirs=["북","북동","동","남동","남","남서","서","북서"];
  return dirs[Math.round(deg/45)%8];
}
function missProfile(shots){
  const flat=shots.flat();
  const count=(name)=>flat.filter(s=>s.miss===name).length;
  const left=count("좌"),right=count("우"),ob=count("OB"),haz=count("해저드");
  let bias="중앙";
  if(right>=left+2) bias="좌중앙";
  else if(left>=right+2) bias="우중앙";
  return {total:flat.length,left,right,ob,haz,bias};
}

export default function Page(){
  const [view,setView]=useState("caddie");
  const [clubs,setClubs]=useStoredState("golfClubsV3",DEFAULT_CLUBS);
  const [scores,setScores]=useStoredState("golfScoresV3",Array.from({length:18},()=>({strokes:"",putts:"",penalty:""})));
  const [shots,setShots]=useStoredState("golfShotsV3",EMPTY_SHOTS);
  const [customCourses,setCustomCourses]=useStoredState("golfCustomCoursesV3",[]);
  const [courseId,setCourseId]=useStoredState("golfCourseIdV3","grace-cc");
  const [step,setStep]=useState(0);
  const [tab,setTab]=useState("ai");
  const [round,setRound]=useStoredState("golfRoundV3",{date:"2026-10-19",time:"13:10",players:4,fee:150000,caddie:"정규캐디"});
  const [weather,setWeather]=useStoredState("golfWeatherV3",{temp:22,wind:2,windDeg:null,relation:"자동",source:"수동",updatedAt:""});
  const [location,setLocation]=useState(null);
  const [gpsStatus,setGpsStatus]=useState("위치 미확인");
  const [memo,setMemo]=useStoredState("golfMemoV3","");
  const [practice,setPractice]=useStoredState("golfPracticeV3",[]);

  const course=useMemo(()=>getCourseById(courseId,customCourses),[courseId,customCourses]);
  const rotation=course.defaultRotation || Object.keys(course.courses || {});
  const currentCourseName=rotation[Math.floor(step/9)] || rotation[0];
  const holeNo=(step%9)+1;
  const currentHole=course.courses?.[currentCourseName]?.[holeNo-1];
  const target=currentHole?.greenLat&&currentHole?.greenLng?{lat:Number(currentHole.greenLat),lng:Number(currentHole.greenLng)}:null;
  const gpsRemain=distanceMeters(location,target);
  const shotBearing=bearing(location,target);
  const autoRelation=windRelation(weather.windDeg,shotBearing);
  const effectiveRelation=weather.relation==="자동"?(autoRelation||"관계 미확인"):weather.relation;
  const driver=Number(clubs.Driver)||0;
  const remain=currentHole?Math.max(0,Number(currentHole.distance||0)-driver):0;
  const second=nearestClub(clubs,Math.min(190,gpsRemain??remain));
  const totalScore=scores.reduce((n,s)=>n+(Number(s.strokes)||0),0);
  const profile=useMemo(()=>missProfile(shots),[shots]);

  function setScoreField(index,key,val){ setScores(prev=>prev.map((s,i)=>i===index?{...s,[key]:val}:s)); }
  function next(){ setStep(s=>Math.min(17,s+1)); }
  function prev(){ setStep(s=>Math.max(0,s-1)); }
  function addShot(shot){ setShots(prev=>prev.map((arr,i)=>i===step?[...arr,{...shot,id:Date.now()}]:arr)); }
  function deleteShot(id){ setShots(prev=>prev.map((arr,i)=>i===step?arr.filter(x=>x.id!==id):arr)); }

  function requestLocation(onSuccess){
    if(!navigator.geolocation){setGpsStatus("이 브라우저는 GPS를 지원하지 않습니다.");return;}
    setGpsStatus("GPS 확인 중...");
    navigator.geolocation.getCurrentPosition(
      p=>{const loc={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)};setLocation(loc);setGpsStatus("GPS 연결됨");onSuccess?.(loc);},
      e=>setGpsStatus("위치 권한/신호 확인 필요: "+e.message),
      {enableHighAccuracy:true,timeout:10000,maximumAge:30000}
    );
  }
  async function fetchLiveWeather(locArg){
    const loc=locArg||location;
    if(!loc){requestLocation(fetchLiveWeather);return;}
    try{
      setGpsStatus("실시간 날씨 불러오는 중...");
      const q=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lng),current:"temperature_2m,wind_speed_10m,wind_direction_10m",wind_speed_unit:"ms",timezone:"auto"});
      const res=await fetch("https://api.open-meteo.com/v1/forecast?"+q.toString());
      if(!res.ok)throw new Error("weather "+res.status);
      const d=await res.json(),cur=d.current||{};
      setWeather(w=>({...w,temp:Number(cur.temperature_2m??w.temp),wind:Number(cur.wind_speed_10m??w.wind),windDeg:cur.wind_direction_10m==null?w.windDeg:Number(cur.wind_direction_10m),source:"실시간(Open-Meteo)",updatedAt:new Date().toLocaleTimeString("ko-KR")}));
      setGpsStatus("GPS·날씨 연결됨");
    }catch(e){setGpsStatus("날씨 연결 실패: "+e.message)}
  }

  function addCourse(e){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const name=String(fd.get("name")||"").trim(), region=String(fd.get("region")||"").trim();
    if(!name)return;
    const id="custom-"+Date.now();
    const mk=(label)=>Array.from({length:9},(_,i)=>({hole:i+1,par:4,distance:0,title:label+" "+(i+1)+"H",hazards:[],strategy:"홀 정보를 입력해 주세요.",greenLat:"",greenLng:"",map:{bend:0,water:"none"}}));
    setCustomCourses(prev=>[...prev,{id,name,region,venueType:"사용자 추가",defaultRotation:["Course A","Course B"],courses:{"Course A":mk("Course A"),"Course B":mk("Course B")}}]);
    setCourseId(id);setStep(0);e.currentTarget.reset();
  }
  function updateCustomHole(courseName,index,patch){
    setCustomCourses(prev=>prev.map(c=>c.id!==courseId?c:{...c,courses:{...c.courses,[courseName]:c.courses[courseName].map((h,i)=>i===index?{...h,...patch}:h)}}));
  }

  function exportData(){
    const blob=new Blob([JSON.stringify({customCourses,clubs,scores,shots,round,weather},null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="golf-ai-data.json"; a.click(); URL.revokeObjectURL(a.href);
  }
  function importData(file){
    const r=new FileReader(); r.onload=()=>{try{const d=JSON.parse(r.result);if(d.customCourses)setCustomCourses(d.customCourses);if(d.clubs)setClubs(d.clubs);if(d.scores)setScores(d.scores);if(d.shots)setShots(d.shots);if(d.round)setRound(d.round);if(d.weather)setWeather(d.weather);}catch{alert("JSON 파일을 확인해 주세요.");}};r.readAsText(file);
  }

  return <div className="shell">
    <aside className="side">
      <div className="logo">⛳ Golf AI<small>LIVE CADDIE & COACH</small></div>
      <div className="nav">{NAV.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</div>
      <div className="clubmini"><b>내 클럽 거리</b>{Object.entries(clubs).map(([k,v])=><span key={k}>{k}<em>{v}m</em></span>)}</div>
      <div className="clubmini"><b>누적 미스</b><span>좌<em>{profile.left}</em></span><span>우<em>{profile.right}</em></span><span>OB<em>{profile.ob}</em></span><span>AI 목표<em>{profile.bias}</em></span></div>
    </aside>

    <main className="main">
      <header className="top">
        <div className="date">{round.date}<b>{round.time}</b></div>
        <div className="title">{course.name}<small>{course.region}</small></div>
        <div className="stat">인원<b>{round.players}인</b></div>
        <div className="stat">그린피<b>{Number(round.fee).toLocaleString()}원</b></div>
        <div className="stat">GPS<b>{location?"ON":"OFF"}</b></div>
        <select aria-label="골프장 선택" value={courseId} onChange={e=>{setCourseId(e.target.value);setStep(0);}}>{[...builtInCourses,...customCourses].map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </header>

      <section className="view">
        {view==="home" && <Home round={round} course={course} totalScore={totalScore} profile={profile} setView={setView}/>}
        {view==="schedule" && <Schedule round={round} setRound={setRound}/>}
        {view==="caddie" && <Caddie course={course} rotation={rotation} step={step} setStep={setStep} tab={tab} setTab={setTab} currentCourseName={currentCourseName} hole={currentHole} driver={driver} remain={gpsRemain??remain} second={second} weather={weather} relation={effectiveRelation} clubs={clubs} memo={memo} setMemo={setMemo} score={scores[step]} setScore={(k,v)=>setScoreField(step,k,v)} shots={shots[step]} addShot={addShot} deleteShot={deleteShot} profile={profile} location={location} target={target} gpsStatus={gpsStatus} requestLocation={requestLocation} fetchLiveWeather={fetchLiveWeather} next={next} prev={prev}/>}
        {view==="score" && <Score scores={scores} setScoreField={setScoreField} shots={shots}/>}
        {view==="courses" && <Courses allCourses={[...builtInCourses,...customCourses]} customCourses={customCourses} addCourse={addCourse} setCustomCourses={setCustomCourses} courseId={courseId} setCourseId={setCourseId} course={course} rotation={rotation} currentCourseName={currentCourseName} holeNo={holeNo} updateCustomHole={updateCustomHole} setStep={setStep}/>}
        {view==="swing" && <Swing/>}
        {view==="practice" && <Practice items={practice} setItems={setPractice}/>}
        {view==="equipment" && <Equipment clubs={clubs} setClubs={setClubs}/>}
        {view==="weather" && <Weather value={weather} setValue={setWeather} location={location} gpsStatus={gpsStatus} requestLocation={requestLocation} fetchLiveWeather={fetchLiveWeather}/>}
        {view==="settings" && <Settings exportData={exportData} importData={importData} reset={()=>{if(confirm("저장 데이터를 초기화할까요?")){localStorage.clear();location.reload();}}}/>}
      </section>
    </main>
  </div>
}

function Home({round,course,totalScore,profile,setView}){return <div className="panel"><h2>라운드 대시보드</h2><div className="cards"><Card t="다음 라운드" v={round.date+" "+round.time}/><Card t="골프장" v={course.name}/><Card t="현재 입력 스코어" v={totalScore||"-"}/><Card t="기록 샷" v={profile.total+"개"}/><Card t="좌/우 미스" v={profile.left+" / "+profile.right}/><Card t="AI 기본 목표" v={profile.bias}/></div><button className="primary" onClick={()=>setView("caddie")}>AI 캐디 시작</button></div>}
function Card({t,v}){return <div className="card"><small>{t}</small><b>{v}</b></div>}
function Schedule({round,setRound}){return <div className="panel"><h2>라운드 일정</h2><div className="formgrid">{Object.entries({date:"날짜",time:"티타임",players:"인원",fee:"그린피",caddie:"캐디"}).map(([k,l])=><label key={k}>{l}<input value={round[k]} type={k==="date"?"date":k==="time"?"time":k==="players"||k==="fee"?"number":"text"} onChange={e=>setRound({...round,[k]:e.target.value})}/></label>)}</div><p className="ok">입력값은 자동 저장됩니다.</p></div>}

function Caddie({course,rotation,step,setStep,tab,setTab,currentCourseName,hole,driver,remain,second,weather,relation,clubs,memo,setMemo,score,setScore,shots,addShot,deleteShot,profile,location,target,gpsStatus,requestLocation,fetchLiveWeather,next,prev}){
  return <div>
    <div className="tabs">{["info","rotation","score","ai","shots","memo"].map(x=><button key={x} className={tab===x?"on":""} onClick={()=>setTab(x)}>{({info:"골프장 정보",rotation:"코스 로테이션",score:"스코어",ai:"AI 공략",shots:"샷 기록",memo:"메모/사진"})[x]}</button>)}</div>
    <div className="rotation">{rotation.map((r,ri)=><div className={"rot "+(ri?"orange":"")} key={r}><b>{ri?"후반":"전반"} · {r}</b><div className="holes">{Array.from({length:9},(_,i)=><button key={i} className={step===ri*9+i?"on":""} onClick={()=>setStep(ri*9+i)}>{i+1}</button>)}</div></div>)}</div>

    {tab==="info" && <div className="panel"><h2>{course.name}</h2><p>{course.region} · {course.venueType}</p><p>현재 선택 코스: <b>{currentCourseName}</b></p><p className="warn">지도는 공략용 개념도입니다. 정확한 GPS 잔여거리는 홀별 그린 좌표가 등록된 경우에만 계산합니다.</p></div>}
    {tab==="rotation" && <div className="panel"><h2>코스 로테이션</h2><p>{rotation.join(" → ")}</p><p className="warn">당일 운영에 따라 변경될 수 있으므로 스타트하우스에서 최종 확인하세요.</p></div>}
    {tab==="score" && <div className="panel"><h2>{currentCourseName} {hole?.hole}H 스코어</h2><div className="formgrid"><label>타수<input type="number" value={score.strokes} onChange={e=>setScore("strokes",e.target.value)}/></label><label>퍼트<input type="number" value={score.putts} onChange={e=>setScore("putts",e.target.value)}/></label><label>벌타<input type="number" value={score.penalty} onChange={e=>setScore("penalty",e.target.value)}/></label></div></div>}

    {tab==="ai" && hole && <div className="board">
      <div className="boardhead">{currentCourseName.toUpperCase()} {hole.hole}H <small>Par {hole.par} · {hole.distance||"-"}m</small></div>
      <div className="livebar"><button onClick={()=>requestLocation()}>GPS 현재위치</button><button onClick={()=>fetchLiveWeather()}>실시간 날씨</button><span>{gpsStatus}</span><span>{location?location.lat.toFixed(5)+", "+location.lng.toFixed(5):"좌표 없음"}</span></div>
      <div className="boardbody"><HoleMap hole={hole} driver={driver} profile={profile}/><div className="strategy"><h3>{hole.title}</h3><p>{hole.strategy}</p><div className="chips">{(hole.hazards||[]).map(h=><span key={h}>{h}</span>)}</div>
        <div className="recommend"><b>AI 목표</b> {profile.bias} · 누적 우미스 {profile.right} / 좌미스 {profile.left}<br/><b>티샷</b> {hole.par===3?nearestClub(clubs,Number(remain||hole.distance)):"Driver"} · 기준 {driver}m<br/><b>{target&&location?"GPS 잔여":"예상 잔여"}</b> {Number(remain||0)}m · <b>다음 추천</b> {second}<br/><b>바람</b> {weather.source} · {compass(weather.windDeg)} {weather.wind}m/s · {relation}</div>
        {!target&&<div className="riskwarn">이 홀의 정확한 그린 GPS 좌표는 아직 등록되지 않았습니다. 골프장 DB에서 좌표를 넣으면 실시간 잔여거리와 바람방향 계산이 활성화됩니다.</div>}
      </div></div>
    </div>}

    {tab==="shots" && <ShotLog hole={hole} shots={shots} clubs={clubs} addShot={addShot} deleteShot={deleteShot}/>}
    {tab==="memo" && <div className="panel"><h2>홀 메모/사진</h2><textarea value={memo} onChange={e=>setMemo(e.target.value)} placeholder="핀 위치, 캐디 조언, 미스 방향 등을 기록하세요."/><input type="file" accept="image/*" onChange={e=>{if(e.target.files?.[0])alert("사진이 선택되었습니다. 현재는 기기 내 선택 단계이며 서버 저장은 계정 연동 단계에서 추가합니다.");}}/></div>}
    <div className="bottomnav"><button onClick={prev} disabled={step===0}>◀ 이전 홀</button><b>{step+1}/18</b><button onClick={next} disabled={step===17}>다음 홀 ▶</button></div>
  </div>
}

function HoleMap({hole,driver,profile}){
  const map=hole.map||{},bend=Number(map.bend??((hole.hole%5)-2)*4), water=map.water||"right";
  return <div className="map"><div className={"water "+(water==="left"?"left":"")+(water==="none"?" none":"")}/><div className="fair" style={{transform:`rotate(${bend}deg)`}}/><div className="green"/><div className="bunker b1"/><div className="bunker b2"/><div className="tee"/><div className="aimline" style={{transform:`rotate(${profile.bias==="좌중앙"?-5:profile.bias==="우중앙"?5:0}deg)`}}/><div className="landing" style={{bottom:`${Math.min(74,38+driver/8)}%`}}/><span className="mapnote">공략 개념도</span><span className="m200">200m</span><span className="m150">150m</span></div>
}

function ShotLog({hole,shots,clubs,addShot,deleteShot}){
  const [club,setClub]=useState("Driver"),[distance,setDistance]=useState(""),[miss,setMiss]=useState("정타"),[note,setNote]=useState("");
  return <div className="panel"><h2>{hole?.hole}H 샷 기록</h2><div className="formgrid"><label>클럽<select value={club} onChange={e=>setClub(e.target.value)}>{Object.keys(clubs).map(c=><option key={c}>{c}</option>)}</select></label><label>실제 거리(m)<input aria-label="실제 거리(m)" type="number" value={distance} onChange={e=>setDistance(e.target.value)}/></label><label>결과<select aria-label="샷 결과" value={miss} onChange={e=>setMiss(e.target.value)}>{MISSES.map(m=><option key={m}>{m}</option>)}</select></label><label className="wide">메모<input value={note} onChange={e=>setNote(e.target.value)} placeholder="예: 우측 러프, 약한 페이드"/></label><button className="primary" onClick={()=>{addShot({club,distance:Number(distance)||0,miss,note,at:new Date().toISOString()});setDistance("");setNote("");}}>샷 추가</button></div><div className="shotlist">{shots.length===0?<p>아직 기록된 샷이 없습니다.</p>:shots.map((s,i)=><div className="shotrow" key={s.id}><b>{i+1}타 · {s.club}</b><span>{s.distance||"-"}m · {s.miss} {s.note&&"· "+s.note}</span><button onClick={()=>deleteShot(s.id)}>삭제</button></div>)}</div></div>
}

function Score({scores,setScoreField,shots}){const total=scores.reduce((n,s)=>n+(Number(s.strokes)||0),0);return <div className="panel"><h2>18홀 스코어카드</h2><div className="scoregrid">{scores.map((s,i)=><div className="scorecell" key={i}><b>{i+1}H <small>{shots[i]?.length||0}샷기록</small></b><input type="number" placeholder="타수" value={s.strokes} onChange={e=>setScoreField(i,"strokes",e.target.value)}/><input type="number" placeholder="퍼트" value={s.putts} onChange={e=>setScoreField(i,"putts",e.target.value)}/><input type="number" placeholder="벌타" value={s.penalty} onChange={e=>setScoreField(i,"penalty",e.target.value)}/></div>)}</div><h3>합계 {total||"-"}</h3></div>}

function Courses({allCourses,customCourses,addCourse,setCustomCourses,courseId,setCourseId,course,rotation,currentCourseName,holeNo,updateCustomHole,setStep}){
  const [q,setQ]=useState("");
  const filtered=allCourses.filter(c=>(c.name+" "+c.region).toLowerCase().includes(q.toLowerCase()));
  const editable=courseId.startsWith("custom-");
  const h=course.courses?.[currentCourseName]?.[holeNo-1];
  return <div className="panel"><h2>골프장 DB</h2><div className="inline"><input aria-label="골프장 검색" value={q} onChange={e=>setQ(e.target.value)} placeholder="골프장명·지역 검색"/><span className="badge">{filtered.length}개</span></div><div className="cards">{filtered.map(c=><div className={"card "+(c.id===courseId?"selected":"")} key={c.id}><b>{c.name}</b><small>{c.region} · {Object.keys(c.courses||{}).join(", ")}</small><button onClick={()=>{setCourseId(c.id);setStep(0);}}>선택</button>{c.id.startsWith("custom-")&&<button onClick={()=>setCustomCourses(p=>p.filter(x=>x.id!==c.id))}>삭제</button>}</div>)}</div>
    <h3>새 골프장 추가</h3><form onSubmit={addCourse} className="formgrid"><label>골프장명<input name="name" required/></label><label>지역<input name="region"/></label><button className="primary">추가 후 선택</button></form>
    <hr/><h3>선택 골프장 홀 데이터 편집</h3>{!editable?<p className="warn">기본 제공 골프장은 보호됩니다. 다른 골프장은 새 골프장으로 추가한 뒤 홀별 거리·전략·GPS 좌표를 입력할 수 있습니다.</p>:<><div className="rotation">{rotation.map((r,ri)=><div className={"rot "+(ri?"orange":"")} key={r}><b>{r}</b><div className="holes">{Array.from({length:9},(_,i)=><button key={i} onClick={()=>setStep(ri*9+i)} className={currentCourseName===r&&holeNo===i+1?"on":""}>{i+1}</button>)}</div></div>)}</div>{h&&<div className="formgrid"><label>Par<input aria-label="홀 Par" type="number" value={h.par} onChange={e=>updateCustomHole(currentCourseName,holeNo-1,{par:Number(e.target.value)})}/></label><label>거리(m)<input aria-label="홀 거리" type="number" value={h.distance} onChange={e=>updateCustomHole(currentCourseName,holeNo-1,{distance:Number(e.target.value)})}/></label><label>홀 제목<input aria-label="홀 제목" value={h.title} onChange={e=>updateCustomHole(currentCourseName,holeNo-1,{title:e.target.value})}/></label><label className="wide">위험요소(쉼표)<input aria-label="위험요소" value={(h.hazards||[]).join(",")} onChange={e=>updateCustomHole(currentCourseName,holeNo-1,{hazards:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></label><label className="wide">공략전략<input aria-label="공략전략" value={h.strategy} onChange={e=>updateCustomHole(currentCourseName,holeNo-1,{strategy:e.target.value})}/></label><label>그린 위도<input aria-label="그린 위도" value={h.greenLat||""} onChange={e=>updateCustomHole(currentCourseName,holeNo-1,{greenLat:e.target.value})}/></label><label>그린 경도<input aria-label="그린 경도" value={h.greenLng||""} onChange={e=>updateCustomHole(currentCourseName,holeNo-1,{greenLng:e.target.value})}/></label></div>}</>}
  </div>
}

function Swing(){const [src,setSrc]=useState("");return <div className="panel"><h2>스윙 분석</h2><input type="file" accept="video/*,image/*" onChange={e=>{const f=e.target.files?.[0];if(f)setSrc(URL.createObjectURL(f));}}/>{src&&<video className="preview" src={src} controls/>}<p className="warn">업로드·재생까지 동작합니다. 실제 자세추정/AI 프레임 분석 모델은 별도 서버 연결 단계입니다.</p></div>}
function Practice({items,setItems}){const [text,setText]=useState("");return <div className="panel"><h2>연습/코칭</h2><div className="inline"><input value={text} onChange={e=>setText(e.target.value)} placeholder="예: 드라이버 20구 우측 미스 체크"/><button className="primary" onClick={()=>{if(text.trim()){setItems([...items,{id:Date.now(),text,done:false}]);setText("");}}}>추가</button></div>{items.map(x=><label className="task" key={x.id}><input type="checkbox" checked={x.done} onChange={()=>setItems(items.map(y=>y.id===x.id?{...y,done:!y.done}:y))}/>{x.text}</label>)}</div>}
function Equipment({clubs,setClubs}){return <div className="panel"><h2>장비/클럽</h2><div className="clubgrid">{Object.entries(clubs).map(([k,v])=><label key={k}>{k}<input type="number" value={v} onChange={e=>setClubs({...clubs,[k]:Number(e.target.value)||0})}/><span>m</span></label>)}</div><p className="ok">거리 입력 즉시 AI 캐디의 추천 클럽과 랜딩존 계산에 반영됩니다.</p></div>}

function Weather({value,setValue,location,gpsStatus,requestLocation,fetchLiveWeather}){return <div className="panel"><h2>날씨/GPS</h2><div className="liveweather"><button className="primary" onClick={()=>requestLocation()}>현재 GPS 받기</button><button className="primary" onClick={()=>fetchLiveWeather()}>GPS로 실시간 날씨 갱신</button><span>{gpsStatus}</span></div>{location&&<p>현재 위치: {location.lat.toFixed(6)}, {location.lng.toFixed(6)} · 정확도 약 {location.accuracy}m</p>}<div className="formgrid"><label>기온<input type="number" value={value.temp} onChange={e=>setValue({...value,temp:Number(e.target.value),source:"수동"})}/></label><label>풍속 m/s<input type="number" value={value.wind} onChange={e=>setValue({...value,wind:Number(e.target.value),source:"수동"})}/></label><label>풍향(도)<input type="number" value={value.windDeg??""} onChange={e=>setValue({...value,windDeg:e.target.value===""?null:Number(e.target.value),source:"수동"})}/></label><label>샷 대비 바람<select value={value.relation} onChange={e=>setValue({...value,relation:e.target.value})}>{RELATIONS.map(x=><option key={x}>{x}</option>)}</select></label></div><p><b>{value.source}</b> · {value.temp}℃ · {compass(value.windDeg)}풍 {value.wind}m/s {value.updatedAt&&"· "+value.updatedAt+" 갱신"}</p><p className="warn">브라우저 위치 권한을 허용해야 GPS가 동작합니다. 홀 그린 좌표가 등록되면 잔여거리와 샷 대비 바람 방향을 자동 계산합니다.</p></div>}

function Settings({exportData,importData,reset}){return <div className="panel"><h2>설정</h2><div className="settings"><button onClick={exportData}>내 데이터 JSON 백업</button><label className="filebtn">JSON 복원<input type="file" accept=".json" onChange={e=>e.target.files?.[0]&&importData(e.target.files[0])}/></label><button className="danger" onClick={reset}>로컬 데이터 초기화</button></div><p>골프장 DB, 클럽거리, 스코어, 샷 결과, 라운드 일정, 날씨 설정을 함께 백업합니다.</p></div>}
