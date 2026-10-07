export function buildCourseGeoJSON({points={},shots=[]}={}){
 const features=[];const add=(p,type,name)=>{if(p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng)))features.push({type:"Feature",properties:{type,name},geometry:{type:"Point",coordinates:[Number(p.lng),Number(p.lat)]}})};
 for(const [k,p] of Object.entries(points))add(p,"course-point",k);
 shots.forEach((s,i)=>add(s.position,"shot",`${i+1}타 ${s.club||""}`));
 const path=shots.filter(s=>s.position).map(s=>[Number(s.position.lng),Number(s.position.lat)]);
 if(path.length>1)features.push({type:"Feature",properties:{type:"shot-path",name:"샷 경로"},geometry:{type:"LineString",coordinates:path}});
 return {type:"FeatureCollection",features};
}
export function downloadGeoJSON(data,name="golf-course-field.geojson"){
 if(typeof document==="undefined")return false;const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/geo+json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
}