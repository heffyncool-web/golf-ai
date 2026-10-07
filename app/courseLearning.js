export function riskMissionFromAreas(shots=[],areas={}){
 const tagged=shots.map(s=>({...s,area:s.position?(()=>{const p=s.position;const inside=(pts=[])=>{if(pts.length<3)return false;let v=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j],hit=((a.lat>p.lat)!==(b.lat>p.lat))&&(p.lng<(b.lng-a.lng)*(p.lat-a.lat)/(b.lat-a.lat)+a.lng);if(hit)v=!v}return v};return inside(areas.ob)?"OB":inside(areas.water)?"해저드":inside(areas.bunker)?"벙커":inside(areas.green)?"그린":inside(areas.fairway)?"페어웨이":"미분류"})():"미기록"}));
 const count=x=>tagged.filter(s=>s.area===x||s.miss===x).length,ob=count("OB"),water=count("해저드"),bunker=count("벙커");
 if(ob>=2)return {priority:"높음",title:"티샷 안전구역 10구",goal:"OB 방향 반대쪽 안전 목표로 10구 중 8구 생존",reason:`OB 관련 ${ob}회`};
 if(water>=2)return {priority:"높음",title:"캐리 여유 훈련 10구",goal:"장애물 최소 캐리보다 여유 있는 클럽 선택",reason:`해저드 관련 ${water}회`};
 if(bunker>=2)return {priority:"보통",title:"벙커 회피 목표점 10구",goal:"핀 직선보다 넓은 랜딩존 우선",reason:`벙커 관련 ${bunker}회`};
 return {priority:"보통",title:"분산 축소 10구",goal:"현재 주력 클럽의 좌우 분산 20% 감소",reason:"치명적 위험 패턴 표본 부족"};
}