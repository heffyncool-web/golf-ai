export function normalizeLineAngle(deg){let x=Number(deg)||0;while(x>90)x-=180;while(x<-90)x+=180;return Math.round(x*10)/10}
export function relativeLineAngle(deg,baseline=0){return normalizeLineAngle(normalizeLineAngle(deg)-normalizeLineAngle(baseline))}
export function smoothAngle(prev,next,alpha=.28){if(prev==null)return normalizeLineAngle(next);return Math.round((Number(prev)*(1-alpha)+normalizeLineAngle(next)*alpha)*10)/10}
export function poseAlignment(landmarks,baseline={foot:0,shoulder:0},prev={}){
 const p=landmarks;if(!p)return {valid:false};const ids=[11,12,27,28],ok=ids.every(i=>p[i]&&(p[i].visibility==null||p[i].visibility>.55));if(!ok)return {valid:false};
 const raw=(a,b)=>normalizeLineAngle(Math.atan2(p[b].y-p[a].y,p[b].x-p[a].x)*180/Math.PI);
 const shoulder=relativeLineAngle(raw(11,12),baseline.shoulder),foot=relativeLineAngle(raw(27,28),baseline.foot);
 return {valid:true,shoulder:smoothAngle(prev.shoulder,shoulder),foot:smoothAngle(prev.foot,foot),rawShoulder:raw(11,12),rawFoot:raw(27,28)};
}