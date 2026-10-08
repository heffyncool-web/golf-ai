const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("청도 그레이스CC").first()).toBeVisible();
});

test("approved dashboard desktop geometry and screenshot", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 977, height: 740 });
  await page.reload();
  const side = await page.locator(".side").boundingBox();
  const top = await page.locator(".top").boundingBox();
  const boards = page.locator(".coursePanel");
  await expect(boards).toHaveCount(2);
  const a = await boards.nth(0).boundingBox();
  const b = await boards.nth(1).boundingBox();
  expect(Math.abs(side.width - 124)).toBeLessThanOrEqual(3);
  expect(top.height).toBeGreaterThanOrEqual(50);
  expect(top.height).toBeLessThanOrEqual(65);
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(a.width - b.width)).toBeLessThan(30);
  expect(a.width).toBeGreaterThan(380);
  await expect(page.locator(".liveVisualMap").first()).toBeVisible();
  await expect(page.locator(".coursePanel")).toHaveCount(2);
  await expect(page.getByText(/실제 위성지도/).first()).toBeVisible();
  const shot = await page.screenshot({ fullPage: true });
  await testInfo.attach("approved-dashboard-desktop",{body:shot,contentType:"image/png"});
});

test("all left navigation opens a functional screen", async ({ page }) => {
  const items=[
    ["홈","라운드 대시보드"],["라운드 일정","라운드 일정"],["AI 캐디","실전 18홀 모드"],
    ["스코어카드","18홀 스코어카드"],["골프장 DB","골프장 DB"],["스윙 분석","스윙 분석"],
    ["연습/코칭","연습/코칭"],["장비/클럽","장비/클럽"],["날씨/바람","날씨/바람"],["설정","설정"]
  ];
  for(const [button,heading] of items){
    await page.locator(".nav").getByRole("button",{name:button,exact:true}).click();
    await expect(page.getByText(heading,{exact:false}).first()).toBeVisible();
  }
});

test("all top caddie tabs are clickable and change real content", async ({ page }) => {
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.locator(".modeTabs").getByRole("button",{name:"골프장 정보",exact:true}).click();
  await expect(page.getByText(/현재 등록 코스/)).toBeVisible();
  await page.locator(".modeTabs").getByRole("button",{name:"코스 로테이션",exact:true}).click();
  await expect(page.getByText("코스 로테이션",{exact:true}).last()).toBeVisible();
  await page.locator(".modeTabs").getByRole("button",{name:"AI 공략 추천",exact:true}).click();
  await expect(page.locator(".coursePanel")).toHaveCount(2);
  await page.locator(".modeTabs").getByRole("button",{name:"메모/사진",exact:true}).click();
  await expect(page.getByPlaceholder(/핀 위치, 캐디 조언/)).toBeVisible();
  await page.locator(".modeTabs").getByRole("button",{name:"실전 18홀 모드",exact:false}).click();
  await expect(page.locator(".coursePanel")).toHaveCount(2);
  await page.locator(".modeTabs").getByRole("button",{name:"스코어카드",exact:true}).click();
  await expect(page.getByText("18홀 스코어카드")).toBeVisible();
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.locator(".modeTabs").getByRole("button",{name:"클럽 추천",exact:true}).click();
  await expect(page.getByRole("heading",{name:"장비/클럽",exact:true})).toBeVisible();
});

test("all 18 course strip hole buttons work", async ({ page }) => {
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  const buttons=page.locator(".stripHoles button");
  await expect(buttons).toHaveCount(18);
  for(let i=0;i<18;i++){
    await buttons.nth(i).click();
    if(i<9) await expect(page.locator(".coursePanel").nth(0).locator(".panelTitle")).toContainText("LAKE "+(i+1)+"H");
    else await expect(page.locator(".coursePanel").nth(1).locator(".panelTitle")).toContainText("MOUNTAIN "+(i-8)+"H");
  }
});

