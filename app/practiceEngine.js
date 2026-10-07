const SHORT_DISTANCES=[5,10,15,20,30,40,50];
const LIES=["fairway","tight","rough","bunker","highlip"];
const bad=new Set(["OB","해저드","벙커","짧음","김"]);
export function shortGameMatrix(records=[]){
 const rows=records.filter(r=>["PW","56°","SW"].includes(r.club)&&Number(r.distance)>0);
 const cells=[];
 for(const club of ["PW","56°"])for(const distance of SHORT_DISTANCES)for(const lie of LIES){
  const near=rows.filter(r=>(r.club===club||(club==="56°"&&r.club==="SW"))&&(r.lie||"fairway")===lie&&Math.abs(Number(r.targetDistance||r.distance)-distance)<=3);
  if(!near.length)continue;
  const success=near.filter(r=>r.success===true||(!bad.has(r.miss)&&Math.abs(Number(r.distance)-distance)<=Math.max(3,distance*.2))).length;
  cells.push({club,distance,lie,samples:near.length,successRate:Math.round(success/near.length*100)});
 }
 return cells;
}
export function weaknessMissions(matrix=[]){
 const ranked=matrix.filter(x=>x.samples>=3).sort((a,b)=>a.successRate-b.successRate||b.samples-a.samples).slice(0,4);
 if(!ranked.length)return[
  {id:"baseline-pw10",club:"PW",distance:10,lie:"fairway",title:"PW 10m 기준 만들기",goal:"10구 중 7구를 목표 반경 안에"},
  {id:"baseline-56-20",club:"56°",distance:20,lie:"fairway",title:"56° 20m 기준 만들기",goal:"10구 캐리·총거리 기록"},
  {id:"baseline-bunker",club:"56°",distance:20,lie:"bunker",title:"20m 벙커 기준 만들기",goal:"10구 중 7구 탈출"}
 ];
 return ranked.map((x,i)=>({id:`weak-${x.club}-${x.distance}-${x.lie}`,club:x.club,distance:x.distance,lie:x.lie,title:`${x.club} ${x.distance}m ${labelLie(x.lie)} 보완`,goal:`현재 성공률 ${x.successRate}% → 10구 중 8구 성공 목표`,priority:i+1}));
}
export function labelLie(lie){return({fairway:"보통 잔디",tight:"맨땅/타이트",rough:"깊은 러프",bunker:"벙커",highlip:"높은 턱 벙커"}[lie]||lie)}

export function personalShortGameChoice(matrix=[],distance,lie="fairway"){
 const d=Number(distance), candidates=matrix.filter(x=>Math.abs(x.distance-d)<=5&&x.lie===lie&&x.samples>=3);
 if(!candidates.length)return null;
 const ranked=[...candidates].sort((a,b)=>b.successRate-a.successRate||b.samples-a.samples);
 const best=ranked[0],other=ranked.find(x=>x.club!==best.club);
 return {best,other,confidence:best.samples>=10?"높음":best.samples>=5?"보통":"초기",text:other?`개인 기록상 ${best.club} 성공률 ${best.successRate}%가 ${other.club} ${other.successRate}%보다 높아 ${best.club}를 우선 추천합니다.`:`개인 기록상 ${best.club} ${best.distance}m 성공률은 ${best.successRate}%입니다.`};
}
