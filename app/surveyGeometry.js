export function pixelDistance(a,b,aspectRatio=1){
 if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
 return Math.hypot((b.x-a.x)*aspectRatio,b.y-a.y);
}
export function planarPolygonArea(vertices,aspectRatio=1){
 if(!Array.isArray(vertices)||vertices.length<3)return null;
 if(!vertices.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
 let twice=0;
 for(let i=0;i<vertices.length;i++){
  const a=vertices[i],b=vertices[(i+1)%vertices.length];
  twice+=aspectRatio*(a.x*b.y-b.x*a.y);
 }
 return Math.abs(twice)/2;
}
export function worldDistance(a,b){
 if(!a||!b||![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite))return null;
 return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
export function worldPlanarArea(points){
 if(!Array.isArray(points)||points.length<3)return null;
 // Cross-product polygon area vector for a 3D planar boundary.
 if(!points.every(p=>p&&[p.x,p.y,p.z].every(Number.isFinite)))return null;
 let nx=0,ny=0,nz=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  nx+=a.y*b.z-a.z*b.y;
  ny+=a.z*b.x-a.x*b.z;
  nz+=a.x*b.y-a.y*b.x;
 }
 return Math.hypot(nx,ny,nz)/2;
}
export function planeResidual(points){
 if(!Array.isArray(points)||points.length<3)return null;
 const p=points[0],a=points[1],b=points[2];
 const u={x:a.x-p.x,y:a.y-p.y,z:a.z-p.z},v={x:b.x-p.x,y:b.y-p.y,z:b.z-p.z};
 const n={x:u.y*v.z-u.z*v.y,y:u.z*v.x-u.x*v.z,z:u.x*v.y-u.y*v.x};
 const size=Math.hypot(n.x,n.y,n.z);
 if(size<1e-8)return null;
 return Math.max(...points.map(pt=>Math.abs((pt.x-p.x)*n.x+(pt.y-p.y)*n.y+(pt.z-p.z)*n.z)/size));
}
export function referenceScale(a,b,knownMeters,aspectRatio=1){
 const px=pixelDistance(a,b,aspectRatio),meter=Number(knownMeters);
 return px&&meter>0&&Number.isFinite(meter)?meter/px:null;
}
export function estimatedMeasurement({kind,reference,referenceLength,points,imageAspectRatio=1}={}){
 if(!["distance","area"].includes(kind))return {error:"측정 종류 미지원"};
 const scale=referenceScale(reference?.[0],reference?.[1],referenceLength,imageAspectRatio);
 if(!scale)return {error:"같은 평면의 실제 기준거리를 먼저 설정하세요."};
 if(kind==="distance"){
   if(!points||points.length!==2)return {error:"두 점을 지정하세요."};
   return {value:pixelDistance(points[0],points[1],imageAspectRatio)*scale,unit:"m",method:"same-plane reference",warning:"원근·투영오차가 있을 수 있는 화면상 참고치. 실측 아님."};
 }
 const area=planarPolygonArea(points,imageAspectRatio);
 if(area==null)return {error:"면적을 계산하려면 동일 평면의 점을 3개 이상 선택하세요."};
 return {value:area*scale*scale,unit:"㎡",method:"same-plane reference",warning:"원근·기울기·비평면 구조가 있으면 부정확. 건축면적·연면적이 아님."};
}