test("course panel tabs, score and next hole work", async ({ page }) => {
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  const first=page.locator(".coursePanel").first();
  await first.getByRole("button",{name:"공략 가이드"}).click();
  await expect(first.getByText("AI 공략 가이드")).toBeVisible();
  await first.getByRole("button",{name:"거리 측정"}).click();
  await expect(first.getByRole("heading",{name:"거리 측정"})).toBeVisible();
  await first.getByRole("button",{name:"메모/사진"}).click();
  await expect(first.getByPlaceholder(/Lake 1H 메모/i)).toBeVisible();
  await first.getByRole("button",{name:"이 홀로 스코어 기록하기",exact:true}).click();
  const strokes=first.getByLabel("Lake 타수");
  await strokes.fill("5");
  await first.getByRole("button",{name:/다음 홀/}).click();
  await expect(first.locator(".panelTitle")).toContainText("LAKE 2H");
});

test("club distance changes AI recommendation and landing label", async ({ page }) => {
  await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
  await page.getByLabel("Driver").fill("230");
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  const first=page.locator(".coursePanel").first();
  await expect(first.getByText(/드라이버 \(230m\)/)).toBeVisible();
  await expect(first.locator(".liveVisualMap")).toBeVisible();
});

test("all holes modal opens and selects a hole", async ({ page }) => {
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:/전체 18홀 보기/}).click();
  await expect(page.getByRole("heading",{name:"전체 18홀"})).toBeVisible();
  const modal=page.locator(".allHoles");
  await expect(modal.locator("button").filter({hasText:"5H · Par"}).first()).toBeVisible();
  await modal.locator("button").filter({hasText:"5H · Par"}).first().click();
  await expect(page.locator(".modalBackdrop")).toHaveCount(0);
});

test("round settings and score persist after reload", async ({ page }) => {
  await page.locator(".nav").getByRole("button",{name:"라운드 일정",exact:true}).click();
  await page.getByLabel("티타임").fill("13:20");
  await page.locator(".nav").getByRole("button",{name:"스코어카드",exact:true}).click();
  const score=page.locator(".scorecell").first().getByPlaceholder("타수");
  await score.fill("5");
  await page.reload();
  await page.locator(".nav").getByRole("button",{name:"라운드 일정",exact:true}).click();
  await expect(page.getByLabel("티타임")).toHaveValue("13:20");
  await page.locator(".nav").getByRole("button",{name:"스코어카드",exact:true}).click();
  await expect(page.locator(".scorecell").first().getByPlaceholder("타수")).toHaveValue("5");
});

test("course DB can search add edit and remove future golf courses", async ({ page }) => {
  await page.locator(".nav").getByRole("button",{name:"골프장 DB",exact:true}).click();
  await page.getByLabel("골프장 검색").fill("그레이스");
  await expect(page.locator(".card").filter({hasText:"청도 그레이스CC"})).toBeVisible();
  await page.getByLabel("골프장 검색").fill("");
  await page.getByLabel("골프장명").fill("테스트CC");
  await page.getByLabel("지역").fill("대구");
  await page.getByRole("button",{name:"추가 후 선택"}).click();
  await page.getByLabel("홀 Par").fill("5");
  await page.getByLabel("홀 거리").fill("480");
  await page.getByLabel("그린 위도").fill("35.8");
  await page.getByLabel("그린 경도").fill("128.6");
  const card=page.locator(".card").filter({hasText:"테스트CC"});
  await card.getByRole("button",{name:"삭제"}).click();
  await expect(page.locator(".card").filter({hasText:"테스트CC"})).toHaveCount(0);
});

test("mobile layout keeps controls clickable without horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({width:412,height:915});
  await page.reload();
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  const bodyWidth=await page.evaluate(()=>document.body.scrollWidth);
  const viewport=await page.evaluate(()=>window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewport+2);
  await page.locator(".stripHoles button").nth(4).click();
  await expect(page.locator(".coursePanel").first().locator(".panelTitle")).toContainText("LAKE 5H");
  await page.locator(".coursePanel").first().getByRole("button",{name:"공략 가이드"}).click();
  await expect(page.locator(".coursePanel").first().getByText("AI 공략 가이드")).toBeVisible();
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach("approved-dashboard-mobile",{body:shot,contentType:"image/png"});
});


