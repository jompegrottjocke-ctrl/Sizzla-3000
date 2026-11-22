const {randomUUID}=require('node:crypto');
const {text,decimal}=require('./domain.cjs');
const {stockDate}=require('./inventory.cjs');
function initSupplierReturns(db,accounting,inventory,{orders,receipts,invoices,invoiceSource,fail}){
 db.exec(`CREATE TRIGGER IF NOT EXISTS supplier_return_preserved BEFORE DELETE ON records WHEN OLD.kind='purchase_return' BEGIN SELECT RAISE(ABORT,'Supplier returns are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS supplier_return_locked BEFORE UPDATE ON records WHEN OLD.kind='purchase_return' AND (NEW.kind!=OLD.kind OR NEW.id!=OLD.id OR json_remove(NEW.data,'$.revision','$.status','$.reversalDate','$.reversalReason','$.reversedBy','$.creditId','$.creditNumber')!=json_remove(OLD.data,'$.revision','$.status','$.reversalDate','$.reversalReason','$.reversedBy','$.creditId','$.creditNumber')) BEGIN SELECT RAISE(ABORT,'Supplier return originals are immutable'); END;`);
 const rows=()=>db.prepare("SELECT id,data FROM records WHERE kind='purchase_return' ORDER BY rowid DESC").all().map(r=>({...JSON.parse(r.data),id:r.id}));
 const save=r=>db.prepare("INSERT INTO records VALUES('purchase_return',?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(r.id,JSON.stringify(r));
 const events=()=>db.prepare("SELECT data FROM records WHERE kind='purchase_return_event' ORDER BY rowid DESC LIMIT 200").all().map(r=>JSON.parse(r.data));
 const event=(r,action,actor,data)=>db.prepare("INSERT INTO records VALUES('purchase_return_event',?,?)").run(randomUUID(),JSON.stringify({returnId:r.id,orderId:r.orderId,action,actor,at:new Date().toISOString(),...data}));
 const current=(list,id,revision)=>{const r=list.find(r=>r.id===id);if(!r)fail('purchaseMissing',404);if(r.revision!==revision)fail('purchaseConflict');return r;};
 const bump=(receiptId,orderId)=>{db.prepare('UPDATE purchase_receipts SET revision=revision+1 WHERE id=?').run(receiptId);db.prepare('UPDATE purchase_orders SET revision=revision+1 WHERE id=?').run(orderId);};
 const activeForReceipt=id=>rows().some(r=>r.receiptId===id&&r.status==='sent');
 // Called inside the purchasing transaction. No stock/record/number can partially commit.
 function handle(action,b,company){
  const actor=accounting.requireOperator();if(b.reviewed!==true)fail('purchaseReview',400);const all=rows();
  if(action==='create'){
   const receipt=current(receipts(),b.id,b.revision),order=current(orders(),receipt.orderId,b.orderRevision);
   if(!receipt.active||!['issued','closed'].includes(order.status))fail('purchaseLocked');if((order.company.org||'').replace('-','')!==(company.org||'').replace('-',''))fail('purchaseCompanyChanged');
   const date=stockDate(b.date);if(date<receipt.date)fail('purchaseDeliveryDate',400);const reference=text(b.reference,'purchaseReference'),reason=text(b.reason,'purchaseReason',true,500);
   const previous=all.filter(r=>r.receiptId===receipt.id);if(previous.some(r=>r.reference.normalize('NFKC').trim().toLocaleUpperCase('sv-SE')===reference.normalize('NFKC').trim().toLocaleUpperCase('sv-SE')))fail('supplierReturnDuplicate');
   if(!Array.isArray(b.lines)||!b.lines.length||b.lines.length>100||new Set(b.lines.map(l=>l?.lineId)).size!==b.lines.length)fail('supplierReturnLines',400);
   const lines=b.lines.map(l=>{const received=receipt.lines.find(x=>x.lineId===l?.lineId),original=order.lines.find(x=>x.id===l?.lineId);if(!received||!original?.articleId||!original.stockTracked)fail('supplierReturnLines',400);const quantity=decimal(l.quantity,'purchaseQuantity',{min:1,max:10000000}),used=previous.filter(r=>r.status==='sent').flatMap(r=>r.lines).filter(x=>x.lineId===l.lineId).reduce((n,x)=>n+x.quantity,0);if(quantity+used>received.quantity)fail('supplierReturnQuantity',400);return {lineId:l.lineId,articleId:original.articleId,sku:original.sku,description:original.description,unit:original.unit,quantity};});
   const counter=db.prepare("SELECT data FROM records WHERE kind='purchase_return_counter' AND id='active'").get(),number=(counter?JSON.parse(counter.data).number:0)+1;if(!Number.isSafeInteger(number))fail('supplierReturnLines');
   const record={id:randomUUID(),number,revision:1,status:'sent',receiptId:receipt.id,receiptDate:receipt.date,receiptReference:receipt.reference,orderId:order.id,orderNumber:order.number,supplierId:order.supplierId,supplier:order.supplier,company:order.company,date,reference,reason,lines,actor,created:new Date().toISOString(),creditId:null,creditNumber:null};
   inventory.returnSupplier(order,record);save(record);db.prepare("INSERT INTO records VALUES('purchase_return_counter','active',?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(JSON.stringify({number}));bump(receipt.id,order.id);event(record,'supplier_return_sent',actor,{reason});return {id:record.id};
  }
  const record=current(all,b.id,b.revision),order=current(orders(),record.orderId,b.orderRevision);if(record.status!=='sent')fail('purchaseLocked');if((order.company.org||'').replace('-','')!==(company.org||'').replace('-',''))fail('purchaseCompanyChanged');
  const reason=text(b.reason,'purchaseReason',true,500);
  if(action==='reverse'){
   if(record.creditId)fail('supplierReturnUnlink');const date=stockDate(b.date);if(date<record.date)fail('purchaseDeliveryDate',400);
   inventory.reverseSupplierReturn(record,date,reason);save({...record,revision:record.revision+1,status:'reversed',reversalDate:date,reversalReason:reason,reversedBy:actor});bump(record.receiptId,record.orderId);event(record,'supplier_return_reversed',actor,{reason,date});return {id:record.id};
  }
  if(action==='link'){
   if(typeof b.creditId!=='string')fail('supplierReturnCredit',400);let credit=null;
   if(b.creditId){credit=invoices().find(i=>i.id===b.creditId&&i.type==='credit'&&i.status==='approved'&&i.supplierId===record.supplierId);const original=credit&&invoices().find(i=>i.id===credit.originalId&&i.type==='invoice'&&i.status==='approved'&&i.orderId===record.orderId&&i.supplierId===record.supplierId);if(!credit||!original||!invoiceSource(credit.id)||!invoiceSource(original.id))fail('supplierReturnCredit');
    const used=all.filter(r=>r.id!==record.id&&r.status==='sent'&&r.creditId===credit.id).flatMap(r=>r.lines),relatedCredits=new Set(invoices().filter(i=>i.originalId===original.id).map(i=>i.id)),originalUsed=all.filter(r=>r.id!==record.id&&r.status==='sent'&&relatedCredits.has(r.creditId)).flatMap(r=>r.lines),demand=new Map();for(const l of record.lines){const key=l.articleId+':'+l.unit;demand.set(key,(demand.get(key)||0)+l.quantity);}
    for(const l of record.lines){const matching=x=>x.articleId===l.articleId&&x.unit===l.unit;const capacity=credit.lines.filter(matching).reduce((n,x)=>n+x.quantity,0),originalQuantity=original.lines.filter(matching).reduce((n,x)=>n+x.quantity,0),allocated=used.filter(matching).reduce((n,x)=>n+x.quantity,0);const requested=demand.get(l.articleId+':'+l.unit)||0;if(requested+allocated>capacity||requested+originalUsed.filter(matching).reduce((n,x)=>n+x.quantity,0)>originalQuantity)fail('supplierReturnCredit');}
   }else if(!record.creditId)fail('supplierReturnCredit');
   save({...record,revision:record.revision+1,creditId:credit?.id||null,creditNumber:credit?.invoiceNo||null});db.prepare('UPDATE purchase_orders SET revision=revision+1 WHERE id=?').run(record.orderId);event(record,credit?'supplier_return_linked':'supplier_return_unlinked',actor,{reason,previousCreditId:record.creditId,creditId:credit?.id||null});return {id:record.id};
  }
  fail('purchaseMissing',404);
 }
 return {state:()=>({returns:rows(),returnEvents:events()}),handle,activeForReceipt};
}
module.exports={initSupplierReturns};
