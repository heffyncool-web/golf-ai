import { NextResponse } from "next/server";
import { koreanTreeName } from "../../treeMeasurements";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const BUCKET=new Map();
const WINDOW_MS=60_000;
const LIMIT=6;
function rateLimit(id){
  const now=Date.now();
  if(BUCKET.size>2000)for(const [key,record] of BUCKET)if(now-record.begin>WINDOW_MS)BUCKET.delete(key);
  const rec=BUCKET.get(id);
  if(!rec||now-rec.begin>WINDOW_MS){BUCKET.set(id,{begin:now,count:1});return false;}
  rec.count++;
  return rec.count>LIMIT;
}
export async function POST(request){
  const key=process.env.PLANTNET_API_KEY;
  if(!key)return NextResponse.json({error:"수종 식별 서버가 아직 연결되지 않았습니다. PLANTNET_API_KEY 환경변수를 설정해야 합니다."},{status:503});
  const client=(request.headers.get("x-forwarded-for")||"anonymous").split(",")[0].trim();
  if(rateLimit(client))return NextResponse.json({error:"분석 횟수가 너무 많습니다. 잠시 후 다시 시도하세요."},{status:429});
  try{
    const form=await request.formData();
    const image=form.get("image");
    if(!image||typeof image==="string"||!["image/jpeg","image/png"].includes(image.type)){
      return NextResponse.json({error:"JPEG/PNG 나무 사진이 필요합니다."},{status:400});
    }
    if(image.size>5_000_000)return NextResponse.json({error:"이미지는 5MB 이하로 줄여주세요."},{status:413});
    const upstreamForm=new FormData();
    upstreamForm.append("images",image,"tree."+ (image.type==="image/png"?"png":"jpg"));
    upstreamForm.append("organs","auto");
    const upstreamUrl="https://my-api.plantnet.org/v2/identify/all?lang=ko&nb-results=5&api-key="+encodeURIComponent(key);
    const response=await fetch(upstreamUrl,{method:"POST",body:upstreamForm,signal:AbortSignal.timeout(20_000),cache:"no-store"});
    if(!response.ok){
      const status=response.status;
      return NextResponse.json({error:status===429?"수종 인식 서비스 일일 한도에 도달했습니다.":"수종 인식 서비스를 사용할 수 없습니다.",upstreamStatus:status},{status:status===429?429:502});
    }
    const body=await response.json();
    const candidates=(Array.isArray(body.results)?body.results:[]).slice(0,5).map(x=>{
      const scientific=String(x?.species?.scientificNameWithoutAuthor||x?.species?.scientificName||"");
      const names=Array.isArray(x?.species?.commonNames)?x.species.commonNames:[];
      const score=Number(x?.score);
      return {name:koreanTreeName(scientific,names),scientificName:scientific,score:Number.isFinite(score)?score:null,commonNames:names.slice(0,3)};
    });
    return NextResponse.json({candidates,remaining:body.remainingIdentificationRequests??null,disclaimer:"확률은 모델 점수로 법적 증빙이나 수종 확정이 아닙니다. 잎·수피·열매와 현장 실측으로 확인하세요."});
  }catch(err){
    return NextResponse.json({error:"사진 분석 중 오류가 발생했습니다. 네트워크 연결을 확인하세요."},{status:502});
  }
}
