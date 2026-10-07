export function buildClubProfile(clubs){
  return Object.entries(clubs).filter(([,v])=>Number(v)>0).map(([name,total])=>{
    const wedge=/PW|AW|SW|56/i.test(name), carry=Math.round(Number(total)*(wedge?.9:.92));
    return {name,total:Number(total),carry,dispersion:wedge?6:name==="Driver"?22:12};
  });
}
export function strategyOptions({clubs,remaining,hazard=null,downstreamRisk="none",missBias="중앙"}){
  const profile=buildClubProfile(clubs);
  const front=Number(hazard?.front||0), width=Number(hazard?.width||0);
  const minimumCarry=front?front+width:0, safeCarry=minimumCarry?minimumCarry+7:0;
  const dangerAfter=downstreamRisk!=="none";
  const candidates=profile.map(c=>{
    const clears=!minimumCarry||c.carry>=safeCarry;
    const overrun=dangerAfter&&c.total>safeCarry+12;
    const gap=Math.abs(c.total-remaining);
    const risk=(clears?0:45)+(overrun?32:0)+c.dispersion*.7+gap*.08;
    return {...c,clears,overrun,risk:Math.round(risk)};
  }).sort((a,b)=>a.risk-b.risk);
  const safe=candidates.find(c=>c.clears&&!c.overrun)||candidates[0];
  const standard=candidates.find(c=>c.clears&&c.total<=remaining+15)||safe;
  const aggressive=candidates.filter(c=>c.clears).sort((a,b)=>b.total-a.total)[0]||standard;
  const layup=profile.filter(c=>minimumCarry&&c.total<front-8).sort((a,b)=>b.total-a.total)[0];
  const explain=(c,mode)=>({
    mode,club:c?.name||"-",carry:c?.carry||0,total:c?.total||0,risk:c?.risk??99,
    text: c?.overrun?`장애물은 넘지만 이후 ${downstreamRisk} 위험이 있어 직접 공략보다 레이업을 우선 검토합니다.`
      :c?.clears?`최소 캐리 ${minimumCarry||"-"}m, 안전 캐리 ${safeCarry||"-"}m 기준을 충족합니다. ${missBias} 방향의 넓은 착지면을 우선합니다.`
      :`안전 캐리 ${safeCarry}m에 부족해 직접 공략을 권하지 않습니다.`
  });
  let result={minimumCarry,safeCarry,safe:explain(safe,"SAFE"),standard:explain(standard,"STANDARD"),aggressive:explain(aggressive,"AGGRESSIVE"),layup:null};
  if(dangerAfter&&layup) result.layup={club:layup.name,carry:layup.carry,total:layup.total,text:`${layup.name} 약 ${layup.total}m 레이업 후 다음 샷을 편한 거리로 남기는 대안입니다.`};
  return result;
}
