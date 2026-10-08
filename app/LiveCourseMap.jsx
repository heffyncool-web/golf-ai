"use client";
import {useEffect,useRef,useState} from "react";
import {buildCourseGeoJSON,downloadGeoJSON} from "./courseGeo";
import {areasGeoJSON} from "./courseAreas";

export default function LiveCourseMap({location,target,points={},shots=[],areas={},fallbackCenter=null,compact=false,showToolbar=true}){
 const el=useRef(null),mapRef=useRef(null);
 const [base,setBase]=useState("street");
 useEffect(()=>{let dead=false;(async()=>{try{
  const ml=await import("maplibre-gl");if(dead||!el.current)return;
  const focus=target||points.center||points.tee||fallbackCenter||location;
  const center=focus?[focus.lng,focus.lat]:[128.6477776634,35.6642636516];
  const map=new ml.Map({container:el.current,center,zoom:target||points.center||points.tee?16:fallbackCenter?14:8,style:{version:8,sources:{base:{type:"raster",tiles:[base==="satellite"?"https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg":"https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:base==="satellite"?"Sentinel-2 cloudless imagery via EOX":"© OpenStreetMap contributors"}},layers:[{id:"base",type:"raster",source:"base"}]}});
  mapRef.current=map;map.addControl(new ml.NavigationControl(),"top-right");
  const resize=()=>{if(!dead&&mapRef.current===map)map.resize()};
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;observer?.observe(el.current);map.once("idle",resize);requestAnimationFrame(resize);
  map.on("remove",()=>observer?.disconnect());
  map.on("load",()=>{const data=areasGeoJSON(areas);map.addSource("course-areas",{type:"geojson",data});map.addLayer({id:"course-area-fill",type:"fill",source:"course-areas",paint:{"fill-color":["match",["get","type"],"green","#1b8f3a","fairway","#62a83b","bunker","#d8bd75","water","#2485c6","ob","#d43b3b","#888"],"fill-opacity":.32}});map.addLayer({id:"course-area-line",type:"line",source:"course-areas",paint:{"line-color":["match",["get","type"],"ob","#d43b3b","water","#2485c6","#fff"],"line-width":2}})});
  const add=(p,label,color)=>{if(!p)return;const node=document.createElement("div");node.title=label;node.style.cssText=`width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px #0008`;new ml.Marker({element:node}).setLngLat([p.lng,p.lat]).setPopup(new ml.Popup({offset:15}).setText(label)).addTo(map)};
  add(location,"현재 위치","#1565c0");add(points.tee,"티잉구역","#111111");add(target,"현재 목표","#d32f2f");
  const route=[points.tee,points.layup||points.ip,target].filter(Boolean);
  if(route.length>=2){const routeData={type:"Feature",properties:{},geometry:{type:"LineString",coordinates:route.map(p=>[p.lng,p.lat])}};map.addSource("strategy-route",{type:"geojson",data:routeData});map.addLayer({id:"strategy-route-line",type:"line",source:"strategy-route",paint:{"line-color":"#00d9ff","line-width":4,"line-dasharray":[2,2]}});}add(points.front,"그린 앞","#2e7d32");add(points.center,"그린 중앙","#00897b");add(points.back,"그린 뒤","#00695c");add(points.custom,"임의 목표","#ef6c00");
  shots.filter(x=>x.position).forEach((x,i)=>add(x.position,`${i+1}타 ${x.club} ${x.miss||""}`,"#7b1fa2"));
 }catch(e){if(el.current)el.current.innerHTML='<div style="padding:16px">지도 모듈을 불러오지 못했습니다. GPS 거리 기능은 계속 사용할 수 있습니다.</div>'}})();return()=>{dead=true;mapRef.current?.remove();mapRef.current=null}},[base,location?.lat,location?.lng,target?.lat,target?.lng,fallbackCenter?.lat,fallbackCenter?.lng,JSON.stringify(points),JSON.stringify(areas),shots.length]);
 return <div className={compact?"liveMapShell compact":"liveMapShell"}>
   {showToolbar&&<div className="inline liveMapToolbar"><button aria-label="위성지도 보기" onClick={()=>setBase("satellite")}>위성</button><button aria-label="일반지도 보기" onClick={()=>setBase("street")}>일반지도</button><small>{base==="satellite"?"위성영상(참고)":"코스 오버레이 우선"}</small><button aria-label="코스 GPS GeoJSON 내보내기" onClick={()=>downloadGeoJSON(buildCourseGeoJSON({points,shots}))}>GPS 데이터 내보내기</button></div>}
   <div ref={el} aria-label="실제 인터랙티브 코스 지도" className="liveMapCanvas"/>
   {!compact&&<small>코스 오버레이 우선 지도 · 다운로드한 티/그린/페어웨이/벙커/해저드가 있으면 먼저 표시합니다. 위성영상은 해상도 한계가 있어 참고용으로 전환합니다.</small>}
 </div>
}