"use client";
import {useMemo,useState} from 'react';
import LiveCourseMap from './LiveCourseMap';
import {courseFeatures,caddiePlans,hazardCrossings,meters,validPoint} from './holeCaddie';
export default function FieldCaddie({location,target,points,areas,features,clubs,stats,weather,elevation,missBias,courseCenter,holeKey,shots,requestLocation,startLiveLocation,gpsStatus,showGpsButtons=true}){
 const [mode,setMode]=useState('STANDARD');
 const geometry=useMemo(()=>courseFeatures(areas,features),[JSON.stringify(areas),JSON.stringify(features)]);
 const origin=validPoint(location)?location:points.tee;
 const plans=useMemo(()=>caddiePlans({origin,target,points,features:geometry,clubs,stats,wind:weather.wind,relation:weather.relation,elevation,missBias}),[JSON.stringify(origin),JSON.stringify(target),JSON.stringify(geometry),JSON.stringify(clubs),JSON.stringify(stats),JSON.stringify(weather),elevation,missBias]);
 const plan=plans.find(p=>p.mode===mode),hazards=hazardCrossings(origin,target,geometry);
 return <section className='fieldCaddie' aria-label='GPS 실전 캐디'>
  <LiveCourseMap location={location} target={target} points={points} shots={shots} areas={areas} features={features} fallbackCenter={courseCenter} compact showToolbar={false} holeKey={holeKey} origin={origin} plan={plan}/>
  <div className='fieldSummary'>{showGpsButtons&&<><button onClick={()=>requestLocation()}>GPS 현재위치</button><button onClick={startLiveLocation}>실시간 GPS 시작</button></>}<span>{location?`GPS ±${Math.round(location.accuracy||0)}m`:points.tee?'티 위치 기준 미리보기':'GPS 미연결'}</span>
   <div className='fieldDistances'>{[['그린 앞',points.front],['그린 중앙',points.center],['그린 뒤',points.back],['핀/목표',target]].map(([name,p])=><span key={name}>{name} <b>{meters(origin,p)==null?'—':Math.round(meters(origin,p))+'m'}</b></span>)}</div>
   {hazards.length>0&&<details><summary>위험요소 {hazards.length}개 · 시작/끝 거리</summary>{hazards.map(h=><p key={h.id}>{h.name} <b>{h.crossFront==null?`${h.front}~${h.back}m (직선거리)`:`${h.crossFront}~${h.crossBack}m (공략선)`}</b></p>)}<small>공략선과 경계가 교차하면 진입/탈출 거리를 표시합니다. 교차하지 않으면 경계의 최단/최장 직선거리를 표시합니다.</small></details>}
   {!plans.length?<p>해당 홀의 티·그린 좌표를 불러오면 목표점과 클럽 공략을 계산합니다.</p>:<><div className='fieldMode'>{plans.map(p=><button key={p.mode} aria-pressed={mode===p.mode} onClick={()=>setMode(p.mode)}>{p.mode}<b>{p.club}</b><small>{p.requiredCarry}m 캐리 · {p.success==null?'확률 보류':p.success+'% 추정'}</small></button>)}</div><p><b>{plan.club} · 목표 방위 {plan.direction}° · 예상 총거리 {plan.total}m</b></p><p>{plan.reason}</p><details><summary>추천 근거 · 다음 샷</summary><p>좌우 ±{plan.dispersion}m · {plan.confidence} · 개인 표본 {plan.samples}샷</p><p>실패 예상: 목표 주변 좌우 분산 또는 짧음/김. 다음 샷 {plan.nextDistance}m · {plan.nextDifficulty}</p><small>성공확률은 입력된 지형과 정규 분산 가정으로 산출한 모델 추정치입니다. 초록 경계·당일 핀·기상 실측이 없으면 정확도가 제한됩니다.</small></details></>}
  </div>
 </section>;
}
