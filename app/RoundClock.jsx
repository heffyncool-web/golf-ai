"use client";
import {useEffect,useState} from 'react';
// Keep the ticking clock local so map and recommendation components do not rerender every second.
export default function RoundClock({date}){
 const [now,setNow]=useState(null);
 useEffect(()=>{setNow(new Date());const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id);},[]);
 const today=now?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now):null;
 const days=today?Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000):null;
 const countdown=days==null||!Number.isFinite(days)?'—':days===0?'D-Day':days>0?'D-'+days:'D+'+Math.abs(days);
 return <><div className="dateBox"><strong>{date}</strong><b>{countdown}</b></div><div className="currentClock" aria-label="현재 날짜와 시간"><small>현재 · 한국 시간</small><time dateTime={now?.toISOString()}>{today||'날짜 확인 중'}<b>{now?now.toLocaleTimeString('en-GB',{timeZone:'Asia/Seoul',hour12:false}):'—'}</b></time></div></>;
}
