const {test,expect}=require('@playwright/test');
test('individual reference renders original image without GPS, resets zoom and survives refresh',async({page},info)=>{
 let calls=0;await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=()=>{throw Error('unexpected GPS')};navigator.geolocation.watchPosition=()=>{throw Error('unexpected GPS')};});
 await page.route(/arcgisonline\.com/,r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().endsWith('/reference/golf-hole-layout.png')&&r.ok())calls++});
 if(info.project.name.startsWith('desktop'))await page.setViewportSize({width:1536,height:1024});
 await page.goto('/');const panel=page.locator('.coursePanel').first(),map=panel.getByLabel('LAKE 1H 개별 홀 공략도'),svg=map.getByRole('img');await expect(map).toBeVisible();await expect(svg).toHaveAttribute('viewBox','202 279 281 576');await expect.poll(()=>calls).toBeGreaterThan(0);
 await expect(panel.getByText('첨부 공략도 · 실제 좌표 미연결')).toBeVisible();await expect(panel.getByLabel('골프장 전체 위성 미리보기',{exact:true})).toHaveCount(0);
 await map.getByRole('button',{name:'개별 홀 확대'}).click();expect(await svg.getAttribute('viewBox')).not.toBe('202 279 281 576');await map.getByRole('button',{name:'기본보기',exact:true}).click();await expect(svg).toHaveAttribute('viewBox','202 279 281 576');
 await map.getByRole('button',{name:'크게보기',exact:true}).click();await expect(page.locator('.mapModal').getByLabel('LAKE 1H 개별 홀 공략도')).toBeVisible();await page.getByRole('button',{name:'지도 닫기',exact:true}).click();
 await page.reload();await expect(map).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await info.attach('individual-hole-reference',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 if(info.project.name.startsWith('desktop')){const actions=await panel.locator('.panelActions').boundingBox(),bar=await page.locator('.roundBar').boundingBox();expect(actions.y+actions.height).toBeLessThanOrEqual(bar.y+1);}
 if(info.project.name.startsWith('desktop'))await page.screenshot({path:info.outputPath('individual-holes.png')});
 await page.locator('.stripHoles').first().getByRole('button',{name:'2',exact:true}).click();await expect(panel.getByLabel('개별 홀 지도 자료 대기')).toBeVisible();await expect(panel.locator('.referenceHolePicture')).toHaveCount(0);
});
