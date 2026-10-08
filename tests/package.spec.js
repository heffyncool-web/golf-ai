const {test,expect}=require('@playwright/test');
const fs=require('fs');
const engine=()=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('app/courseImporter.js','utf8')+'\n'+fs.readFileSync('app/coursePackage.js','utf8').replace(/^import .*;\n/,'')).toString('base64'));
// Synthetic coordinates exercise registration only; these are not actual course holes.
const course={id:'grace-cc',mapCenter:{lat:35.664,lng:128.648},courses:{Lake:[{},{}],Mountain:[{}]}};
const fixture=()=>({type:'GolfCoursePackage',schemaVersion:1,courseId:'grace-cc',source:{name:'TEST FIXTURE',license:'Synthetic test data'},holes:[{course:'Lake',hole:1,data:{points:{tee:{lat:35.664,lng:128.648},center:{lat:35.667,lng:128.648}}}},{course:'Lake',hole:2,data:{points:{tee:{lat:35.664,lng:128.649},center:{lat:35.666,lng:128.649}}}},{course:'Mountain',hole:1,data:{points:{tee:{lat:35.664,lng:128.650},center:{lat:35.666,lng:128.650}}}}]});
test('package validates identity, coordinates and duplicates before replacing data',async()=>{
 const m=await engine(),src=fixture(),pkg=m.parseCoursePackage(src,course);expect(pkg.holes).toHaveLength(3);expect(m.selectPackageHole(pkg,'Lake',2).points.tee.lng).toBe(128.649);expect(m.selectPackageHole(pkg,'Mountain',1).points.tee.lng).toBe(128.650);expect(m.selectPackageHole(pkg,'Lake',3)).toBeNull();
 for(const mutate of [x=>x.courseId='other',x=>x.holes.push(x.holes[0]),x=>x.holes[0].data.points.tee.lat=95,x=>x.source.license='',x=>x.holes[0].course='Unknown',x=>x.holes[0].data.points.tee.lat=37]){const bad=fixture();mutate(bad);expect(()=>m.parseCoursePackage(bad,course)).toThrow();}
 const bad=fixture();bad.holes[0].data.features=[{geometry:{type:'Polygon',coordinates:[[[128.648,35.664],[128.649,35.664],[128.649,35.665]]]}}];expect(()=>m.parseCoursePackage(bad,course)).toThrow(/닫힌/);
});
test('one import selects distinct holes, survives reload and invalid import preserves package',async({page})=>{
 await page.goto('/');await page.locator('.nav').getByRole('button',{name:'골프장 DB',exact:true}).click();const input=page.getByLabel('골프장 전체 홀 자료 파일');
 await input.setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});await expect(page.getByRole('status')).toContainText('3개 홀 등록 완료');
 const saved=await page.evaluate(()=>localStorage.getItem('golfCoursePackage:grace-cc'));const bad=fixture();bad.courseId='wrong';await input.setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.getByRole('status')).toContainText('기존 자료 유지');expect(await page.evaluate(()=>localStorage.getItem('golfCoursePackage:grace-cc'))).toBe(saved);
 await page.locator('.nav').getByRole('button',{name:'AI 캐디',exact:true}).click();const panel=page.locator('.coursePanel').first();await expect(panel.locator('.fieldMode button')).toHaveCount(3);await expect(panel.locator('.referenceHolePicture')).toHaveCount(0);
 await page.locator('.stripHoles').first().getByRole('button',{name:'2',exact:true}).click();await expect(panel.locator('.fieldMode button')).toHaveCount(3);await page.reload();await expect(panel.locator('.fieldMode button')).toHaveCount(3);
 await page.locator('.stripHoles').first().getByRole('button',{name:'3',exact:true}).click();await expect(panel.getByLabel('개별 홀 지도 자료 대기')).toBeVisible();
 await page.locator('.nav').getByRole('button',{name:'골프장 DB',exact:true}).click();await page.getByRole('button',{name:'일괄 홀 자료 해제',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('golfCoursePackage:grace-cc'))).toBeNull();
});
