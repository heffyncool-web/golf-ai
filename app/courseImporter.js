export function normalizeCourseImport(raw){
 const src=typeof raw==="string"?JSON.parse(raw):raw;
 if(!src)return null;
 if(src.type==="FeatureCollection"){
  const points={},areas={fairway:[],green:[],bunker:[],water:[],ob:[]};
  for(const f of src.features||[]){
   const p=f.properties||{},g=f.geometry||{},kind=String(p.golf||p.kind||p.type||"").toLowerCase();
   if(g.type==="Point"){
    const [lng,lat]=g.coordinates||[]; if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
    if(kind==="tee")points.tee={lat,lng,source:"download"};
    if(kind==="green"||kind==="pin")points.center={lat,lng,source:"download"};
   }
   if(g.type==="Polygon"){
    const ring=(g.coordinates?.[0]||[]).map(([lng,lat])=>({lat,lng,source:"download"}));
    if(kind==="fairway")areas.fairway.push(...ring);
    else if(kind==="green")areas.green.push(...ring);
    else if(kind==="bunker")areas.bunker.push(...ring);
    else if(/water|hazard|penalty/.test(kind))areas.water.push(...ring);
    else if(kind==="ob")areas.ob.push(...ring);
   }
  }
  return {points,areas,source:"GeoJSON 다운로드",importedAt:new Date().toISOString()};
 }
 if(src.points||src.areas)return {...src,source:src.source||"다운로드 파일",importedAt:src.importedAt||new Date().toISOString()};
 throw new Error("지원하지 않는 코스 데이터 형식");
}
