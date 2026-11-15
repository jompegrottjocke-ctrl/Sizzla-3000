const {hash:webHash}=require('./woo-orders.cjs');
const {snapshot:currencySnapshot}=require('./currency.cjs');
const {randomUUID}=require('node:crypto');
const {text,date,invoice,decimal}=require('./domain.cjs');
const {stockDate}=require('./inventory.cjs');
class TradeError extends Error {constructor(message,status=409){super(message);this.status=status;}}
const fail=(code,status=code==='tradeLocked'?409:400)=>{throw new TradeError(code,status);};
const cents=n=>(n/100).toFixed(2);
const proportional=(n,q,total)=>Number((BigInt(n)*BigInt(q)+BigInt(total)/2n)/BigInt(total));
function initTrade(db,accounting,inventory){
 const rows=kind=>db.prepare('SELECT id,data FROM records WHERE kind=? ORDER BY rowid DESC').all('trade_'+kind).map(r=>({...JSON.parse(r.data),id:r.id}));
 const get=(kind,id)=>{if(typeof id!=='string'||!id)fail('tradeMissing',404);const r=db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get('trade_'+kind,id);if(!r)fail('tradeMissing',404);return {...JSON.parse(r.data),id};};
 const save=(kind,d)=>db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run('trade_'+kind,d.id,JSON.stringify(d));
 const current=(kind,b)=>{const d=get(kind,b.id);if(d.revision!==b.revision)fail('tradeConflict',409);return d;};
 const customer=id=>{const r=db.prepare("SELECT data FROM records WHERE kind='customer' AND id=?").get(id);if(!r)fail('tradeCustomer');return {id,data:JSON.parse(r.data)};};
 const event=(kind,id,action,actor,data={})=>save('event',{id:randomUUID(),kind,entityId:id,action,actor,at:new Date().toISOString(),data});
 const number=kind=>{const old=rows('counter').find(r=>r.id===kind),n=(old?.number||0)+1;if(!Number.isSafeInteger(n))fail('tradeInvalid');save('counter',{id:kind,number:n});return n;};
 const identity=c=>{if(!c.name||!/^\d{6}-?\d{4}$/.test(c.org||''))fail('tradeCompany');};
 const sameCompany=(a,b)=>{if((a.org||'').replace('-','')!==(b.org||'').replace('-',''))fail('tradeCompany');};
 const reviewed=b=>{if(b.reviewed!==true)fail('tradeReview');};
 const reason=b=>text(b.reason,'tradeReason',true,500);
 const itemData=(b,c)=>{identity(c);const d=invoice({...b,due:b.date},customer(b.customerId));if(d.total<=0)fail('tradeAmount');for(const l of d.lines)if(l.articleId){const r=db.prepare("SELECT data FROM records WHERE kind='article' AND id=?").get(l.articleId);if(!r)fail('tradeArticle');const a=JSON.parse(r.data);if(a.unit!==l.unit||a.sku!==l.sku)fail('tradeArticle');}return {...d,company:c,reference:text(b.reference??'','tradeReference',false),terms:text(b.terms??'','tradeTerms',false,2000)};};
 const issued=id=>db.prepare('SELECT id,number FROM sales_documents WHERE draft_id=?').get(id);
 const batches=()=>{const docs=new Map(db.prepare('SELECT draft_id,id,number FROM sales_documents WHERE draft_id IS NOT NULL').all().map(d=>[d.draft_id,{id:d.id,number:d.number}]));return rows('batch').map(b=>({...b,status:b.status==='cancelled'?'cancelled':docs.has(b.invoiceId)?'issued':'draft',document:docs.get(b.invoiceId)||null}));};
 const deliveries=()=>rows('delivery');
 function amounts(order,deliveryRows=deliveries(),batchRows=batches()){const ds=deliveryRows.filter(d=>d.orderId===order.id&&d.status!=='reversed'),bs=batchRows.filter(b=>b.orderId===order.id&&b.status!=='cancelled');return order.lines.map(l=>({...l,delivered:ds.flatMap(d=>d.lines).filter(x=>x.lineId===l.id).reduce((n,x)=>n+x.quantity,0),billed:bs.flatMap(b=>b.quantities).filter(x=>x.lineId===l.id).reduce((n,x)=>n+x.quantity,0)}));}
 const selection=(input,limits)=>{if(!Array.isArray(input)||!input.length||input.length>100||input.some(l=>!l||typeof l!=='object'||typeof l.lineId!=='string')||new Set(input.map(l=>l.lineId)).size!==input.length)fail('tradeSelection');return input.map(l=>{const limit=limits.find(x=>x.id===l.lineId);if(!limit)fail('tradeSelection');const quantity=decimal(l.quantity,'tradeQuantity',{min:1,max:10000000});if(quantity>limit.available)fail('tradeQuantity');return {lineId:l.lineId,quantity};});};
 function prepareOrder(d,c){sameCompany(d.company,c);const fresh=customer(d.customerId);return {...d,company:c,customer:fresh.data,lines:inventory.prepareOrderLines(d.lines.map(l=>({...l,id:l.id||randomUUID()})))};}
 const findBatch=invoiceId=>batches().find(b=>b.invoiceId===invoiceId&&b.status!=='cancelled');
 function protectDraft(invoiceId,data,old,body){const b=findBatch(invoiceId);if(!b)return data;if(b.status==='issued')fail('tradeLocked');if(old&&body.updated!==old.updated)fail('tradeConflict');
  const shape=l=>({articleId:l.articleId||'',sku:l.sku||'',description:l.description,quantity:l.quantity,price:l.price,unit:l.unit,vat:l.vat});
  if((data.currency||'SEK')!==(b.invoice.currency||'SEK')||data.customerId!==b.invoice.customerId||JSON.stringify(data.lines.map(shape))!==JSON.stringify(b.invoice.lines.map(shape))||data.date<b.latestDelivery)fail('tradeDraftLocked');
  return currencySnapshot({...data,lines:b.invoice.lines,net:b.invoice.net,tax:b.invoice.tax,total:b.invoice.total,tradeSource:{orderId:b.orderId,batchId:b.id,orderNumber:b.orderNumber,deliveryIds:b.deliveryIds}});
 }
 function assertIssue(invoiceId,draft,computed){return protectDraft(invoiceId,computed,null,{});}
 function state(){const ds=deliveries(),bs=batches();return {quotes:rows('quote'),orders:rows('order').map(o=>({...o,lines:amounts(o,ds,bs)})),deliveries:ds,batches:bs,events:rows('event').slice(0,200)};}
 function webOrderLookup(source){return db.prepare("SELECT id FROM records WHERE kind='trade_order' AND COALESCE(json_extract(data,'$.webSource.platform'),'woocommerce')=? AND json_extract(data,'$.webSource.site')=? AND json_extract(data,'$.webSource.id')=? LIMIT 1").get(source.platform||'woocommerce',source.site,source.id)?.id||null;}
 function webOrderReview(source,c){
  const existing=webOrderLookup(source);if(existing)return {existing,issues:[]};
  const issues=[];try{accounting.requireOperator();}catch{issues.push('webOperator');}const bindingId=webHash([...(source.platform==='shopify'?['shopify']:[]),source.site,source.customerId?'customer:'+source.customerId:'guest-order:'+source.id]),binding=db.prepare("SELECT data FROM records WHERE kind='web_customer' AND id=?").get(bindingId),bound=binding?JSON.parse(binding.data):null;
  const customerRow=bound?db.prepare("SELECT data FROM records WHERE kind='customer' AND id=?").get(bound.customerId):null,customerData=customerRow?JSON.parse(customerRow.data):source.customer;
  if(bound&&!customerRow)issues.push('webCustomerChanged');if(customerRow&&['name','email','phone','address','postal','city'].some(k=>customerData[k]!==source.customer[k]))issues.push('webCustomerChanged');
  const articles=db.prepare("SELECT id,data FROM records WHERE kind='article'").all().map(r=>({id:r.id,...JSON.parse(r.data)})),stock=new Map(inventory.summary().items.map(a=>[a.id,a])),demand=new Map();
  const lines=source.lines.map(l=>{if(l.kind!=='item')return {...l,unit:'st',stockTracked:false};const matches=articles.filter(a=>a.sku===l.sku);if(matches.length!==1){issues.push('webSKU');return {...l};}const a=matches[0],s=stock.get(a.id);if(source.platform==='shopify'&&!s.enabled)issues.push('shopOrderTracking');if(s.enabled)demand.set(a.id,(demand.get(a.id)||0)+l.quantity*100);return {...l,articleId:a.id,unit:a.unit,stockTracked:s.enabled,articleVersion:webHash(a),available:s.available,stockRevision:s.stockRevision,settingsRevision:s.revision};});
  for(const [id,n] of demand)if(n>stock.get(id).available)issues.push('webStock');
  if(((source.platform==='shopify'?'Shopify':'WooCommerce')+(source.test?' TEST':'')+' #'+source.number).length>200)issues.push('webInvalid');
  try{identity(c);stockDate(source.date);}catch{issues.push('webCompany');}
  return {issues:[...new Set(issues)],bindingId,customerId:bound?.customerId||null,customer:customerData,company:c,lines};
 }
 function importWebOrder(source,expected,c){db.exec('BEGIN IMMEDIATE');try{
  const actor=accounting.requireOperator(),check=webOrderReview(source,c);if(check.existing){db.exec('COMMIT');return {id:check.existing,duplicate:true};}if(check.issues.length)fail(check.issues[0]);if(webHash(check)!==webHash(expected))fail('webLocalChanged',409);
  const customerId=check.customerId||randomUUID();if(!check.customerId){db.prepare("INSERT INTO records VALUES('customer',?,?)").run(customerId,JSON.stringify(check.customer));db.prepare("INSERT INTO records VALUES('web_customer',?,?)").run(check.bindingId,JSON.stringify({customerId,site:source.site,platform:source.platform||'woocommerce',externalCustomerId:source.customerId,guestOrderId:source.customerId?null:source.id}));}
  const platform=source.platform==='shopify'?'Shopify':'WooCommerce',label=platform+(source.test?' TEST':'')+' #'+source.number;
  const input={customerId,date:source.date,currency:'SEK',lines:check.lines.map(l=>({...l,quantity:String(l.quantity),price:cents(l.price)})),reference:label,note:label+' / '+(source.paid?'Betald i webbshoppen (ej bokförd här)':'Betalning ej rapporterad')+' / Leverans: '+[source.shipping.name,source.shipping.address,source.shipping.postal,source.shipping.city].join(', ')};
  const data=itemData(input,c);if(data.net!==source.net||data.tax!==source.tax||data.total!==source.total)fail('webAmounts');const prepared=prepareOrder(data,c);prepared.lines=prepared.lines.map((l,i)=>({...l,...(source.lines[i].externalLineId?{webLineId:source.lines[i].externalLineId}:{})}));inventory.assertReservation(prepared.lines);
  const id=randomUUID(),n=number('order'),order={...prepared,id,number:n,revision:1,status:'confirmed',requestedDate:'',created:new Date().toISOString(),confirmedAt:new Date().toISOString(),webSource:source};save('order',order);event('order',id,source.platform==='shopify'?'shopOrderImported':'webImported',actor,{platform:source.platform||'woocommerce',site:source.site,externalId:source.id,number:source.number,paid:source.paid});db.exec('COMMIT');return {id,number:n};
 }catch(e){db.exec('ROLLBACK');throw e;}}
 function handle(route,b,c){db.exec('BEGIN IMMEDIATE');try{
  const actor=accounting.requireOperator();let result;
  if(route==='quotes/save'||route==='orders/save'){
   const kind=route.startsWith('quotes')?'quote':'order',old=b.id?current(kind,b):null;if(old&&old.status!=='draft')fail('tradeLocked');const data=itemData(b,c);date(b.date);
   const extra=kind==='quote'?{validUntil:date(b.validUntil)}:{requestedDate:b.requestedDate?date(b.requestedDate):''};if(kind==='quote'&&extra.validUntil<data.date||kind==='order'&&extra.requestedDate&&extra.requestedDate<data.date)fail('tradeDate');
   const d={...data,...extra,id:old?.id||randomUUID(),revision:(old?.revision||0)+1,status:'draft',number:null,created:old?.created||new Date().toISOString()};save(kind,d);event(kind,d.id,old?'updated':'created',actor);result={id:d.id};
  }else if(route==='quotes/issue'){
   const d=current('quote',b);if(d.status!=='draft')fail('tradeLocked');reviewed(b);stockDate(d.date);if(d.validUntil<d.date)fail('tradeDate');sameCompany(d.company,c);if(JSON.stringify(d.company)!==JSON.stringify(c)||JSON.stringify(d.customer)!==JSON.stringify(customer(d.customerId).data))fail('tradeStale');
   const next={...d,status:'issued',revision:d.revision+1,number:number('quote'),issuedAt:new Date().toISOString()};save('quote',next);event('quote',d.id,'issued',actor,{number:next.number});result={id:d.id};
  }else if(route==='quotes/accept'){
   const d=current('quote',b);if(d.status!=='issued'||d.orderId)fail('tradeLocked');reviewed(b);const acceptedDate=stockDate(b.date);if(acceptedDate<d.date||acceptedDate>d.validUntil)fail('tradeExpired');if(b.requestedDate&&date(b.requestedDate)<acceptedDate)fail('tradeDate');const reference=text(b.reference,'tradeReference');
   const o=prepareOrder(d,c);inventory.assertReservation(o.lines);const id=randomUUID(),n=number('order');save('order',{...o,id,revision:1,number:n,status:'confirmed',date:acceptedDate,quoteId:d.id,quoteNumber:d.number,acceptanceReference:reference,confirmedAt:new Date().toISOString(),requestedDate:b.requestedDate?date(b.requestedDate):''});
   save('quote',{...d,revision:d.revision+1,status:'accepted',orderId:id,acceptedDate,acceptanceReference:reference});event('quote',d.id,'accepted',actor,{orderId:id,reference,date:acceptedDate});event('order',id,'confirmed',actor,{quoteId:d.id,number:n});result={id};
  }else if(route==='quotes/decline'||route==='quotes/cancel'){
   const d=current('quote',b);if(!['draft','issued'].includes(d.status)||route==='quotes/decline'&&d.status!=='issued')fail('tradeLocked');const why=reason(b);save('quote',{...d,status:route.endsWith('decline')?'declined':'cancelled',revision:d.revision+1,reason:why});event('quote',d.id,route.endsWith('decline')?'declined':'cancelled',actor,{reason:why});result={id:d.id};
  }else if(route==='orders/confirm'){
   const d=current('order',b);if(d.status!=='draft')fail('tradeLocked');reviewed(b);stockDate(d.date);if(JSON.stringify(d.company)!==JSON.stringify(c)||JSON.stringify(d.customer)!==JSON.stringify(customer(d.customerId).data))fail('tradeStale');const o=prepareOrder(d,c);inventory.assertReservation(o.lines);save('order',{...o,revision:d.revision+1,status:'confirmed',number:number('order'),confirmedAt:new Date().toISOString()});event('order',d.id,'confirmed',actor);result={id:d.id};
  }else if(route==='orders/close'){
   const d=current('order',b);if(!['draft','confirmed'].includes(d.status))fail('tradeLocked');const why=reason(b),hasDelivery=deliveries().some(x=>x.orderId===d.id&&x.status!=='reversed');save('order',{...d,status:hasDelivery?'closed':'cancelled',revision:d.revision+1,reason:why});event('order',d.id,hasDelivery?'closed':'cancelled',actor,{reason:why});result={id:d.id};
  }else if(route==='deliveries/create'){
   const o=current('order',b);if(o.status!=='confirmed')fail('tradeLocked');reviewed(b);sameCompany(o.company,c);inventory.assertOrderLines(o.lines);const when=stockDate(b.date);if(when<o.date)fail('tradeDate');const lines=selection(b.lines,amounts(o).map(l=>({...l,available:l.quantity-l.delivered}))),id=randomUUID(),n=number('delivery');
   const d={id,revision:1,number:n,orderId:o.id,orderNumber:o.number,status:'delivered',date:when,reference:text(b.reference,'tradeReference'),lines,company:o.company,customer:o.customer,...(o.webSource?{shipping:o.webSource.shipping,webOrderNumber:o.webSource.number,webPlatform:o.webSource.platform||'woocommerce',webTest:!!o.webSource.test}:{}),created:new Date().toISOString()};save('delivery',d);inventory.deliverCustomer(o,d);save('order',{...o,revision:o.revision+1});event('delivery',id,'delivered',actor,{orderId:o.id,number:n});result={id};
  }else if(route==='deliveries/reverse'){
   const d=current('delivery',b),o=get('order',d.orderId);if(d.status!=='delivered'||b.orderRevision!==o.revision)fail('tradeConflict');if(batches().some(x=>x.status!=='cancelled'&&x.deliveryIds.includes(d.id)))fail('tradeDeliveryBilled');const why=reason(b),when=stockDate(b.date);if(when<d.date)fail('tradeDate');
   inventory.reverseCustomerDelivery(d,when,why);save('delivery',{...d,status:'reversed',revision:d.revision+1,reversalDate:when,reason:why});save('order',{...o,revision:o.revision+1});event('delivery',d.id,'reversed',actor,{reason:why,date:when});result={id:d.id};
  }else if(route==='batches/create'){
   const o=current('order',b);if(o.webSource)fail('webBilling');if(!['confirmed','closed'].includes(o.status))fail('tradeLocked');reviewed(b);sameCompany(o.company,c);const prior=batches().filter(x=>x.orderId===o.id&&x.status!=='cancelled');if(prior.some(x=>x.status==='draft'))fail('tradePendingDraft');
   if(!Array.isArray(b.deliveryIds)||!b.deliveryIds.length||b.deliveryIds.length>100||b.deliveryIds.some(id=>typeof id!=='string')||new Set(b.deliveryIds).size!==b.deliveryIds.length)fail('tradeSelection');const ds=b.deliveryIds.map(id=>get('delivery',id));if(ds.some(d=>d.orderId!==o.id||d.status!=='delivered'||prior.some(x=>x.deliveryIds.includes(d.id))))fail('tradeSelection');
   const latestDelivery=ds.map(d=>d.date).sort().at(-1),invoiceDate=stockDate(b.date),due=date(b.due);if(invoiceDate<latestDelivery||due<invoiceDate)fail('tradeDate');const quant=amounts(o);const quantities=o.lines.map(l=>({lineId:l.id,quantity:ds.flatMap(d=>d.lines).filter(x=>x.lineId===l.id).reduce((n,x)=>n+x.quantity,0)})).filter(x=>x.quantity);
   const lines=quantities.map(q=>{const l=quant.find(x=>x.id===q.lineId);if(l.billed+q.quantity>l.quantity)fail('tradeQuantity');const net=proportional(l.net,l.billed+q.quantity,l.quantity)-proportional(l.net,l.billed,l.quantity),tax=proportional(l.tax,l.billed+q.quantity,l.quantity)-proportional(l.tax,l.billed,l.quantity);return {...l,quantity:q.quantity,net,tax,delivered:undefined,billed:undefined,stockTracked:undefined};});
   const fresh=customer(o.customerId),data=invoice({currency:o.currency,fx:o.fx,date:invoiceDate,due,note:b.note||'',lines:lines.map(l=>({...l,quantity:cents(l.quantity),price:cents(l.price)}))},fresh);data.lines=lines;data.net=lines.reduce((n,l)=>n+l.net,0);data.tax=lines.reduce((n,l)=>n+l.tax,0);data.total=data.net+data.tax;if(data.total<=0)fail('tradeZeroBatch');
   const id=randomUUID(),invoiceId=randomUUID(),n=number('batch'),source={orderId:o.id,batchId:id,orderNumber:o.number,deliveryIds:b.deliveryIds};
   const draft=currencySnapshot({...data,company:c,tradeSource:source,status:'draft',updated:new Date().toISOString()});save('batch',{id,revision:1,number:n,orderId:o.id,orderNumber:o.number,invoiceId,status:'draft',deliveryIds:b.deliveryIds,quantities,invoice:draft,latestDelivery,created:new Date().toISOString()});db.prepare("INSERT INTO records VALUES('invoice',?,?)").run(invoiceId,JSON.stringify(draft));save('order',{...o,revision:o.revision+1});event('batch',id,'transferred',actor,{orderId:o.id,invoiceId,deliveryIds:b.deliveryIds});result={id,invoiceId};
  }else if(route==='batches/cancel'){
   const batch=current('batch',b),o=get('order',batch.orderId);if(batch.status==='cancelled'||issued(batch.invoiceId))fail('tradeLocked');if(o.revision!==b.orderRevision)fail('tradeConflict');const draft=db.prepare("SELECT data FROM records WHERE kind='invoice' AND id=?").get(batch.invoiceId);if(!draft||JSON.parse(draft.data).updated!==b.invoiceUpdated)fail('tradeConflict');const why=reason(b);db.prepare("DELETE FROM records WHERE kind='invoice' AND id=?").run(batch.invoiceId);save('batch',{...batch,status:'cancelled',revision:batch.revision+1,reason:why});save('order',{...o,revision:o.revision+1});event('batch',batch.id,'cancelled',actor,{reason:why});result={id:batch.id};
  }else fail('tradeMissing',404);
  db.exec('COMMIT');return result;
 }catch(error){db.exec('ROLLBACK');throw error;}}
 return {state,handle,protectDraft,assertIssue,webOrderReview,webOrderLookup,importWebOrder};
}
module.exports={initTrade,TradeError};
