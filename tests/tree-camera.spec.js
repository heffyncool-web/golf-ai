const {test,expect}=require("@playwright/test");

test("tree camera routes present species and measurement with honest limitations",async({page})=>{
 await page.goto("/camera/trees");
 await expect(page.getByRole("heading",{name:/AI 카메라 · 수종 인식/})).toBeVisible();
 await expect(page.getByRole("button",{name:"카메라 켜기"})).toBeVisible();
 await expect(page.getByRole("button",{name:"지금 수종 인식"})).toBeDisabled();
 await expect(page.getByText(/실제 AI 분석 연결 후 후보를 표시/)).toBeVisible();
 await expect(page.getByText(/원근 차이, 나무의 비원형 단면/)).toBeVisible();
 await page.getByRole("combobox").selectOption("R");
 await expect(page.getByText(/근원직경 R 참고 결과/)).toBeVisible();
 await page.getByRole("button",{name:"현재 추정 기록 추가"}).click();
 await expect(page.getByText(/1건의 참고 기록/)).toBeVisible();
});

test("tree plant API never fabricates a match without API credentials",async({request})=>{
 const response=await request.post("/api/tree-identify",{multipart:{image:{name:"tree.jpg",mimeType:"image/jpeg",buffer:Buffer.from([0xff,0xd8,0xff,0xd9])}}});
 // No PLANTNET_API_KEY in the CI environment, so the route reports a dependency.
 expect([503,502,400]).toContain(response.status());
 const payload=await response.json();
 expect(payload.candidates).toBeUndefined();
 expect(payload.error).toBeTruthy();
});
