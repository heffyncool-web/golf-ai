const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("청도 그레이스CC").first()).toBeVisible();
});

test("all primary navigation opens a real screen", async ({ page }) => {
  const items = [
    ["홈","라운드 대시보드"],
    ["라운드 일정","라운드 일정"],
    ["AI 캐디","AI 공략 추천"],
    ["스코어카드","18홀 스코어카드"],
    ["골프장 DB","골프장 DB"],
    ["스윙 분석","스윙 분석"],
    ["연습/코칭","연습/코칭"],
    ["장비/클럽","장비/클럽"],
    ["날씨/바람","날씨/바람"],
    ["설정","설정"]
  ];
  for (const [button, heading] of items) {
    await page.getByRole("button",{name:button,exact:true}).click();
    await expect(page.getByText(heading,{exact:false}).first()).toBeVisible();
  }
});

test("18 hole navigation works", async ({ page }) => {
  await page.getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:"AI 공략 추천",exact:true}).click();
  const holeButtons = page.locator(".holes button");
  await holeButtons.nth(4).click();
  await expect(page.getByText(/LAKE 5H/)).toBeVisible();
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
  await page.getByRole("button",{name:"AI 공략 추천",exact:true}).click();
  await expect(page.getByText(/예상 230m/)).toBeVisible();
});

test("round settings persist", async ({ page }) => {
  await page.getByRole("button",{name:"라운드 일정",exact:true}).click();
  await page.getByLabel("티타임").fill("13:20");
  await page.getByRole("button",{name:"홈",exact:true}).click();
  await page.reload();
  await page.getByRole("button",{name:"라운드 일정",exact:true}).click();
  await expect(page.getByLabel("티타임")).toHaveValue("13:20");
});

test("course database can add and remove a custom course", async ({ page }) => {
  await page.getByRole("button",{name:"골프장 DB",exact:true}).click();
  await page.getByLabel("골프장명").fill("테스트CC");
  await page.getByLabel("지역").fill("대구");
  await page.getByRole("button",{name:"추가",exact:true}).click();
  const card=page.locator(".card").filter({hasText:"테스트CC"});
  await expect(card).toBeVisible();
  await card.getByRole("button",{name:"삭제",exact:true}).click();
  await expect(page.locator(".card").filter({hasText:"테스트CC"})).toHaveCount(0);
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

test("weather values flow into caddie", async ({ page }) => {
  await page.getByRole("button",{name:"날씨/바람",exact:true}).click();
  await page.getByLabel("풍속 m/s").fill("5");
  await page.getByLabel("바람").selectOption({label:"뒷바람"});
  await page.getByRole("button",{name:"AI 캐디",exact:true}).click();
  await page.getByRole("button",{name:"AI 공략 추천",exact:true}).click();
  await expect(page.getByText(/뒷바람 5m\/s/)).toBeVisible();
});