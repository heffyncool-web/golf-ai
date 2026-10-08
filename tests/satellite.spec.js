const {test,expect}=require('@playwright/test');
const fs=require('fs');
const engine=()=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('app/holeCaddie.js','utf8')).toString('base64'));
const tee={lat:35.664,lng:128.648},green={lat:35.667,lng:128.648};
// Synthetic geometry tests algorithm only; this is NOT a mapped GraceCC hole.
const data={points:{tee,center:green,front:{...green,lat:35.6669},back:{...green,lat:35.6671}},areas:{fairway:[{lat:35.664,lng:128.6477},{lat:35.667,lng:128.6477},{lat:35.667,lng:128.6483},{lat:35.664,lng:128.6483}],bunker:[{lat:35.6653,lng:128.6479},{lat:35.6655,lng:128.6479},{lat:35.6655,lng:128.6481},{lat:35.6653,lng:128.6481}]},source:'TEST FIXTURE'};
test('geometry engine keeps separate bunkers, distance edges and cautious layup',async()=>{
 const m=await engine();const features=m.courseFeatures(data.areas,[]);const h=m.hazardDistances(tee,features);expect(h[0].front).toBeGreaterThan(140);expect(h[0].front).toBeLessThan(150);expect(h[0].back).toBeGreaterThan(165);
 const plans=m.caddiePlans({origin:tee,target:green,features,clubs:{'7I':165,'8I':130},stats:{'7I':{carry:150,total:165,dispersion:4},'8I':{carry:125,total:130,dispersion:4}}});expect(plans).toHaveLength(3);expect(plans[0].club).toBe('8I');expect(plans[0].success).toBeGreaterThan(plans[2].risk);expect(m.holeBounds({tee,center:green},features)[0][1]).toBe(tee.lat);
 expect(m.caddiePlans({origin:tee,target:green,features:[],clubs:{'8I':130}})[0].success).toBeNull();
});
test('mobile satellite receives REAL imagery, GPS updates retain map canvas and reload retains hole',async({page,context},info)=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:tee.lat,longitude:tee.lng,accuracy:5});
 await page.addInitScript(d=>localStorage.setItem('golfTarget:grace-cc:Lake:1:downloadedCourse',JSON.stringify(d)),data);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');const field=page.getByLabel('GPS 실전 캐디').first();
 // A real external imagery load, no mocked tiles and no screenshot-only pass.
 await expect(field.getByTestId('map-status')).toContainText('위성영상 표시됨',{timeout:40000});
 await expect(field.locator('.courseMarker')).toHaveCount(7);
 const mapView=field.getByLabel('실제 인터랙티브 코스 지도');const initialCenter=await mapView.getAttribute('data-view-center');
 const stageBox=await field.locator('.holeMapStage').boundingBox();for(const label of ['티','그린','뒤']){const box=await field.locator('.courseMarker').filter({hasText:new RegExp('^'+label+'$')}).boundingBox();expect(box.y).toBeGreaterThanOrEqual(stageBox.y);expect(box.y+box.height).toBeLessThanOrEqual(stageBox.y+stageBox.height-22);}
 const before=await field.locator('canvas').count();await field.getByRole('button',{name:'GPS 현재위치',exact:true}).click();await expect(field.getByText(/GPS ±5m/)).toBeVisible();
 await expect(field.locator('.fieldMode button')).toHaveCount(3);await expect(field.getByText(/벙커/).first()).toBeAttached();
 if(before){await field.locator('canvas').evaluate(c=>c.dataset.stable='yes');await field.getByRole('button',{name:'실시간 GPS 시작',exact:true}).click();await context.setGeolocation({latitude:35.6641,longitude:128.648,accuracy:6});await expect(field.getByText(/GPS ±6m/)).toBeVisible();await expect(field.locator('canvas')).toHaveAttribute('data-stable','yes');expect(await mapView.getAttribute('data-view-center')).toBe(initialCenter);}
 await field.getByRole('button',{name:'홀 전체 기본보기'}).click();await page.reload();await expect(page.getByLabel('GPS 실전 캐디').first().locator('.fieldMode button')).toHaveCount(3);expect(errors).toEqual([]);
 await expect(page.getByLabel('GPS 실전 캐디').first().getByTestId('map-status')).toContainText('위성영상 표시됨',{timeout:40000});
 await page.waitForTimeout(1200);
 await info.attach('satellite-mobile',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await info.attach('satellite-map',{body:await page.locator('.holeMapStage').first().screenshot(),contentType:'image/png'});
});
test('changing hole never carries over previous geometry',async({page})=>{
 await page.addInitScript(d=>localStorage.setItem('golfTarget:grace-cc:Lake:1:downloadedCourse',JSON.stringify(d)),data);await page.goto('/');await expect(page.getByLabel('GPS 실전 캐디').first().locator('.fieldMode button')).toHaveCount(3);
 await page.locator('.stripHoles').first().getByRole('button',{name:'2',exact:true}).click();await expect(page.getByLabel('GPS 실전 캐디').first().locator('.fieldMode button')).toHaveCount(0);await expect(page.locator('.coursePanel').first().locator('.panelTitle')).toContainText('2H');
});
test('invalid tile input is rejected without external fetch',async({request})=>{expect((await request.get('/api/satellite-tile?z=200&x=0&y=0')).status()).toBe(400)});
test('WebGL unavailable uses REAL image tiles with geometry and zoom reset',async({page})=>{
 await page.addInitScript(d=>{localStorage.setItem('golfTarget:grace-cc:Lake:1:downloadedCourse',JSON.stringify(d));const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};},data);
 await page.goto('/');const field=page.getByLabel('GPS 실전 캐디').first();await expect(field.getByLabel('위성영상 대체 지도')).toBeVisible();await expect(field.getByTestId('map-status')).toContainText('위성영상 표시됨 · 대체 표시',{timeout:40000});
 expect(await field.locator('.imageTileMap>img').evaluateAll(imgs=>imgs.some(i=>i.complete&&i.naturalWidth===256))).toBe(true);await expect(field.locator('.tileOverlay circle')).toHaveCount(3);await field.getByRole('button',{name:'대체 지도 확대'}).click();await field.getByRole('button',{name:'대체 지도 기본보기'}).click();await expect(field.locator('.fieldMode button')).toHaveCount(3);
});
