import {referenceScale} from "./surveyGeometry";
/** 2D photo-referenced CAD sketch (not actual ARCore 3D survey).
 *  All points assumed to lie in the same calibrated plane.
 *  Scale must use actual photo aspect ratio, not normalized x/y Euclidean space.
 */
export function survey2dDxf({reference,referenceLength,points,imageAspectRatio=1,closed=false}={}){
 if(!Number.isFinite(imageAspectRatio)||imageAspectRatio<=0)throw Error("촬영 사진 비율 미확인");
 const scale=referenceScale(reference?.[0],reference?.[1],referenceLength,imageAspectRatio);
 if(!scale || !Number.isFinite(scale))throw Error("실제 기준길이 설정이 필요합니다.");
 if(!Array.isArray(points)||points.length<(closed?3:2))throw Error("측정할 점이 충분하지 않습니다.");
 if(!points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)))throw Error("유효하지 않은 측정점");
 const origin=reference[0];
 const coords=points.map(p=>[(p.x-origin.x)*imageAspectRatio*scale,(origin.y-p.y)*scale]);
 const pair=(k,v)=>k+"\n"+v+"\n";
 const txt=(p,str,layer)=>pair(0,"TEXT")+pair(8,layer)+pair(10,p[0])+pair(20,p[1])+pair(30,0)+pair(40,0.08)+pair(1,str);
 let d=pair(999,"Photo-calibrated approximate DXF; camera perspective not corrected; not an as-built survey");
 d+=pair(0,"SECTION")+pair(2,"HEADER")+pair(9,"$ACADVER")+pair(1,"AC1015")+pair(9,"$INSUNITS")+pair(70,6)+pair(0,"ENDSEC");
 d+=pair(0,"SECTION")+pair(2,"TABLES")+pair(0,"TABLE")+pair(2,"LAYER")+pair(70,2);
 for(const l of ["PHOTO_REFERENCE","LIMITATION"])d+=pair(0,"LAYER")+pair(2,l)+pair(70,0)+pair(62,l==="LIMITATION"?1:3)+pair(6,"CONTINUOUS");
 d+=pair(0,"ENDTAB")+pair(0,"ENDSEC")+pair(0,"SECTION")+pair(2,"ENTITIES");
 const n=closed?coords.length:coords.length-1;
 for(let i=0;i<n;i++){
  const a=coords[i],b=coords[(i+1)%coords.length];
  d+=pair(0,"LINE")+pair(8,"PHOTO_REFERENCE")+pair(10,a[0])+pair(20,a[1])+pair(30,0)+pair(11,b[0])+pair(21,b[1])+pair(31,0);
  d+=txt([(a[0]+b[0])/2,(a[1]+b[1])/2],Math.hypot(a[0]-b[0],a[1]-b[1]).toFixed(2)+" m","PHOTO_REFERENCE");
 }
 d+=txt(coords[0],"APPROXIMATE PHOTO REFERENCE - NOT SURVEYED","LIMITATION");
 d+=pair(0,"ENDSEC")+pair(0,"EOF");
 return d;
}
