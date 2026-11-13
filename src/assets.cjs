const {randomUUID}=require('node:crypto');
const {ValidationError,text,decimal}=require('./domain.cjs');
class AssetError extends Error{constructor(message,status=409){super(message);this.status=status;}}
const fail=key=>{throw new ValidationError(key);};
const today=()=>new Date().toISOString().slice(0,10);
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail('assetDate');return value;}
function month(value){if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)||value<'1900-01')fail('assetMonth');return value;}
const index=m=>Number(m.slice(0,4))*12+Number(m.slice(5,7))-1;
const monthAt=i=>String(Math.floor(i/12)).padStart(4,'0')+'-'+String(i%12+1).padStart(2,'0');
const endMonth=m=>{month(m);return m+'-'+new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5)),0)).getUTCDate();};
const amounts=['cost','residual','openingDepreciation'];
const terms=['acquired','startMonth','months',...amounts,'openingThrough','assetAccount','accumulatedAccount','depreciationAccount','gainAccount','lossAccount','sourceReference','sourceVoucherId','purchaseInvoiceId'];
function assetData(body){
 const a={code:text(body.code,'assetCode',true,50),name:text(body.name,'assetName'),category:text(body.category||'','assetCategory',false),serial:text(body.serial||'','assetSerial',false),location:text(body.location||'','assetLocation',false),note:text(body.note||'','assetNote',false,2000),acquired:date(body.acquired),startMonth:month(body.startMonth),months:Number(body.months)};
 for(const k of amounts)a[k]=decimal(body[k]??'0','assetAmount',{max:100000000000});
 if(!a.cost||a.residual>a.cost||a.openingDepreciation>a.cost-a.residual||!Number.isInteger(a.months)||a.months<1||a.months>600||a.startMonth<a.acquired.slice(0,7))fail('assetTerms');
 a.openingThrough=body.openingThrough?month(body.openingThrough):'';
 const elapsed=a.openingThrough?index(a.openingThrough)-index(a.startMonth)+1:0;
 if((a.openingDepreciation&&!a.openingThrough)||(a.openingThrough&&(elapsed<1||elapsed>a.months||endMonth(a.openingThrough)>today()))||(elapsed===a.months&&a.openingDepreciation!==a.cost-a.residual))fail('assetOpening');
 for(const k of ['assetAccount','accumulatedAccount','depreciationAccount','gainAccount','lossAccount'])a[k]=text(body[k], 'assetAccounts');
 a.sourceReference=text(body.sourceReference,'assetReference');a.sourceVoucherId=text(body.sourceVoucherId||'','assetSource',false);a.purchaseInvoiceId=text(body.purchaseInvoiceId||'','assetSource',false);
 return a;
}
function initAssets(db,accounting){
 const previews=new Map();
 const rows=kind=>db.prepare('SELECT id,data FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r=>({id:r.id,...JSON.parse(r.data)}));
 const assets=()=>rows('fixed_asset'),operations=()=>rows('asset_operation');
 const save=(kind,value)=>{const {id,...data}=value;db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind,id,JSON.stringify(data));};
 const audit=(a,action,data)=>db.prepare('INSERT INTO ledger_events(at,entity,entity_id,action,data) VALUES(?,?,?,?,?)').run(new Date().toISOString(),'asset',a.id,action,JSON.stringify(data));
 const current=body=>{const a=assets().find(a=>a.id===body.id);if(!a)throw new AssetError('assetMissing',404);if(a.revision!==body.revision)throw new AssetError('assetConflict');return a;};
 const live=(a,all=operations())=>all.filter(o=>o.assetId===a.id&&o.status==='posted');
 const dep=(a,all)=>live(a,all).filter(o=>o.kind==='depreciate');
 const accumulated=(a,all)=>a.openingDepreciation+dep(a,all).reduce((s,o)=>s+o.amount,0);
 const nextMonth=(a,all)=>monthAt(a.openingDepreciation===a.cost-a.residual?index(a.startMonth)+a.months:a.openingThrough?index(a.openingThrough)+dep(a,all).length+1:index(a.startMonth)+dep(a,all).length);
 function account(code,prefix,type){const a=accounting.account(code);if(!a||!prefix.test(code)||a.type!==type)fail('assetAccounts');return a;}
 function checkAccounts(a){account(a.assetAccount,/^1[012]/,'asset');account(a.accumulatedAccount,/^1[012]/,'asset');account(a.depreciationAccount,/^78/,'expense');account(a.gainAccount,/^3/,'income');account(a.lossAccount,/^[4-7]/,'expense');if(a.assetAccount===a.accumulatedAccount)fail('assetAccounts');}
 const voucher=id=>accounting.state().vouchers.find(v=>v.id===id&&v.status==='posted'&&!v.reversedBy&&!v.corrects);
 function source(a){
  let v=a.sourceVoucherId?voucher(a.sourceVoucherId):null;
  if(a.purchaseInvoiceId){const bill=db.prepare('SELECT * FROM purchase_invoices WHERE id=?').get(a.purchaseInvoiceId);if(!bill||bill.status!=='approved'||JSON.parse(bill.data).type==='credit')fail('assetSource');const p=accounting.source('purchaseInvoice',a.purchaseInvoiceId);if(!p||(v&&v.id!==p.id))fail('assetSource');v=p;}
  if((a.sourceVoucherId||a.purchaseInvoiceId)&&!v)fail('assetSource');
  if(v){if(v.date>today())fail('assetSource');const available=v.lines.filter(l=>l.account===a.assetAccount).reduce((s,l)=>s+l.debit-l.credit,0),used=assets().filter(other=>other.id!==a.id&&['active','disposed'].includes(other.status)&&other.sourceVoucherId===v.id&&other.assetAccount===a.assetAccount).reduce((s,a)=>s+a.cost,0);if(available-used<a.cost)fail('assetSource');}
  return v;
 }
 function year(id,postingDate){const y=accounting.state().years.find(y=>y.id===id);if(!y)fail('bookMissing');if(y.closed)throw new AssetError('bookYearClosed');if(postingDate<y.start||postingDate>y.end)fail('bookOutsideYear');if(y.lockedThrough&&postingDate<=y.lockedThrough)throw new AssetError('bookPeriodLocked');return y;}
 function prepare(body,company){
  const a=current(body);if(a.status!=='active')throw new AssetError('assetLocked');checkAccounts(a);
  if(!company.name||!/^\d{6}-?\d{4}$/.test(company.org||'')||(a.companyIdentity&&a.companyIdentity!==company.org.replace('-','')))fail('bookCompanyChanged');
  const postingDate=date(body.date);if(postingDate>today()||postingDate<a.acquired)fail('assetDate');
  if(a.sourceVoucherId&&(!voucher(a.sourceVoucherId)||voucher(a.sourceVoucherId).date>postingDate))fail('assetSource');
  const ownOps=operations().filter(o=>o.assetId===a.id),lastDate=ownOps.reduce((d,o)=>[d,o.date,o.reversalDate||''].sort().at(-1),'');if(postingDate<lastDate)fail('assetChronology');
  const y=year(body.yearId,postingDate),lines=[];const add=(code,value)=>{if(value){const acc=accounting.account(code);if(!acc)fail('assetAccounts');lines.push({account:code,name:acc.name,nameEn:acc.nameEn,debit:Math.max(0,value),credit:Math.max(0,-value)});}};
  let plan={kind:body.kind,assetId:a.id,asset:a,yearId:y.id,yearRevision:y.revision,date:postingDate,company,reference:text(body.reference||a.sourceReference,'assetReference'),lines};
  if(body.kind==='depreciate'){
   const m=month(body.month);if(m!==nextMonth(a)||index(m)>=index(a.startMonth)+a.months||endMonth(m)>postingDate)fail('assetNextMonth');
   const openingMonths=a.openingThrough?index(a.openingThrough)-index(a.startMonth)+1:0,total=a.cost-a.residual-a.openingDepreciation,n=dep(a).length+1,remaining=a.months-openingMonths;
   const target=Math.round(total*n/remaining),previous=accumulated(a)-a.openingDepreciation,amount=target-previous;
   if(amount<0||accumulated(a)+amount>a.cost-a.residual)fail('assetTerms');
   add(a.depreciationAccount,amount);add(a.accumulatedAccount,-amount);Object.assign(plan,{month:m,amount,accumulated:accumulated(a)+amount,bookValue:a.cost-accumulated(a)-amount});
  }else if(body.kind==='dispose'){
   if(!['sale','retire'].includes(body.disposition))fail('assetDisposition');
   const due=Math.min(index(postingDate.slice(0,7))-1,index(a.startMonth)+a.months-1);if(index(nextMonth(a))<=due)fail('assetDepreciateFirst');
   const amount=body.disposition==='sale'?decimal(body.proceeds,'assetAmount',{max:100000000000}):0,accum=accumulated(a),book=a.cost-accum,gain=amount-book;
   let sale=null;
   if(body.disposition==='sale'){
    if(!amount)fail('assetAmount');sale=voucher(body.saleVoucherId);account(body.proceedsAccount,/^3/,'income');if(!sale||sale.sourceKind==='assetOperation'||sale.date>postingDate||sale.date<a.acquired)fail('assetSaleSource');
    const available=sale.lines.filter(l=>l.account===body.proceedsAccount).reduce((s,l)=>s+l.credit-l.debit,0),allocated=operations().filter(o=>o.kind==='dispose'&&o.status==='posted'&&o.saleVoucherId===sale.id&&o.proceedsAccount===body.proceedsAccount).reduce((s,o)=>s+o.proceeds,0);if(available-allocated<amount)fail('assetSaleSource');add(body.proceedsAccount,amount);
   }
   add(a.accumulatedAccount,accum);add(a.assetAccount,-a.cost);add(gain>=0?a.gainAccount:a.lossAccount,-gain);
   Object.assign(plan,{disposition:body.disposition,amount:book,accumulated:accum,proceeds:amount,gain,saleVoucherId:sale?.id||'',saleRevision:sale?.revision||0,proceedsAccount:sale?body.proceedsAccount:'',bookValue:0,reason:text(body.reason,'assetReason')});
  }else fail('assetAction');
  return plan;
 }
 function beforeReverse(v,body={}){
  if(assets().some(a=>['active','disposed'].includes(a.status)&&a.sourceVoucherId===v.id)||operations().some(o=>o.status==='posted'&&o.saleVoucherId===v.id))throw new AssetError('assetSourceInUse');
  if(v.sourceKind==='assetOperation'){if(body.date&&body.date<operations().filter(o=>o.assetId===operations().find(p=>p.id===v.sourceId)?.assetId).reduce((d,o)=>o.reversalDate>d?o.reversalDate:d,''))fail('assetChronology');const o=operations().find(o=>o.id===v.sourceId);if(!o||o.status!=='posted'||live({id:o.assetId}).at(-1)?.id!==o.id)throw new AssetError('assetReverseLatest');}
 }
 function markReversed(o,reversalId,reversalDate,reason){const a=assets().find(a=>a.id===o.assetId);save('asset_operation',{...o,status:'reversed',reversalId,reversalDate,reason});save('fixed_asset',{...a,status:'active',revision:a.revision+1});audit(a,'reversed',{operationId:o.id,reversalId,reversalDate,reason});}
 function afterReverse(v,result,reason){if(v.sourceKind!=='assetOperation')return;const o=operations().find(o=>o.id===v.sourceId);markReversed(o,result.id,accounting.state().vouchers.find(v=>v.id===result.id).date,reason);}
 function report(asOf){date(asOf);if(asOf>today())fail('assetDate');const all=operations(),sourceDates=new Map(accounting.state().vouchers.map(v=>[v.id,v.date]));return assets().filter(a=>['active','disposed'].includes(a.status)&&a.acquired<=asOf&&(!a.sourceVoucherId||sourceDates.get(a.sourceVoucherId)<=asOf)).map(a=>{
  if(a.openingThrough&&asOf<endMonth(a.openingThrough))return {...a,unavailable:true,accumulated:null,bookValue:null};
  const ops=all.filter(o=>o.assetId===a.id&&o.date<=asOf&&(o.status==='posted'||o.reversalDate>asOf)),disposed=ops.find(o=>o.kind==='dispose'),sum=a.openingDepreciation+ops.filter(o=>o.kind==='depreciate').reduce((s,o)=>s+o.amount,0);
  return {...a,status:disposed?'disposed':'active',accumulated:sum,bookValue:disposed?0:a.cost-sum,disposalDate:disposed?.date||''};
 });}
 return {beforeReverse,afterReverse,report,hasActive:()=>assets().some(a=>['active','disposed'].includes(a.status)),state:()=>{const all=operations();return {items:assets().map(a=>({...a,accumulated:accumulated(a,all),bookValue:a.status==='disposed'?0:a.cost-accumulated(a,all),nextMonth:nextMonth(a,all)})),operations:all,events:db.prepare("SELECT * FROM ledger_events WHERE entity='asset' ORDER BY id DESC").all().map(e=>({...e,data:JSON.parse(e.data)}))};},handle(route,body,company){
  if(route==='/api/assets/preview'){
   const plan=prepare(body,company),id=randomUUID();for(const [key,p]of previews)if(p.at<Date.now()-30*60000)previews.delete(key);if(previews.size>=20)previews.delete(previews.keys().next().value);previews.set(id,{plan,body,at:Date.now()});return {...plan,previewId:id};
  }
  db.exec('BEGIN IMMEDIATE');try{let result;
   if(route==='/api/assets/save'){
    const old=body.id?current(body):null,data=assetData(body);checkAccounts(data);
    if(assets().some(a=>a.id!==old?.id&&a.code.toLocaleUpperCase('sv-SE')===data.code.toLocaleUpperCase('sv-SE')))fail('assetDuplicate');
    if(old&&old.status!=='draft'&&(old.status==='cancelled'||data.code!==old.code||terms.some(k=>data[k]!==old[k])))throw new AssetError('assetLocked');
    const a={...data,id:old?.id||randomUUID(),revision:(old?.revision||0)+1,status:old?.status||'draft',created:old?.created||new Date().toISOString(),...(old?.companyIdentity?{companyIdentity:old.companyIdentity}:{})};save('fixed_asset',a);audit(a,old?'updated':'created',{before:old||null,after:a});result={id:a.id};
   }else if(route==='/api/assets/activate'){
    const a=current(body);if(a.status!=='draft')throw new AssetError('assetLocked');if(a.acquired>today())fail('assetDate');if(body.reviewed!==true)fail('assetReview');if(!company.name||!/^\d{6}-?\d{4}$/.test(company.org||''))fail('bookCompanyChanged');checkAccounts(a);const v=source(a);const active={...a,sourceVoucherId:v?.id||'',companyIdentity:company.org.replace('-',''),status:'active',revision:a.revision+1};save('fixed_asset',active);audit(a,'activated',{after:active,acquisitionAlreadyPosted:true});result={id:a.id};
   }else if(route==='/api/assets/reset'||route==='/api/assets/cancel'){
    const a=current(body);if(a.status==='disposed'||a.status==='cancelled'||live(a).length||(route.endsWith('/reset')&&operations().some(o=>o.assetId===a.id)))throw new AssetError('assetLocked');
    const reason=text(body.reason,'assetReason'),status=route.endsWith('/reset')?'draft':'cancelled';save('fixed_asset',{...a,status,revision:a.revision+1});audit(a,status,{reason});result={id:a.id};
   }else if(route==='/api/assets/post'){
    const p=previews.get(body.previewId);if(!p||p.at<Date.now()-30*60000)throw new AssetError('assetPreviewExpired');if(body.reviewed!==true)fail('assetReview');if(p.done){db.exec('COMMIT');return {...p.done,replayed:true};}
    const fresh=prepare(p.body,company);if(JSON.stringify(fresh)!==JSON.stringify(p.plan))throw new AssetError('assetConflict');const plan=p.plan,opId=randomUUID(),v=plan.lines.length?accounting.postSource(plan.yearId,{date:plan.date,description:plan.kind==='depreciate'?`Avskrivning ${plan.asset.code} / ${plan.month}`:`Avyttring ${plan.asset.code}`,reference:plan.reference,lines:plan.lines,company},{sourceKind:'assetOperation',sourceId:opId}):null;
    const {asset,company:companySnapshot,yearRevision,saleRevision,lines,...operation}=plan;save('asset_operation',{...operation,id:opId,status:'posted',voucherId:v?.id||'',snapshot:asset,company:companySnapshot,lines,created:new Date().toISOString()});save('fixed_asset',{...asset,status:plan.kind==='dispose'?'disposed':'active',revision:asset.revision+1});audit(asset,plan.kind,{operationId:opId,...operation,voucherId:v?.id||''});result={id:asset.id,operationId:opId,voucherId:v?.id||''};db.exec('COMMIT');p.done=result;return result;
   }else if(route==='/api/assets/reverse'){
    if(body.reviewed!==true)fail('assetReview');const a=current(body),o=operations().find(o=>o.id===body.operationId&&o.assetId===a.id);if(!o||o.status!=='posted'||live(a).at(-1)?.id!==o.id)throw new AssetError('assetReverseLatest');const reversalDate=date(body.date),reason=text(body.reason,'assetReason');if(reversalDate<o.date||reversalDate>today()||reversalDate<operations().filter(op=>op.assetId===a.id).reduce((d,op)=>op.reversalDate>d?op.reversalDate:d,''))fail('assetChronology');year(body.yearId,reversalDate);
    if(o.voucherId){const v=voucher(o.voucherId);if(!v)throw new AssetError('assetConflict');result=accounting.reverseSource(v.id,{revision:v.revision,yearId:body.yearId,date:reversalDate,reason},company);}else{markReversed(o,'',reversalDate,reason);result={id:a.id};}
   }else throw new AssetError('assetMissing',404);
   db.exec('COMMIT');return result;
  }catch(e){db.exec('ROLLBACK');throw e;}
 }};
}
module.exports={initAssets,AssetError,assetData,endMonth};
