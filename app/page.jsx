"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { builtInCourses, getCourseById } from "../data/courses";
import { SATELLITE_MAPS } from "../data/satelliteMaps";
import ShortGameAcademy, { getShortGameAdvice } from "./ShortGameAcademy";
import { strategyOptions, defaultClubStats } from "./strategyEngine";
import { learnClubStats, parseGolfzonText, parseGolfzonFile } from "./learningEngine";
import { shortGameMatrix, weaknessMissions, labelLie, personalShortGameChoice } from "./practiceEngine";
import { alignmentGrade, alignmentLesson } from "./alignmentEngine";
import CameraAlignmentCoach from "./CameraAlignmentCoach";

const NAV=[
  ["home","⌂","홈"],["schedule","▣","라운드 일정"],["caddie","♟","AI 캐디"],["score","▤","스코어카드"],
  ["courses","♙","골프장 DB"],["swing","♧","스윙 분석"],["shortgame","◎","상황별 공략·어프로치"],["practice","⚯","연습/코칭"],["equipment","⌕","장비/클럽"],
  ["weather","☀","날씨/바람"],["settings","⚙","설정"]
];
const DEFAULT_CLUBS={Driver:220,"3W":200,"5W":180,Utility:170,"5I":160,"6I":150,"7I":140,"8I":130,"9I":120,PW:105,AW:90,SW:80};
const MISSES=["정타","좌","우","짧음","김","OB","해저드","벙커"];
const RELATIONS=["자동","앞바람","뒷바람","좌→우","우→좌"];

function useStoredState(key,initial){
  const [value,setValue]=useState(initial);
  const [ready,setReady]=useState(false);
  useEffect(()=>{const raw=localStorage.getItem(key);if(raw){try{setValue(JSON.parse(raw))}catch{}}setReady(true)},[key]);
  useEffect(()=>{if(ready)localStorage.setItem(key,JSON.stringify(value))},[key,value,ready]);
  return [value,setValue];
}
function nearestClub(clubs,distance){
  return Object.entries(clubs).filter(([,v])=>Number(v)>0).sort((a,b)=>Math.abs(Number(a[1])-distance)-Math.abs(Number(b[1])-distance))[0]?.[0]||"-";
}
function rad(v){return v*Math.PI/180}
function distanceMeters(a,b){
  if(!a||!b?.lat||!b?.lng)return null;
  const R=6371000,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
   const y=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(y)));
}
function bearing(a,b){
  if(!a||!b?.lat||!b?.lng)return null;
  const y=Math.sin(rad(b.lng-a.lng))*Math.cos(rad(b.lat));
  const x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lng-a.lng));
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function windRelation(windFrom,bearingToTarget){
  if(windFrom==null||bearingToTarget==null)return null;
  const d=((windFrom-bearingToTarget+540)%360)-180,a=Math.abs(d);
  if(a<=45)return"앞바람";if(a>=135)return"뒷바람";return d>0?"우→좌":"좌→우";
}
function compass(deg){if(deg==null)return"-";return["북","북동","동","남동","남","남서","서","북서"][Math.round(deg/45)%8]}
function missProfile(shots){
  const flat=shots.flat(),count=n=>flat.filter(s=>s.miss===n).length;
  const left=count("좌"),right=count("우"),ob=count("OB"),haz=count("해저드");
  return{total:flat.length,left,right,ob,haz,bias:right>=left+2?"좌중앙":left>=right+2?"우중앙":"중앙"};
}
function currentStepFor(courseIndex,holeIndex){return courseIndex*9+holeIndex}

