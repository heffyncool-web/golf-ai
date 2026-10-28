const { test, expect } = require("@playwright/test");

test("swing analysis includes shared golf camera and comparison controls", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav").getByRole("button", { name: "스윙 분석", exact: true }).click();
  await expect(page.getByRole("heading", { name: /골프 AI 카메라/ })).toBeVisible();
  await expect(page.getByLabel("내 골프 스윙 영상")).toBeVisible();
  await expect(page.getByLabel("프로 참고 골프 스윙 영상")).toBeVisible();
  await expect(page.getByRole("button", { name: /카메라 켜기/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "두 영상 동시에 재생" })).toBeVisible();
  await page.getByLabel("비교 단계").selectOption("임팩트");
  await expect(page.getByText(/먼저 두 영상에서 동일한 임팩트 순간/)).toBeVisible();
});

test("AI camera golf route shares the swing studio", async ({ page }) => {
  await page.goto("/camera/golf");
  await expect(page.getByRole("heading", { name: /골프 AI 카메라/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "골프 AI 홈으로 이동" })).toHaveAttribute("href", "/");
  await page.getByLabel("프레임 분석 기준 fps").selectOption("120");
  await page.getByLabel("재생속도").selectOption("0.125");
  await expect(page.getByRole("button", { name: "선택 단계로 맞추기" })).toBeVisible();
});
