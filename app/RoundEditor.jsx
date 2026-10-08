"use client";
import {useState} from 'react';
export default function RoundEditor({round,onSave,onCancel}){
 const [draft,setDraft]=useState({...round});
 const [error,setError]=useState('');
 function submit(e){e.preventDefault();try{onSave({...draft,players:Number(draft.players),fee:Number(draft.fee),targetScore:Number(draft.targetScore)});}catch{setError('저장 공간이 부족하거나 브라우저에서 저장을 허용하지 않습니다. 다시 시도해 주세요.');}}
 return <form className="roundEditor" onSubmit={submit}><h2>라운드 정보 수정</h2><div className="formgrid">{Object.entries({date:'날짜',time:'티타임',players:'인원',fee:'그린피',caddie:'캐디',targetScore:'목표타수'}).map(([key,label])=><label key={key}>{label}<input aria-label={label} autoFocus={key==='date'} required value={draft[key]??''} type={key==='date'?'date':key==='time'?'time':['players','fee','targetScore'].includes(key)?'number':'text'} min={key==='fee'?0:key==='targetScore'?18:1} max={key==='players'?8:key==='targetScore'?300:undefined} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}/></label>)}</div><p>이 브라우저에 저장하며, 상단 정보와 홈·라운드 일정에 함께 반영됩니다.</p><div className="editorActions"><button type="button" onClick={onCancel}>취소</button><button className="primary" type="submit">저장 &amp; 반영</button></div>{error&&<p role="alert">{error}</p>}</form>;
}
