const {randomUUID}=require('node:crypto');
const {ValidationError,text,decimal}=require('./domain.cjs');
class PurchaseError extends Error {constructor(code,status=409){super(code);this.status=status;}}
const invalid=key=>{throw new ValidationError(key);};
function purchaseDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))invalid('purchaseDate');
  const d=new Date(value);if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value||+value.slice(0,4)<1900)invalid('purchaseDate');return value;
}
function purchaseLines(input,invoice=false){
  if(!Array.isArray(input)||!input.length||input.length>100)invalid('purchaseLines');
  const lines=input.map(line=>{
    if(!line||typeof line!=='object')invalid('purchaseLines');
    const quantity=decimal(line.quantity,'purchaseQuantity',{min:1,max:10000000}),price=decimal(line.price,'purchasePrice');
    const discount=decimal(line.discount??'0','purchaseDiscount',{max:10000});
    if(!['number','string'].includes(typeof line.vat)||String(line.vat).trim()==='')invalid('purchaseVat');const vat=Number(line.vat);
    if(![0,6,12,25].includes(vat))invalid('purchaseVat');
    const base=Math.round(quantity*price/100),net=base-Math.round(base*discount/10000),expected=Math.round(net*vat/100);
    const vatManual=invoice&&line.vatAmount!==undefined&&line.vatAmount!=='';
    const tax=vatManual?decimal(line.vatAmount,'purchaseVatAmount'):expected;
    if(Math.abs(tax-expected)>1||((!vat||!net)&&tax))invalid('purchaseVatAmount');
    const deductible=invoice?decimal(line.deductible??'100','purchaseDeduction',{max:10000}):10000;
    return {articleId:line.articleId?text(line.articleId,'invMissing'):'',id:line.id===undefined?randomUUID():text(line.id,'purchaseLines'),description:text(line.description,'purchaseDescription'),sku:text(line.sku??'','purchaseSku',false),unit:text(line.unit||'st','purchaseUnit'),quantity,price,discount,vat,net,tax,vatManual,deductible,deductibleTax:Math.round(tax*deductible/10000),expenseAccount:invoice?text(line.expenseAccount||'4000','purchaseExpenseAccount'):''};
  });
  if(new Set(lines.map(l=>l.id)).size!==lines.length)invalid('purchaseLines');return lines;
}
function totals(lines,rounding='0'){
  if(!/^-?\d+(\.\d{1,2})?$/.test(String(rounding).replace(',','.')))invalid('purchaseRounding');
  const signed=String(rounding).replace(',','.');const r=(signed.startsWith('-')?-1:1)*decimal(signed.replace('-',''),'purchaseRounding',{max:100});
  const net=lines.reduce((s,l)=>s+l.net,0),tax=lines.reduce((s,l)=>s+l.tax,0),total=net+tax+r;
  if(total<0||total>10000000000)invalid('purchaseTotal');return {net,tax,rounding:r,total};
}
const invoiceKey=value=>value.normalize('NFKC').trim().toLocaleUpperCase('sv-SE');
function initPurchases(db,accounting,inventory={}){
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`CREATE TABLE IF NOT EXISTS purchase_suppliers(id TEXT PRIMARY KEY,number INTEGER UNIQUE NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS purchase_orders(id TEXT PRIMARY KEY,number INTEGER UNIQUE NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,reason TEXT);
      CREATE TABLE IF NOT EXISTS purchase_receipts(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES purchase_orders(id),revision INTEGER NOT NULL,active INTEGER NOT NULL,data TEXT NOT NULL,reason TEXT);
      CREATE TABLE IF NOT EXISTS purchase_invoices(id TEXT PRIMARY KEY,number INTEGER UNIQUE NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,supplier_id TEXT NOT NULL REFERENCES purchase_suppliers(id),invoice_key TEXT NOT NULL,data TEXT NOT NULL,reason TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS purchase_invoice_unique ON purchase_invoices(supplier_id,invoice_key) WHERE status='approved';
      CREATE TABLE IF NOT EXISTS purchase_payments(id TEXT PRIMARY KEY,invoice_id TEXT NOT NULL REFERENCES purchase_invoices(id),number INTEGER UNIQUE NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,reversal_id TEXT,reason TEXT);
      CREATE TABLE IF NOT EXISTS purchase_events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,entity TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,data TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS purchase_invoice_locked BEFORE UPDATE OF data,supplier_id,invoice_key ON purchase_invoices WHEN OLD.status!='draft' BEGIN SELECT RAISE(ABORT,'Approved invoices are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS purchase_order_locked BEFORE UPDATE OF data ON purchase_orders WHEN OLD.status!='draft' BEGIN SELECT RAISE(ABORT,'Issued orders are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS purchase_payment_locked BEFORE UPDATE OF data ON purchase_payments BEGIN SELECT RAISE(ABORT,'Payment history is immutable'); END;
      `);
    if(db.prepare('PRAGMA user_version').get().user_version<4)db.exec('PRAGMA user_version=4;');
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  const suppliers=()=>db.prepare('SELECT * FROM purchase_suppliers ORDER BY number').all().map(r=>({...JSON.parse(r.data),id:r.id,number:r.number,revision:r.revision}));
  const orders=()=>db.prepare('SELECT * FROM purchase_orders ORDER BY number DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,number:r.number,revision:r.revision,status:r.status,reason:r.reason}));
  const invoices=()=>db.prepare('SELECT * FROM purchase_invoices ORDER BY number DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,number:r.number,revision:r.revision,status:r.status,reason:r.reason}));
  const receipts=()=>db.prepare('SELECT * FROM purchase_receipts ORDER BY rowid DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,orderId:r.order_id,revision:r.revision,active:!!r.active,reason:r.reason}));
  const payments=()=>db.prepare('SELECT * FROM purchase_payments ORDER BY number DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,invoiceId:r.invoice_id,number:r.number,revision:r.revision,status:r.status,reversalId:r.reversal_id,reason:r.reason}));
  const event=(entity,id,action,data={})=>db.prepare('INSERT INTO purchase_events(at,entity,entity_id,action,data) VALUES(?,?,?,?,?)').run(new Date().toISOString(),entity,id,action,JSON.stringify(data));
  const current=(rows,body)=>{const row=rows.find(r=>r.id===body.id);if(!row)throw new PurchaseError('purchaseMissing',404);if(row.revision!==body.revision)throw new PurchaseError('purchaseConflict');return row;};
  const supplier=id=>{const s=suppliers().find(s=>s.id===id);if(!s)invalid('purchaseSupplier');return s;};
  const signedCompany=c=>(c.org||'').replace('-','');
  const checkCompany=(stored,company)=>{if(!company.name||!/^\d{6}-?\d{4}$/.test(company.org||'')||JSON.stringify(stored)!==JSON.stringify(company))throw new PurchaseError('purchaseCompanyChanged');};
  const documentReview=(record,body,company)=>{checkCompany(record.company,company);const s=supplier(record.supplierId);if(record.supplier.revision!==s.revision)throw new PurchaseError('purchaseSupplierChanged');if(!s.active)throw new PurchaseError('purchaseSupplierInactive');if(body.reviewed!==true)invalid('purchaseReview');};
  const remaining=(bill,all=invoices(),cash=payments())=>{
    const paid=cash.filter(p=>p.invoiceId===bill.id&&p.status==='posted').reduce((s,p)=>s+p.amount,0);
    const credits=bill.type==='invoice'?all.filter(i=>i.status==='approved'&&i.originalId===bill.id).reduce((s,i)=>s+i.offset,0):(bill.offset||0);
    return {paid,credited:credits,remaining:bill.total-paid-credits};
  };
  const received=(order,allReceipts=receipts())=>{
    const map=new Map(order.lines.map(l=>[l.id,0]));
    for(const r of allReceipts.filter(r=>r.orderId===order.id&&r.active))for(const l of r.lines)map.set(l.lineId,(map.get(l.lineId)||0)+l.quantity);
    return Object.fromEntries(map);
  };
  const allowed=(code,types)=>{const a=accounting.account(code);if(!a||!types.includes(a.type))invalid('purchaseAccount');return code;};
  const invoiceSource=id=>accounting.source('purchaseInvoice',id);
  const paymentSource=id=>accounting.source('purchasePayment',id);
  function beforeReverse(v){
    if(v.sourceKind!=='purchaseInvoice')return;
    const bill=invoices().find(i=>i.id===v.sourceId);if(!bill)return;
    const related=[bill.id,...invoices().filter(i=>i.originalId===bill.id&&i.status==='approved').map(i=>i.id)];
    if(payments().some(p=>related.includes(p.invoiceId)&&p.status==='posted'))throw new PurchaseError('purchaseReversePaymentFirst');
    if(bill.type==='invoice'&&related.slice(1).some(id=>invoiceSource(id)))throw new PurchaseError('purchaseReverseCreditFirst');
  }
  function afterReverse(v,reversal,reason){
    if(v.sourceKind==='purchaseInvoice'){event('invoice',v.sourceId,'reversed',{reversal:reversal.id,reason});return;}
    if(v.sourceKind!=='purchasePayment')return;
    const p=payments().find(p=>p.id===v.sourceId&&p.status==='posted');if(!p)return;
    db.prepare("UPDATE purchase_payments SET status='reversed',revision=revision+1,reversal_id=?,reason=? WHERE id=?").run(reversal.id,reason,p.id);
    db.prepare('UPDATE purchase_invoices SET revision=revision+1 WHERE id=?').run(p.invoiceId);
    event('payment',p.id,'reversed',{reversal:reversal.id,reason});
  }
  return {beforeReverse,afterReverse,
    state(){
      const all=invoices(),cash=payments(),rs=receipts();const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'});
      return {suppliers:suppliers(),orders:orders().map(o=>{const counts=received(o,rs),total=o.lines.reduce((s,l)=>s+l.quantity,0),done=Object.values(counts).reduce((s,n)=>s+n,0);return {...o,received:counts,deliveryStatus:o.status==='issued'?(done===total?'received':done?'partial':'issued'):o.status};}),receipts:rs,invoices:all.map(i=>{const r=remaining(i,all,cash),v=invoiceSource(i.id);return {...i,...r,settlement:r.remaining===0?'settled':r.paid+r.credited>0?'partial':'unpaid',overdue:i.status==='approved'&&r.remaining>0&&i.due<today,voucherId:v?.id||null,voucherNumber:v?.number||null,liabilityAccount:v?.liabilityAccount||null};}),payments:cash.map(p=>({...p,voucherId:paymentSource(p.id)?.id||null})),events:db.prepare('SELECT id,at,entity,entity_id AS entityId,action FROM purchase_events ORDER BY id DESC').all()};
    },
    handle(route,body,company){
      db.exec('BEGIN IMMEDIATE');
      try{
        let result=null;
        if(route==='/api/purchases/suppliers'){
          const old=body.id?current(suppliers(),body):null,data={};
          for(const key of ['name','org','email','phone','address','postal','city','contact','bankgiro','plusgiro','notes'])data[key]=text(body[key]??'',key,key==='name',key==='notes'?2000:200);
          if(data.org&&!/^\d{6}-?\d{4}$/.test(data.org))invalid('purchaseOrg');
          if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))invalid('purchaseEmail');
          if(data.org&&suppliers().some(s=>s.id!==old?.id&&signedCompany(s)===signedCompany(data)))throw new PurchaseError('purchaseSupplierExists');
          for(const key of ['bankgiro','plusgiro'])if(data[key]&&!/^[\d -]{3,20}$/.test(data[key]))invalid('purchaseBank');
          data.terms=Number(body.terms??30);if(!Number.isInteger(data.terms)||data.terms<0||data.terms>365)invalid('purchaseTerms');data.active=body.active!==false;
          const id=old?.id||randomUUID(),number=old?.number||db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM purchase_suppliers').get().n;
          db.prepare('INSERT INTO purchase_suppliers VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data').run(id,number,(old?.revision||0)+1,JSON.stringify(data));event('supplier',id,old?'updated':'created',data);result={id};
        }else if(route==='/api/purchases/orders'){
          if(body.currency&&body.currency!=='SEK')invalid('purchaseCurrency');
          const old=body.id?current(orders(),body):null;if(old&&old.status!=='draft')throw new PurchaseError('purchaseLocked');
          const s=supplier(body.supplierId);if(!s.active)throw new PurchaseError('purchaseSupplierInactive');
          const date=purchaseDate(body.date),expected=body.expected?purchaseDate(body.expected):'';if(expected&&expected<date)invalid('purchaseDeliveryDate');
          const rawLines=purchaseLines(body.lines),lines=inventory.prepareOrderLines?inventory.prepareOrderLines(rawLines):rawLines;if(new Set(lines.map(l=>l.id)).size!==lines.length)invalid('purchaseLines');
          const id=old?.id||randomUUID(),number=old?.number||db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM purchase_orders').get().n;
          const data={supplierId:s.id,supplier:s,company,date,expected,reference:text(body.reference??'','purchaseReference',false),note:text(body.note??'','purchaseNote',false,2000),lines,...totals(lines),currency:'SEK'};
          db.prepare("INSERT INTO purchase_orders VALUES(?,?,?,'draft',?,NULL) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data").run(id,number,(old?.revision||0)+1,JSON.stringify(data));event('order',id,old?'updated':'created',data);result={id};
        }else if(['/api/purchases/orders/issue','/api/purchases/orders/cancel','/api/purchases/orders/close'].includes(route)){
          const o=current(orders(),body),action=route.split('/').at(-1);let status,reason=null;
          if(action==='issue'){if(o.status!=='draft')throw new PurchaseError('purchaseLocked');documentReview(o,body,company);inventory.assertOrderLines?.(o.lines);if(!o.total)invalid('purchaseTotal');status='issued';}
          else{if(!['draft','issued'].includes(o.status)||(action==='close'&&o.status!=='issued'))throw new PurchaseError('purchaseLocked');reason=text(body.reason,'purchaseReason');if(action==='cancel'&&(receipts().some(r=>r.orderId===o.id&&r.active)||invoices().some(i=>i.orderId===o.id&&i.status==='approved')))throw new PurchaseError('purchaseOrderUsed');status=action==='close'?'closed':'cancelled';}
          db.prepare('UPDATE purchase_orders SET status=?,revision=revision+1,reason=? WHERE id=?').run(status,reason,o.id);event('order',o.id,action,{reason});result={id:o.id};
        }else if(route==='/api/purchases/receipts'){
          const o=current(orders(),body);if(o.status!=='issued')throw new PurchaseError('purchaseLocked');
          const date=purchaseDate(body.date);if(date<o.date)invalid('purchaseDeliveryDate');
          if(!Array.isArray(body.lines)||!body.lines.length)invalid('purchaseReceipt');
          const counts=received(o),seen=new Set(),lines=body.lines.map(l=>{if(!l||typeof l!=='object')invalid('purchaseReceipt');const line=o.lines.find(x=>x.id===l.lineId);if(!line||seen.has(l.lineId))invalid('purchaseReceipt');seen.add(l.lineId);const quantity=decimal(l.quantity,'purchaseQuantity',{max:10000000});if(quantity+counts[line.id]>line.quantity)invalid('purchaseOverDelivery');return {lineId:line.id,quantity};}).filter(l=>l.quantity>0);
          if(!lines.length)invalid('purchaseReceipt');
          const id=randomUUID(),data={date,reference:text(body.reference,'purchaseReference'),lines};db.prepare('INSERT INTO purchase_receipts VALUES(?,?,1,1,?,NULL)').run(id,o.id,JSON.stringify(data));db.prepare('UPDATE purchase_orders SET revision=revision+1 WHERE id=?').run(o.id);inventory.receive?.(o,{id,...data});event('receipt',id,'created',data);result={id};
        }else if(route==='/api/purchases/receipts/reverse'){
          const r=current(receipts(),body);if(!r.active)throw new PurchaseError('purchaseLocked');const reason=text(body.reason,'purchaseReason');inventory.reverseReceipt?.(r,reason);db.prepare('UPDATE purchase_receipts SET active=0,revision=revision+1,reason=? WHERE id=?').run(reason,r.id);db.prepare('UPDATE purchase_orders SET revision=revision+1 WHERE id=?').run(r.orderId);event('receipt',r.id,'reversed',{reason});result={id:r.id};
        }else if(route==='/api/purchases/invoices'){
          if(body.currency&&body.currency!=='SEK')invalid('purchaseCurrency');
          const old=body.id?current(invoices(),body):null;if(old&&old.status!=='draft')throw new PurchaseError('purchaseLocked');
          const s=supplier(body.supplierId);if(!s.active)throw new PurchaseError('purchaseSupplierInactive');
          const type=body.type||'invoice';if(!['invoice','credit'].includes(type))invalid('purchaseType');
          const original=type==='credit'?invoices().find(i=>i.id===body.originalId&&i.type==='invoice'&&i.status==='approved'&&i.supplierId===s.id):null;if(type==='credit'&&!original)invalid('purchaseOriginal');
          const order=body.orderId?orders().find(o=>o.id===body.orderId&&o.supplierId===s.id&&['issued','closed'].includes(o.status)):null;if(body.orderId&&!order)invalid('purchaseOrder');
          const date=purchaseDate(body.date),due=purchaseDate(body.due);if(due<date)invalid('purchaseDue');
          const lines=purchaseLines(body.lines,true),sum=totals(lines,body.rounding??'0');
          const documentTotal=body.documentTotal===undefined||body.documentTotal===''?null:decimal(body.documentTotal,'purchaseDocumentTotal',{max:10000000000});
          const id=old?.id||randomUUID(),number=old?.number||db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM purchase_invoices').get().n;
          const data={type,originalId:original?.id||null,orderId:order?.id||null,supplierId:s.id,supplier:s,company,date,due,invoiceNo:text(body.invoiceNo??'','purchaseInvoiceNo',false),reference:text(body.reference??'','purchaseReference',false),paymentReference:text(body.paymentReference??'','purchasePaymentReference',false),note:text(body.note??'','purchaseNote',false,2000),documentTotal,lines,...sum,offset:0,currency:'SEK'};
          db.prepare("INSERT INTO purchase_invoices VALUES(?,?,?,'draft',?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,supplier_id=excluded.supplier_id,invoice_key=excluded.invoice_key,data=excluded.data").run(id,number,(old?.revision||0)+1,s.id,invoiceKey(data.invoiceNo),JSON.stringify(data));event('invoice',id,old?'updated':'created',data);result={id};
        }else if(route==='/api/purchases/invoices/approve'){
          const i=current(invoices(),body);if(i.status!=='draft')throw new PurchaseError('purchaseLocked');documentReview(i,body,company);
          if(!i.invoiceNo)invalid('purchaseInvoiceNo');if(!i.reference)invalid('purchaseReference');if(i.documentTotal!==i.total||i.total<=0)invalid('purchaseDocumentTotal');
          for(const line of i.lines)allowed(line.expenseAccount,['asset','expense']);
          if(invoices().some(x=>x.id!==i.id&&x.status==='approved'&&x.supplierId===i.supplierId&&invoiceKey(x.invoiceNo)===invoiceKey(i.invoiceNo)))throw new PurchaseError('purchaseDuplicateInvoice');
          let offset=0;
          if(i.type==='credit'){
            const orig=invoices().find(o=>o.id===i.originalId&&o.status==='approved');if(!orig)invalid('purchaseOriginal');
            const credits=invoices().filter(c=>c.id!==i.id&&c.originalId===orig.id&&c.status==='approved').reduce((s,c)=>s+c.total,0);if(i.total+credits>orig.total)invalid('purchaseCreditLimit');offset=Math.min(i.total,remaining(orig).remaining);
          }
          const {id,number,revision,status,reason,...data}=i;data.offset=offset;data.approvedAt=new Date().toISOString();db.prepare("UPDATE purchase_invoices SET status='approved',revision=revision+1,data=? WHERE id=?").run(JSON.stringify(data),i.id);if(i.originalId&&offset)db.prepare('UPDATE purchase_invoices SET revision=revision+1 WHERE id=?').run(i.originalId);event('invoice',i.id,'approved',data);result={id:i.id};
        }else if(route==='/api/purchases/invoices/cancel'){
          const i=current(invoices(),body);if(i.status==='cancelled')throw new PurchaseError('purchaseLocked');
          if(invoiceSource(i.id)||payments().some(p=>p.invoiceId===i.id&&p.status==='posted')||invoices().some(c=>c.originalId===i.id&&c.status==='approved'))throw new PurchaseError('purchaseInvoiceUsed');
          const reason=text(body.reason,'purchaseReason');db.prepare("UPDATE purchase_invoices SET status='cancelled',revision=revision+1,reason=? WHERE id=?").run(reason,i.id);if(i.originalId&&i.offset)db.prepare('UPDATE purchase_invoices SET revision=revision+1 WHERE id=?').run(i.originalId);event('invoice',i.id,'cancelled',{reason});result={id:i.id};
        }else if(route==='/api/purchases/invoices/post'){
          const i=current(invoices(),body);if(i.status!=='approved')throw new PurchaseError('purchaseLocked');if(body.reviewed!==true)invalid('purchaseReview');
          if(signedCompany(i.company)!==signedCompany(company))invalid('purchaseCompanyChanged');
          if(i.type==='credit')accounting.requireOperator();
          const original=i.type==='credit'?invoiceSource(i.originalId):null;if(i.type==='credit'&&!original)throw new PurchaseError('purchasePostOriginalFirst');
          const liabilityAccount=allowed(original?.liabilityAccount||body.liabilityAccount,['liability']),vatAccount=i.lines.some(l=>l.deductibleTax)?allowed(body.vatAccount,['liability','asset']):null;
          const sign=i.type==='credit'?-1:1,lines=[];
          const add=(account,amount)=>{if(amount)lines.push({account,debit:Math.max(0,amount),credit:Math.max(0,-amount)});};
          for(const l of i.lines){add(allowed(l.expenseAccount,['asset','expense']),sign*(l.net+l.tax-l.deductibleTax));if(l.deductibleTax)add(vatAccount,sign*l.deductibleTax);}
          if(i.rounding)add(allowed(body.roundingAccount,['income','expense']),sign*i.rounding);add(liabilityAccount,-sign*i.total);
          result=accounting.postSource(body.yearId,{date:purchaseDate(body.date),description:text(body.description,'purchaseDescription'),reference:`LF${i.number} / ${i.invoiceNo}`,lines,company,liabilityAccount,purchaseInvoiceId:i.id},{sourceKind:'purchaseInvoice',sourceId:i.id});event('invoice',i.id,'posted',{voucher:result.id});
        }else if(route==='/api/purchases/payments'){
          const i=current(invoices(),body);if(i.status!=='approved')throw new PurchaseError('purchaseLocked');if(body.reviewed!==true)invalid('purchaseReview');
          const source=invoiceSource(i.id);if(!source)throw new PurchaseError('purchasePostInvoiceFirst');
          if(i.type==='invoice'&&invoices().some(c=>c.originalId===i.id&&c.status==='approved'&&c.offset&&!invoiceSource(c.id)))throw new PurchaseError('purchasePostCreditFirst');
          const amount=decimal(body.amount,'purchasePaymentAmount',{min:1,max:10000000000});if(amount>remaining(i).remaining)invalid('purchaseOverpayment');
          const date=purchaseDate(body.date);if(date<i.date)invalid('purchasePaymentDate');
          const bankAccount=allowed(body.bankAccount,['asset']),reference=text(body.reference,'purchasePaymentReference'),id=randomUUID(),sign=i.type==='credit'?-1:1;
          const lines=[{account:source.liabilityAccount,debit:sign>0?amount:0,credit:sign<0?amount:0},{account:bankAccount,debit:sign<0?amount:0,credit:sign>0?amount:0}];
          const voucher=accounting.postSource(body.yearId,{date:purchaseDate(body.postingDate||date),description:text(body.description,'purchaseDescription'),reference:`LF${i.number} / ${reference}`,lines,company,purchaseInvoiceId:i.id},{sourceKind:'purchasePayment',sourceId:id});
          const number=db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM purchase_payments').get().n,data={date,amount,bankAccount,reference,voucherId:voucher.id,direction:i.type==='credit'?'incoming':'outgoing'};
          db.prepare("INSERT INTO purchase_payments VALUES(?,?,?,1,'posted',?,NULL,NULL)").run(id,i.id,number,JSON.stringify(data));db.prepare('UPDATE purchase_invoices SET revision=revision+1 WHERE id=?').run(i.id);event('payment',id,'posted',data);result={id,invoiceId:i.id,voucherId:voucher.id};
        }else if(route==='/api/purchases/payments/reverse'){
          const p=current(payments(),body);if(p.status!=='posted')throw new PurchaseError('purchaseLocked');const source=paymentSource(p.id);if(!source)throw new PurchaseError('purchaseMissing');
          result=accounting.reverseSource(source.id,{revision:source.revision,yearId:body.yearId,date:purchaseDate(body.date),reason:text(body.reason,'purchaseReason')},company);
        }
        db.exec('COMMIT');return result;
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
  };
}
module.exports={initPurchases,PurchaseError,purchaseLines,totals};
