export function makeAddressRecord({club,targetDistance,lie,footAngle,shoulderAngle,shaftAngle,faceAngle,source="camera"}){
 return {id:Date.now(),createdAt:new Date().toISOString(),club,targetDistance:Number(targetDistance)||0,lie,alignment:{footAngle:Number(footAngle)||0,shoulderAngle:Number(shoulderAngle)||0,shaftAngle:Number(shaftAngle)||0,faceAngle:Number(faceAngle)||0},source};
}
export function addressScore(r){
 const a=r?.alignment||{},vals=[a.footAngle,a.shoulderAngle,a.faceAngle].map(x=>Math.abs(Number(x)||0));
 const max=Math.max(...vals),score=Math.max(0,100-Math.round(vals.reduce((n,v)=>n+v,0)*4));
 return {score,label:max<=3?"정렬 양호":max<=7?"조금 수정":"재정렬 필요"};
}
