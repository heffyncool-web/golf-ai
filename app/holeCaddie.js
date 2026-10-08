// All geometry is WGS84. GPS never changes the framing of a hole.
export const validPoint=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=85&&Math.abs(Number(p.lng))<=180;
const R=6371000,rad=d=>d*Math.PI/180;
export function meters(a,b){if(!validPoint(a)||!validPoint(b))return null;const x=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2;return 2*R*Math.asin(Math.sqrt(Math.min(1,x)));}
export function direction(a,b){return (Math.atan2(Math.sin(rad(b.lng-a.lng))*Math.cos(rad(b.lat)),Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lng-a.lng)))*180/Math.PI+360)%360;}
export function offset(p,forward,right,bearing){const b=rad(bearing),north=forward*Math.cos(b)-right*Math.sin(b),east=forward*Math.sin(b)+right*Math.cos(b);return {lat:Number(p.lat)+north/R*180/Math.PI,lng:Number(p.lng)+east/(R*Math.cos(rad(p.lat)))*180/Math.PI};}
export function kindOf(f){const k=String(f.properties?.golf||f.properties?.kind||f.properties?.type||'').toLowerCase();return /water|hazard|penalty/.test(k)?'water':k;}
export function courseFeatures(areas={},features=[]){
 const result=features.filter(f=>f?.geometry).map(f=>({...f,properties:{...f.properties,type:kindOf(f)}}));
 for(const [type,points] of Object.entries(areas)){if(!Array.isArray(points)||points.filter(validPoint).length<3)continue;
 // Imported geometry is authoritative; area arrays are only a legacy fallback.
 if(result.some(f=>kindOf(f)===type))continue;
 const cs=points.filter(validPoint).map(p=>[Number(p.lng),Number(p.lat)]);cs.push(cs[0]);result.push({type:'Feature',properties:{type},geometry:{type:'Polygon',coordinates:[cs]}});
 }return result;
}
export function allCoordinates(g){if(!g)return [];if(g.type==='Point')return [g.coordinates];return (g.coordinates||[]).flat(g.type==='MultiPolygon'?2:g.type==='Polygon'||g.type==='MultiLineString'?1:0);}
export function holeBounds(points={},features=[]){const coords=[...Object.values(points).filter(validPoint).filter(p=>p!==points.a&&p!==points.b&&p!==points.custom).map(p=>[Number(p.lng),Number(p.lat)]),...features.flatMap(f=>allCoordinates(f.geometry))].filter(c=>Array.isArray(c)&&c.length>=2&&c.every(Number.isFinite));if(coords.length<2)return null;const xs=coords.map(c=>c[0]),ys=coords.map(c=>c[1]);return [[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]];}
function insideRing(p,cs){let yes=false;for(let i=0,j=cs.length-1;i<cs.length;j=i++){const a=cs[i],b=cs[j];if((a[1]>p.lat)!==(b[1]>p.lat)&&p.lng<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function inside(p,f){if(!validPoint(p))return false;const g=f.geometry;const polygons=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];return polygons.some(rings=>insideRing(p,rings[0])&&!rings.slice(1).some(r=>insideRing(p,r)));}
function segmentRange(origin,a,b){const scale=R*Math.PI/180,cos=Math.cos(rad(origin.lat)),x=(a[0]-origin.lng)*scale*cos,y=(a[1]-origin.lat)*scale,dx=(b[0]-a[0])*scale*cos,dy=(b[1]-a[1])*scale,t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x+t*dx,y+t*dy);}
export function hazardDistances(origin,features){if(!validPoint(origin))return [];return features.filter(f=>['bunker','water','ob','tree'].includes(kindOf(f))).map((f,i)=>{const cs=allCoordinates(f.geometry),ds=cs.map(([lng,lat])=>meters(origin,{lng,lat}));if(!ds.length)return null;const near=inside(origin,f)?0:Math.min(...ds,...cs.slice(1).map((c,j)=>segmentRange(origin,cs[j],c)));return {id:f.properties?.osmId||i,type:kindOf(f),name:f.properties?.name||({bunker:'벙커',water:'물/해저드',ob:'OB',tree:'나무'}[kindOf(f)]),front:Math.round(near),back:Math.round(Math.max(...ds)),feature:f};}).filter(Boolean).sort((a,b)=>a.front-b.front);}
export function hazardCrossings(origin,target,features){
 if(!validPoint(origin)||!validPoint(target))return [];
 const distance=meters(origin,target),scale=R*Math.PI/180,cos=Math.cos(rad(origin.lat)),xy=c=>[(c[0]-origin.lng)*scale*cos,(c[1]-origin.lat)*scale],end=xy([target.lng,target.lat]),len=Math.hypot(...end),d=end.map(v=>v/(len||1)),cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 return hazardDistances(origin,features).map(h=>{const g=h.feature.geometry,polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[],hits=[];
  for(const rings of polygons)for(const ring of rings)for(let i=0;i<ring.length;i++){const a=xy(ring[i]),b=xy(ring[(i+1)%ring.length]),v=[b[0]-a[0],b[1]-a[1]],den=cross(d,v);if(Math.abs(den)<1e-8)continue;const t=cross(a,v)/den,u=cross(a,d)/den;if(t>=0&&t<=distance+100&&u>=0&&u<=1)hits.push(t);}
  if(inside(origin,h.feature))hits.push(0);
  return {...h,crossFront:hits.length>=2?Math.round(Math.min(...hits)):null,crossBack:hits.length>=2?Math.round(Math.max(...hits)):null};
 });
}
export function caddiePlans({origin,target,points={},features=[],clubs={},stats={},wind=0,relation='',elevation=0,missBias=''}){
 if(!validPoint(origin)||!validPoint(target)||meters(origin,target)<5)return [];
 const remaining=meters(origin,target),b=direction(origin,target),hazards=features.filter(f=>['bunker','water','ob'].includes(kindOf(f))),safeAreas=features.filter(f=>['fairway','green'].includes(kindOf(f))),hasLanding=safeAreas.length>0;
 const candidates=[];
 for(const [club,total] of Object.entries(clubs)){
  const s=stats[club]||{},carry=Number(s.carry??Number(total)*.92),run=Math.max(0,Number(s.total??total)-carry),lateral=Math.max(2,Number(s.dispersion??12)),longitudinal=Math.max(4,Number(s.carrySD??carry*.07)),bias=/우/.test(missBias)?lateral*.35:/좌/.test(missBias)?-lateral*.35:0;
  if(!(carry>0)||carry>remaining+Math.max(25,lateral))continue;
  const travel=carry-Number(elevation||0)*.9+((relation==='앞바람'||relation==='맞바람')?-2.2:Number(relation==='뒷바람')*1.21)*Number(wind||0);
  for(const aim of [-lateral,0,lateral]){
   const landing=offset(origin,travel,aim,b),finish=offset(origin,travel+run,aim,b);let bad=0,penalty=0,safe=0,weight=0;
   // Weighted deterministic quadrature, not a claim of measured success probability.
   for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const w=Math.exp(-(i*i+j*j)/2),p=offset(origin,travel+i*longitudinal,aim+bias+j*lateral,b),f=hazards.find(h=>inside(p,h)),ok=safeAreas.some(h=>inside(p,h));weight+=w;if(f){bad+=w;penalty+=w*(kindOf(f)==='bunker'?.8:2);}if(ok&&!f)safe+=w;}
   const hit=hazards.find(f=>inside(finish,f));if(hit)penalty+=weight*.25;
   const loss=penalty/weight+(hasLanding?(1-safe/weight)*.35:0),next=meters(finish,target),expected=1+next/150+loss+(next<40?.12:0);
   candidates.push({club,carry:Math.round(carry),requiredCarry:Math.round(meters(origin,landing)),total:Math.round(travel+run),dispersion:Math.round(lateral),longitudinal:Math.round(longitudinal),success:hasLanding?Math.round(safe/weight*100):null,risk:Math.round(bad/weight*100),expected,landing,finish,bearing:b,direction:Math.round(direction(origin,landing)),nextDistance:Math.round(next),nextDifficulty:loss>.5?'위험구역 인접':next>190?'긴 다음 샷':'일반',loss,samples:Number(s.samples||0),hazards:hazards.filter(f=>inside(landing,f)||inside(finish,f)).map(f=>({bunker:'벙커',water:'물/해저드',ob:'OB'}[kindOf(f)]))});
  }
 }
 if(!candidates.length)return [];
 const pick=(riskWeight,progressWeight)=>[...candidates].sort((a,b)=>(a.expected+a.loss*riskWeight-a.total*progressWeight)-(b.expected+b.loss*riskWeight-b.total*progressWeight))[0];
 return [['SAFE',pick(2,0)],['STANDARD',pick(.5,0)],['AGGRESSIVE',pick(.1,.003)]].map(([mode,c])=>({...c,mode,reason:`${c.club} 캐리 ${c.carry}m · 좌우 분산 ±${c.dispersion}m. ${c.hazards.length?c.hazards.join('·')+' 착지 위험. ':''}다음 샷 약 ${c.nextDistance}m를 남기는 공략.`,confidence:hasLanding?'입력 지형·분산 기반 추정':'착지면 경계 부족 · 성공확률 계산 보류'}));
}
export function planGeoJSON(origin,plan){const fs=[];const line=(a,b,type)=>fs.push({type:'Feature',properties:{type},geometry:{type:'LineString',coordinates:[[a.lng,a.lat],[b.lng,b.lat]]}});if(!plan||!validPoint(origin))return {type:'FeatureCollection',features:[]};line(origin,plan.landing,'aim');line(plan.landing,plan.finish,'run');const ring=[];for(let i=0;i<=48;i++){const t=i/48*Math.PI*2,p=offset(plan.landing,Math.cos(t)*plan.longitudinal*2,Math.sin(t)*plan.dispersion*2,plan.bearing);ring.push([p.lng,p.lat]);}fs.push({type:'Feature',properties:{type:'dispersion'},geometry:{type:'Polygon',coordinates:[ring]}});return {type:'FeatureCollection',features:fs};}
