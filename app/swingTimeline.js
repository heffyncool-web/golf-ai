export const GOLF_PHASES=["어드레스","테이크백","백스윙 탑","전환","다운스윙","임팩트","피니시"];
export const CAMERA_HINTS={
 "다운더라인":"손 높이에 카메라를 놓고 손-목표선 방향을 향하게 합니다. 골프채와 발끝을 모두 화면에 넣으세요.",
 "정면":"가슴 높이에서 몸의 정면을 촬영하고 공과 발을 포함해 전신이 보이도록 하세요."
};
function finite(n){return typeof n==="number"&&Number.isFinite(n);}
function clamp(a,b,v){return Math.max(a,Math.min(b,v));}
export function handHeight(landmarks){
  if(!Array.isArray(landmarks))return null;
  const a=landmarks[15],b=landmarks[16],sh=landmarks[11],rh=landmarks[12],lh=landmarks[23],rhip=landmarks[24];
  if(!a||!b||!sh||!rh||!lh||!rhip)return null;
  const hand=(a.y+b.y)/2,shoulder=(sh.y+rh.y)/2,hip=(lh.y+rhip.y)/2;
  return [hand,shoulder,hip].every(finite)?{hand,shoulder,hip}:null;
}
export function inferPhaseTimeline(samples=[]){
  const sorted=samples.filter(s=>finite(s.time)&&s.pose&&finite(s.pose.hand)).sort((a,b)=>a.time-b.time);
  if(sorted.length<12)return {marks:{},confidence:"insufficient",reason:"분석된 자세 프레임이 부족합니다. 전신을 밝게 촬영하세요."};
  const n=sorted.length;
  const start=clamp(0,n-1,Math.round((n-1)*.04));
  const end=clamp(start+1,n-1,Math.round((n-1)*.96));
  const lowTop=Math.min(end-4,Math.max(start+2,Math.floor(n*.12)));
  const highTop=Math.max(lowTop,Math.min(end-4,Math.floor(n*.66)));
  let top=lowTop;
  for(let i=lowTop+1;i<=highTop;i++)if(sorted[i].pose.hand<sorted[top].pose.hand)top=i;
  let impact=Math.min(end-2,top+2);
  for(let i=impact+1;i<=Math.min(end-1,Math.floor(n*.92));i++)if(sorted[i].pose.hand>sorted[impact].pose.hand)impact=i;
  const minAtTop=sorted[top].pose.hand;
  const rise=sorted[start].pose.hand-minAtTop;
  const fall=sorted[impact].pose.hand-minAtTop;
  const dynamic=rise>.08&&fall>.10&&impact>=top+3;
  if(!dynamic)return {marks:{},confidence:"low",reason:"손의 높낮이 변화에서 뚜렷한 백스윙·임팩트 구간을 찾지 못했습니다. 직접 단계 지점을 지정하세요."};
  let finish=Math.min(end,impact+1);
  for(let i=finish+1;i<=end;i++)if(sorted[i].pose.hand<sorted[finish].pose.hand)finish=i;
  const nearest=(fraction)=>clamp(start,finish,Math.round(fraction));
  const idx={
    "어드레스":start,
    "테이크백":nearest(start+(top-start)*.55),
    "백스윙 탑":top,
    "전환":nearest(top+(impact-top)*.12),
    "다운스윙":nearest(top+(impact-top)*.58),
    "임팩트":impact,
    "피니시":finish
  };
  const marks=Object.fromEntries(GOLF_PHASES.map(phase=>[phase,sorted[idx[phase]].time]));
  return {marks,confidence:fall>.17&&rise>.13?"medium":"low",reason:"손 위치의 상하 움직임을 이용한 예상 단계입니다. 실제 임팩트는 반드시 영상으로 확인하세요.",sampleCount:n};
}
export function coachingFromDifferences(compare,phase,club,view){
  const found=(compare||[]).filter(r=>finite(r.diff)).sort((a,b)=>b.diff-a.diff);
  const major=found[0];
  if(!major)return {title:"영상 비교 대기",summary:"동일한 단계의 내 영상과 참고 영상을 분석하세요.",drill:"삼각대 높이와 카메라 방향을 같게 두고 다시 촬영하세요."};
  const guide={
    spine:["상체 기울기를 유지하며 가슴이 먼저 들리는지 확인하세요.","공 없이 가슴 앞에 클럽을 대고 어드레스→임팩트를 천천히 5회 반복하세요."],
    shoulder:["양쪽 어깨의 기울기와 상체 회전을 구분해 확인하세요.","정면·후방을 별도 촬영하고 어깨선 위치를 3회 비교하세요."],
    hip:["골반 기울기 차이는 회전량과 다릅니다. 좌우 높이를 확인하세요.","벽에 엉덩이를 가볍게 닿게 두고 천천히 전환 동작을 5회 반복하세요."],
    rightElbow:["오른팔꿈치가 몸통에서 과도하게 떨어지는지 확인하세요.","오른팔꿈치가 몸통 가까이 내려오는 50% 속도 연습을 5회 실시하세요."],
    leftKnee:["왼무릎 각도를 확인하고 체중이동·골반 회전을 혼동하지 마세요.","맨손으로 왼발 디딤과 균형을 5회 연습하세요."],
    rightKnee:["오른무릎 각도가 변하는 구간과 중심 이동을 확인하세요.","무릎 과신전 없이 균형을 유지하는 빈스윙 5회 실시하세요."]
  };
  const [hint,drill]=guide[major.key]||["같은 구도에서 해당 관절 움직임을 비교하세요.","50% 속도로 반복 촬영하세요."];
  const title=major.diff>=7?major.label+"부터 확인":"큰 2D 관절각 차이 미확인";
  return {
    title,
    summary:major.label+"이 참고 영상과 약 "+major.diff+"° 다릅니다. "+hint,
    drill,
    phase,club,view,
    caution:"이 차이는 2D 영상 관측값이며 스윙 오류의 확정 판정이 아닙니다. 생크·뒤땅·훅은 타점과 클럽 궤도도 함께 점검해야 합니다."
  };
}
export function newPracticeEntry({club,angle,phase,coaching,metrics,reference,time}){
  return {
    id:(typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(36).slice(2),
    createdAt:new Date().toISOString(),club,angle,phase,
    priority:coaching?.title||"자세 비교 기록",summary:coaching?.summary||"",
    drill:coaching?.drill||"",metrics:metrics||null,reference:reference||"",
    videoTime:finite(time)?time:null
  };
}
