export function shotPathSummary(shots=[]){
 const positioned=shots.filter(s=>s?.position&&Number.isFinite(Number(s.position.lat))&&Number.isFinite(Number(s.position.lng)));
 const legs=[];for(let i=1;i<positioned.length;i++){const a=positioned[i-1].position,b=positioned[i].position,R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;legs.push(Math.round(2*R*Math.asin(Math.sqrt(h))))}
 return {points:positioned.length,legs,total:legs.reduce((n,x)=>n+x,0),misses:shots.reduce((o,s)=>(o[s.miss]=(o[s.miss]||0)+1,o),{})};
}
export function roundReview(shotsByHole=[]){
 const flat=shotsByHole.flat(),gps=flat.filter(s=>s.position).length,ob=flat.filter(s=>s.miss==="OB").length,hazard=flat.filter(s=>s.miss==="해저드"||s.miss==="hazard").length;
 return {shots:flat.length,gps,ob,hazard,gpsRate:flat.length?Math.round(gps/flat.length*100):0};
}
