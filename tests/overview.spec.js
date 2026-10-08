const {test,expect}=require('@playwright/test');
test('home preview remains real satellite without GPS or external tile service',async({page},info)=>{
 await page.addInitScript(()=>{window.gpsRequested=false;navigator.geolocation.getCurrentPosition=()=>{window.gpsRequested=true;throw Error('GPS must not be needed for preview');};navigator.geolocation.watchPosition=()=>{window.gpsRequested=true;throw Error('GPS must not be needed for preview');};});
 await page.route(/https:\/\/(server|services)\.arcgisonline\.com\//,r=>r.abort());
 const received=[];page.on('response',r=>{if(r.url().includes('/course-imagery/'))received.push({url:r.url(),status:r.status()});});
 await page.goto('/');const panel=page.locator('.coursePanel[data-active=true]');await panel.getByRole('button',{name:'실제 위성·GPS 열기'}).click();const view=panel.getByLabel('골프장 전체 위성 미리보기', {exact:true});await expect(view).toBeVisible();await expect(view.locator('svg image')).toHaveCount(4);
 await expect.poll(()=>received.filter(x=>x.status===200).length).toBeGreaterThanOrEqual(4);expect(await page.evaluate(()=>window.gpsRequested)).toBe(false);await expect(panel.getByTestId('map-status')).toContainText('보관된 실제 위성영상 표시됨');
 const svg=view.getByRole('img');const before=await svg.getAttribute('viewBox');await view.getByRole('button',{name:'골프장 위성 미리보기 확대'}).click();expect(await svg.getAttribute('viewBox')).not.toBe(before);await view.getByRole('button',{name:'골프장 위성 미리보기 기본보기'}).click();expect(await svg.getAttribute('viewBox')).toBe(before);
 await page.reload();await panel.getByRole('button',{name:'실제 위성·GPS 열기'}).click();await expect(panel.getByLabel('골프장 전체 위성 미리보기', {exact:true})).toBeVisible();await page.waitForTimeout(800);await info.attach('gps-free-real-satellite-preview',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});