test("hole full-view toggle opens a real satellite map modal and closes", async ({ page }) => {
  await page.setViewportSize({ width: 977, height: 740 });
  await page.reload();
  const first=page.locator(".coursePanel").first();
  const toggle=first.getByLabel("Lake 홀 전체보기");
  await toggle.check();
  await expect(page.locator(".mapModal")).toBeVisible();
  await expect(page.locator(".mapModal .liveVisualMap")).toBeVisible();
  await page.getByRole("button",{name:"지도 닫기"}).click();
  await expect(page.locator(".mapModal")).toHaveCount(0);
});

test("desktop reference viewport keeps Lake and Mountain side by side", async ({ page }) => {
  await page.setViewportSize({width:977,height:740});
  await page.reload();
  const boards=page.locator(".coursePanel");
  const a=await boards.nth(0).boundingBox(), b=await boards.nth(1).boundingBox();
  expect(Math.abs(a.y-b.y)).toBeLessThanOrEqual(3);
  expect(a.x).toBeLessThan(b.x);
  expect(a.width).toBeGreaterThan(390);
  expect(b.width).toBeGreaterThan(390);
});


test("short game academy and live caddie share trouble-shot guidance", async ({ page }) => {
  await page.reload();
  await page.locator(".nav").getByRole("button",{name:"상황별 공략·어프로치",exact:true}).click();
  await expect(page.getByRole("heading",{name:"상황별 공략 · 어프로치 아카데미"})).toBeVisible();
  await page.getByLabel("현재 라이").selectOption("highlip");
  await expect(page.getByText("탈출 우선 · 로프트 최대 확보")).toBeVisible();

  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  const first=page.locator(".coursePanel").first();
  await first.getByRole("button",{name:"트러블/어프로치"}).click();
  await first.getByLabel("트러블 라이").selectOption("highlip");
  await expect(first.getByText(/탈출 우선 · 로프트 최대 확보/)).toBeVisible();
  await first.getByLabel("트러블 남은 거리").selectOption("10");
  await expect(first.getByText(/추천 56°/)).toBeVisible();
});


test("AI guide compares carry clearance downstream risk and layup", async ({ page }) => {
  await page.reload();
  const first=page.locator(".coursePanel").first();
  await first.getByRole("button",{name:"공략 가이드"}).click();
  await first.getByLabel("장애물 앞 거리").fill("150");
  await first.getByLabel("장애물 폭").fill("15");
  await first.getByLabel("장애물 뒤 위험").selectOption("내리막+OB");
  await expect(first.getByText(/최소 캐리:/)).toContainText("165m");
  await expect(first.getByText(/안전 캐리:/)).toContainText("172m");
  await expect(first.getByText("SAFE",{exact:true})).toBeVisible();
  await expect(first.getByText("STANDARD",{exact:true})).toBeVisible();
  await expect(first.getByText("AGGRESSIVE",{exact:true})).toBeVisible();
  await expect(first.getByText("더 쉬운 대안")).toBeVisible();
});


test("personal club carry dispersion and success persist and affect strategy UI", async ({ page }) => {
  await page.reload();
  await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
  await page.getByLabel("5W 캐리").fill("175");
  await page.getByLabel("5W 총거리").fill("185");
  await page.getByLabel("5W 분산").fill("10");
  await page.getByLabel("5W 성공률").fill("88");
  await page.reload();
  await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
  await expect(page.getByLabel("5W 캐리")).toHaveValue("175");
  await expect(page.getByLabel("5W 성공률")).toHaveValue("88");
  await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
  const first=page.locator(".coursePanel").first();
  await first.getByRole("button",{name:"공략 가이드"}).click();
  await expect(first.getByText(/유효 캐리|개인 분산/).first()).toBeVisible();
});


