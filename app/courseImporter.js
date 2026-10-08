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
   if(g.type==="Polygon"&&kind==="green"&&!points.center){const coords=g.coordinates?.[0]||[];if(coords.length){const lat=coords.reduce((n,p)=>n+p[1],0)/coords.length,lng=coords.reduce((n,p)=>n+p[0],0)/coords.length;points.center={lat,lng,source:"download",precision:"polygon-centroid-estimate"}}}
   if(g.type==="Polygon"){
    const ring=(g.coordinates?.[0]||[]).filter(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)).map(([lng,lat])=>({lat,lng,source:"download"}));
    if(kind==="fairway"&&ring.length>=3)areas.fairway.push(...ring);
    else if(kind==="green")areas.green.push(...ring);
    else if(kind==="bunker")areas.bunker.push(...ring);
    else if(/water|hazard|penalty/.test(kind))areas.water.push(...ring);
    else if(kind==="ob")areas.ob.push(...ring);
   }
  }
  // Keep independent polygons: joining multiple bunkers creates imaginary bridges.
  const features=(src.features||[]).filter(f=>f?.geometry);
  const holeLine=features.find(f=>f.properties?.golf==="hole"&&f.geometry?.type==="LineString");
  if(holeLine){const coords=holeLine.geometry.coordinates;if(coords.length>=2){points.tee??={lng:coords[0][0],lat:coords[0][1],source:"hole-line-estimate"};points.center??={lng:coords.at(-1)[0],lat:coords.at(-1)[1],source:"hole-line-estimate"};}}
  return {points,areas,features,source:"GeoJSON 다운로드",importedAt:new Date().toISOString()};
 }
 if(src.points||src.areas)return {...src,source:src.source||"다운로드 파일",importedAt:src.importedAt||new Date().toISOString()};
 throw new Error("지원하지 않는 코스 데이터 형식");
}

export function selectOSMHole(raw,number,courseName){
 const features=raw?.features||[];
 const normalize=v=>String(v||"").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
 const n=String(number),c=normalize(courseName);
 const holeLines=features.filter(f=>f.properties?.golf==="hole"&&String(f.properties?.ref||"").trim()===n);
 const matched=holeLines.filter(f=>!f.properties?.name||normalize(f.properties.name).includes(c));
 if(matched.length!==1)return {status:"unmatched",reason:matched.length>1?"동일 번호 홀이 여러 개 있어 자동 배정 불가":"코스명이 확인된 홀 중심선이 없어 자동 배정 불가",features:[]};
 const line=matched[0].geometry?.coordinates||[];
 if(line.length<2)return {status:"unmatched",reason:"홀 중심선 좌표 부족",features:[]};
 const d=(a,b)=>Math.hypot((a[0]-b[0])*90000,(a[1]-b[1])*111000);
 const near=(f,p,max)=>{const g=f.geometry||{};const cs=g.type==="Point"?[g.coordinates]:g.type==="Polygon"?g.coordinates?.[0]:g.type==="LineString"?g.coordinates:[];return cs?.some(x=>d(x,p)<max)};
 const selected=features.filter(f=>f===matched[0]||((f.properties?.golf==="tee"&&near(f,line[0],110))||(f.properties?.golf==="green"&&near(f,line.at(-1),110))||(["fairway","bunker","water_hazard"].includes(f.properties?.golf)&&line.some(p=>near(f,p,75)))));
 return {status:"estimated",reason:"OSM 중심선 기준 주변 객체 자동 추정 · 현장 검증 필요",features:selected};
}
