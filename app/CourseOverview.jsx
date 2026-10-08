"use client";
import {useState} from 'react';
import {validPoint} from './holeCaddie';
const project=(lng,lat,z)=>[(Number(lng)+180)/360*2**z*256,(1-Math.asinh(Math.tan(Number(lat)*Math.PI/180))/Math.PI)/2*2**z*256];
export default function CourseOverview({overview,location}){
 const [zoom,setZoom]=useState(0),[failed,setFailed]=useState(false);
 const a=project(overview.bounds[0][0],overview.bounds[1][1],overview.zoom),b=project(overview.bounds[1][0],overview.bounds[0][1],overview.zoom);
 const w=b[0]-a[0]+12,h=b[1]-a[1]+12,scale=2**zoom,cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
 const inView=validPoint(location)&&location.lng>=overview.bounds[0][0]&&location.lng<=overview.bounds[1][0]&&location.lat>=overview.bounds[0][1]&&location.lat<=overview.bounds[1][1];
 const gps=inView?project(location.lng,location.lat,overview.zoom):null;
 return <div className="courseOverview" aria-label="골프장 전체 위성 미리보기">
  <svg viewBox={`${cx-w/scale/2} ${cy-h/scale/2} ${w/scale} ${h/scale}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="실제 골프장 경계 기준 위성영상">
   {overview.tiles.map(t=><image key={t.url} href={t.url} x={t.x*256} y={t.y*256} width="256" height="256" onError={()=>setFailed(true)}/>)}
   <polygon points={overview.boundary.map(p=>project(p[0],p[1],overview.zoom).join(',')).join(' ')} fill="none" stroke="#fbda74" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
   {gps&&<g><circle cx={gps[0]} cy={gps[1]} r="3" fill="#2289ed" stroke="white" strokeWidth="1"/><text x={gps[0]+4} y={gps[1]} fill="white" stroke="#123" strokeWidth=".6" paintOrder="stroke" fontSize="5">현재 GPS</text></g>}
  </svg>
  <div className="overviewZoom"><button aria-label="골프장 위성 미리보기 확대" onClick={()=>setZoom(n=>Math.min(2,n+1))}>＋</button><button aria-label="골프장 위성 미리보기 기본보기" onClick={()=>setZoom(0)}>기본보기</button></div>
  <p className="overviewCaption">{failed?'보관 영상 일부 연결 실패':'골프장 전체 위성 미리보기 · GPS 없이 표시'}<small>홀 번호별 좌표 검증 전 · {overview.checked} 보관 영상</small></p>
  <small className="overviewAttribution">{overview.imageryAttribution} · {overview.geometryAttribution}</small>
 </div>;
}
