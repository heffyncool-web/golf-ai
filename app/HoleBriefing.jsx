"use client";
import {useMemo} from 'react';
import {caddiePlans,courseFeatures,validPoint,meters} from './holeCaddie';

function GreenOutline({features,points,slope}){
 const shape=features.find(f=>f.properties?.type==='green'||f.properties?.golf==='green');
 const ring=shape?.geometry?.type==='Polygon'?shape.geometry.coordinates[0]:null;
 let outline=null;
 if(ring?.length>=3){const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),minX=Math.min(...xs),maxY=Math.max(...ys),dx=Math.max(...xs)-minX,dy=maxY-Math.min(...ys);if(dx>0&&dy>0)outline=ring.map(p=>`${10+(p[0]-minX)/dx*100},${10+(maxY-p[1])/dy*70}`).join(' ');}
 return <div className="greenMini"><h4>그린 형태 · 경사</h4>{outline?<svg viewBox="0 0 120 90" role="img" aria-label="등록 좌표 기반 그린 윤곽"><polygon points={outline} fill="#69a647" stroke="#356d32" strokeWidth="2"/></svg>:<p className="briefPending">그린 윤곽 미등록</p>}<small>{slope||'경사 미확인 · 현장/공식 자료 필요'}{validPoint(points.center)?' · 중앙 좌표 등록됨':''}</small></div>;
}
export default function HoleBriefing({hole,points,areas,features,clubs,stats,weather,location,preview,missBias}){
 const geometry=useMemo(()=>courseFeatures(areas,features),[JSON.stringify(areas),JSON.stringify(features)]);
 const origin=preview?points.tee:(validPoint(location)?location:points.tee);
 const target=points.center;
 const plans=caddiePlans({origin,target,points,features:geometry,clubs,stats,wind:weather.wind,relation:weather.relation,missBias});
 const tee=plans.find(p=>p.mode==='STANDARD');
 const second=tee?caddiePlans({origin:tee.finish,target,points,features:geometry,clubs,stats,wind:weather.wind,relation:weather.relation,missBias}).find(p=>p.mode==='STANDARD'):null;
 const approachDistance=second?meters(second.finish,target):null;
 const teedistances=hole.teeDistances||{};
 return <section className="holeBriefing" aria-label="홀 사전 공략 분석">
  <div className="infoSplit"><div><h4>기본 정보</h4><dl><dt>Par</dt><dd>{hole.par}</dd><dt>등록 전장</dt><dd>{hole.distance||'—'}m</dd>{[['black','블랙'],['white','화이트'],['blue','블루'],['red','레드/레이디']].map(([key,label])=><span className="briefDistanceRow" key={key}><dt>{label}</dt><dd>{Number.isFinite(Number(teedistances[key]))&&teedistances[key]!=null?teedistances[key]+'m':'미등록'}</dd></span>)}</dl><small>티별 전장은 등록 자료만 표시</small></div><GreenOutline features={geometry} points={points} slope={hole.greenSlope}/></div>
  <div className="briefStage tee"><h4>⚑ {preview?'티샷 사전 공략':'현재 샷 공략'}</h4>{tee?<><p><b>{tee.club} · 캐리 {tee.requiredCarry}m · 총거리 {tee.total}m</b></p><p>목표 방위 {tee.direction}° · 좌우 분산 ±{tee.dispersion}m</p><p>{tee.reason}</p></>:<p>티·그린 좌표 확보 후 개인 클럽과 지형을 함께 분석합니다.</p>}</div>
  <div className="briefStage second"><h4>✓ 세컨드 샷 예상 공략</h4>{second?<><p><b>예상 잔여 {tee.nextDistance}m · {second.club}</b></p><p>첫 샷 예상 정지점에서 계산 · 캐리 {second.requiredCarry}m · 좌우 ±{second.dispersion}m</p><p>{second.reason}</p></>:<p>첫 샷 착탄점 계산 후 다음 샷을 연결합니다.</p>}</div>
  <div className="briefStage green"><h4>⚑ 그린 · 어프로치 공략</h4><p>{approachDistance!=null?`두 샷 후 예상 잔여 ${Math.round(approachDistance)}m. `:''}핀 좌표와 경사를 확인하고 넓은 착지면을 우선합니다.</p><p>숏게임 기본 PW · 56°{clubs['56°']!=null?` (등록 거리 ${clubs['56°']}m)`:''}. 라이·거리별 상세 안내는 트러블/어프로치에서 확인합니다.</p></div>
  <p className="briefConfidence">{tee?tee.confidence:'홀 좌표 미등록 · 지도 중심은 골프장 위치 기준'} · 다음 샷은 예상 정지점 기준이며 실제 샷 결과에 따라 재계산합니다.</p>
 </section>;
}
