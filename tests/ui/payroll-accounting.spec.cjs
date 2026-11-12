const {test,expect}=require('@playwright/test');
test('reviewed payroll posts accrued wages and bank payment once each',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 const fixture=await page.evaluate(async()=>{
  const state=await fetch('/api/state').then(r=>r.json());
  const api=async(route,body)=>{const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Sizzla-Token':state.token},body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());return r.json();};
  await api('company',{name:'Lönebokföring AB',org:'559123-4567'});
  const year=await api('accounting/years',{name:'2028',start:'2028-01-01',end:'2028-12-31'});
  const prefix='19900301001',sum=prefix.slice(2).split('').reduce((s,n,i)=>{const v=+n*(i%2?1:2);return s+Math.floor(v/10)+v%10;},0);
  const person=await api('employees',{firstName:'Bokföring',lastName:'Test',personId:prefix+(10-sum%10)%10,startDate:'2028-01-01',salary:'30000',vacationYear:2028});
  const run=await api('payruns',{period:'2028-11',payDate:'2028-11-25',entries:[{employeeId:person.id,tax:'8000',contribution:'9000',reimbursement:'200',netDeduction:'100',taxConfirmed:true,contributionConfirmed:true,taxBasis:'Test fixture, verified manual amounts'}]});
  await api('payruns/approve',{id:run.id,revision:1});return {yearId:year.id,runId:run.id};
 });
 const openRun=async()=>{
  await page.reload();await page.locator('nav').getByRole('button',{name:'Bokföring',exact:true}).click();await page.locator('#book-year').selectOption(fixture.yearId);
  await page.getByRole('tab',{name:'Bokför löner',exact:true}).click();await page.locator(`[data-book-payroll="${fixture.runId}"]`).click();
 };
 await openRun();
 await page.getByLabel('Kostnadsersättningens kostnadskonto').selectOption('5800');await page.getByLabel('Jag har granskat löneunderlaget').check();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Bokför granskad lön'}).click();
 await expect(page.locator('#book-view-title')).toContainText('A1');await expect(page.getByRole('row').filter({hasText:'2910'})).toContainText('22\u00a0100,00');
 await page.getByRole('button',{name:'Stäng',exact:true}).click();
 await page.evaluate(async runId=>{
  const s=await fetch('/api/state').then(r=>r.json());const r=await fetch('/api/payruns/paid',{method:'POST',headers:{'Content-Type':'application/json','X-Sizzla-Token':s.token},body:JSON.stringify({id:runId,revision:2})});if(!r.ok)throw new Error(await r.text());
 },fixture.runId);
 await openRun();await page.getByLabel('Typ av lönebokning').selectOption('payment');await page.getByLabel('Jag har granskat löneunderlaget').check();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Bokför granskad lön'}).click();
 await expect(page.locator('#book-view-title')).toContainText('A2');await expect(page.getByRole('row').filter({hasText:'1930'})).toContainText('22\u00a0100,00');
 await page.getByRole('button',{name:'Stäng',exact:true}).click();await page.locator(`[data-book-payroll="${fixture.runId}"]`).click();await page.getByLabel('Kostnadsersättningens kostnadskonto').selectOption('5800');await page.getByLabel('Jag har granskat löneunderlaget').check();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Bokför granskad lön'}).click();await expect(page.locator('#book-error')).toContainText('Underlaget är redan bokfört');
 expect(errors).toEqual([]);
});
