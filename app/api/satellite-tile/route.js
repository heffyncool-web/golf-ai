export const runtime='nodejs';
export async function GET(req){
 const u=new URL(req.url),z=Number(u.searchParams.get('z')),x=Number(u.searchParams.get('x')),y=Number(u.searchParams.get('y'));
 if(![z,x,y].every(Number.isInteger)||z<0||z>20||x<0||y<0||x>=2**z||y>=2**z)return new Response('Invalid tile',{status:400});
 for(const host of ['server.arcgisonline.com','services.arcgisonline.com'])try{const r=await fetch(`https://${host}/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,{signal:AbortSignal.timeout(6000),next:{revalidate:86400}});if(r.ok&&r.headers.get('content-type')?.startsWith('image/'))return new Response(await r.arrayBuffer(),{headers:{'Content-Type':r.headers.get('content-type'),'Cache-Control':'public, max-age=3600, s-maxage=86400'}});}catch{}
 return new Response('Imagery unavailable',{status:502,headers:{'Cache-Control':'no-store'}});
}
