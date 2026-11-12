const {test,expect}=require('@playwright/test');const fs=require('node:fs/promises');
test('purchasing: supplier, order, partial receipts, invoice, credit, partial payments and corrected payment',async({page},testInfo)=>{
 test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 const yearId=await page.evaluate(async()=>{
  const s=await fetch('/api/state').then(r=>r.json());const api=async(route,data)=>{const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Sizzla-Token':s.token},body:JSON.stringify(data)});if(!r.ok)throw new Error(await r.text());return r.json();};
  await api('company',{name:'Inköpsflöde AB',org:'559123-4567'});return (await api('accounting/years',{name:'2029',start:'2029-01-01',end:'2029-12-31'})).id;
 });
 await page.reload();await page.getByLabel('Utseende',{exact:true}).selectOption('dark');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('nav').getByRole('button',{name:'Inköp',exact:true}).click();await page.getByRole('button',{name:'Ny leverantör'}).click();
 await page.getByRole('dialog').getByLabel('Namn',{exact:false}).fill('Leverantör & Partner <AB>');await page.getByLabel('Organisationsnummer').fill('556000-0001');await page.getByLabel('E-post').fill('inkop@example.se');
 await page.getByRole('dialog').getByRole('button',{name:'Spara',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('tbody')).toContainText('Leverantör & Partner <AB>');
 await page.getByRole('tab',{name:'Inköpsorder',exact:true}).click();await page.getByRole('button',{name:'Ny inköpsorder'}).click();
 await page.getByRole('dialog').getByLabel('Datum').fill('2029-11-01');await page.getByLabel('Önskad leveransdag').fill('2029-11-05');await page.getByLabel('Underlag / referens').fill('Beställning 1');
 await page.locator('[data-key=description]').fill('Inköpta varor');await page.locator('[data-key=quantity]').fill('10');await page.locator('[data-key=price]').fill('100');
 await page.getByRole('dialog').getByRole('button',{name:'Spara',exact:true}).click();await expect(page.locator('#purchase-view-title')).toContainText('IO1');await page.locator('#purchase-review').check();await page.getByRole('button',{name:'Utfärda order'}).click();await expect(page.getByRole('button',{name:'Registrera inleverans'})).toBeVisible();
 const printPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Skriv ut',exact:true}).click();const popup=await printPromise;await expect(popup.getByRole('heading',{name:'Inköpsorder',exact:true})).toBeVisible();await popup.close();
 for(const [quantity,reference,date] of [['4','Följesedel A','2029-11-05'],['6','Följesedel B','2029-11-06']]){
  await page.getByRole('button',{name:'Registrera inleverans'}).click();await page.getByRole('dialog').getByLabel('Datum').fill(date);await page.getByLabel('Följesedel / leveransreferens').fill(reference);await page.locator('[data-receipt-line]').fill(quantity);await page.getByRole('dialog').getByRole('button',{name:'Spara',exact:true}).click();await expect(page.locator('#purchase-view-title')).toContainText('IO1');
 }
 await expect(page.getByRole('button',{name:'Registrera inleverans'})).toHaveCount(0);await page.getByRole('button',{name:'Skapa fakturautkast'}).click();
 await page.getByRole('dialog').getByLabel('Datum',{exact:false}).first().fill('2029-11-01');await page.getByLabel('Förfallodatum').fill('2029-12-01');await page.getByLabel('Leverantörens fakturanummer').fill('INV-UI1');await page.getByLabel('Underlag / referens').fill('Original PDF 1');await page.getByLabel('Totalbelopp enligt originalfakturan').fill('1250');await page.locator('[data-key=deductible]').fill('50');
 await page.getByRole('dialog').getByRole('button',{name:'Spara',exact:true}).click();await expect(page.locator('#purchase-view-title')).toContainText('INV-UI1');await page.locator('#purchase-review').check();await page.getByRole('button',{name:'Godkänn faktura'}).click();await expect(page.getByRole('button',{name:'Bokför faktura',exact:true})).toBeVisible();
 const bookInvoice=async()=>{
  await page.getByRole('button',{name:'Bokför faktura',exact:true}).click();await page.getByLabel('Räkenskapsår',{exact:true}).selectOption(yearId);await page.getByLabel('Bokföringsdatum').fill('2029-11-07');await page.getByLabel('Jag har kontrollerat underlag').check();await page.getByRole('button',{name:'Bokför granskad faktura'}).click();await expect(page.getByRole('button',{name:'Öppna verifikation'})).toBeVisible();
 };
 await bookInvoice();
 const pay=async(reference,actualDate='2029-11-10',postingDate=actualDate)=>{
  await page.getByRole('button',{name:'Registrera betalning',exact:true}).click();await page.getByLabel('Belopp (SEK)',{exact:true}).fill('500');await page.getByLabel('Faktiskt betalningsdatum').fill(actualDate);await page.getByLabel('Bokföringsdatum').fill(postingDate);await page.getByLabel('Banktransaktion / referens').fill(reference);await page.getByLabel('Räkenskapsår',{exact:true}).selectOption(yearId);await page.getByLabel('Jag bekräftar att betalningen').check();await page.getByRole('button',{name:'Registrera och bokför'}).click();await expect(page.locator('#purchase-view-title')).toContainText('INV-UI1');
 };
 await pay('Bank del 1');await expect(page.locator('.purchase-settlement')).toContainText('750,00');
 await page.getByRole('button',{name:'Registrera kreditfaktura'}).click();await page.getByRole('dialog').getByLabel('Datum',{exact:false}).first().fill('2029-11-02');await page.getByLabel('Förfallodatum').fill('2029-12-01');await page.getByLabel('Leverantörens fakturanummer').fill('CREDIT-UI1');await page.getByLabel('Underlag / referens').fill('Original kredit-PDF');await page.getByLabel('Totalbelopp enligt originalfakturan').fill('250');await page.locator('[data-key=quantity]').fill('2');
 await page.getByRole('dialog').getByRole('button',{name:'Spara',exact:true}).click();await page.locator('#purchase-review').check();await page.getByRole('button',{name:'Godkänn faktura'}).click();await bookInvoice();
 const creditPrintPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Skriv ut',exact:true}).click();const creditPrint=await creditPrintPromise;await expect(creditPrint.locator('.purchase-print')).toContainText('Dokumenttyp: Kreditfaktura');await creditPrint.emulateMedia({media:'print'});await expect(creditPrint.locator('.purchase-print')).toHaveCSS('background-color','rgb(255, 255, 255)');await creditPrint.close();
 await page.getByRole('button',{name:'Stäng',exact:true}).click();await page.getByRole('tab',{name:'Reskontra',exact:true}).click();await expect(page.locator('tbody')).toContainText('INV-UI1');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exportera aktuell reskontra'}).click();const download=await downloadPromise;const csv=await fs.readFile(await download.path(),'utf8');expect(csv).toContain('"-250.00"');expect(csv).toContain('"500.00"');
 await page.screenshot({path:testInfo.outputPath('purchases-dark.png'),fullPage:true});
 await page.locator('tbody tr').filter({hasText:'INV-UI1'}).getByRole('button',{name:'Öppna'}).click();await expect(page.locator('.purchase-settlement')).toContainText('500,00');await pay('Bank del 2','2029-11-12');
 await expect(page.getByRole('button',{name:'Registrera betalning',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Rätta betalningsregistrering',exact:true}).first().click();await expect(page.getByText('Detta rättar registreringen och skapar en motbokning.',{exact:false})).toBeVisible();await page.getByLabel('Räkenskapsår',{exact:true}).selectOption(yearId);await page.getByLabel('Datum för motbokning').fill('2029-11-13');await page.getByLabel('Orsak').fill('Rätta bankreferens');await page.getByRole('dialog').getByRole('button',{name:'Motboka registreringen',exact:true}).click();await expect(page.locator('.purchase-settlement')).toContainText('500,00');
 await pay('Korrekt bankreferens','2029-11-12','2029-11-13');await page.getByRole('button',{name:'Stäng',exact:true}).click();await page.getByLabel('Språk',{exact:true}).selectOption('en');await expect(page.getByRole('tab',{name:'Payables',exact:true})).toBeVisible();
 await page.getByLabel('Language',{exact:true}).selectOption('sv');await page.getByLabel('Utseende',{exact:true}).selectOption('light');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 expect(errors).toEqual([]);
});
