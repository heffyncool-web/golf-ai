export function angleDiff(a,b){if(a==null||b==null)return null;return Math.abs(((a-b+540)%360)-180)}
export function alignmentGrade(targetBearing,deviceHeading,tolerance=5){
 const diff=angleDiff(targetBearing,deviceHeading);if(diff==null)return{ok:false,diff:null,label:"측정 대기"};
 if(diff<=tolerance)return{ok:true,diff:Math.round(diff),label:"목표선 정렬 양호"};
 if(diff<=10)return{ok:false,diff:Math.round(diff),label:"조금 더 정렬 필요"};
 return{ok:false,diff:Math.round(diff),label:"목표선 재정렬 필요"};
}
export function alignmentLesson(targetBearing,heading){
 const g=alignmentGrade(targetBearing,heading);
 return `목표 방향은 북쪽 기준 ${Math.round(targetBearing||0)}도입니다. 휴대폰을 목표선과 평행하게 두고 확인하세요. 현재 오차는 ${g.diff==null?"측정 중":g.diff+"도"}입니다. 발끝선과 어깨선은 목표선과 평행하게, 클럽 페이스는 목표를 향하게 맞춥니다. GPS는 목표 방위 계산용이고 정렬 확인은 나침반과 카메라를 함께 사용하세요.`;
}
