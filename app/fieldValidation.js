import {meters} from './holeCaddie';
export function assessFieldDistance({a,b,reference,now=Date.now()}){
 const gpsDistance=meters(a,b),ref=Number(reference);
 if(!a||!b||!Number.isFinite(gpsDistance)||gpsDistance<1||!Number.isFinite(ref)||ref<1||ref>1500)return {status:'MISSING',message:'A·B 위치와 1~1,500m의 기준 거리를 등록하세요.'};
 const error=gpsDistance-ref;
 const quality=[a,b].every(p=>Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=10&&Number.isFinite(Date.parse(p.at))&&now-Date.parse(p.at)>=0&&now-Date.parse(p.at)<=86400000&&Number.isFinite(Date.parse(p.fixAt))&&Date.parse(p.at)-Date.parse(p.fixAt)>=-1000&&Date.parse(p.at)-Date.parse(p.fixAt)<=60000);
 const status=Math.abs(error)>5?'OUTSIDE_TOLERANCE':quality?'WITHIN_TOLERANCE':'GPS_QUALITY_REVIEW';
 return {status,gpsDistance,reference:ref,error,tolerance:5,quality,message:status==='OUTSIDE_TOLERANCE'?'거리 차이 5m 초과 · GPS 위치와 기준점을 재확인하세요.':status==='GPS_QUALITY_REVIEW'?'거리 차이는 5m 이내 · GPS 정확도 또는 측정 시각 확인 필요':'거리 차이 5m 이내 · 이 비교 기록의 기준 충족'};
}
export const fieldSampleKey=(a,b)=>JSON.stringify([a?.lat,a?.lng,a?.at,b?.lat,b?.lng,b?.at]);
