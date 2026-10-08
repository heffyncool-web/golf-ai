import { normalizeCourseImport } from './courseImporter';
export const packageKey=id=>`golfCoursePackage:${id}`;
export function parseCoursePackage(raw,course){
 const src=typeof raw==='string'?JSON.parse(raw):raw;
 if(src?.type!=='GolfCoursePackage'||src.schemaVersion!==1)throw Error('GolfCoursePackage 버전 1 파일이 필요합니다');
 if(src.courseId!==course.id)throw Error('선택한 골프장과 파일의 골프장이 다릅니다');
 if(!src.source?.name?.trim()||!src.source?.license?.trim())throw Error('자료 출처와 이용 조건을 입력하세요');
 if(!Array.isArray(src.holes)||!src.holes.length||src.holes.length>54)throw Error('홀 자료는 1~54개여야 합니다');
 const seen=new Set();
 const point=p=>{if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180)throw Error('유효한 WGS84 좌표가 아닙니다');
 if(course.mapCenter&&Math.hypot((p.lat-course.mapCenter.lat)*111000,(p.lng-course.mapCenter.lng)*111000*Math.cos(course.mapCenter.lat*Math.PI/180))>15000)throw Error('좌표가 선택한 골프장에서 너무 멉니다');};
 const coordinate=c=>{if(!Array.isArray(c)||c.length<2)throw Error('좌표 형식 오류');point({lng:c[0],lat:c[1]});};
 const ring=r=>{if(!Array.isArray(r)||r.length<4||new Set(r.map(x=>JSON.stringify(x?.slice(0,2)))).size<3||JSON.stringify(r[0])!==JSON.stringify(r.at(-1)))throw Error('폴리곤은 닫힌 경계여야 합니다');r.forEach(coordinate);};
 const geometry=g=>{if(!g)throw Error('도형이 없습니다');switch(g.type){case 'Point':coordinate(g.coordinates);break;case 'LineString':if(g.coordinates?.length<2)throw Error('중심선 좌표 부족');g.coordinates.forEach(coordinate);break;case 'Polygon':if(!g.coordinates?.length)throw Error('경계가 없습니다');g.coordinates.forEach(ring);break;case 'MultiPolygon':if(!g.coordinates?.length)throw Error('경계가 없습니다');g.coordinates.forEach(p=>p.forEach(ring));break;default:throw Error('지원하지 않는 도형');}};
 const holes=src.holes.map(h=>{
 if(!Object.hasOwn(course.courses||{},h.course)||!Number.isInteger(h.hole)||!course.courses[h.course][h.hole-1])throw Error('등록된 코스명·홀 번호와 일치하지 않습니다');
 const key=`${h.course}:${h.hole}`;if(seen.has(key))throw Error('같은 코스·홀 자료가 중복되었습니다');seen.add(key);
 const d=h.data;if(!d||typeof d!=='object')throw Error('홀 지도 자료가 없습니다');
 Object.values(d.points||{}).filter(Boolean).forEach(point);
 Object.values(d.areas||{}).forEach(a=>{if(!Array.isArray(a))throw Error('영역 형식 오류');a.forEach(point);});
 const fs=d.features||[];if(!Array.isArray(fs))throw Error('객체 목록 형식 오류');fs.forEach(f=>geometry(f.geometry));
 if(d.type==='FeatureCollection')for(const kind of ['tee','green']){const n=fs.filter(f=>f.geometry.type==='Point'&&(kind==='green'?['green','pin'].includes(f.properties?.golf||f.properties?.kind):[kind].includes(f.properties?.golf||f.properties?.kind))).length;if(n>1)throw Error('티 또는 그린 좌표가 여러 개여서 자동 선택할 수 없습니다');}
 const data=normalizeCourseImport(d);if(!data?.points?.tee||!data?.points?.center)throw Error('각 홀의 티와 그린 중앙 좌표가 필요합니다');point(data.points.tee);point(data.points.center);
 return {course:h.course,hole:h.hole,data:{...data,source:src.source.name,attribution:src.source.license,matchStatus:'등록 자료 · 현장 검증 필요'}};
 });
 return {type:'GolfCoursePackage',schemaVersion:1,courseId:src.courseId,source:src.source,holes,importedAt:new Date().toISOString()};
}
export const selectPackageHole=(pkg,name,number)=>pkg?.holes?.find(h=>h.course===name&&h.hole===number)?.data||null;
