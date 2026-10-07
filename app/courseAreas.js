export function emptyCourseAreas(){return {fairway:[],green:[],bunker:[],water:[],ob:[]}}
export function addAreaPoint(areas,type,p){if(!areas[type]||!p)return areas;return {...areas,[type]:[...areas[type],{lat:Number(p.lat),lng:Number(p.lng)}]}}
export function closeRing(points=[]){if(points.length<3)return null;const c=points.map(p=>[p.lng,p.lat]);c.push(c[0]);return c}
export function areasGeoJSON(areas={}){
 const features=[];for(const [type,pts] of Object.entries(areas)){const ring=closeRing(pts);if(ring)features.push({type:"Feature",properties:{type,name:type},geometry:{type:"Polygon",coordinates:[ring]}})}
 return {type:"FeatureCollection",features};
}
export function pointInPolygon(p,points=[]){const ring=closeRing(points);if(!p||!ring)return false;let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1],hit=((yi>p.lat)!==(yj>p.lat))&&(p.lng<(xj-xi)*(p.lat-yi)/(yj-yi)+xi);if(hit)inside=!inside}return inside}
export function positionRisk(p,areas={}){if(pointInPolygon(p,areas.ob))return "OB";if(pointInPolygon(p,areas.water))return "해저드";if(pointInPolygon(p,areas.bunker))return "벙커";if(pointInPolygon(p,areas.green))return "그린";if(pointInPolygon(p,areas.fairway))return "페어웨이";return "미분류"}
