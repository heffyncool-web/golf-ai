const {test,expect}=require('@playwright/test');
test.setTimeout(60000);

test('round editing saves explicitly, updates header and survives reload; cancel preserves values',async({page})=>{
 await page.clock.install({time:new Date('2026-10-09T03:00:00Z')});
 await page.goto('/');
 await expect(page.getByLabel('현재 날짜와 시간')).toContainText('2026-10-09');
 await expect(page.locator('.dateBox')).toContainText('D-10');
 await page.getByRole('button',{name:'✎ 수정',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'라운드 정보 수정'});
 await editor.getByLabel('목표타수').fill('85');await editor.getByLabel('날짜',{exact:true}).fill('2026-10-12');await editor.getByLabel('티타임').fill('14:30');
 await expect(page.locator('.targetScore')).toContainText('90타');
 await editor.getByRole('button',{name:'저장 & 반영',exact:true}).click();
 await expect(page.locator('.targetScore')).toContainText('85타');await expect(page.locator('.dateBox')).toContainText('D-3');
 await page.reload();await expect(page.locator('.targetScore')).toContainText('85타');
 await page.getByRole('button',{name:'✎ 수정',exact:true}).click();await editor.getByLabel('목표타수').fill('99');await editor.getByRole('button',{name:'취소',exact:true}).click();await expect(page.locator('.targetScore')).toContainText('85타');
 await page.locator('.nav').getByRole('button',{name:'홈',exact:true}).click();await expect(page.locator('.card').filter({hasText:'목표타수'})).toContainText('85타');
});

test('reference can return from satellite and missing hole distinguishes whole course with per-hole artwork storage',async({page})=>{
 await page.goto('/');const panel=page.locator('.coursePanel').first();
 await panel.getByRole('button',{name:'실제 위성·GPS 열기',exact:true}).click();
 await expect(panel.getByRole('button',{name:'← 홀 공략도로 돌아가기'})).toBeVisible();
 await panel.getByRole('button',{name:'← 홀 공략도로 돌아가기'}).click();await expect(panel.getByLabel('LAKE 1H 개별 홀 공략도')).toBeVisible();
 await page.locator('.stripHoles').first().getByRole('button',{name:'2',exact:true}).click();
 const file=panel.getByLabel('Lake 2홀 공략도 사진');
 await file.setInputFiles({name:'hole2.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aENsAAAAASUVORK5CYII=','base64')});
 await panel.getByRole('button',{name:'사진 저장 & 반영',exact:true}).click();
 await expect(panel.getByAltText('Lake 2홀 사용자 등록 공략도')).toBeVisible();
 await panel.getByRole('button',{name:'실제 위성·GPS 열기',exact:true}).click();await expect(panel.locator('.mapReturnBar')).toContainText('골프장 전체 위치 참고용');
 await panel.getByRole('button',{name:'← 홀 공략도로 돌아가기'}).click();await expect(panel.getByAltText('Lake 2홀 사용자 등록 공략도')).toBeVisible();
 await page.locator('.stripHoles').first().getByRole('button',{name:'3',exact:true}).click();await expect(panel.locator('.holeArtwork img')).toHaveCount(0);
 await page.reload();await page.locator('.stripHoles').first().getByRole('button',{name:'2',exact:true}).click();await expect(panel.getByAltText('Lake 2홀 사용자 등록 공략도')).toBeVisible();
});

test('distance toolbar measures two selected map points and clears them',async({page})=>{
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args)};});
 await page.goto('/');const panel=page.locator('.coursePanel').first();await panel.getByRole('button',{name:'거리 측정',exact:true}).click();
 const detail=panel.locator('.detailPanel'),map=detail.getByLabel('위성영상 대체 지도');await expect(map).toBeVisible();
 await detail.getByRole('button',{name:'📏 두 지점 거리 측정',exact:true}).click();
 await map.click({position:{x:100,y:180}});await expect(detail.getByLabel('지도 측정 거리')).toContainText('끝점');
 await map.click({position:{x:100,y:280}});const result=detail.getByLabel('지도 측정 거리');await expect(result).toHaveText(/^\d+m$/);
 const value=Number((await result.textContent()).replace('m',''));expect(value).toBeGreaterThan(300);expect(value).toBeLessThan(450);
 await detail.getByRole('button',{name:'측정 초기화',exact:true}).click();await expect(result).toContainText('시작점');
});

test('course selectors remain separate and all nine buttons fit their strip',async({page},info)=>{
 if(info.project.name.startsWith('desktop'))await page.setViewportSize({width:1536,height:1024});
 await page.goto('/');const strips=page.locator('.courseStrip');await expect(strips).toHaveCount(2);
 for(let i=0;i<2;i++){const bounds=await strips.nth(i).boundingBox();for(const button of await strips.nth(i).locator('button').all()){const b=await button.boundingBox();expect(b.x).toBeGreaterThanOrEqual(bounds.x);expect(b.x+b.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);}}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await info.attach('updated-dashboard',{body:await page.screenshot({fullPage:true,path:info.project.name.startsWith('desktop')?'/workspace/onboarding/golf-ai-updated-desktop.png':'/workspace/onboarding/golf-ai-updated-mobile.png'}),contentType:'image/png'});
});