test("Golfzon pasted shots auto-learn personal club profile", async ({ page }) => {
 await page.reload(); await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
 const box=page.getByLabel("Golfzon 데이터 붙여넣기");
 await box.fill("7I,142,134,6,정타\n7I,138,131,-8,좌\n7I,145,136,4,정타\n7I,141,133,5,정타");
 await page.getByRole("button",{name:"가져오기·학습"}).click();
 await expect(page.getByText(/4개 샷을 가져와 자동 학습했습니다/)).toBeVisible();
 await expect(page.locator(".card").filter({hasText:"7I · 4샷"})).toBeVisible();
 await expect(page.getByLabel("7I 캐리")).toHaveValue("134");
});


test("Golfzon CSV file upload imports shots and learns profile", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
 await page.getByLabel("Golfzon 파일 선택").setInputFiles({name:"golfzon.csv",mimeType:"text/csv",buffer:Buffer.from("PW,100,90,3,정타\nPW,102,92,-4,정타\nPW,98,89,5,정타")});
 await expect(page.getByText(/golfzon.csv에서 3개 샷을 가져와 자동 학습했습니다/)).toBeVisible();
 await expect(page.locator(".card").filter({hasText:"PW · 3샷"})).toBeVisible();
});


test("adaptive practice loop creates baseline mission and relearns shot by shot", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"연습/코칭",exact:true}).click();
 await expect(page.getByText("PW 10m 기준 만들기")).toBeVisible();
 await page.locator(".card").filter({hasText:"PW 10m 기준 만들기"}).getByRole("button",{name:"이 미션 연습"}).click();
 for(const d of ["9","10","11"]){await page.getByLabel("연습 실제 거리").fill(d);await page.getByLabel("연습 결과").selectOption("정타");await page.getByRole("button",{name:"1구 기록·재학습"}).click();}
 await expect(page.locator(".card").filter({hasText:/PW 10m · 보통 잔디/})).toContainText("3구");
 await expect(page.locator(".card").filter({hasText:/PW 10m · 보통 잔디/})).toContainText("성공률 100%");
});


test("live caddie falls back safely when personal short-game sample is insufficient", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await first.getByLabel("트러블 남은 거리").selectOption("10");await first.getByLabel("트러블 라이").selectOption("fairway");
 await expect(first.getByText(/개인 표본이 3구 미만|내 성공률 기반 추천/)).toBeVisible();
});


test("voice caddie controls are available with auto-read setting", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await expect(first.getByRole("button",{name:"AI 캐디 음성 듣기"})).toBeVisible();
 await expect(first.getByRole("button",{name:"AI 캐디 음성 정지"})).toBeVisible();
 await first.getByLabel("추천 자동 읽기").check();await expect(first.getByLabel("추천 자동 읽기")).toBeChecked();
});


test("camera address alignment coach exposes overlay and correction controls", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await expect(first.getByRole("button",{name:"정렬 카메라 시작"})).toBeVisible();
 await expect(first.getByLabel("카메라 목표선")).toBeVisible();
 await first.getByLabel("발끝선 각도").fill("8");
 await expect(first.getByText("재정렬 필요").first()).toBeVisible();
 await expect(first.getByRole("button",{name:"정렬 음성 피드백"})).toBeVisible();
});


test("camera coach exposes AI automatic joint alignment without claiming club-face vision", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await expect(first.getByRole("button",{name:"AI 자동 관절 분석"})).toBeVisible();
 await expect(first.getByText(/AI 자동 관절 분석을 켜기 전에는/)).toBeVisible();
 await expect(first.getByLabel("클럽페이스 각도")).toBeVisible();
});


