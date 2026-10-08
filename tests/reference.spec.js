const {test,expect}=require('@playwright/test');
test('reference composition keeps actual controls and marks unknown terrain',async({page},info)=>{
 await page.goto('/');const panel=page.locator('.coursePanel').first();
 await expect(panel.getByLabel('LAKE 1H 개별 홀 공략도')).toBeVisible();
 await expect(panel.getByLabel('첨부 이미지 기준 홀 공략 안내').getByRole('heading',{name:'세컨드 샷 공략'})).toBeVisible();
 await panel.getByRole('button',{name:'실제 위성·GPS 열기'}).click();const brief=panel.getByLabel('홀 사전 공략 분석');
 await expect(brief.getByRole('heading',{name:'티샷 사전 공략'})).toBeVisible();await expect(brief.getByText('그린 윤곽 미등록')).toBeVisible();
 await expect(brief.locator('.briefDistanceRow dd')).toHaveText(['미등록','미등록','미등록','미등록']);
 await panel.getByRole('button',{name:'현재 위치 공략',exact:true}).click();await expect(brief.getByRole('heading',{name:'현재 샷 공략'})).toBeVisible();await panel.getByRole('button',{name:'라운드 전 티샷',exact:true}).click();
 await panel.locator('.holeDataTools summary').click();await expect(panel.getByRole('button',{name:'오픈 코스 데이터 자동 불러오기'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await info.attach('reference-composition',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});
test('wide desktop has satellite beside analysis, mobile retains current hole',async({page},info)=>{
 if(info.project.name.startsWith('desktop'))await page.setViewportSize({width:1600,height:1000});
 await page.goto('/');const panel=page.locator('.coursePanel[data-active=true]');const map=await panel.locator('.fieldCaddie').boundingBox(),brief=await panel.locator('.holeDetails').boundingBox();
 if(info.project.name.startsWith('desktop')){expect(brief.x).toBeGreaterThanOrEqual(map.x+map.width-2);expect(Math.abs(brief.y-map.y)).toBeLessThan(2);await expect(page.locator('.coursePanel')).toHaveCount(2);}
 else {expect(brief.y).toBeGreaterThan(map.y);await expect(page.locator('.coursePanel[data-active=false]')).toBeHidden();}
});
