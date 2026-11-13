const {randomUUID}=require('node:crypto');
const {text,decimal,invoice}=require('./domain.cjs');
class SalesError extends Error{constructor(code,status=409){super(code);this.status=status;}}
const bad=code=>{throw new SalesError(code,400);};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'});
function saleDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value<'1900-01-01'||value>today())bad('saleDate');return value;}
const proportional=(amount,quantity,total)=>Number((BigInt(amount)*BigInt(quantity)+BigInt(total)/2n)/BigInt(total));
function initSales(db,accounting,{prepareDraft=(id,draft,computed)=>computed}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS sales_numbering(id INTEGER PRIMARY KEY CHECK(id=1),next_number INTEGER NOT NULL CHECK(next_number>0));
 INSERT OR IGNORE INTO sales_numbering VALUES(1,1);
 CREATE TABLE IF NOT EXISTS sales_documents(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,type TEXT NOT NULL CHECK(type IN ('invoice','credit')),draft_id TEXT UNIQUE,original_id TEXT REFERENCES sales_documents(id),revision INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sales_payments(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,document_id TEXT NOT NULL REFERENCES sales_documents(id),revision INTEGER NOT NULL,status TEXT NOT NULL,date TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),reference TEXT NOT NULL,data TEXT NOT NULL,reversal_id TEXT);
 CREATE TABLE IF NOT EXISTS sales_allocations(id TEXT PRIMARY KEY,invoice_id TEXT NOT NULL REFERENCES sales_documents(id),credit_id TEXT NOT NULL REFERENCES sales_documents(id),revision INTEGER NOT NULL,status TEXT NOT NULL,date TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),reference TEXT NOT NULL,data TEXT NOT NULL,reversal_id TEXT);
 CREATE TABLE IF NOT EXISTS sales_events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,entity TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS sales_document_locked BEFORE UPDATE OF id,number,type,draft_id,original_id,data ON sales_documents BEGIN SELECT RAISE(ABORT,'Issued invoices are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS sales_document_preserved BEFORE DELETE ON sales_documents BEGIN SELECT RAISE(ABORT,'Issued invoices are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS sales_draft_locked BEFORE UPDATE ON records WHEN OLD.kind='invoice' AND EXISTS(SELECT 1 FROM sales_documents WHERE draft_id=OLD.id) BEGIN SELECT RAISE(ABORT,'Issued invoice drafts are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS sales_draft_preserved BEFORE DELETE ON records WHEN OLD.kind='invoice' AND EXISTS(SELECT 1 FROM sales_documents WHERE draft_id=OLD.id) BEGIN SELECT RAISE(ABORT,'Issued invoice drafts are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS sales_payment_preserved BEFORE DELETE ON sales_payments BEGIN SELECT RAISE(ABORT,'Sales payments are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS sales_allocation_preserved BEFORE DELETE ON sales_allocations BEGIN SELECT RAISE(ABORT,'Credit allocations are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS sales_payment_locked BEFORE UPDATE OF id,number,document_id,date,amount,reference,data ON sales_payments BEGIN SELECT RAISE(ABORT,'Sales payments are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS sales_allocation_locked BEFORE UPDATE OF id,invoice_id,credit_id,date,amount,reference,data ON sales_allocations BEGIN SELECT RAISE(ABORT,'Credit allocations are immutable'); END;
 `);
 if(db.prepare('PRAGMA user_version').get().user_version<7)db.exec('PRAGMA user_version=7;');
 const documents=()=>db.prepare('SELECT * FROM sales_documents ORDER BY number DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,number:r.number,type:r.type,draftId:r.draft_id,originalId:r.original_id,revision:r.revision}));
 const payments=()=>db.prepare('SELECT * FROM sales_payments ORDER BY number DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,number:r.number,documentId:r.document_id,revision:r.revision,status:r.status,date:r.date,amount:r.amount,reference:r.reference,reversalId:r.reversal_id}));
 const allocations=()=>db.prepare('SELECT * FROM sales_allocations ORDER BY rowid DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,invoiceId:r.invoice_id,creditId:r.credit_id,revision:r.revision,status:r.status,date:r.date,amount:r.amount,reference:r.reference,reversalId:r.reversal_id}));
 const document=id=>{const d=documents().find(d=>d.id===id);if(!d)throw new SalesError('saleMissing',404);return d;};
 const current=body=>{const d=document(body.id);if(d.revision!==body.revision)throw new SalesError('saleConflict');return d;};
 const source=id=>accounting.source('salesInvoice',id);
 const posted=id=>{const v=source(id);if(!v)throw new SalesError('saleUnposted');return v;};
 const receivable=id=>posted(id).lines[0].account;
 const nextNumber=()=>db.prepare('SELECT next_number AS n FROM sales_numbering WHERE id=1').get().n;
 const event=(entity,id,action,data={})=>db.prepare('INSERT INTO sales_events(at,entity,entity_id,action,data) VALUES(?,?,?,?,?)').run(new Date().toISOString(),entity,id,action,JSON.stringify(data));
 const bump=id=>db.prepare('UPDATE sales_documents SET revision=revision+1 WHERE id=?').run(id);
 function remaining(d,cash=payments(),offsets=allocations()){const paid=cash.filter(p=>p.documentId===d.id&&p.status==='posted').reduce((s,p)=>s+p.amount,0),allocated=offsets.filter(a=>a.status==='posted'&&(a.invoiceId===d.id||a.creditId===d.id)).reduce((s,a)=>s+a.amount,0);return {paid,allocated,remaining:d.total-paid-allocated};}
 function account(code,type,pattern){const a=accounting.account(code);if(!a||a.type!==type||!pattern.test(code))bad('saleAccount');return code;}
 function checkCompany(c,customer,lines,zeroReason,paymentInstructions){
  if(!c.name||!/^\d{6}-?\d{4}$/.test(c.org||'')||!c.address||!c.postal||!c.city)bad('saleCompany');
  if(!customer?.name||!customer.address||!customer.postal||!customer.city)bad('saleCustomer');
  if(lines.some(l=>l.vat>0&&l.net>0)&&(!/^SE\d{10}01$/.test(c.vatNumber||'')||c.vatNumber.slice(2,12)!==c.org.replace('-','')))bad('saleVatNumber');
  if(lines.some(l=>l.vat===0&&l.net>0)&&!zeroReason)bad('saleZeroReason');
  if(!c.bankgiro&&!paymentInstructions)bad('salePaymentInfo');
 }
 function book(d,body,company){
  const postingDate=saleDate(body.postingDate||d.date);if(postingDate<d.date)bad('saleDate');if(company.org?.replace('-','')!==d.company.org.replace('-',''))bad('saleCompany');
  if(d.type==='credit')posted(d.originalId);
  const ar=account(body.receivable||'1510','asset',/^15\d{2}$/),lines=[{account:ar,debit:d.total,credit:0,note:'Kundfordran'}];
  for(const rate of [...new Set(d.lines.map(l=>l.vat))]){const net=d.lines.filter(l=>l.vat===rate).reduce((s,l)=>s+l.net,0),tax=d.lines.filter(l=>l.vat===rate).reduce((s,l)=>s+l.tax,0);if(net)lines.push({account:account(body.revenues?.[rate]||({25:'3001',12:'3002',6:'3003',0:'3044'})[rate],'income',/^3\d{3}$/),debit:0,credit:net,note:'Försäljning '+rate+' %'});if(tax)lines.push({account:account(body.vatAccounts?.[rate]||({25:'2611',12:'2621',6:'2631'})[rate],'liability',new RegExp('^'+({25:'261',12:'262',6:'263'})[rate]+'\\d$')),debit:0,credit:tax,note:'Utgående moms '+rate+' %'});}
  const signed=d.type==='credit'?lines.map(l=>({...l,debit:l.credit,credit:l.debit})):lines;
  return accounting.postSource(body.yearId,{date:postingDate,description:(d.type==='credit'?'Kreditfaktura ':'Kundfaktura ')+d.number,reference:'KF'+d.number,lines:signed,company},{sourceKind:'salesInvoice',sourceId:d.id});
 }
 function beforeReverse(v){
  if(v.sourceKind!=='salesInvoice')return;const d=document(v.sourceId),ids=d.type==='invoice'?[d.id,...documents().filter(c=>c.originalId===d.id).map(c=>c.id)]:[d.id];
  if(payments().some(p=>ids.includes(p.documentId)&&p.status==='posted')||allocations().some(a=>a.status==='posted'&&(ids.includes(a.invoiceId)||ids.includes(a.creditId))))throw new SalesError('saleReverseSettlementFirst');
  if(d.type==='invoice'&&ids.slice(1).some(id=>source(id)))throw new SalesError('saleReverseCreditsFirst');
 }
 function afterReverse(v,reversal,reason){
  if(v.sourceKind==='salesInvoice'){bump(v.sourceId);event('document',v.sourceId,'posting_reversed',{reversal:reversal.id,reason});}
  if(v.sourceKind==='salesPayment'){const p=payments().find(p=>p.id===v.sourceId&&p.status==='posted');if(p){db.prepare("UPDATE sales_payments SET status='reversed',revision=revision+1,reversal_id=? WHERE id=?").run(reversal.id,p.id);bump(p.documentId);event('payment',p.id,'reversed',{reason,reversal:reversal.id});}}
  if(v.sourceKind==='salesAllocation'){const a=allocations().find(a=>a.id===v.sourceId&&a.status==='posted');if(a){db.prepare("UPDATE sales_allocations SET status='reversed',revision=revision+1,reversal_id=? WHERE id=?").run(reversal.id,a.id);bump(a.invoiceId);bump(a.creditId);event('allocation',a.id,'reversed',{reason,reversal:reversal.id});}}
 }
 function state(){const cash=payments(),offsets=allocations();return {nextNumber:nextNumber(),documents:documents().map(d=>{const balance=remaining(d,cash,offsets),v=source(d.id);return {...d,...balance,voucherId:v?.id||null,voucherNumber:v?.number||null,overdue:d.type==='invoice'&&balance.remaining>0&&d.due<today()};}),payments:cash,allocations:offsets,events:db.prepare('SELECT * FROM sales_events ORDER BY id DESC LIMIT 1000').all().map(r=>({...r,data:JSON.parse(r.data)}))};}
 function handle(route,body,company){db.exec('BEGIN IMMEDIATE');try{if(body.currency!==undefined&&body.currency!=='SEK')bad('saleCurrency');let result;
  if(route==='/api/sales/numbering'){if(documents().length)throw new SalesError('saleLocked');if(!Number.isSafeInteger(body.nextNumber)||body.nextNumber<1||body.nextNumber>1000000000)bad('saleNumber');db.prepare('UPDATE sales_numbering SET next_number=? WHERE id=1').run(body.nextNumber);event('numbering','1','changed',{nextNumber:body.nextNumber});result={ok:true};
  }else if(route==='/api/sales/issue'){
   if(body.reviewed!==true)bad('saleReview');
   text(body.draftId,'saleMissing');if(db.prepare('SELECT 1 FROM sales_documents WHERE draft_id=?').get(body.draftId))throw new SalesError('saleLocked');if(body.expectedNumber!==nextNumber())throw new SalesError('saleConflict');
   const row=db.prepare("SELECT data FROM records WHERE kind='invoice' AND id=?").get(body.draftId);if(!row)throw new SalesError('saleMissing');const draft=JSON.parse(row.data);
   if(draft.updated!==body.draftUpdated)throw new SalesError('saleConflict');const customerRow=db.prepare("SELECT data FROM records WHERE kind='customer' AND id=?").get(draft.customerId);if(!customerRow)bad('saleCustomer');const customer=JSON.parse(customerRow.data);
   if(JSON.stringify(draft.company)!==JSON.stringify(company)||JSON.stringify(draft.customer)!==JSON.stringify(customer))throw new SalesError('saleStale');
   let computed=invoice({...draft,lines:draft.lines.map(l=>({...l,quantity:(l.quantity/100).toFixed(2),price:(l.price/100).toFixed(2)}))},{id:draft.customerId,data:customer});computed=prepareDraft(body.draftId,draft,computed);if(computed.total!==draft.total||computed.tax!==draft.tax||computed.net!==draft.net||computed.total<=0||draft.currency!=='SEK')bad('saleAmount');saleDate(computed.date);
   const zeroReason=text(body.zeroReason??'','saleZeroReason',false,500),paymentInstructions=text(body.paymentInstructions??'','salePaymentInfo',false,500),performanceDate=saleDate(body.performanceDate||computed.date);if(performanceDate>computed.date)bad('saleDate');checkCompany(company,customer,computed.lines,zeroReason,paymentInstructions);
   const id=randomUUID(),number=nextNumber(),data={...computed,company,zeroReason,paymentInstructions,performanceDate,issuedAt:new Date().toISOString()};db.prepare("INSERT INTO sales_documents VALUES(?,?,'invoice',?,NULL,1,?)").run(id,number,body.draftId,JSON.stringify(data));
   const voucher=book({...data,id,number,type:'invoice'},body,company);db.prepare('UPDATE sales_numbering SET next_number=next_number+1 WHERE id=1').run();event('document',id,'issued',{number,voucherId:voucher.id});result={id,number,voucherId:voucher.id};
  }else if(route==='/api/sales/credit'){
   accounting.requireOperator();
   const original=current(body);if(original.type!=='invoice')bad('saleCreditOriginal');posted(original.id);if(body.reviewed!==true)bad('saleReview');if(body.expectedNumber!==nextNumber())throw new SalesError('saleConflict');
   const date=saleDate(body.date);if(date<original.date)bad('saleDate');if(!Array.isArray(body.lines)||!body.lines.length||body.lines.length>100)bad('saleCreditLines');const prior=documents().filter(c=>c.originalId===original.id),seen=new Set();
   const lines=body.lines.map(input=>{const index=input?.index;if(!Number.isInteger(index)||!original.lines[index]||seen.has(index))bad('saleCreditLines');seen.add(index);const base=original.lines[index],qty=decimal(input.quantity,'saleAmount',{min:1,max:10000000}),previous=prior.flatMap(c=>c.lines.filter(l=>l.originalIndex===index)),used=previous.reduce((s,l)=>s+l.quantity,0);if(qty+used>base.quantity)bad('saleCreditLimit');return {...base,originalIndex:index,quantity:qty,net:proportional(base.net,qty+used,base.quantity)-previous.reduce((s,l)=>s+l.net,0),tax:proportional(base.tax,qty+used,base.quantity)-previous.reduce((s,l)=>s+l.tax,0)};});
   const net=lines.reduce((s,l)=>s+l.net,0),tax=lines.reduce((s,l)=>s+l.tax,0);if(net+tax<=0)bad('saleAmount');const reason=text(body.reason,'saleReason'),id=randomUUID(),number=nextNumber();
   checkCompany(company,original.customer,lines,original.zeroReason,original.paymentInstructions);const data={customerId:original.customerId,customer:original.customer,company,date,due:date,performanceDate:original.performanceDate,lines,net,tax,total:net+tax,currency:'SEK',note:reason,zeroReason:original.zeroReason,paymentInstructions:original.paymentInstructions,originalNumber:original.number,issuedAt:new Date().toISOString()};
   db.prepare("INSERT INTO sales_documents VALUES(?,?,'credit',NULL,?,1,?)").run(id,number,original.id,JSON.stringify(data));const voucher=book({...data,id,number,type:'credit',originalId:original.id},body,company);db.prepare('UPDATE sales_numbering SET next_number=next_number+1 WHERE id=1').run();bump(original.id);event('document',id,'credit_issued',{number,originalId:original.id,voucherId:voucher.id});result={id,number,voucherId:voucher.id};
  }else if(route==='/api/sales/repost'){
   const d=current(body);if(source(d.id))throw new SalesError('saleAlreadyPosted');if(body.reviewed!==true)bad('saleReview');const voucher=book(d,body,company);bump(d.id);event('document',d.id,'reposted',{voucherId:voucher.id});result={id:d.id,voucherId:voucher.id};
  }else if(route==='/api/sales/payments'){
   const d=current(body),v=posted(d.id);if(body.reviewed!==true)bad('saleReview');const date=saleDate(body.date),postingDate=saleDate(body.postingDate||date);if(date<d.date||postingDate<d.date||postingDate<v.date)bad('saleDate');const amount=decimal(body.amount,'saleAmount',{min:1,max:10000000000});if(amount>remaining(d).remaining)bad('saleOverpayment');const reference=text(body.reference,'saleReference');
   if(payments().some(p=>p.documentId===d.id&&p.status==='posted'&&p.date===date&&p.amount===amount&&p.reference.normalize('NFKC').toUpperCase()===reference.normalize('NFKC').toUpperCase()))throw new SalesError('saleDuplicatePayment');
   const bank=account(body.bank||'1930','asset',/^19\d{2}$/),ar=receivable(d.id),id=randomUUID(),number=db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM sales_payments').get().n,refund=d.type==='credit';
   const lines=[{account:bank,debit:refund?0:amount,credit:refund?amount:0,note:reference},{account:ar,debit:refund?amount:0,credit:refund?0:amount,note:'KF'+d.number}];const voucher=accounting.postSource(body.yearId,{date:postingDate,description:(refund?'Återbetalning kreditfaktura ':'Kundinbetalning ')+d.number,reference,lines,company},{sourceKind:'salesPayment',sourceId:id});
   db.prepare("INSERT INTO sales_payments VALUES(?,?,?,1,'posted',?,?,?,?,NULL)").run(id,number,d.id,date,amount,reference,JSON.stringify({postingDate,bank,direction:refund?'outgoing':'incoming',voucherId:voucher.id}));bump(d.id);event('payment',id,'posted',{documentId:d.id,amount,voucherId:voucher.id});result={id,documentId:d.id,voucherId:voucher.id};
  }else if(route==='/api/sales/allocations'){
   const original=document(body.invoiceId),credit=document(body.creditId);if(original.revision!==body.invoiceRevision||credit.revision!==body.creditRevision)throw new SalesError('saleConflict');if(original.type!=='invoice'||credit.type!=='credit'||credit.originalId!==original.id)bad('saleCreditOriginal');if(body.reviewed!==true)bad('saleReview');
   const a=posted(original.id),b=posted(credit.id),date=saleDate(body.date);if(date<a.date||date<b.date||date<original.date||date<credit.date)bad('saleDate');const amount=decimal(body.amount,'saleAmount',{min:1,max:10000000000});if(amount>remaining(original).remaining||amount>remaining(credit).remaining)bad('saleOverpayment');const reference=text(body.reference,'saleReference'),id=randomUUID();if(allocations().some(a=>a.status==='posted'&&a.invoiceId===original.id&&a.creditId===credit.id&&a.date===date&&a.amount===amount&&a.reference.normalize('NFKC').toUpperCase()===reference.normalize('NFKC').toUpperCase()))throw new SalesError('saleDuplicateAllocation');
   const voucher=accounting.postSource(body.yearId,{date,description:'Kvittning KF'+original.number+' / KF'+credit.number,reference,lines:[{account:receivable(credit.id),debit:amount,credit:0,note:'KF'+credit.number},{account:receivable(original.id),debit:0,credit:amount,note:'KF'+original.number}],company},{sourceKind:'salesAllocation',sourceId:id});db.prepare("INSERT INTO sales_allocations VALUES(?,?,?,1,'posted',?,?,?,?,NULL)").run(id,original.id,credit.id,date,amount,reference,JSON.stringify({voucherId:voucher.id}));bump(original.id);bump(credit.id);event('allocation',id,'posted',{invoiceId:original.id,creditId:credit.id,amount,voucherId:voucher.id});result={id,voucherId:voucher.id};
  }else if(['/api/sales/payments/reverse','/api/sales/allocations/reverse'].includes(route)){
   const payment=route.includes('/payments/'),row=(payment?payments():allocations()).find(p=>p.id===body.id);if(!row)throw new SalesError('saleMissing');if(row.revision!==body.revision||row.status!=='posted')throw new SalesError('saleConflict');const v=accounting.source(payment?'salesPayment':'salesAllocation',row.id);if(!v)throw new SalesError('saleMissing');const resultV=accounting.reverseSource(v.id,{revision:v.revision,date:saleDate(body.date),yearId:body.yearId,reason:text(body.reason,'saleReason')},company);result={id:row.id,voucherId:resultV.id};
  }else throw new SalesError('saleMissing',404);
  db.exec('COMMIT');return result;
 }catch(error){db.exec('ROLLBACK');throw error;}}
 return {state,handle,beforeReverse,afterReverse,isIssuedDraft:id=>!!db.prepare('SELECT 1 FROM sales_documents WHERE draft_id=?').get(id)};
}
module.exports={initSales,SalesError};
