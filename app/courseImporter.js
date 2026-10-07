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