test("address session saves club target lie and alignment score", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await first.getByLabel("어드레스 클럽").selectOption("7I");
 await first.getByLabel("어드레스 목표거리").fill("140");
 await first.getByLabel("발끝선 각도").fill("2");
 await first.getByLabel("어깨선 각도").fill("3");
 await first.getByLabel("샤프트 각도").fill("1");
 await first.getByLabel("클럽페이스 각도").fill("2");
 await first.getByRole("button",{name:"어드레스 세션 저장"}).click();
 await expect(first.getByText(/7I · 140m ·/)).toBeVisible();
 await expect(first.getByText(/정렬 양호/).last()).toBeVisible();
});


test("address result links into personal alignment learning", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await first.getByLabel("어깨선 각도").fill("6");
 for(let i=0;i<3;i++){
  await first.getByRole("button",{name:"어드레스 세션 저장"}).click();
  await first.getByLabel("어드레스 샷 결과").selectOption("우");
  await first.getByLabel("어드레스 좌우 편차").fill("8");
  await first.getByRole("button",{name:"샷 결과 연결"}).click();
 }
 await expect(first.getByText(/표본 3개/)).toBeVisible();
 await expect(first.getByText(/우측 미스가 100%/)).toBeVisible();
});


test("pre-shot warning is scoped by club and distance and creates drill", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await first.getByLabel("어드레스 클럽").selectOption("7I");
 await first.getByLabel("어드레스 목표거리").fill("140");
 await expect(first.getByText("7I 정렬 리셋 10구")).toBeVisible();
 await expect(first.getByText(/표본 8개 확보|기존 미스 비율보다 20% 이상 감소/)).toBeVisible();
});


test("alignment sessions survive reload and spoken pre-shot coach is available", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await first.getByLabel("어드레스 클럽").selectOption("7I");
 await first.getByLabel("어드레스 목표거리").fill("140");
 await first.getByRole("button",{name:"어드레스 세션 저장"}).click();
 await expect(first.getByRole("button",{name:"개인 경고 음성 듣기"})).toBeVisible();
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const again=page.locator(".coursePanel").first();await again.getByRole("button",{name:"트러블/어프로치"}).click();
 await expect(again.getByText(/7I · 140m ·/).first()).toBeVisible();
});


test("live GPS can register a field pin target and restore distance workflow", async ({ page, context }) => {
 await context.grantPermissions(["geolocation"]);
 await context.setGeolocation({latitude:35.647,longitude:128.735});
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();
 await first.getByRole("button",{name:"GPS 현재위치"}).click();
 await expect(first.getByText(/GPS 연결됨/)).toBeVisible();
 await first.getByRole("button",{name:"현재 위치를 그린 핀으로 저장"}).click();
 await expect(first.getByText(/그린\/핀 좌표:/)).toBeVisible();
 await expect(first.getByText(/잔여거리:/)).toBeVisible();
 await expect(first.getByRole("button",{name:"저장 핀 삭제"})).toBeVisible();
});

test("live GPS controls are available for continuous on-course tracking", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();
 await expect(first.getByRole("button",{name:"실시간 GPS 시작"})).toBeVisible();
 await expect(first.getByRole("button",{name:"실시간 GPS 정지"})).toBeVisible();
});


test("score shot can retain GPS context for hole review", async ({ page, context }) => {
 await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:35.647,longitude:128.735});
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();await first.getByRole("button",{name:"GPS 현재위치"}).click();
 await first.getByRole("button",{name:"스코어"}).click();
 await first.getByLabel(/샷 거리/).fill("210");await first.getByRole("button",{name:"추가",exact:true}).click();
 await first.getByRole("button",{name:"홀 샷 복기"}).click();
 await expect(first.getByText(/GPS 35\.647/)).toBeVisible();
});


test("field GPS supports green front center back custom target and two-point measure", async ({ page, context }) => {
 await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:35.647,longitude:128.735});
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();await first.getByRole("button",{name:"GPS 현재위치"}).click();
 for(const name of ["그린 앞 저장","그린 중앙 저장","그린 뒤 저장","임의 목표 저장","거리측정 시작점 저장","거리측정 끝점 저장"])await first.getByRole("button",{name}).click();
 await expect(first.getByText(/앞\/중앙\/뒤:/)).toBeVisible();
 await expect(first.getByText(/A↔B 0m/)).toBeVisible();
 await expect(first.getByRole("button",{name:"현장 GPS 포인트 초기화"})).toBeVisible();
});


