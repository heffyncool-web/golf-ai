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
  expect(top.height).toBeGreaterThanOrEqual(65);
  expect(top.height).toBeLessThanOrEqual(82);
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(a.width - b.width)).toBeLessThan(30);
  expect(a.width).toBeGreaterThan(380);
  await expect(page.locator(".visualMap.satellite").first()).toBeVisible();
  await expect(page.locator(".coursePanel")).toHaveCount(2);
  await expect(page.getByText(/위성풍 공략도/).first()).toBeVisible();
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
  await first.getByRole("button",{name:"스코어",exact:true}).click();
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
  await expect(first.locator(".visualMap svg")).toBeVisible();
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
