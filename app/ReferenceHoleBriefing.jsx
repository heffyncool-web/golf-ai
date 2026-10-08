const guides=[{
 distances:[378,360,340,320],green:[648,317,172,147],
 features:['좌측 벙커와 우측 해저드가 있는 전형적인 레이크홀','페어웨이가 넓어 보이지만 우측으로 갈수록 물이 가까움','그린 앞 벙커, 그린 뒤쪽으로 OB 가능성'],
 tee:['목표지점: 중앙 페어웨이 (좌측 벙커와 해저드 사이)','페이드샷 구질 추천 (우측 미스 주의)','그린으로 밀리면 해저드 위험, 좌측 벙커 주의'],
 second:['남은 거리 확인 후 그린 좌측 공략','그린 앞 벙커 피해서 중앙~좌측 공략','핀 위치가 앞쪽이면 한 클럽 짧게'],
 greenGuide:['그린은 좌우로 긴 형태','핀 위치에 따라 오르막 내리막 확인','그린 뒤 OB 주의']
},{distances:[362,342,320,300],green:[1300,317,211,147],
 features:['좌측 해저드와 우측 OB가 있는 산악형 파4','페어웨이가 점차 좁아져 티샷이 중요','그린 주변 벙커와 경사, 핀 위치에 따라 공략 난이도 변화'],
 tee:['목표지점: 페어웨이 중앙 (좌측 해저드 피하기)','드로우 구질은 우측 OB 위험, 페이드 추천','바람이 있으면 한 클럽 짧게'],
 second:['남은 거리 및 핀 위치 확인 후 그린 중앙 공략','좌측 해저드와 우측 OB 사이 안전 구역 공략','바람이 있는 경우 한 클럽 길게'],
 greenGuide:['그린은 앞뒤로 긴 형태, 경사 변화 확인','그린 주변 벙커와 내리막 주의','핀 위치가 앞쪽이면 짧게, 뒤쪽이면 한 클럽 추가']
}];
export default function ReferenceHoleBriefing({courseIndex,hole}){
 const g=guides[courseIndex===0?0:1];
 return <section className="holeBriefing referenceBriefing" aria-label="첨부 이미지 기준 홀 공략 안내">
  <div className="infoSplit"><div><h4>기본 정보</h4><dl><dt>Par</dt><dd>{hole.par}</dd>{['블랙','화이트','블루','레이디'].map((label,i)=><span className="briefDistanceRow" key={label}><dt>{label}</dt><dd>{g.distances[i]}m</dd></span>)}</dl></div><div className="greenMini"><svg viewBox={g.green.join(' ')} role="img" aria-label="첨부 이미지의 그린 형태"><defs><clipPath id={`reference-green-${courseIndex}`}><rect x={g.green[0]} y={g.green[1]} width={g.green[2]} height={g.green[3]}/></clipPath></defs><image clipPath={`url(#reference-green-${courseIndex})`} href="/reference/golf-hole-layout.png" x="0" y="0" width="1536" height="1024"/></svg></div></div>
  <div className="briefStage features"><h4>홀 특징 및 공략 포인트</h4><ul>{g.features.map(s=><li key={s}>{s}</li>)}</ul></div>
  {[['tee','⚑','티샷 공략 (추천 클럽: 드라이버 또는 3W)',g.tee],['second','✔','세컨드 샷 공략',g.second],['green','⚑','그린 공략',g.greenGuide]].map(([cls,icon,title,items])=><div className={'briefStage '+cls} key={cls}><h4><span>{icon}</span> {title}</h4><ul>{items.map(s=><li key={s}>{s}</li>)}</ul></div>)}
  <small className="referenceBriefNotice">첨부 이미지 기준 참고 · 실제 GPS 공략은 등록 좌표로 계산</small>
 </section>;
}