export default function Page(){
  const [view,setView]=useState("caddie");
  const [clubs,setClubs]=useStoredState("golfClubsV3",DEFAULT_CLUBS);
  const [clubStats,setClubStats]=useStoredState("golfClubStatsV1",defaultClubStats(DEFAULT_CLUBS));
  const [scores,setScores]=useStoredState("golfScoresV3",Array.from({length:18},()=>({strokes:"",putts:"",penalty:""})));
  const [shots,setShots]=useStoredState("golfShotsV3",Array.from({length:18},()=>[]));
  const [customCourses,setCustomCourses]=useStoredState("golfCustomCoursesV3",[]);
  const [courseId,setCourseId]=useStoredState("golfCourseIdV3","grace-cc");
  const [step,setStep]=useState(0);
  const [round,setRound]=useStoredState("golfRoundV3",{date:"2026-10-19",time:"13:10",players:4,fee:150000,caddie:"정규캐디"});
  const [weather,setWeather]=useStoredState("golfWeatherV3",{temp:22,wind:2,windDeg:null,relation:"자동",source:"수동",updatedAt:""});
  const [location,setLocation]=useState(null);
  const gpsWatch=useRef(null);
  const [gpsStatus,setGpsStatus]=useState("위치 미확인");
  const [memo,setMemo]=useStoredState("golfMemoV3","");
  const [practice,setPractice]=useStoredState("golfPracticeV3",[]);
  const course=useMemo(()=>getCourseById(courseId,customCourses),[courseId,customCourses]);
  const rotation=course.defaultRotation||Object.keys(course.courses||{});
  const profile=useMemo(()=>missProfile(shots),[shots]);
  const totalScore=scores.reduce((n,s)=>n+(Number(s.strokes)||0),0);
  const learnedStats=useMemo(()=>learnClubStats(clubs,clubStats,shots),[clubs,clubStats,shots]);
  const shortMatrix=useMemo(()=>shortGameMatrix(shots.flat()),[shots]);
  const autoMissions=useMemo(()=>weaknessMissions(shortMatrix),[shortMatrix]);

  function setScoreField(index,key,val){setScores(p=>p.map((s,i)=>i===index?{...s,[key]:val}:s))}
  function addShot(index,shot){setShots(p=>{const next=p.map((arr,i)=>i===index?[...arr,{...shot,id:Date.now()}]:arr);setClubStats(old=>learnClubStats(clubs,old,next));return next})}
  function importGolfzon(text,fileName=""){const rows=fileName?parseGolfzonFile(fileName,text):parseGolfzonText(text);if(!rows.length)return 0;setShots(p=>{const next=p.map((arr,i)=>i===0?[...arr,...rows.map((x,j)=>({...x,id:Date.now()+j}))]:arr);setClubStats(old=>learnClubStats(clubs,old,next));return next});return rows.length}
  function deleteShot(index,id){setShots(p=>p.map((arr,i)=>i===index?arr.filter(x=>x.id!==id):arr))}
  function requestLocation(onSuccess){
    if(!navigator.geolocation){setGpsStatus("이 브라우저는 GPS를 지원하지 않습니다.");return}
    setGpsStatus("GPS 확인 중...");
    navigator.geolocation.getCurrentPosition(
      p=>{const loc={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)};setLocation(loc);setGpsStatus("GPS 연결됨");onSuccess?.(loc)},
      e=>setGpsStatus("위치 권한/신호 확인 필요: "+e.message),
      {enableHighAccuracy:true,timeout:10000,maximumAge:30000}
    );
  }
  function startLiveLocation(){if(!navigator.geolocation){setGpsStatus("이 브라우저는 GPS를 지원하지 않습니다.");return}if(gpsWatch.current!=null)return;setGpsStatus("실시간 GPS 연결 중...");gpsWatch.current=navigator.geolocation.watchPosition(p=>{setLocation({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)});setGpsStatus("실시간 GPS 연결됨")},e=>setGpsStatus("위치 권한/신호 확인 필요: "+e.message),{enableHighAccuracy:true,maximumAge:3000,timeout:15000})}
  function stopLiveLocation(){if(gpsWatch.current!=null&&navigator.geolocation){navigator.geolocation.clearWatch(gpsWatch.current);gpsWatch.current=null}setGpsStatus("실시간 GPS 정지")}
  useEffect(()=>()=>{if(gpsWatch.current!=null&&navigator.geolocation)navigator.geolocation.clearWatch(gpsWatch.current)},[]);
  async function fetchLiveWeather(locArg){
    const loc=locArg||location;if(!loc){requestLocation(fetchLiveWeather);return}
    try{
      setGpsStatus("실시간 날씨 불러오는 중...");
      const q=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lng),current:"temperature_2m,wind_speed_10m,wind_direction_10m",wind_speed_unit:"ms",timezone:"auto"});
      const res=await fetch("https://api.open-meteo.com/v1/forecast?"+q);if(!res.ok)throw new Error(String(res.status));
      const d=await res.json(),cur=d.current||{};
      setWeather(w=>({...w,temp:Number(cur.temperature_2m??w.temp),wind:Number(cur.wind_speed_10m??w.wind),windDeg:cur.wind_direction_10m==null?w.windDeg:Number(cur.wind_direction_10m),source:"실시간",updatedAt:new Date().toLocaleTimeString("ko-KR")}));
      setGpsStatus("GPS·날씨 연결됨");
    }catch(e){setGpsStatus("날씨 연결 실패: "+e.message)}
  }
  function addCourse(e){
    e.preventDefault();const fd=new FormData(e.currentTarget),name=String(fd.get("name")||"").trim(),region=String(fd.get("region")||"").trim();if(!name)return;
    const id="custom-"+Date.now(),mk=label=>Array.from({length:9},(_,i)=>({hole:i+1,par:4,distance:0,title:label+" "+(i+1)+"H",hazards:[],strategy:"홀 정보를 입력해 주세요.",greenLat:"",greenLng:"",map:{bend:0,water:"none"}}));
    setCustomCourses(p=>[...p,{id,name,region,venueType:"사용자 추가",defaultRotation:["Course A","Course B"],courses:{"Course A":mk("Course A"),"Course B":mk("Course B")}}]);setCourseId(id);setStep(0);e.currentTarget.reset();
  }
  function updateCustomHole(courseName,index,patch){setCustomCourses(p=>p.map(c=>c.id!==courseId?c:{...c,courses:{...c.courses,[courseName]:c.courses[courseName].map((h,i)=>i===index?{...h,...patch}:h)}}))}
  function exportData(){
    const blob=new Blob([JSON.stringify({customCourses,clubs,scores,shots,round,weather},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="golf-ai-data.json";a.click();URL.revokeObjectURL(a.href);
  }
  function importData(file){
    const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.customCourses)setCustomCourses(d.customCourses);if(d.clubs)setClubs(d.clubs);if(d.scores)setScores(d.scores);if(d.shots)setShots(d.shots);if(d.round)setRound(d.round);if(d.weather)setWeather(d.weather)}catch{alert("JSON 파일을 확인해 주세요.")}};r.readAsText(file);
  }

  return <div className="shell">
    <aside className="side">
      <div className="logo"><span className="golfer">⛳</span><b>Golf <i>AI</i></b><small>AI CADDIE & COACH</small></div>
      <nav className="nav">{NAV.map(([id,icon,label])=><button key={id} aria-label={label} className={view===id?"active":""} onClick={()=>setView(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>
      <div className="clubmini"><div className="miniTitle">◉ 내 클럽 거리 (평균)</div>{Object.entries(clubs).map(([k,v])=><span key={k}>{k}<em>{v}m</em></span>)}<button onClick={()=>setView("equipment")}>클럽 거리 설정</button></div>
      <div className="version">Golf AI v1.0</div>
    </aside>

    <main className="main">
      <header className="top">
        <div className="dateBox"><strong>{round.date}</strong><b>D-12</b></div>
        <div className="courseThumb" aria-hidden="true" style={{backgroundImage:`url(${SATELLITE_MAPS.lake})`}}/>
        <div className="title">{course.name}<small>{course.region}</small></div>
        <div className="stat">티타임<b>{round.time}</b></div>
        <div className="stat">인원<b>{round.players}인</b></div>
        <div className="stat">그린피<b>{Number(round.fee).toLocaleString()}원</b></div>
        <div className="stat">캐디<b>{round.caddie}</b></div>
        <div className="weatherTop">☀️ <span>청도 날씨 (예보)<b>{weather.temp}° / 바람 {weather.wind}m/s</b></span></div>
        <select aria-label="골프장 선택" value={courseId} onChange={e=>{setCourseId(e.target.value);setStep(0)}}>{[...builtInCourses,...customCourses].map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </header>

      <section className="view">
        {view==="home"&&<Home round={round} course={course} totalScore={totalScore} profile={profile} setView={setView}/>}
        {view==="schedule"&&<Schedule round={round} setRound={setRound}/>}
        {view==="caddie"&&<CaddieDashboard course={course} rotation={rotation} step={step} setStep={setStep} clubs={clubs} clubStats={clubStats} shortMatrix={shortMatrix} scores={scores} shots={shots} setScoreField={setScoreField} addShot={addShot} deleteShot={deleteShot} profile={profile} weather={weather} location={location} gpsStatus={gpsStatus} requestLocation={requestLocation} startLiveLocation={startLiveLocation} stopLiveLocation={stopLiveLocation} fetchLiveWeather={fetchLiveWeather} memo={memo} setMemo={setMemo} setView={setView}/>}
        {view==="score"&&<Score scores={scores} setScoreField={setScoreField} shots={shots}/>}
        {view==="courses"&&<Courses allCourses={[...builtInCourses,...customCourses]} customCourses={customCourses} addCourse={addCourse} setCustomCourses={setCustomCourses} courseId={courseId} setCourseId={setCourseId} course={course} rotation={rotation} updateCustomHole={updateCustomHole} setStep={setStep}/>}
        {view==="swing"&&<Swing/>}
        {view==="shortgame"&&<ShortGameAcademy/>}
        {view==="practice"&&<Practice items={practice} setItems={setPractice} autoMissions={autoMissions} matrix={shortMatrix} addShot={shot=>addShot(0,shot)}/>}
        {view==="equipment"&&<Equipment clubs={clubs} setClubs={setClubs} clubStats={clubStats} setClubStats={setClubStats} learnedStats={learnedStats} importGolfzon={importGolfzon}/>}
        {view==="weather"&&<Weather value={weather} setValue={setWeather} location={location} gpsStatus={gpsStatus} requestLocation={requestLocation} fetchLiveWeather={fetchLiveWeather}/>}
        {view==="settings"&&<Settings exportData={exportData} importData={importData} reset={()=>{if(confirm("저장 데이터를 초기화할까요?")){localStorage.clear();location.reload()}}}/>}
      </section>
    </main>
  </div>
}

function CaddieDashboard({course,rotation,step,setStep,clubs,clubStats,shortMatrix,scores,shots,setScoreField,addShot,deleteShot,profile,weather,location,gpsStatus,requestLocation,startLiveLocation,stopLiveLocation,fetchLiveWeather,memo,setMemo,setView}){
  const [mode,setMode]=useState("live");
  const [selected,setSelected]=useState({0:0,1:0});
  const [panelTabs,setPanelTabs]=useState({0:"info",1:"info"});
  const [showAll,setShowAll]=useState(false);
  const names=rotation.slice(0,2);
  const setHole=(ci,hi)=>{setSelected(s=>({...s,[ci]:hi}));setStep(currentStepFor(ci,hi))};
  const nextPanel=(ci)=>{const n=Math.min(8,(selected[ci]||0)+1);setHole(ci,n)};
  const currentGlobal=Math.min(17,Math.max(0,step));

  return <div className="caddieScreen">
    <div className="modeTabs">
      <button className={mode==="live"?"active live":""} onClick={()=>setMode("live")}><b>실전 18홀 모드</b><small>{names[0]} 1~9 → {names[1]} 1~9</small></button>
      <button className={mode==="info"?"active":""} onClick={()=>setMode("info")}>골프장 정보</button>
      <button className={mode==="rotation"?"active":""} onClick={()=>setMode("rotation")}>코스 로테이션</button>
      <button onClick={()=>setView("score")}>스코어카드</button>
      <button className={mode==="ai"?"active":""} onClick={()=>setMode("ai")}>AI 공략 추천</button>
      <button onClick={()=>setView("equipment")}>클럽 추천</button>
      <button className={mode==="memo"?"active":""} onClick={()=>setMode("memo")}>메모/사진</button>
    </div>

    <div className="courseStrips">
      {names.map((name,ci)=><div className={"courseStrip "+(ci===1?"mountain":"lake")} key={name} style={{backgroundImage:`linear-gradient(90deg,${ci===1?"rgba(166,60,5,.96)":"rgba(5,77,156,.96)"} 0 44%,rgba(0,0,0,.18) 44% 100%),url(${ci===1?SATELLITE_MAPS.mountain:SATELLITE_MAPS.lake})`}}>
        <div className="stripTitle">{ci===0?"전반":"후반"} <b>{name.toUpperCase()} 코스</b> <small>(Par 36)</small></div>
        <div className="stripHoles">{Array.from({length:9},(_,i)=><button key={i} className={selected[ci]===i?"on":""} onClick={()=>setHole(ci,i)}>{i+1}</button>)}</div>
      </div>)}
      <div className="rotationGuide"><b>코스 로테이션 안내</b><strong>{names[0]} 시작 → 후반 <span>{names[1]}</span></strong><small>당일 운영에 따라 변경될 수 있어 스타트하우스에서 최종 확인하세요.</small></div>
    </div>

    {mode==="info"&&<div className="panel infoBanner"><h2>{course.name}</h2><p>{course.region} · {course.venueType}</p><p>현재 등록 코스: {Object.keys(course.courses||{}).join(" / ")}</p></div>}
    {mode==="rotation"&&<div className="panel infoBanner"><h2>코스 로테이션</h2><p><b>{names.join(" → ")}</b></p><p className="warn">당일 운영에 따라 변경될 수 있으므로 현장에서 최종 확인하세요.</p></div>}
    {mode==="memo"&&<div className="panel infoBanner"><h2>라운드 메모/사진</h2><textarea value={memo} onChange={e=>setMemo(e.target.value)} placeholder="핀 위치, 캐디 조언, 동반자 메모 등을 기록하세요."/><input type="file" accept="image/*"/></div>}

    {(mode==="live"||mode==="ai")&&<div className="dualBoards">
      {names.map((name,ci)=>{
        const hi=selected[ci]||0,hole=course.courses?.[name]?.[hi];
        const index=currentStepFor(ci,hi);
        return <CoursePanel key={name} courseName={name} courseIndex={ci} hole={hole} holeIndex={hi} panelTab={panelTabs[ci]} setPanelTab={t=>setPanelTabs(p=>({...p,[ci]:t}))} clubs={clubs} clubStats={clubStats} shortMatrix={shortMatrix} score={scores[index]} setScore={(k,v)=>setScoreField(index,k,v)} shots={shots[index]||[]} addShot={s=>addShot(index,s)} deleteShot={id=>deleteShot(index,id)} profile={profile} weather={weather} location={location} gpsStatus={gpsStatus} requestLocation={requestLocation} startLiveLocation={startLiveLocation} stopLiveLocation={stopLiveLocation} fetchLiveWeather={fetchLiveWeather} onScore={()=>{setStep(index);setPanelTabs(p=>({...p,[ci]:"score"}))}} onNext={()=>nextPanel(ci)}/>;
      })}
    </div>}

    <div className="roundBar">
      <div className="roundTitle">♙ 라운드 진행 <b>현재 홀</b></div>
      <div className="progressHoles">{Array.from({length:18},(_,i)=><button key={i} className={(i===currentGlobal?"current ":"")+(i>=9?"m":"l")} onClick={()=>{const ci=i>=9?1:0,hi=i%9;setHole(ci,hi)}}>{i<9?"L":"M"}{i%9+1}</button>)}</div>
      <button onClick={()=>{const n=Math.max(0,currentGlobal-1),ci=n>=9?1:0;setHole(ci,n%9)}}>◀ 이전 홀</button>
      <button onClick={()=>setShowAll(true)}>▦ 전체 18홀 보기</button>
      <button className="next" onClick={()=>{const n=Math.min(17,currentGlobal+1),ci=n>=9?1:0;setHole(ci,n%9)}}>다음 홀 →</button>
    </div>

    {showAll&&<div className="modalBackdrop" onClick={()=>setShowAll(false)}><div className="allHoles" onClick={e=>e.stopPropagation()}><div className="modalHead"><h3>전체 18홀</h3><button onClick={()=>setShowAll(false)}>✕</button></div><div className="allGrid">{names.map((name,ci)=><div key={name}><h4>{name}</h4>{(course.courses?.[name]||[]).map((h,hi)=><button key={hi} onClick={()=>{setHole(ci,hi);setShowAll(false)}}><b>{h.hole}H · Par {h.par}</b><span>{h.distance}m</span><small>{h.title}</small></button>)}</div>)}</div></div></div>}
  </div>
}

function CoursePanel({courseName,courseIndex,hole,holeIndex,panelTab,setPanelTab,clubs,clubStats,shortMatrix,score,setScore,shots,addShot,deleteShot,profile,weather,location,gpsStatus,requestLocation,startLiveLocation,stopLiveLocation,fetchLiveWeather,onScore,onNext}){
  if(!hole)return <div className="coursePanel">데이터 없음</div>;
  const targetKey=`golfTarget:${courseName}:${hole.hole}`;
  const [savedTarget,setSavedTarget]=useState(null);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(targetKey)||"null");setSavedTarget(v)}catch{}},[targetKey]);
  const target=savedTarget||(hole.greenLat&&hole.greenLng?{lat:Number(hole.greenLat),lng:Number(hole.greenLng)}:null);
  const gpsRemain=distanceMeters(location,target),shotBearing=bearing(location,target),autoRelation=windRelation(weather.windDeg,shotBearing);
  const relation=weather.relation==="자동"?(autoRelation||"관계 미확인"):weather.relation;
  const driver=Number(clubs.Driver)||0,remain=gpsRemain??Math.max(0,Number(hole.distance||0)-driver),second=nearestClub(clubs,Math.min(190,remain));
  const approach=nearestClub(clubs,Math.min(100,Math.max(35,Math.round(remain*.35))));
  const [shotClub,setShotClub]=useState("Driver"),[shotDist,setShotDist]=useState(""),[miss,setMiss]=useState("정타"),[fullMap,setFullMap]=useState(false),[photo,setPhoto]=useState(""),[review,setReview]=useState(false);
  const [trouble,setTrouble]=useState("fairway"),[shortDistance,setShortDistance]=useState(20);
  const [voiceAuto,setVoiceAuto]=useState(false),[voiceStatus,setVoiceStatus]=useState("대기");
  const [deviceHeading,setDeviceHeading]=useState(null),[alignStatus,setAlignStatus]=useState("나침반 미연결");
  const [hazardFront,setHazardFront]=useState(150),[hazardWidth,setHazardWidth]=useState(15),[afterRisk,setAfterRisk]=useState("none");
  const strategy=strategyOptions({clubs,clubStats,remaining:remain,hazard:{front:hazardFront,width:hazardWidth},downstreamRisk:afterRisk,missBias:profile.bias});
  const personalChoice=personalShortGameChoice(shortMatrix,shortDistance,trouble);
  const shortAdvice=getShortGameAdvice(shortDistance,trouble,personalChoice?.best?.club||"56°");
  useEffect(()=>{if(voiceAuto&&panelTab==="trouble"){const id=setTimeout(()=>speakAdvice(),250);return()=>clearTimeout(id)}},[voiceAuto,shortDistance,trouble,personalChoice?.best?.club]);
  const targetBearing=location&&target?bearing(location,target):null;
  const align=alignmentGrade(targetBearing,deviceHeading);
  const orientationHandler=useRef(null);
  useEffect(()=>()=>{if(orientationHandler.current){window.removeEventListener("deviceorientationabsolute",orientationHandler.current);window.removeEventListener("deviceorientation",orientationHandler.current)}},[]);
  async function startAlignment(){try{if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){const p=await DeviceOrientationEvent.requestPermission();if(p!=="granted"){setAlignStatus("센서 권한 필요");return}}const handler=e=>{const h=e.webkitCompassHeading!=null?e.webkitCompassHeading:(e.alpha!=null?(360-e.alpha)%360:null);if(h!=null){setDeviceHeading(h);setAlignStatus("나침반 연결됨")}};if(orientationHandler.current){window.removeEventListener("deviceorientationabsolute",orientationHandler.current);window.removeEventListener("deviceorientation",orientationHandler.current)}orientationHandler.current=handler;window.addEventListener("deviceorientationabsolute",handler);window.addEventListener("deviceorientation",handler);setAlignStatus("나침반 확인 중")}catch(e){setAlignStatus("센서 연결 실패")}}
  const voiceText=[`${shortDistance}미터 남았습니다.`,personalChoice?.text||"",`추천 클럽은 ${personalChoice?.best?.club||shortAdvice.club}입니다.`,shortAdvice.title,shortAdvice.setup,shortAdvice.feel,`목표는 ${shortAdvice.target}`,`주의할 점은 ${shortAdvice.avoid}`,targetBearing!=null?alignmentLesson(targetBearing,deviceHeading):""].filter(Boolean).join(" ");
  function speakAdvice(){if(typeof window==="undefined"||!("speechSynthesis" in window)){setVoiceStatus("이 브라우저는 음성 읽기를 지원하지 않습니다.");return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(voiceText);u.lang="ko-KR";u.rate=.92;u.pitch=1;u.onstart=()=>setVoiceStatus("읽는 중");u.onend=()=>setVoiceStatus("완료");u.onerror=()=>setVoiceStatus("음성 재생 실패");window.speechSynthesis.speak(u)}
  function stopVoice(){if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();setVoiceStatus("정지")}
  const color=courseIndex===0?"blue":"orange";
  return <article className={"coursePanel "+color}>
    <div className="panelTitle">{courseName.toUpperCase()} {hole.hole}H <small>Par {hole.par}　{hole.distance}m</small><label>홀 전체보기 <input aria-label={courseName+" 홀 전체보기"} type="checkbox" checked={fullMap} onChange={e=>setFullMap(e.target.checked)}/></label></div>
    <div className="panelCore">
      <VisualCourseMap hole={hole} courseName={courseName} profile={profile} driver={driver}/>
      <div className="holeDetails">
        <div className="innerTabs">
          <button className={panelTab==="info"?"on":""} onClick={()=>setPanelTab("info")}>홀 정보</button>
          <button className={panelTab==="guide"?"on":""} onClick={()=>setPanelTab("guide")}>공략 가이드</button>
          <button className={panelTab==="distance"?"on":""} onClick={()=>setPanelTab("distance")}>거리 측정</button>
          <button className={panelTab==="memo"?"on":""} onClick={()=>setPanelTab("memo")}>메모/사진</button>
          <button className={panelTab==="trouble"?"on":""} onClick={()=>setPanelTab("trouble")}>트러블/어프로치</button>
          <button className={panelTab==="score"?"on":""} onClick={()=>setPanelTab("score")}>스코어</button>
        </div>

        {panelTab==="info"&&<>
          <div className="infoSplit"><div><h4>기본 정보</h4><dl><dt>Par</dt><dd>{hole.par}</dd><dt>블랙</dt><dd>{hole.distance}m</dd><dt>화이트</dt><dd>{Math.max(0,hole.distance-18)}m</dd><dt>블루</dt><dd>{Math.max(0,hole.distance-38)}m</dd><dt>레이디</dt><dd>{Math.max(0,hole.distance-58)}m</dd></dl></div><GreenMini courseIndex={courseIndex}/></div>
          <StrategyBox title="홀 특징 및 공략 포인트" icon="●"><p>{hole.strategy}</p><div className="chips">{(hole.hazards||[]).map(x=><span key={x}>{x}</span>)}</div></StrategyBox>
          <StrategyBox title={"티샷 공략 (추천 클럽: "+(hole.par===3?nearestClub(clubs,hole.distance):"드라이버 또는 3W")+")"} icon="⚑"><p>목표지점: <b>{profile.bias}</b> · 최근 미스 방향을 반영해 안전 폭을 우선합니다.</p><p>예상 낙하지점 약 {driver}m · 위험구역과 겹치면 한 클럽 짧게 선택합니다.</p></StrategyBox>
          <StrategyBox title="세컨드 샷 공략" icon="✓"><p>예상 잔여 {remain}m · 추천 {second}. 그린 중앙과 넓은 면을 우선합니다.</p></StrategyBox>
          <StrategyBox title="그린 공략" icon="⚑"><p>핀보다 그린 중앙을 기본 목표로 하고 당일 경사와 핀 위치를 최종 확인합니다.</p></StrategyBox>
        </>}

        {panelTab==="guide"&&<div className="detailPanel"><h4>AI 공략 가이드</h4><p><b>1.</b> 티샷 목표는 {profile.bias}. 좌 미스 {profile.left}, 우 미스 {profile.right} 기록을 반영합니다.</p><p><b>2.</b> 남은거리 {remain}m에서 추천 클럽은 {second}입니다.</p><p><b>3.</b> 현재 바람: {compass(weather.windDeg)} {weather.wind}m/s · {relation}</p><p><b>4.</b> 위험요소: {(hole.hazards||[]).join(", ")||"세부 위험 확인"}</p>
          <hr/><h4>캐리 · 착지 위험 계산</h4>
          <div className="scoreInputs"><label>장애물 앞까지(m)<input aria-label="장애물 앞 거리" type="number" value={hazardFront} onChange={e=>setHazardFront(Number(e.target.value)||0)}/></label><label>장애물 폭(m)<input aria-label="장애물 폭" type="number" value={hazardWidth} onChange={e=>setHazardWidth(Number(e.target.value)||0)}/></label><label>넘긴 뒤 위험<select aria-label="장애물 뒤 위험" value={afterRisk} onChange={e=>setAfterRisk(e.target.value)}><option value="none">없음</option><option value="내리막+OB">내리막 + OB</option><option value="물">물</option><option value="벙커">벙커</option><option value="좁은 페어웨이">좁은 페어웨이</option><option value="깊은 러프">깊은 러프</option></select></label></div>
          <p><b>최소 캐리:</b> {strategy.minimumCarry}m · <b>안전 캐리:</b> {strategy.safeCarry}m</p>
          <div className="cards strategyCards">{[strategy.safe,strategy.standard,strategy.aggressive].map(x=><div className="card" key={x.mode}><small>{x.mode}</small><b>{x.club} · 캐리 {x.carry}m</b><span>예상 총거리 {x.total}m · 위험점수 {x.risk}</span><span>{x.text}</span></div>)}</div>
          {strategy.layup&&<div className="strategyBox"><h4><span>↘</span> 더 쉬운 대안</h4><p><b>{strategy.layup.club}</b> · {strategy.layup.text}</p></div>}
        </div>}
        {panelTab==="distance"&&<div className="detailPanel"><h4>거리 측정</h4><div className="liveBtns"><button onClick={()=>requestLocation()}>GPS 현재위치</button><button aria-label="실시간 GPS 시작" onClick={startLiveLocation}>실시간 GPS 시작</button><button aria-label="실시간 GPS 정지" onClick={stopLiveLocation}>GPS 정지</button><button onClick={()=>fetchLiveWeather()}>실시간 날씨</button></div><p>{gpsStatus}</p><p><b>현재 위치:</b> {location?location.lat.toFixed(5)+", "+location.lng.toFixed(5):"미확인"}</p><p><b>그린/핀 좌표:</b> {target?target.lat.toFixed(5)+", "+target.lng.toFixed(5):"미등록"}</p><div className="inline"><button aria-label="현재 위치를 그린 핀으로 저장" disabled={!location} onClick={()=>{const v={lat:location.lat,lng:location.lng,accuracy:location.accuracy,at:new Date().toISOString()};localStorage.setItem(targetKey,JSON.stringify(v));setSavedTarget(v)}}>현재 위치를 그린/핀으로 저장</button>{savedTarget&&<button aria-label="저장 핀 삭제" onClick={()=>{localStorage.removeItem(targetKey);setSavedTarget(null)}}>저장 핀 삭제</button>}</div><p className="warn">현장 GPS 저장값은 정확도 {savedTarget?.accuracy??"-"}m 참고값입니다. 당일 핀 위치는 직접 확인해 저장하세요.</p><p><b>잔여거리:</b> {gpsRemain!=null?gpsRemain+"m":"그린 좌표 등록 시 GPS 계산"}</p></div>}
        {panelTab==="memo"&&<div className="detailPanel"><h4>메모/사진</h4><textarea placeholder={courseName+" "+hole.hole+"H 메모"}/><input aria-label={courseName+" 사진 선택"} type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file){if(photo)URL.revokeObjectURL(photo);setPhoto(URL.createObjectURL(file))}}}/>{photo&&<img className="memoPreview" src={photo} alt={courseName+" 선택 사진 미리보기"}/>}</div>}
        {panelTab==="trouble"&&<div className="detailPanel"><h4>상황별 쉬운 공략</h4>
          <div className="scoreInputs"><label>남은 거리<select aria-label="트러블 남은 거리" value={shortDistance} onChange={e=>setShortDistance(Number(e.target.value))}>{[5,10,15,20,30,40,50].map(d=><option key={d} value={d}>{d}m</option>)}</select></label>
          <label>라이<select aria-label="트러블 라이" value={trouble} onChange={e=>setTrouble(e.target.value)}><option value="fairway">보통 잔디</option><option value="tight">맨땅/잔디 거의 없음</option><option value="rough">깊은 러프</option><option value="bunker">그린사이드 벙커</option><option value="highlip">턱 바로 앞 벙커</option><option value="divot">디봇</option><option value="uphill">왼발 오르막</option><option value="downhill">왼발 내리막</option></select></label></div>
          {personalChoice?<div className="strategyBox"><h4><span>★</span> 내 성공률 기반 추천</h4><p><b>{personalChoice.best.club} {personalChoice.best.distance}m · 성공률 {personalChoice.best.successRate}%</b> · {personalChoice.best.samples}구 · 신뢰도 {personalChoice.confidence}</p><p>{personalChoice.text}</p>{personalChoice.other&&<p>비교: {personalChoice.other.club} {personalChoice.other.successRate}% ({personalChoice.other.samples}구)</p>}</div>:<p className="warn">이 거리·라이의 개인 표본이 3구 미만이라 기본 안전 공략을 사용합니다.</p>}<p><b>추천 {personalChoice?.best?.club||shortAdvice.club}</b> · {shortAdvice.title}</p><p><b>셋업:</b> {shortAdvice.setup}</p><p><b>거리감:</b> {shortAdvice.feel}</p><p><b>목표:</b> {shortAdvice.target}</p><p className="warn"><b>실수 방지:</b> {shortAdvice.avoid}</p><div className="strategyBox"><h4><span>⌖</span> 목표선 정렬 체크</h4><p>GPS로 목표 방위각을 계산하고 휴대폰 나침반으로 정렬을 확인합니다. 발·어깨·클럽페이스의 최종 확인은 카메라 분석 단계와 함께 사용합니다.</p><div className="inline"><button aria-label="목표선 정렬 시작" onClick={startAlignment}>나침반 정렬 시작</button><b>{targetBearing==null?"그린 좌표 필요":`목표 ${Math.round(targetBearing)}°`}</b><b>{deviceHeading==null?"현재 방향 -":`현재 ${Math.round(deviceHeading)}°`}</b><strong>{align.label}{align.diff!=null?` · 오차 ${align.diff}°`:""}</strong><small>{alignStatus}</small></div></div><CameraAlignmentCoach/><div className="inline"><button className="primary" aria-label="AI 캐디 음성 듣기" onClick={speakAdvice}>▶ 음성으로 듣기</button><button aria-label="AI 캐디 음성 정지" onClick={stopVoice}>■ 정지</button><label><input aria-label="추천 자동 읽기" type="checkbox" checked={voiceAuto} onChange={e=>setVoiceAuto(e.target.checked)}/> 자동읽기</label><small>{voiceStatus}</small></div>
        </div>}
        {panelTab==="score"&&<div className="detailPanel"><h4>스코어 기록</h4><div className="scoreInputs"><label>타수<input aria-label={courseName+" 타수"} type="number" value={score.strokes} onChange={e=>setScore("strokes",e.target.value)}/></label><label>퍼트<input type="number" value={score.putts} onChange={e=>setScore("putts",e.target.value)}/></label><label>벌타<input type="number" value={score.penalty} onChange={e=>setScore("penalty",e.target.value)}/></label></div><h4>샷 기록</h4><div className="shotQuick"><select value={shotClub} onChange={e=>setShotClub(e.target.value)}>{Object.keys(clubs).map(c=><option key={c}>{c}</option>)}</select><input aria-label={courseName+" 샷 거리"} type="number" value={shotDist} onChange={e=>setShotDist(e.target.value)} placeholder="거리"/><select value={miss} onChange={e=>setMiss(e.target.value)}>{MISSES.map(m=><option key={m}>{m}</option>)}</select><button onClick={()=>{addShot({club:shotClub,distance:Number(shotDist)||0,miss,at:new Date().toISOString(),position:location?{lat:location.lat,lng:location.lng,accuracy:location.accuracy}:null,targetDistance:gpsRemain});setShotDist("")}}>추가</button></div><div className="inline"><button aria-label="홀 샷 복기" onClick={()=>setReview(v=>!v)}>홀 샷 복기</button><small>GPS가 연결된 상태에서 샷을 추가하면 위치도 함께 저장됩니다.</small></div>{review&&<div className="strategyBox"><h4><span>↺</span> 홀 복기</h4>{shots.length?shots.map((x,i)=><p key={x.id}><b>{i+1}타 {x.club}</b> · {x.distance||"-"}m · {x.miss} · {x.position?`GPS ${x.position.lat.toFixed(5)}, ${x.position.lng.toFixed(5)} (±${x.position.accuracy}m)`:"위치 미기록"}{x.targetDistance!=null?` · 당시 목표까지 ${x.targetDistance}m`:""}</p>):<p>기록된 샷이 없습니다.</p>}</div>}<div className="shotRows">{shots.map((s,i)=><div key={s.id}><span>{i+1}타 {s.club} · {s.distance||"-"}m · {s.miss}</span><button onClick={()=>deleteShot(s.id)}>삭제</button></div>)}</div></div>}
      </div>
    </div>
    <div className="clubRecommend"><div className="clock">◷</div><div><b>AI 추천 클럽 (내 구질 반영)</b><div className="recGrid"><span><small>티샷</small><strong>{hole.par===3?nearestClub(clubs,hole.distance):"드라이버"} ({hole.par===3?clubs[nearestClub(clubs,hole.distance)]:driver}m)</strong></span><span><small>세컨드 (예상 {remain}m)</small><strong>{second} ({clubs[second]||"-"}m)</strong></span><span><small>어프로치</small><strong>{approach} ({clubs[approach]||"-"}m)</strong></span></div></div></div>
    <div className="panelActions"><button className="scoreBtn" onClick={onScore}>이 홀로 스코어 기록하기</button><button className="nextBtn" onClick={onNext}>{holeIndex===8?"이 코스 완료":"다음 홀 ("+(holeIndex+2)+"H) →"}</button></div>
    {fullMap&&<div className="mapModal" onClick={()=>setFullMap(false)}><div className="mapModalInner" onClick={e=>e.stopPropagation()}><div className="modalHead"><h3>{courseName.toUpperCase()} {hole.hole}H 전체보기</h3><button aria-label="지도 닫기" onClick={()=>setFullMap(false)}>✕</button></div><VisualCourseMap hole={hole} courseName={courseName} profile={profile} driver={driver}/></div></div>}
  </article>
}

