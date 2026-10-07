export function lessonScript({title="골프 AI 레슨",situation="",club="",setup="",target="",feel="",avoid="",drill=""}={}){
 const parts=[title,situation&&`상황은 ${situation}입니다.`,club&&`추천 클럽은 ${club}입니다.`,setup&&`셋업. ${setup}`,target&&`목표. ${target}`,feel&&`스윙 느낌. ${feel}`,avoid&&`주의. ${avoid}`,drill&&`연습. ${drill}`].filter(Boolean);
 return parts.join(" ");
}
export function speakLesson(script,{rate=.95}={}){
 if(typeof window==="undefined"||!("speechSynthesis" in window))return false;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(script);u.lang="ko-KR";u.rate=rate;window.speechSynthesis.speak(u);return true;
}
export function videoStoryboard(data={}){
 return [{scene:1,title:"상황 인식",text:data.situation||""},{scene:2,title:"클럽 선택",text:data.club||""},{scene:3,title:"셋업",text:data.setup||""},{scene:4,title:"목표점·캐리",text:data.target||""},{scene:5,title:"스윙 느낌",text:data.feel||""},{scene:6,title:"실수 방지",text:data.avoid||""},{scene:7,title:"연습법",text:data.drill||""}];
}