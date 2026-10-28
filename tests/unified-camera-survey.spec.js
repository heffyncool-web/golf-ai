const {test,expect}=require("@playwright/test");
test("unified camera hub offers golf, tree and survey routes",async({page})=>{
 await page.goto("/camera");
 await expect(page.getByRole("heading",{name:"AI 카메라 통합"})).toBeVisible();
 await page.getByRole("button",{name:/측량/}).click();
 await expect(page.getByRole("link",{name:"현재 기능 화면 열기"})).toHaveAttribute("href","/camera/survey");
 await page.getByRole("button",{name:/책·문서/}).click();
 await expect(page.getByText(/구현 완료로 표시하지 않습니다/)).toBeVisible();
});
test("survey has distance area building and golf tools, no fabricated geometry",async({page})=>{
 await page.goto("/camera/survey");
 await expect(page.getByRole("heading",{name:"AI 카메라 · 측량"})).toBeVisible();
 await expect(page.getByRole("button",{name:"거리",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"면적",exact:true}).click();
 await expect(page.getByRole("heading",{name:"면적 측정"})).toBeVisible();
 await expect(page.getByText(/현재 측정값/)).toBeVisible();
 await expect(page.getByText(/건축면적이나 연면적과 동일하지 않습니다/)).toBeVisible();
 await page.getByRole("button",{name:"건물",exact:true}).click();
 await expect(page.getByRole("heading",{name:"건물 측정"})).toBeVisible();
 await page.getByRole("button",{name:"골프 거리",exact:true}).click();
 await expect(page.getByRole("heading",{name:"골프 거리 측정"})).toBeVisible();
});

test("DXF export requires calibrated reference and actual measured points",async({page})=>{
  await page.goto("/camera/survey");
  await expect(page.getByRole("button",{name:"2D CAD DXF 저장"})).toBeDisabled();
  await page.getByRole("button",{name:"건물",exact:true}).click();
  await expect(page.getByRole("button",{name:"2D CAD DXF 저장"})).toBeDisabled();
  await expect(page.getByText(/건축면적이나 연면적과 동일하지 않습니다/)).toBeVisible();
});