function VisualCourseMap({hole,courseName,profile,driver}){
  const isLake=/lake/i.test(courseName);
  const image=isLake?SATELLITE_MAPS.lake:SATELLITE_MAPS.mountain;
  const aimLeft=profile.bias==="좌중앙"?"46%":profile.bias==="우중앙"?"54%":"50%";
  const landingTop=Math.max(26,58-Math.min(30,driver/12));
  return <div className="visualMap satelliteMap" style={{backgroundImage:`linear-gradient(180deg,rgba(1,20,10,.02),rgba(1,20,10,.16)),url(${image})`}}>
    <svg className="mapOverlay" viewBox="0 0 220 430" role="img" aria-label={courseName+" "+hole.hole+"홀 위성형 공략도"}>
      <defs>
        <filter id={"glow"+courseName+hole.hole}><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M110 385 C106 340 106 300 108 255 C110 205 102 165 108 120 C110 98 108 75 110 48" fill="none" stroke="#43e8ff" strokeWidth="3" strokeDasharray="7 7" filter={"url(#glow"+courseName+hole.hole+")"}/>
      <path d={"M110 385 Q"+(profile.bias==="좌중앙"?92:profile.bias==="우중앙"?128:110)+" 280 "+(profile.bias==="좌중앙"?96:profile.bias==="우중앙"?124:110)+" 185"} fill="none" stroke="#fff" strokeWidth="2" opacity=".92"/>
      <circle cx="110" cy="385" r="9" fill="#e91f2b" stroke="#fff" strokeWidth="3"/>
      <circle cx="110" cy="363" r="8" fill="#fff" stroke="#fff" strokeWidth="2"/>
      <circle cx="110" cy="341" r="8" fill="#2574ff" stroke="#fff" strokeWidth="2"/>
      <circle cx="110" cy="319" r="8" fill="#202020" stroke="#fff" strokeWidth="2"/>
      <circle cx={aimLeft==="46%"?100:aimLeft==="54%"?120:110} cy={landingTop*4.3} r="7" fill="#fff" stroke="#00a2ff" strokeWidth="3"/>
      <text x="120" y="242" fill="#fff" fontSize="17" fontWeight="900" stroke="#17341f" strokeWidth=".8">150m</text>
      <text x="120" y="184" fill="#fff" fontSize="17" fontWeight="900" stroke="#17341f" strokeWidth=".8">{driver}m</text>
    </svg>
    {(hole.hazards||[]).slice(0,3).map((h,i)=><span className={"hazardLabel h"+i} key={h}>{h}</span>)}
    <span className="conceptBadge satelliteBadge">위성형 공략도 · 실제 위치 검증 전</span>
  </div>
}

