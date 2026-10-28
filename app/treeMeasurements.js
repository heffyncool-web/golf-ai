// Measurement helpers shared between native ARCore adapter and the camera preview.
// These functions do not infer scale from an uncalibrated photograph.
export const TREE_FIELDS=[
 {key:"H",name:"수고",unit:"m",method:"지표면~수관 정상부 3D 높이",primary:"AR"},
 {key:"B",name:"흉고직경",unit:"cm",method:"지상 1.2m 수간 직경",primary:"AR/참조물"},
 {key:"R",name:"근원직경",unit:"cm",method:"지표면과 접하는 부분의 줄기 직경",primary:"AR/참조물"},
 {key:"W",name:"수관폭",unit:"m",method:"수관 양끝의 수평 거리",primary:"AR"},
];
export const COMMON_TREE_NAMES={
 "Pinus densiflora":"소나무",
 "Pinus thunbergii":"곰솔(해송)",
 "Pinus koraiensis":"잣나무",
 "Pinus strobus":"스트로브잣나무",
 "Zelkova serrata":"느티나무",
 "Ginkgo biloba":"은행나무",
 "Acer palmatum":"단풍나무",
 "Prunus persica":"복숭아나무",
 "Prunus mume":"매화나무",
 "Prunus salicina":"자두나무",
 "Diospyros kaki":"감나무",
 "Pyrus pyrifolia":"배나무",
 "Malus domestica":"사과나무",
 "Prunus armeniaca":"살구나무",
 "Quercus acutissima":"상수리나무",
 "Quercus mongolica":"신갈나무",
 "Metasequoia glyptostroboides":"메타세쿼이아",
 "Cryptomeria japonica":"삼나무",
};
export function koreanTreeName(scientific,common=[]){
  const key=String(scientific||"").trim();
  return COMMON_TREE_NAMES[key]||common.find(s=>/[가-힣]/.test(s))||key||"수종 미확인";
}
export function pointDistance(a,b){
  if(!a||!b||!["x","y","z"].every(k=>Number.isFinite(a[k])&&Number.isFinite(b[k])))return null;
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
export function estimateARMeasurements({base,top,left,right,crownLeft,crownRight,confidence}={}){
  // ARCore world-coordinate Y is vertical when tracking and gravity are available.
  const result={H:null,B:null,W:null,quality:"unverified",reason:""};
  if(base&&top&&[base.y,top.y].every(Number.isFinite)&&top.y>base.y){
    result.H=+(top.y-base.y).toFixed(2);
  }
  const diameter=pointDistance(left,right);
  if(diameter!=null&&diameter>0)result.B=+(diameter*100).toFixed(1);
  const canopy=crownLeft&&crownRight&&[crownLeft.x,crownLeft.z,crownRight.x,crownRight.z].every(Number.isFinite)?Math.hypot(crownLeft.x-crownRight.x,crownLeft.z-crownRight.z):null;
  if(canopy!=null&&canopy>0)result.W=+canopy.toFixed(2);
  const c=Number(confidence);
  result.quality=Number.isFinite(c)&&c>=.8?"추정·깊이신뢰도 높음":Number.isFinite(c)&&c>=.5?"추정·현장 재확인":"추정·신뢰도 낮음";
  result.reason="AR 좌표의 수고는 지면/정상부 검출, 직경은 같은 높이의 줄기 양끝 검출이 정확해야 합니다. 현장 실측값 아님.";
  return result;
}
export function referenceDiameterCm({referenceCm,referencePixels,trunkPixels}={}){
  const ref=Number(referenceCm),px=Number(referencePixels),trunk=Number(trunkPixels);
  if(![ref,px,trunk].every(Number.isFinite)||ref<=0||px<=0||trunk<=0)return null;
  return Math.round(10*ref*trunk/px)/10;
}