test("round scorecard shows GPS risk review metrics", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"스코어카드",exact:true}).click();
 await expect(page.getByText("GPS 기록률")).toBeVisible();
 await expect(page.getByText("OB / 해저드")).toBeVisible();
 await expect(page.getByText("퍼트 / 벌타")).toBeVisible();
});

test("default short game wedge uses 56 degree naming", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
 await expect(page.getByText("56°",{exact:true}).first()).toBeVisible();
});


test("live caddie exposes real interactive map surface", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();
 await expect(first.getByLabel("실제 인터랙티브 코스 지도")).toBeVisible();
});

test("camera coach exposes zero degree calibration", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"트러블/어프로치"}).click();
 await expect(first.getByRole("button",{name:"카메라 정렬 기준 보정"})).toBeVisible();
});


test("course map switches between satellite and street and exports field GPS", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();
 await expect(first.getByRole("button",{name:"위성지도 보기"})).toBeVisible();
 await expect(first.getByRole("button",{name:"일반지도 보기"})).toBeVisible();
 await expect(first.getByRole("button",{name:"코스 GPS GeoJSON 내보내기"})).toBeVisible();
});

test("short game media tab can play current Korean lesson and build storyboard", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"상황별 공략·어프로치",exact:true}).click();
 await page.getByRole("button",{name:"MP3 · MP4 레슨"}).click();
 await expect(page.getByRole("button",{name:"현재 레슨 음성 재생"})).toBeVisible();
 await expect(page.getByText("MP4 제작 스토리보드")).toBeVisible();
});


test("field course boundary capture supports fairway green bunker water and OB", async ({ page, context }) => {
 await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:35.647,longitude:128.735});
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();await first.getByRole("button",{name:"GPS 현재위치"}).click();
 await expect(first.getByLabel("코스 영역 종류")).toBeVisible();
 await first.getByLabel("코스 영역 종류").selectOption("green");
 await first.getByRole("button",{name:"현재 위치를 코스 경계점으로 추가"}).click();
 await expect(first.getByText(/그린 1점/)).toBeVisible();
 await expect(first.getByRole("button",{name:"코스 경계 초기화"})).toBeVisible();
});


test("AI guide exposes slope effective distance and target bias", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"공략 가이드"}).click();
 await expect(first.getByLabel("목표 고저차")).toBeVisible();
 await expect(first.getByText(/바람 포함 유효거리/)).toBeVisible();
 await expect(first.getByText(/추천 목표 보정/)).toBeVisible();
});

test("course field screen exposes learned risk mission", async ({ page }) => {
 await page.reload();await page.locator(".nav").getByRole("button",{name:"AI 캐디",exact:true}).click();
 const first=page.locator(".coursePanel").first();await first.getByRole("button",{name:"거리 측정"}).click();
 await expect(first.getByText("코스 위험 학습 미션")).toBeVisible();
});


test("distance panel exposes field geometry verification", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button",{name:"거리 측정"}).first().click();
  await expect(page.getByText(/이 홀 실측 검증/).first()).toBeVisible();
  await expect(page.getByRole("button",{name:"티잉구역 저장"}).first()).toBeVisible();
  await expect(page.getByText(/공개 코스맵은 참고자료/).first()).toBeVisible();
});

test("strategy confidence starts conservatively until field geometry is verified", async ({ page }) => {
 await page.reload();
 const first=page.locator(".coursePanel").first();
 await first.getByRole("button",{name:"공략 가이드"}).click();
 await expect(first.getByText(/지형 신뢰도/)).toBeVisible();
 await expect(first.getByText(/보수적 공략/)).toBeVisible();
 await expect(first.getByText(/그린 GPS 미검증/)).toBeVisible();
});

