const {test,expect}=require('@playwright/test');
test('employee save remains inside the viewport while only profile fields scroll at all text sizes',async({page})=>{
 await page.goto('/');const s=await page.request.get('/api/state').then(r=>r.json()),headers={Origin:'http://127.0.0.1:3199','X-Sizzla-Token':s.token};
 const r=await page.request.post('/api/employees',{headers,data:{firstName:'Layout',lastName:'Test',startDate:'2026-01-01',salaryType:'monthly',salary:'100',employmentPercent:'100',weeklyHours:'40',vacationYear:2026,vacationDays:'0',contract:'permanent'}});expect(r.ok()).toBeTruthy();const employee=await r.json();
 for(const viewport of [{width:1024,height:700},{width:1366,height:768}])for(const textSize of [100,150,200]){
  await page.setViewportSize(viewport);await page.request.post('/api/preferences',{headers,data:{language:'sv',theme:'light',textSize,bold:false}});await page.reload();await expect(page.locator('nav')).toBeVisible();await page.evaluate(id=>{page='payroll';render();hrOpen('employee',id);},employee.id);
  const save=page.locator('#hr-form button[type=submit]');await expect(save).toBeInViewport({ratio:1});await expect(page.locator('#hr-cancel')).toBeInViewport({ratio:1});
  const before=await save.boundingBox();await page.locator('#hr-form>.dialog-body').evaluate(e=>{e.scrollTop=e.scrollHeight;});const after=await save.boundingBox();expect(Math.abs(after.y-before.y)).toBeLessThan(1);await expect(save).toBeInViewport({ratio:1});
  await page.locator('#hr-form [name=notes]').fill('Layout verified '+textSize);await save.click();await expect(page.locator('#hr-form')).toHaveCount(0);
 }
 await page.request.post('/api/preferences',{headers,data:{language:'sv',theme:'light',textSize:100,bold:false}});
});
