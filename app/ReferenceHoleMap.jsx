"use client";
import {useId,useRef,useState} from 'react';
/** Display the user's original reference without generating fictitious terrain or coordinates. */
export default function ReferenceHoleMap({courseIndex,holeNumber,onSatellite,onExpand}) {
 const clipId=useId();
 const [zoom,setZoom]=useState(1),[offset,setOffset]=useState({x:0,y:0});
 const pointers=useRef(new Map()),gesture=useRef(null);
 const crop=courseIndex===0?[202,279,281,576]:[842,279,293,576];
 const [x,y,w,h]=crop;
 const dx=Math.max(-w*(1-1/zoom)/2,Math.min(w*(1-1/zoom)/2,offset.x)),dy=Math.max(-h*(1-1/zoom)/2,Math.min(h*(1-1/zoom)/2,offset.y));
 const view=[x+w*(1-1/zoom)/2+dx,y+h*(1-1/zoom)/2+dy,w/zoom,h/zoom].join(' ');
 function move(e){const previous=pointers.current.get(e.pointerId);if(!previous)return;const rect=e.currentTarget.getBoundingClientRect();pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...pointers.current.values()];if(ps.length===2){const d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(gesture.current)setZoom(Math.max(1,Math.min(3,gesture.current.zoom*d/gesture.current.distance)));else gesture.current={distance:d,zoom};}else if(zoom>1)setOffset(o=>({x:o.x-(e.clientX-previous.x)*w/rect.width/zoom,y:o.y-(e.clientY-previous.y)*h/rect.height/zoom}));}
 function release(e){pointers.current.delete(e.pointerId);gesture.current=null;}
 return <section className="fieldCaddie referenceHoleView" aria-label={`${courseIndex===0?'LAKE':'MOUNTAIN'} ${holeNumber}H 개별 홀 공략도`}>
  <div className="referenceHolePicture" onPointerDown={e=>{if(e.target.closest("button"))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={move} onPointerUp={release} onPointerCancel={release}>
   <svg viewBox={view} role="img" aria-label="첨부 이미지와 동일한 개별 홀 공략도" preserveAspectRatio="xMidYMid meet"><defs><clipPath id={clipId}><rect x={x} y={y} width={w} height={h}/></clipPath></defs><image clipPath={`url(#${clipId})`} href="/reference/golf-hole-layout.png" x="0" y="0" width="1536" height="1024"/></svg>
   <div className="referenceMapActions"><button aria-label="개별 홀 확대" onClick={()=>setZoom(z=>Math.min(3,z+.5))}>＋</button><button aria-label="개별 홀 축소" onClick={()=>setZoom(z=>Math.max(1,z-.5))}>－</button><button onClick={()=>{setZoom(1);setOffset({x:0,y:0})}}>기본보기</button>{onExpand&&<button onClick={onExpand}>크게보기</button>}</div>
  </div>
  <div className="referenceMapCaption"><span>첨부 공략도 · 실제 좌표 미연결</span><button onClick={onSatellite}>실제 위성·GPS 열기</button></div>
 </section>;
}
