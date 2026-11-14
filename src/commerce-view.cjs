const {DatabaseError}=require('./databases.cjs');
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));
const documentSummary=d=>({...pick(d,['id','number','type','draftId','originalId','originalNumber','customerId','date','due','note','revision','net','tax','total','currency','paid','allocated','remaining','clearedSek','remainingSek','voucherId','voucherNumber','overdue']),customer:pick(d.customer,['name','org'])});
const supplierSummary=d=>({...pick(d,['id','number','invoiceNo','type','status','date','due','revision','currency','paid','credited','remaining','total','voucherId']),supplier:pick(d.supplier,['name'])});
function commerceView({sales,purchases,drafts,view,selection={}}){
 const result={sales:{nextNumber:sales.nextNumber,documents:sales.documents.map(documentSummary)},purchases:{invoices:purchases.invoices.map(supplierSummary)},invoices:drafts};
 if(view==='commerce-history'){Object.assign(result.sales,{payments:sales.payments,allocations:sales.allocations,events:sales.events});result.purchases.payments=purchases.payments;}
 if(view==='commerce-detail'){
  const history=selection.history==='1';if(selection.history!==undefined&&!history)throw new DatabaseError('stateView',400);selection={...selection};delete selection.history;
  const keys=Object.keys(selection);if(keys.length>1||keys.some(k=>!['document','draft','payment','allocation'].includes(k)))throw new DatabaseError('stateView',400);
  let documentId=selection.document,draft=selection.draft&&drafts.find(d=>d.id===selection.draft);
  if(selection.payment)documentId=sales.payments.find(p=>p.id===selection.payment)?.documentId;
  if(selection.allocation)documentId=sales.allocations.find(a=>a.id===selection.allocation)?.creditId;
  if(selection.draft&&!draft)documentId=sales.documents.find(d=>d.draftId===selection.draft)?.id;
  if(keys.length&&!documentId&&!draft)throw new DatabaseError('missing',404);
  const selected=documentId&&sales.documents.find(d=>d.id===documentId);if(documentId&&!selected)throw new DatabaseError('missing',404);
  const root=selected&&(selected.originalId||selected.id),ids=new Set(root?sales.documents.filter(d=>d.id===root||d.originalId===root).map(d=>d.id):[]);
  result.sales.documents=sales.documents.map(d=>ids.has(d.id)?d:documentSummary(d));
  result.sales.payments=sales.payments.filter(p=>ids.has(p.documentId));result.sales.allocations=sales.allocations.filter(a=>ids.has(a.invoiceId)||ids.has(a.creditId));
  result.commerceDetails={documents:[...ids],drafts:draft?[draft.id]:[],inputs:true,history};
  if(history){Object.assign(result.sales,{payments:sales.payments,allocations:sales.allocations,events:sales.events});result.purchases.payments=purchases.payments;}
 }
 return result;
}
module.exports={commerceView,documentSummary,supplierSummary};
