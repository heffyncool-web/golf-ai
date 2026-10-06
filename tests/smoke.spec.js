const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("청도 그레이스CC").first()).toBeVisible();
});

test("all primary navigation opens a real screen", async ({ page }) => {
  const items = [
    ["홈","라운드 대시보드"],
    ["라운드 일정","라운드 일정"],
    ["AI 캐디","AI 공략"],
    ["스코어카드","18홀 스코어카드"],
    ["골프장 DB","골프장 DB"],
    ["스윙 분석","스윙 분석"],
    ["연습/코칭","연습/코칭"],
    ["장비/클럽","장비/클럽"],
    ["날씨/GPS","날씨/GPS"],
    ["설정","설정"]
  ];
  for (const [button, heading] of items) {
    await page.getByRole("button",{name:button,exact:true}).click();
    await expect(page.getByText(heading,{exact:false}).first()).toBeVisible();
  }
});

test("18 hole navigation and concept map work", async ({ page }) => {
  await page.getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:"AI 공략",exact:true}).click();
  const holeButtons = page.locator(".holes button");
  await holeButtons.nth(4).click();
  await expect(page.getByText(/LAKE 5H/)).toBeVisible();
  await expect(page.getByText("공략 개념도")).toBeVisible();
  await holeButtons.nth(9).click();
  await expect(page.getByText(/MOUNTAIN 1H/)).toBeVisible();
  await page.getByRole("button",{name:/다음 홀/}).click();
  await expect(page.getByText(/MOUNTAIN 2H/)).toBeVisible();
  await page.getByRole("button",{name:/이전 홀/}).click();
  await expect(page.getByText(/MOUNTAIN 1H/)).toBeVisible();
});

test("score entry persists across navigation", async ({ page }) => {
  await page.getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:"스코어",exact:true}).click();
  const strokes = page.getByLabel("타수");
  await strokes.fill("5");
  await page.getByRole("button",{name:/다음 홀/}).click();
  await page.getByRole("button",{name:/이전 홀/}).click();
  await expect(strokes).toHaveValue("5");
});

test("club distance changes update caddie", async ({ page }) => {
  await page.getByRole("button",{name:"장비/클럽",exact:true}).click();
  const driver = page.getByLabel("Driver");
  await driver.fill("230");
  await page.getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:"AI 공략",exact:true}).click();
  await expect(page.getByText(/기준 230m/)).toBeVisible();
});

test("round settings persist after reload", async ({ page }) => {
  await page.getByRole("button",{name:"라운드 일정",exact:true}).click();
  await page.getByLabel("티타임").fill("13:20");
  await page.reload();
  await page.getByRole("button",{name:"라운드 일정",exact:true}).click();
  await expect(page.getByLabel("티타임")).toHaveValue("13:20");
});

test("course database searches, adds, selects and edits a course", async ({ page }) => {
  await page.getByRole("button",{name:"골프장 DB",exact:true}).click();
  await page.getByLabel("골프장 검색").fill("그레이스");
  await expect(page.locator(".card").filter({hasText:"청도 그레이스CC"})).toBeVisible();
  await page.getByLabel("골프장 검색").fill("");
  await page.getByLabel("골프장명").fill("테스트CC");
  await page.getByLabel("지역").fill("대구");
  await page.getByRole("button",{name:"추가 후 선택",exact:true}).click();
  const card=page.locator(".card").filter({hasText:"테스트CC"});
  await expect(card).toBeVisible();
  await page.getByLabel("홀 Par").fill("5");
  await page.getByLabel("홀 거리").fill("480");
  await page.getByLabel("그린 위도").fill("35.8001");
  await page.getByLabel("그린 경도").fill("128.6001");
  await expect(page.getByLabel("홀 Par")).toHaveValue("5");
  await card.getByRole("button",{name:"삭제",exact:true}).click();
  await expect(page.locator(".card").filter({hasText:"테스트CC"})).toHaveCount(0);
});

test("shot log records misses and updates personal aim bias", async ({ page }) => {
  await page.getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:"샷 기록",exact:true}).click();
  for(let i=0;i<2;i++){
    await page.getByLabel("실제 거리(m)").fill("215");
    await page.getByLabel("샷 결과").selectOption({label:"우"});
    await page.getByRole("button",{name:"샷 추가",exact:true}).click();
  }
  await expect(page.getByText(/1타 · Driver/)).toBeVisible();
  await page.getByRole("button",{name:"AI 공략",exact:true}).click();
  await expect(page.getByText(/AI 목표.*좌중앙/)).toBeVisible();
});

test("practice checklist works", async ({ page }) => {
  await page.getByRole("button",{name:"연습/코칭",exact:true}).click();
  await page.getByPlaceholder(/드라이버 20구/).fill("퍼팅 20개");
  await page.getByRole("button",{name:"추가",exact:true}).click();
  const task = page.getByText("퍼팅 20개",{exact:true});
  await expect(task).toBeVisible();
  const checkbox = task.locator("..").getByRole("checkbox");
  await checkbox.check();
  await expect(checkbox).toBeChecked();
});

test("manual weather values flow into caddie", async ({ page }) => {
  await page.getByRole("button",{name:"날씨/GPS",exact:true}).click();
  await page.getByLabel("풍속 m/s").fill("5");
  await page.getByLabel("샷 대비 바람").selectOption({label:"뒷바람"});
  await page.getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:"AI 공략",exact:true}).click();
  await expect(page.getByText(/5m\/s · 뒷바람/)).toBeVisible();
});

test("GPS and live weather buttons are functional with browser APIs", async ({ page }) => {
  await page.route("https://api.open-meteo.com/**", async route => {
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({current:{temperature_2m:19.4,wind_speed_10m:3.2,wind_direction_10m:90}})});
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator,"geolocation",{configurable:true,value:{getCurrentPosition(success){success({coords:{latitude:35.65,longitude:128.73,accuracy:8}});}}});
  });
  await page.getByRole("button",{name:"날씨/GPS",exact:true}).click();
  await page.getByRole("button",{name:"GPS로 실시간 날씨 갱신",exact:true}).click();
  await expect(page.getByText(/GPS·날씨 연결됨/)).toBeVisible();
  await expect(page.getByText(/19.4℃/)).toBeVisible();
  await expect(page.getByText(/3.2m\/s/)).toBeVisible();
});
