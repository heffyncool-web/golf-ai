export function slopeAdjustedDistance(distance,elevationDelta=0){
 const d=Math.max(0,Number(distance)||0),h=Number(elevationDelta)||0;
 return Math.max(0,Math.round(d+h*.9));
}
export function windAdjustedDistance(distance,wind=0,relation="무풍"){
 const d=Number(distance)||0,w=Math.max(0,Number(wind)||0),f=(relation==="맞바람"||relation==="앞바람")?1:relation==="뒷바람"?-.55:0;
 return Math.max(0,Math.round(d+w*2.2*f));
}
export function effectiveDistance({distance,elevationDelta=0,wind=0,relation="무풍"}){
 const slope=slopeAdjustedDistance(distance,elevationDelta),effective=windAdjustedDistance(slope,wind,relation);
 return {raw:Math.round(Number(distance)||0),slope,effective,elevationDelta:Number(elevationDelta)||0,wind:Number(wind)||0,relation};
}
export function targetBias({missBias="중앙",dispersion=0,riskLeft=false,riskRight=false}={}){
 let meters=0,direction="중앙";const d=Math.max(0,Number(dispersion)||0);
 if(riskRight||missBias==="우"){meters=Math.round(d*.65);direction="좌"}else if(riskLeft||missBias==="좌"){meters=Math.round(d*.65);direction="우"}
 return {direction,meters,text:meters?`위험/개인 미스를 고려해 목표를 ${direction}쪽 약 ${meters}m 이동`:"중앙 안전면 유지"};
}