test("daily moved tee box can override nominal tee without changing master tee", async ({ page }) => {
 await page.reload();
 const first=page.locator(".coursePanel").first();
 await first.getByRole("button",{name:"거리 측정"}).click();
 await expect(first.getByText("오늘 티박스 위치")).toBeVisible();
 await expect(first.getByRole("button",{name:"오늘 티박스 현재 GPS 적용"})).toBeVisible();
 await expect(first.getByRole("button",{name:"오늘 티박스 위치 해제"})).toBeDisabled();
 await expect(first.getByText(/기준 티 좌표와 별도로 저장/)).toBeVisible();
});

test("download-first course mode is available before field GPS", async ({ page }) => {
 await page.reload();
 const first=page.locator(".coursePanel").first();
 await first.getByRole("button",{name:"거리 측정"}).click();
 await expect(first.getByText(/1단계 · 코스 데이터 먼저 불러오기/)).toBeVisible();
 await expect(first.getByLabel("코스 데이터 파일")).toBeVisible();
 await expect(first.getByText(/2단계 · 현장 GPS 보정/)).toBeVisible();
});

test("course overlay first view avoids pretending blurry imagery is verified geometry", async ({ page }) => {
 await page.reload();
 const first=page.locator(".coursePanel").first();
 await expect(first.getByText(/코스 데이터 불러오기 전|다운로드 코스 형상 적용됨/)).toBeVisible();
 await first.getByRole("button",{name:"거리 측정"}).click();
 await expect(first.getByRole("button",{name:"위성지도 보기"})).toBeVisible();
 await expect(first.getByRole("button",{name:"일반지도 보기"})).toBeVisible();
});


test("mobile survives corrupted legacy localStorage without client exception", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("golfClubsV3","null");
    localStorage.setItem("golfScoresV3","{}");
    localStorage.setItem("golfShotsV3","{}");
    localStorage.setItem("golfCustomCoursesV3","{}");
    localStorage.setItem("golfCourseIdV3","123");
    localStorage.setItem("golfRoundV3","[]");
    localStorage.setItem("golfWeatherV3","[]");
  });
  await page.setViewportSize({width:412,height:915});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.goto("/");
  await expect(page.getByText("청도 그레이스CC").first()).toBeVisible();
  await expect(page.locator(".coursePanel")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("fresh v6 state renders after reload on mobile", async ({ page }) => {
  await page.setViewportSize({width:412,height:915});
  await page.goto("/");
  await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
  await page.getByLabel("Driver").fill("225");
  await page.reload();
  await page.locator(".nav").getByRole("button",{name:"장비/클럽",exact:true}).click();
  await expect(page.getByLabel("Driver")).toHaveValue("225");
});


test("mobile primary hole view shows satellite-style course instead of street map", async ({ page }) => {
  await page.setViewportSize({width:412,height:915});
  await page.goto("/");
  const map=page.locator(".mainSatelliteMap").first();
  await expect(map).toBeVisible();
  const bg=await map.evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(bg).toContain("data:image/jpeg;base64");
  await expect(page.getByText("위성형 공략도 · 홀 정보 우선 표시").first()).toBeVisible();
  await expect(page.getByRole("button",{name:"오픈 코스 데이터 자동 불러오기"})).toHaveCount(0);
  await page.locator(".coursePanel").first().getByRole("button",{name:"거리 측정"}).click();
  await expect(page.getByRole("button",{name:"오픈 코스 데이터 자동 불러오기"}).first()).toBeVisible();
});


test("primary Grace CC map uses real satellite embed with geographic center", async ({ page }) => {
  await page.setViewportSize({width:412,height:915});
  await page.goto("/");
  const frame=page.locator(".realSatelliteFrame").first();
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("src",/maps\.google\.com\/maps\?q=.*&t=k&z=17&output=embed/);
  await expect(page.getByText("실제 위성지도 · 홀별 GPS 보정 전").first()).toBeVisible();
});
