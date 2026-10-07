const BAD=new Set(["OB","hazard","bunker"]);
export function linkAddressShot(address,shot){
 if(!address||!shot)return null;
 return {...address,shot:{club:shot.club||address.club,carry:Number(shot.carry)||0,total:Number(shot.total)||0,lateral:Number(shot.lateral)||0,miss:shot.miss||"",success:shot.success??!BAD.has(shot.miss)}};
}
export function alignmentPatterns(records=[]){
 const linked=records.filter(r=>r?.shot);
 if(linked.length<3)return {samples:linked.length,confidence:"초기",patterns:[],message:"연결된 어드레스+샷 기록이 3개 이상 필요합니다."};
 const axes=[["footAngle","발끝선"],["shoulderAngle","어깨선"],["faceAngle","클럽페이스"]];
 const patterns=axes.map(([key,label])=>{
  const pos=linked.filter(r=>(Number(r.alignment?.[key])||0)>=4),neg=linked.filter(r=>(Number(r.alignment?.[key])||0)<=-4);
  const summarize=(xs)=>{if(!xs.length)return null;const right=xs.filter(r=>Number(r.shot.lateral)>3||r.shot.miss==="우").length,left=xs.filter(r=>Number(r.shot.lateral)<-3||r.shot.miss==="좌").length;return {samples:xs.length,rightPct:Math.round(right/xs.length*100),leftPct:Math.round(left/xs.length*100)}};
  return {key,label,positive:summarize(pos),negative:summarize(neg)};
 }).filter(x=>x.positive||x.negative);
 const confidence=linked.length>=20?"높음":linked.length>=8?"보통":"초기";
 return {samples:linked.length,confidence,patterns,message:`어드레스와 실제 샷 ${linked.length}개를 연결해 분석했습니다.`};
}
export function alignmentCoaching(analysis){
 if(!analysis?.patterns?.length)return analysis?.message||"학습 데이터가 부족합니다.";
 let best=null;
 for(const p of analysis.patterns)for(const [dir,d] of [["열림/양의",p.positive],["닫힘/음의",p.negative]])if(d&&d.samples>=3){const peak=Math.max(d.rightPct,d.leftPct);if(!best||peak>best.peak)best={label:p.label,dir,...d,peak,miss:d.rightPct>=d.leftPct?"우측":"좌측"}}
 return best?`${best.label}이 ${best.dir} 방향일 때 ${best.miss} 미스가 ${best.peak}%입니다(표본 ${best.samples}). 다음 연습에서는 이 정렬을 중립에 가깝게 맞추고 결과를 다시 비교하세요.`:"특정 정렬과 미스의 반복 패턴을 확인하려면 같은 조건의 샷을 더 기록하세요.";
}

export function scopedAlignment(records=[],club="",distance=0){
 const d=Number(distance)||0, band=d?Math.floor(d/25)*25:0;
 const scoped=records.filter(r=>r?.shot&&(!club||r.club===club)&&(!band||Math.floor((Number(r.targetDistance)||0)/25)*25===band));
 return {...alignmentPatterns(scoped),club,band};
}
export function preShotWarning(records=[],club="",distance=0){
 const a=scopedAlignment(records,club,distance),tip=alignmentCoaching(a);
 if(a.samples<3)return {level:"info",text:`${club||"이 클럽"} 조건의 정렬 학습 표본이 ${a.samples}개입니다. 샷 전 정렬을 기록하면 개인 경고가 정교해집니다.`,analysis:a};
 const risky=/미스가 (\d+)%/.exec(tip),pct=risky?Number(risky[1]):0;
 return {level:pct>=70?"warn":"info",text:tip,analysis:a};
}
export function alignmentPracticeMission(records=[],club="",distance=0){
 const w=preShotWarning(records,club,distance),n=w.analysis.samples;
 return {title:`${club||"선택 클럽"} 정렬 리셋 10구`,steps:["공 뒤에서 목표점 1개 선택","클럽페이스를 목표에 먼저 정렬","발끝선과 어깨선을 목표선에 평행하게 확인","10구의 좌우 편차와 결과를 기록"],goal:n<8?"표본 8개 확보":"기존 미스 비율보다 20% 이상 감소",warning:w.text};
}
