'use client';
import { useEffect,useState } from 'react';
import {packageKey,parseCoursePackage} from './coursePackage';
export function useCoursePackage(id){
 const [value,setValue]=useState(null);
 useEffect(()=>{const read=()=>{try{const p=JSON.parse(localStorage.getItem(packageKey(id))||'null');setValue(p?.courseId===id&&p.type==='GolfCoursePackage'?p:null);}catch{setValue(null);}};read();window.addEventListener('golf-course-package',read);window.addEventListener('storage',read);return()=>{window.removeEventListener('golf-course-package',read);window.removeEventListener('storage',read);};},[id]);
 return value;
}
export default function CoursePackageControls({course}){
 const pkg=useCoursePackage(course.id),[message,setMessage]=useState('');
 useEffect(()=>setMessage(''),[course.id]);
 const importFile=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('파일은 10MB 이하로 등록하세요');const data=parseCoursePackage(await file.text(),course);localStorage.setItem(packageKey(course.id),JSON.stringify(data));window.dispatchEvent(new Event('golf-course-package'));setMessage(`${data.holes.length}개 홀 등록 완료 · 현장 확인 필요`);}catch(error){setMessage(`등록 실패: ${error.message} · 기존 자료 유지`);}finally{e.target.value='';}};
 return <section className="strategyBox" aria-label="골프장 홀 지도 자료"><h3>골프장 홀 지도 자료</h3><p>홀 자료를 한 번 등록하면 코스·홀 선택에 맞춰 지도와 공략을 불러옵니다. 현장 GPS 저장값과 기존 개별 홀 자료를 우선 적용합니다.</p><input type="file" accept=".json,.geojson" aria-label="골프장 전체 홀 자료 파일" onChange={importFile}/><p role="status">{message|| (pkg?`${pkg.holes.length}개 홀 등록 · ${pkg.source.name}`:'홀 좌표 자료 미등록')}</p>{pkg&&<><small>{pkg.source.license} · 현장 검증 필요</small><p>{pkg.holes.map(h=>`${h.course} ${h.hole}H`).join(' · ')}</p><button onClick={()=>{localStorage.removeItem(packageKey(course.id));window.dispatchEvent(new Event('golf-course-package'));setMessage('일괄 자료 해제 · 기존 개별 홀 자료 유지');}}>일괄 홀 자료 해제</button></>}<details><summary>자료 등록 형식</summary><p>GolfCoursePackage 버전 1: 골프장 ID, 출처·이용 조건, 코스명과 홀 번호, 각 홀의 티·그린 및 GeoJSON 지형 자료가 필요합니다. 등록 파일은 이 기기에 저장됩니다. 원본 파일을 보관하세요.</p></details></section>;
}
