export function learnClubStats(clubs,currentStats,shots){
 const flat=shots.flat().filter(s=>s&&s.club&&Number(s.distance)>0);
 const next={...currentStats};
 for(const club of Object.keys(clubs)){
  const rows=flat.filter(s=>s.club===club); if(rows.length<3)continue;
  const avg=a=>a.reduce((n,v)=>n+v,0)/a.length, totals=rows.map(s=>Number(s.distance));
  const carries=rows.map(s=>Number(s.carry||s.distance*.9));
  const lateral=rows.map(s=>Math.abs(Number(s.lateral||(["좌","우"].includes(s.miss)?12:0))));
  const ok=rows.filter(s=>!["OB","해저드","벙커"].includes(s.miss)).length;
  next[club]={...(next[club]||{}),carry:Math.round(avg(carries)),total:Math.round(avg(totals)),dispersion:Math.round(avg(lateral)),success:Math.round(ok/rows.length*100),samples:rows.length,learnedAt:new Date().toISOString()};
 }
 return next;
}
export function parseGolfzonText(text){
 const rows=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];
 for(const row of rows){
  const p=row.split(/[,\t]/).map(x=>x.trim()); if(p.length<2)continue;
  const club=p[0],distance=Number(String(p[1]).replace(/[^0-9.\-]/g,"")); if(!club||!distance)continue;
  out.push({club,distance,carry:Number(String(p[2]||"").replace(/[^0-9.\-]/g,""))||undefined,lateral:Number(String(p[3]||"").replace(/[^0-9.\-]/g,""))||0,miss:p[4]||"정타",source:"golfzon"});
 }
 return out;
}

export function parseGolfzonFile(name,text){
 const lower=String(name||"").toLowerCase();
 if(lower.endsWith(".json")){try{const d=JSON.parse(text),rows=Array.isArray(d)?d:(d.shots||d.data||[]);return rows.map(x=>({club:x.club||x.clubName,distance:Number(x.distance||x.totalDistance||x.total),carry:Number(x.carry||x.carryDistance)||undefined,lateral:Number(x.lateral||x.side)||0,miss:x.miss||x.result||"정타",source:"golfzon-file"})).filter(x=>x.club&&x.distance)}catch{return[]}}
 return parseGolfzonText(text);
}
