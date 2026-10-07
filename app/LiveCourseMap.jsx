"use client";
import {useEffect,useRef} from "react";
export default function LiveCourseMap({location,target,points={},shots=[]}){
 const el=useRef(null),mapRef=useRef(null);
 useEffect(()=>{let dead=false;(async()=>{try{
  const ml=await import("maplibre-gl");if(dead||!el.current)return;
  const center=location?[location.lng,location.lat]:target?[target.lng,target.lat]:[128.73,35.65];
  const map=new ml.Map({container:el.current,center,zoom:location||target?17:8,style:{version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:"© OpenStreetMap contributors"}},layers:[{id:"osm",type:"raster",source:"osm"}]}});
  mapRef.current=map;map.addControl(new ml.NavigationControl(),"top-right");
  const add=(p,label,color)=>{if(!p)return;const node=document.createElement("div");node.title=label;node.style.cssText=`width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px #0008`;new ml.Marker({element:node}).setLngLat([p.lng,p.lat]).setPopup(new ml.Popup({offset:15}).setText(label)).addTo(map)};
  add(location,"현재 위치","#1565c0");add(target,"현재 목표","#d32f2f");add(points.front,"그린 앞","#2e7d32");add(points.center,"그린 중앙","#00897b");add(points.back,"그린 뒤","#00695c");add(points.custom,"임의 목표","#ef6c00");
  shots.filter(x=>x.position).forEach((x,i)=>add(x.position,`${i+1}타 ${x.club} ${x.miss||""}`,"#7b1fa2"));
 }catch(e){if(el.current)el.current.innerHTML='<div style="padding:16px">지도 모듈을 불러오지 못했습니다. GPS 거리 기능은 계속 사용할 수 있습니다.</div>'}})();return()=>{dead=true;mapRef.current?.remove();mapRef.current=null}},[location?.lat,location?.lng,target?.lat,target?.lng,JSON.stringify(points),shots.length]);
 return <div><div ref={el} aria-label="실제 인터랙티브 코스 지도" style={{height:360,borderRadius:14,overflow:"hidden",background:"#dde3e7"}}/><small>실제 인터랙티브 지도 · OpenStreetMap. 위성영상은 제공자 키/이용조건 연결 시 같은 지도 엔진에서 교체합니다.</small></div>
}