function GreenMini({courseIndex}){return <div className="greenMini"><h4>그린 형태</h4><div className="greenShape"><span className={courseIndex?"diag":"cross"}>↔</span></div><small>{courseIndex?"좌측 높음　→　우측 낮음":"앞쪽 낮음　↔　뒤쪽 높음"}</small></div>}
function StrategyBox({title,icon,children}){return <div className="strategyBox"><h4><span>{icon}</span>{title}</h4>{children}</div>}

function Home({round,course,totalScore,profile,setView}){return <div className="panel"><h2>라운드 대시보드</h2><div className="cards"><Card t="다음 라운드" v={round.date+" "+round.time}/><Card t="골프장" v={course.name}/><Card t="현재 스코어" v={totalScore||"-"}/><Card t="기록 샷" v={profile.total+"개"}/><Card t="좌/우 미스" v={profile.left+" / "+profile.right}/><Card t="AI 목표" v={profile.bias}/></div><button className="primary" onClick={()=>setView("caddie")}>AI 캐디 시작</button></div>}
function Card({t,v}){return <div className="card"><small>{t}</small><b>{v}</b></div>}
function Schedule({round,setRound}){return <div className="panel"><h2>라운드 일정</h2><div className="formgrid">{Object.entries({date:"날짜",time:"티타임",players:"인원",fee:"그린피",caddie:"캐디"}).map(([k,l])=><label key={k}>{l}<input aria-label={l} value={round[k]} type={k==="date"?"date":k==="time"?"time":k==="players"||k==="fee"?"number":"text"} onChange={e=>setRound({...round,[k]:e.target.value})}/></label>)}</div><p className="ok">입력값은 자동 저장됩니다.</p></div>}
function Score({scores,setScoreField,shots}){const total=scores.reduce((n,s)=>n+(Number(s.strokes)||0),0);return <div className="panel"><h2>18홀 스코어카드</h2><div className="scoregrid">{scores.map((s,i)=><div className="scorecell" key={i}><b>{i+1}H <small>{shots[i]?.length||0}샷</small></b><input type="number" placeholder="타수" value={s.strokes} onChange={e=>setScoreField(i,"strokes",e.target.value)}/><input type="number" placeholder="퍼트" value={s.putts} onChange={e=>setScoreField(i,"putts",e.target.value)}/><input type="number" placeholder="벌타" value={s.penalty} onChange={e=>setScoreField(i,"penalty",e.target.value)}/></div>)}</div><h3>합계 {total||"-"}</h3></div>}
function Courses({allCourses,customCourses,addCourse,setCustomCourses,courseId,setCourseId,course,rotation,updateCustomHole,setStep}){
  const [q,setQ]=useState(""),[courseName,setCourseName]=useState(rotation[0]||""),[holeNo,setHoleNo]=useState(1);
  useEffect(()=>{setCourseName(rotation[0]||"");setHoleNo(1)},[courseId]);
  const filtered=allCourses.filter(c=>(c.name+" "+c.region).toLowerCase().includes(q.toLowerCase())),editable=courseId.startsWith("custom-"),h=course.courses?.[courseName]?.[holeNo-1];
  return <div className="panel"><h2>골프장 DB</h2><div className="inline"><input aria-label="골프장 검색" value={q} onChange={e=>setQ(e.target.value)} placeholder="골프장명·지역 검색"/><span className="badge">{filtered.length}개</span></div><div className="cards">{filtered.map(c=><div className={"card "+(c.id===courseId?"selected":"")} key={c.id}><b>{c.name}</b><small>{c.region} · {Object.keys(c.courses||{}).join(", ")}</small><button onClick={()=>{setCourseId(c.id);setStep(0)}}>선택</button>{c.id.startsWith("custom-")&&<button onClick={()=>setCustomCourses(p=>p.filter(x=>x.id!==c.id))}>삭제</button>}</div>)}</div><h3>새 골프장 추가</h3><form onSubmit={addCourse} className="formgrid"><label>골프장명<input name="name" required/></label><label>지역<input name="region"/></label><button className="primary">추가 후 선택</button></form><hr/><h3>홀 데이터 편집</h3>{!editable?<p className="warn">기본 제공 골프장은 보호됩니다. 새 골프장을 추가하면 홀별 거리·전략·GPS를 편집할 수 있습니다.</p>:<><div className="inline"><select value={courseName} onChange={e=>{setCourseName(e.target.value);setHoleNo(1)}}>{rotation.map(r=><option key={r}>{r}</option>)}</select><select value={holeNo} onChange={e=>setHoleNo(Number(e.target.value))}>{Array.from({length:9},(_,i)=><option key={i} value={i+1}>{i+1}H</option>)}</select></div>{h&&<div className="formgrid"><label>Par<input aria-label="홀 Par" type="number" value={h.par} onChange={e=>updateCustomHole(courseName,holeNo-1,{par:Number(e.target.value)})}/></label><label>거리(m)<input aria-label="홀 거리" type="number" value={h.distance} onChange={e=>updateCustomHole(courseName,holeNo-1,{distance:Number(e.target.value)})}/></label><label>홀 제목<input aria-label="홀 제목" value={h.title} onChange={e=>updateCustomHole(courseName,holeNo-1,{title:e.target.value})}/></label><label>그린 위도<input aria-label="그린 위도" value={h.greenLat||""} onChange={e=>updateCustomHole(courseName,holeNo-1,{greenLat:e.target.value})}/></label><label>그린 경도<input aria-label="그린 경도" value={h.greenLng||""} onChange={e=>updateCustomHole(courseName,holeNo-1,{greenLng:e.target.value})}/></label></div>}</>}</div>
}
function Swing(){const[src,setSrc]=useState("");return <div className="panel"><h2>스윙 분석</h2><input type="file" accept="video/*,image/*" onChange={e=>{const f=e.target.files?.[0];if(f)setSrc(URL.createObjectURL(f))}}/>{src&&<video className="preview" src={src} controls/>}<p className="warn">업로드·재생 기능까지 구현되어 있습니다. 실제 자세추정 AI는 별도 모델 연결 단계입니다.</p></div>}
function Practice({items,setItems,autoMissions,matrix,addShot}){const[text,setText]=useState(""),[active,setActive]=useState(null),[actual,setActual]=useState(""),[miss,setMiss]=useState("정타");return <div className="panel"><h2>연습/코칭 · 자동 학습 루프</h2><h3>오늘의 자동 미션</h3><div className="cards">{autoMissions.map(m=><div className="card" key={m.id}><b>{m.title}</b><span>{m.goal}</span><button className="primary" onClick={()=>setActive(m)}>이 미션 연습</button></div>)}</div>{active&&<div className="strategyBox"><h4>{active.title} 기록</h4><p>{active.club} · {active.distance}m · {labelLie(active.lie)}</p><div className="scoreInputs"><label>실제 거리(m)<input aria-label="연습 실제 거리" type="number" value={actual} onChange={e=>setActual(e.target.value)}/></label><label>결과<select aria-label="연습 결과" value={miss} onChange={e=>setMiss(e.target.value)}>{MISSES.map(x=><option key={x}>{x}</option>)}</select></label></div><button className="primary" onClick={()=>{if(!actual)return;addShot({club:active.club,distance:Number(actual),carry:Number(actual),targetDistance:active.distance,lie:active.lie,miss,source:"practice",success:miss==="정타"});setActual("")}}>1구 기록·재학습</button></div>}<h3>내 쇼트게임 학습표</h3><div className="cards">{matrix.map(x=><div className="card" key={x.club+x.distance+x.lie}><b>{x.club} {x.distance}m · {labelLie(x.lie)}</b><span>{x.samples}구 · 성공률 {x.successRate}%</span></div>)}</div><h3>직접 연습 메모</h3><div className="inline"><input value={text} onChange={e=>setText(e.target.value)} placeholder="예: 드라이버 20구 우측 미스 체크"/><button className="primary" onClick={()=>{if(text.trim()){setItems([...items,{id:Date.now(),text,done:false}]);setText("")}}}>추가</button></div>{items.map(x=><label className="task" key={x.id}><input type="checkbox" checked={x.done} onChange={()=>setItems(items.map(y=>y.id===x.id?{...y,done:!y.done}:y))}/>{x.text}</label>)}</div>}
function Equipment({clubs,setClubs,clubStats,setClubStats,learnedStats,importGolfzon}){const update=(k,key,val)=>setClubStats({...clubStats,[k]:{...(clubStats[k]||{}),[key]:Number(val)||0}});return <div className="panel"><h2>장비/클럽 · 개인 샷 프로필</h2><p className="ok">최고거리가 아니라 반복 가능한 캐리·총거리·좌우 분산·성공률을 입력하세요. AI 캐디가 안전 공략에 직접 사용합니다.</p><div className="clubgrid">{Object.entries(clubs).map(([k,v])=>{const x=clubStats[k]||{};return <div className="card" key={k}><b>{k}</b><label>기존 평균<input aria-label={k} type="number" value={v} onChange={e=>setClubs({...clubs,[k]:Number(e.target.value)||0})}/></label><label>캐리(m)<input aria-label={k+" 캐리"} type="number" value={x.carry??""} onChange={e=>update(k,"carry",e.target.value)}/></label><label>총거리(m)<input aria-label={k+" 총거리"} type="number" value={x.total??v} onChange={e=>update(k,"total",e.target.value)}/></label><label>좌우 분산(m)<input aria-label={k+" 분산"} type="number" value={x.dispersion??""} onChange={e=>update(k,"dispersion",e.target.value)}/></label><label>성공률(%)<input aria-label={k+" 성공률"} type="number" min="0" max="100" value={x.success??75} onChange={e=>update(k,"success",e.target.value)}/></label></div>})}</div><p className="ok">라운드 샷이 3개 이상 쌓인 클럽은 캐리·총거리·분산·성공률을 자동 학습합니다.</p><h3>자동 학습 상태</h3><div className="cards">{Object.entries(learnedStats).filter(([,x])=>x.samples>0).map(([k,x])=><div className="card" key={k}><b>{k} · {x.samples}샷</b><span>캐리 {x.carry}m / 총 {x.total}m</span><span>분산 {x.dispersion}m / 성공 {x.success}%</span></div>)}</div><GolfzonImport onImport={importGolfzon}/></div>}
function GolfzonImport({onImport}){const[text,setText]=useState(""),[msg,setMsg]=useState("");const load=file=>{const r=new FileReader();r.onload=()=>{const n=onImport(String(r.result||""),file.name);setMsg(n?file.name+"에서 "+n+"개 샷을 가져와 자동 학습했습니다.":"지원되는 샷 데이터를 찾지 못했습니다.");};r.readAsText(file)};return <div className="strategyBox"><h4><span>G</span> Golfzon 데이터 가져오기</h4><p>클럽,총거리,캐리,좌우편차,결과 순서의 CSV/탭 데이터를 붙여넣거나 CSV·TSV·JSON 파일을 선택하세요.</p><input aria-label="Golfzon 파일 선택" type="file" accept=".csv,.tsv,.txt,.json" onChange={e=>e.target.files?.[0]&&load(e.target.files[0])}/><textarea aria-label="Golfzon 데이터 붙여넣기" value={text} onChange={e=>setText(e.target.value)} placeholder={"7I,142,134,6,정타
7I,138,131,-8,좌"}/><button className="primary" onClick={()=>{const n=onImport(text);setMsg(n?n+"개 샷을 가져와 자동 학습했습니다.":"가져올 샷을 찾지 못했습니다.")}}>가져오기·학습</button>{msg&&<p className="ok">{msg}</p>}<p className="warn">골프존 공식 서비스는 라운드 기록·샷 데이터·스윙 데이터를 제공하지만, 공개된 개인 샷 데이터용 외부 Open API는 현재 공식 자료에서 확인되지 않아 계정 비밀번호를 우회 수집하지 않습니다.</p></div>}
function Weather({value,setValue,location,gpsStatus,requestLocation,fetchLiveWeather}){return <div className="panel"><h2>날씨/바람</h2><div className="liveweather"><button className="primary" onClick={()=>requestLocation()}>현재 GPS 받기</button><button className="primary" onClick={()=>fetchLiveWeather()}>GPS로 실시간 날씨 갱신</button><span>{gpsStatus}</span></div>{location&&<p>현재 위치: {location.lat.toFixed(6)}, {location.lng.toFixed(6)} · 정확도 약 {location.accuracy}m</p>}<div className="formgrid"><label>기온<input type="number" value={value.temp} onChange={e=>setValue({...value,temp:Number(e.target.value),source:"수동"})}/></label><label>풍속 m/s<input aria-label="풍속 m/s" type="number" value={value.wind} onChange={e=>setValue({...value,wind:Number(e.target.value),source:"수동"})}/></label><label>풍향(도)<input type="number" value={value.windDeg??""} onChange={e=>setValue({...value,windDeg:e.target.value===""?null:Number(e.target.value),source:"수동"})}/></label><label>샷 대비 바람<select aria-label="샷 대비 바람" value={value.relation} onChange={e=>setValue({...value,relation:e.target.value})}>{RELATIONS.map(x=><option key={x}>{x}</option>)}</select></label></div><p><b>{value.source}</b> · {value.temp}℃ · {compass(value.windDeg)}풍 {value.wind}m/s</p></div>}
function Settings({exportData,importData,reset}){return <div className="panel"><h2>설정</h2><div className="settings"><button onClick={exportData}>내 데이터 JSON 백업</button><label className="filebtn">JSON 복원<input type="file" accept=".json" onChange={e=>e.target.files?.[0]&&importData(e.target.files[0])}/></label><button className="danger" onClick={reset}>로컬 데이터 초기화</button></div></div>}
