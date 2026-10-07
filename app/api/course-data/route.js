import {NextResponse} from "next/server";
export const runtime="nodejs";
const endpoints=["https://overpass.private.coffee/api/interpreter","https://overpass.nchc.org.tw/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
const allowed=new Set(["tee","green","fairway","bunker","water_hazard","hole"]);
export async function GET(request){
 const u=new URL(request.url),lat=Number(u.searchParams.get("lat")),lng=Number(u.searchParams.get("lng"));
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<33||lat>39||lng<124||lng>132)return NextResponse.json({error:"지원하지 않는 좌표"},{status:400});
 const q=`[out:json][timeout:20];(nwr(around:1800,${lat},${lng})["golf"~"^(hole|tee|green|fairway|bunker|water_hazard)$"];);out geom;`;
 try{
  let response=null;const errors=[];
  for(const endpoint of endpoints){
   try{
    const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json","User-Agent":"GolfAI-CourseViewer/1.0 (OpenStreetMap attribution in UI)"},body:new URLSearchParams({data:q}),signal:AbortSignal.timeout(9500),cache:"no-store"});
    if(!r.ok){errors.push(r.status);continue;}
    response=r;break;
   }catch(e){errors.push(e?.name==="TimeoutError"?"timeout":"network");}
  }
  if(!response)throw Error("Overpass unavailable: "+errors.join(","));
  const data=await response.json();
  const features=[];
  for(const e of data.elements||[]){
   const kind=e.tags?.golf;if(!allowed.has(kind))continue;
   const geom=e.geometry;
   if(e.type==="node"&&Number.isFinite(e.lon)&&Number.isFinite(e.lat)){features.push({type:"Feature",properties:{...e.tags,osmId:e.id},geometry:{type:"Point",coordinates:[e.lon,e.lat]}});continue}
   if(!Array.isArray(geom)||geom.length<2)continue;
   const coords=geom.filter(p=>Number.isFinite(p.lon)&&Number.isFinite(p.lat)).map(p=>[p.lon,p.lat]);
   if(coords.length<2)continue;
   const closed=coords.length>=4&&coords[0][0]===coords.at(-1)[0]&&coords[0][1]===coords.at(-1)[1];
   features.push({type:"Feature",properties:{...e.tags,osmId:e.id},geometry:closed?{type:"Polygon",coordinates:[coords]}:{type:"LineString",coordinates:coords}});
  }
  return NextResponse.json({type:"FeatureCollection",features,source:"OpenStreetMap / Overpass",license:"ODbL",attribution:"© OpenStreetMap contributors",fetchedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
 }catch(e){return NextResponse.json({error:"OSM 데이터 제공 서버가 응답하지 않습니다. 잠시 후 재시도하거나 GeoJSON 파일을 불러오세요.",retryable:true},{status:503,headers:{"Retry-After":"60"}})}
}
