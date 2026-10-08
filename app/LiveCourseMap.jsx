"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {buildCourseGeoJSON,downloadGeoJSON} from "./courseGeo";
import {courseFeatures,holeBounds,validPoint,planGeoJSON} from "./holeCaddie";

const imagery="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const attribution="Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const colors=["match",["get","type"],"green","#1b8f3a","fairway","#62a83b","bunker","#f4d281","water","#2485c6","ob","#ef4444","#888"];
export default function LiveCourseMap({location,target,points={},shots=[],areas={},features=[],fallbackCenter=null,compact=false,showToolbar=true,holeKey='',plan=null,origin=null}){
 const el=useRef(null),mapRef=useRef(null),markers=useRef([]),mlRef=useRef(null),latest=useRef(null),fitted=useRef(''),fitRef=useRef(()=>{}),updateRef=useRef(()=>{});
 const [base,setBase]=useState('satellite'),[ready,setReady]=useState(false),[fallback,setFallback]=useState(false),[status,setStatus]=useState('위성영상 연결 중…'),[retry,setRetry]=useState(0);
 const geoFeatures=useMemo(()=>courseFeatures(areas,features),[JSON.stringify(areas),JSON.stringify(features)]);
 const bounds=useMemo(()=>holeBounds({...points,center:points.center||target},geoFeatures),[JSON.stringify(points),JSON.stringify(geoFeatures),target?.lat,target?.lng]);
 latest.current={location,target,points,shots,geoFeatures,bounds,fallbackCenter,plan,origin};
 useEffect(()=>{
  let dead=false,map,observer,timer,switched=false;
  setReady(false);setFallback(false);setStatus('위성영상 연결 중…');fitted.current='';
  (async()=>{try{
   const ml=await import('maplibre-gl');if(dead||!el.current)return;mlRef.current=ml;
   const d=latest.current,focus=d.points.tee||d.target||d.fallbackCenter;
   map=new ml.Map({container:el.current,center:validPoint(focus)?[Number(focus.lng),Number(focus.lat)]:[128.64778,35.66426],zoom:15,maxZoom:20,attributionControl:true,style:{version:8,sources:{base:{type:'raster',tiles:[base==='satellite'?imagery:'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:base==='satellite'?attribution:'© OpenStreetMap contributors'}},layers:[{id:'base',type:'raster',source:'base'}]}});
   mapRef.current=map;map.on('moveend',()=>{if(el.current){el.current.dataset.viewCenter=JSON.stringify(map.getCenter().toArray());el.current.dataset.viewZoom=String(map.getZoom());}});map.addControl(new ml.NavigationControl({showCompass:false}),'top-right');map.dragRotate.disable();map.touchZoomRotate.disableRotation();
   fitRef.current=()=>{const d=latest.current;map.setMinZoom(0);map.setMaxBounds(null);if(d.bounds){map.fitBounds(d.bounds,{padding:{top:65,bottom:55,left:35,right:35},maxZoom:18.5,duration:0});const z=map.getZoom(),viewport=map.getBounds();map.setMinZoom(Math.max(12,z-.15));const pad=.004;map.setMaxBounds([[viewport.getWest()-pad,viewport.getSouth()-pad],[viewport.getEast()+pad,viewport.getNorth()+pad]]);}else{const p=d.points.tee||d.target||d.fallbackCenter;if(validPoint(p)){map.jumpTo({center:[Number(p.lng),Number(p.lat)],zoom:15});map.setMinZoom(14);map.setMaxBounds([[p.lng-.018,p.lat-.018],[p.lng+.018,p.lat+.018]]);}}};
   updateRef.current=()=>{if(!map.getSource('course-areas'))return;const d=latest.current;map.getSource('course-areas')?.setData({type:'FeatureCollection',features:d.geoFeatures});map.getSource('strategy')?.setData(planGeoJSON(d.origin,d.plan));markers.current.forEach(m=>m.remove());markers.current=[];
    const add=(p,label,color)=>{if(!validPoint(p))return;const n=document.createElement('div');n.className='courseMarker';n.style.background=color;n.title=label;n.textContent=label;n.setAttribute('aria-label',label);markers.current.push(new ml.Marker({element:n,anchor:'bottom'}).setLngLat([Number(p.lng),Number(p.lat)]).addTo(map));};
    add(d.location,'현재 GPS','#1565c0');add(d.points.tee,'티','#17212b');add(d.points.front,'앞','#2e7d32');add(d.points.center,'그린','#00897b');add(d.points.back,'뒤','#00695c');add(d.target,d.target?.at?'핀':'목표','#d32f2f');add(d.plan?.landing,'캐리 착탄','#eb8800');add(d.plan?.finish,'총거리','#9333ea');d.shots.filter(x=>x.position).forEach((s,i)=>add(s.position,`${i+1}타`,'#7b1fa2'));
   };
   map.on('style.load',()=>{if(dead)return;map.addSource('course-areas',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'course-area-fill',type:'fill',source:'course-areas',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':colors,'fill-opacity':.18}});map.addLayer({id:'course-area-line',type:'line',source:'course-areas',paint:{'line-color':colors,'line-width':2}});map.addSource('strategy',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'dispersion',type:'fill',source:'strategy',filter:['==',['get','type'],'dispersion'],paint:{'fill-color':'#22d3ee','fill-opacity':.22}});map.addLayer({id:'aim',type:'line',source:'strategy',paint:{'line-color':['match',['get','type'],'run','#c084fc','#22d3ee'],'line-width':3,'line-dasharray':[2,1]}});fitRef.current();updateRef.current();setReady(true);});
   map.on('sourcedata',e=>{if(!dead&&e.sourceId==='base'&&e.tile?.state==='loaded'){clearTimeout(timer);setStatus(base==='satellite'?'위성영상 표시됨':'일반지도 표시됨');}});
   map.on('error',e=>{if(dead||e.sourceId!=='base')return;if(!switched&&base==='satellite'){switched=true;setStatus('대체 위성영상 경로 연결 중…');map.getSource('base')?.setTiles(['/api/satellite-tile?z={z}&x={x}&y={y}']);}else if(switched)setStatus('위성영상 재연결 중…');});
   timer=setTimeout(()=>{if(dead)return;setStatus('위성영상 대체 표시로 전환');setFallback(true);map.remove();mapRef.current=null;},18000);
   const resize=()=>{if(!dead&&mapRef.current){map.resize();fitRef.current();}};observer=new ResizeObserver(resize);observer.observe(el.current);
  }catch{if(!dead){setFallback(true);setStatus('위성영상 대체 표시');}}})();
  return()=>{dead=true;clearTimeout(timer);observer?.disconnect();markers.current=[];if(mapRef.current===map){map?.remove();mapRef.current=null;}};
 },[base,retry]);
 useEffect(()=>{if(!ready||!mapRef.current)return;updateRef.current();const key=holeKey+JSON.stringify(bounds);if(fitted.current!==key){fitted.current=key;fitRef.current();}},[ready,holeKey,JSON.stringify(bounds),JSON.stringify(points),JSON.stringify(geoFeatures),location?.lat,location?.lng,target?.lat,target?.lng,shots.length,JSON.stringify(plan)]);
 return <div className={compact?'liveMapShell compact':'liveMapShell'}>
  {showToolbar&&<div className='inline liveMapToolbar'><button aria-label='위성지도 보기' onClick={()=>setBase('satellite')}>위성</button><button aria-label='일반지도 보기' onClick={()=>setBase('street')}>일반지도</button><button aria-label='코스 GPS GeoJSON 내보내기' onClick={()=>downloadGeoJSON(buildCourseGeoJSON({points,shots}))}>GPS 데이터 내보내기</button></div>}
  <div className='holeMapStage' data-hole-key={holeKey}>
   <div ref={el} aria-label='실제 인터랙티브 코스 지도' className='liveMapCanvas' style={fallback?{display:'none'}:undefined}/>
   {fallback&&<ImageTileMap data={latest.current} onStatus={setStatus}/>}
   <div className='mapActions'><button aria-label='홀 전체 기본보기' onClick={()=>fallback?setRetry(x=>x+1):fitRef.current()}>기본보기</button><button aria-label='지도 재연결' onClick={()=>setRetry(x=>x+1)}>재연결</button></div>
   <span className='mapStatus' role='status' data-testid='map-status'>{status}{!bounds?' · 홀 좌표 미등록':''}</span>
  </div>
 </div>;
}
function ImageTileMap({data,onStatus}){
 const root=useRef(null),[size,setSize]=useState({w:360,h:390}),[zoom,setZoom]=useState(0),[failed,setFailed]=useState(0);
 useEffect(()=>{const o=new ResizeObserver(([e])=>setSize({w:e.contentRect.width,h:e.contentRect.height}));if(root.current)o.observe(root.current);return()=>o.disconnect();},[]);
 useEffect(()=>setZoom(0),[JSON.stringify(data.bounds)]);
 const project=(lng,lat,z)=>({x:(Number(lng)+180)/360*2**z*256,y:(1-Math.asinh(Math.tan(Number(lat)*Math.PI/180))/Math.PI)/2*2**z*256});
 const b=data.bounds,focus=data.points.tee||data.target||data.fallbackCenter||{lat:35.66426,lng:128.64778};let z=15;
 if(b){for(z=19;z>12;z--){const a=project(...b[0],z),c=project(...b[1],z);if(Math.abs(a.x-c.x)<size.w-65&&Math.abs(a.y-c.y)<size.h-110)break;}}
 z=Math.min(20,z+zoom);const center=b?project((b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2,z):project(focus.lng,focus.lat,z),left=center.x-size.w/2,top=center.y-size.h/2,tiles=[];
 for(let x=Math.floor(left/256);x<=Math.floor((left+size.w)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+size.h)/256);y++)tiles.push({x,y});
 const xy=p=>{const q=project(p.lng,p.lat,z);return [q.x-left,q.y-top];};
 const geometry=[...data.geoFeatures,...planGeoJSON(data.origin,data.plan).features];
 return <div className='imageTileMap' ref={root} aria-label='위성영상 대체 지도'>
  {tiles.map(t=><img key={`${z}/${t.x}/${t.y}`} alt='' draggable={false} style={{left:t.x*256-left,top:t.y*256-top}} src={`/api/satellite-tile?z=${z}&x=${t.x}&y=${t.y}`} onLoad={()=>onStatus('위성영상 표시됨 · 대체 표시')} onError={()=>{setFailed(n=>n+1);onStatus('위성영상 연결 실패 · 재연결 필요');}}/>)}
  <svg width={size.w} height={size.h} className='tileOverlay'>{geometry.map((f,i)=>{const cs=f.geometry?.type==='Polygon'?f.geometry.coordinates[0]:f.geometry?.type==='LineString'?f.geometry.coordinates:[];const pts=cs.map(([lng,lat])=>xy({lng,lat}).join(',')).join(' ');return f.geometry?.type==='Polygon'?<polygon key={i} points={pts} fill='#22d3ee33' stroke='#fff'/>:<polyline key={i} points={pts} fill='none' stroke='#22d3ee' strokeWidth='3'/>;})}{[[data.location,'GPS'],[data.points.tee,'티'],[data.target,'목표'],[data.plan?.landing,'착탄']].filter(([p])=>validPoint(p)).map(([p,name])=>{const [x,y]=xy(p);return <g key={name}><circle cx={x} cy={y} r='6' fill='#fbbf24' stroke='white'/><text x={x+9} y={y} fill='white' stroke='#000' paintOrder='stroke'>{name}</text></g>;})}</svg>
  <div className='fallbackZoom'><button aria-label='대체 지도 확대' onClick={()=>setZoom(n=>Math.min(3,n+1))}>＋</button><button aria-label='대체 지도 기본보기' onClick={()=>setZoom(0)}>기본보기</button></div>
  <small className='tileAttribution'>{attribution}</small>{failed>0&&<span className='tileError'>일부 영상 미수신</span>}
 </div>;
}
