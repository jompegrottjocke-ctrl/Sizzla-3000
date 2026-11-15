const {randomBytes,createHash,createHmac,timingSafeEqual}=require('node:crypto');
const {WebshopError,siteURL,requestJSON}=require('./webshop.cjs');const {decimal,text,date}=require('./domain.cjs');
const fail=(code,status=400)=>{throw new WebshopError(code,status);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function normalizeOrder(o,site){
 try{
  if(!o||!Number.isSafeInteger(o.id)||o.id<1)fail('webInvalid');
  if(!['processing','on-hold'].includes(o.status))fail('webStatus');if(o.currency!=='SEK')fail('webCurrency');if(!Array.isArray(o.refunds)||o.refunds.length)fail('webRefund');
  const when=date(String(o.date_created||'').slice(0,10));
  const address=b=>{if(!b||b.country!=='SE')fail('webCountry');if(['company','first_name','last_name','address_1','address_2','postcode','city'].some(k=>b[k]!==undefined&&typeof b[k]!=='string'))fail('webCustomer');return {name:text(b.company||[b.first_name,b.last_name].filter(Boolean).join(' '),'webCustomer'),address:text([b.address_1,b.address_2].filter(Boolean).join(', '),'webCustomer'),postal:text(b.postcode,'webCustomer'),city:text(b.city,'webCustomer')};};
  const billing=address(o.billing),shipping=address(o.shipping?.address_1?o.shipping:o.billing),customer={name:billing.name,org:'',email:text(o.billing.email||'','webCustomer',false),phone:text(o.billing.phone||'','webCustomer',false),address:billing.address,postal:billing.postal,city:billing.city};if(customer.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))fail('webCustomer');
  if(!Number.isSafeInteger(o.customer_id)||o.customer_id<0||!Array.isArray(o.tax_lines)||!Array.isArray(o.line_items)||!o.line_items.length||!Array.isArray(o.shipping_lines)||!Array.isArray(o.fee_lines))fail('webInvalid');
  if(new Set(o.tax_lines.map(t=>t.rate_id)).size!==o.tax_lines.length)fail('webTax');const rates=new Map(o.tax_lines.map(t=>[t.rate_id,t])),lines=[];
  for(const [kind,input] of [['item',o.line_items],['shipping',o.shipping_lines],['fee',o.fee_lines]])for(const l of input){
   const quantity=kind==='item'?l.quantity:1;if(!Number.isSafeInteger(quantity)||quantity<=0||quantity>100000)fail('webQuantity');const net=decimal(l.total,'webAmounts'),tax=decimal(l.total_tax,'webAmounts');let vat=0;
   if(!Array.isArray(l.taxes))fail('webTax');const applied=l.taxes.filter(t=>decimal(t.total,'webTax')>0);if(applied.length>1)fail('webTax');
   if(applied.length){const t=rates.get(applied[0].id);if(!t||t.compound!==false||![6,12,25].includes(Number(t.rate_percent)))fail('webTax');vat=Number(t.rate_percent);if(decimal(applied[0].total,'webTax')!==tax)fail('webTax');}else if(tax!==0)fail('webTax');
   if(net%quantity||Math.round(net*vat/100)!==tax)fail('webAmounts');
   lines.push({kind,sku:kind==='item'?text(l.sku||'','webSKU'): '',description:text(kind==='shipping'?l.method_title||'Shipping':l.name,'webAmounts'),quantity,price:net/quantity,vat,net,tax});
  }
  if(lines.length>100)fail('webAmounts');const net=lines.reduce((n,l)=>n+l.net,0),tax=lines.reduce((n,l)=>n+l.tax,0),total=decimal(o.total,'webAmounts',{max:10000000000});if(total<=0||net+tax!==total||tax!==decimal(o.total_tax,'webAmounts',{max:10000000000})||lines.filter(l=>l.kind==='shipping').reduce((n,l)=>n+l.net,0)!==decimal(o.shipping_total,'webAmounts',{max:10000000000}))fail('webAmounts');
  return {platform:'woocommerce',site,id:o.id,number:text(String(o.number||o.id),'webInvalid'),status:o.status,modified:text(o.date_modified_gmt||'','webInvalid'),date:when,currency:'SEK',paid:!!(o.date_paid_gmt||o.date_paid),paymentMethod:text(o.payment_method_title||'','webInvalid',false),customerId:o.customer_id,customer,shipping,lines,net,tax,total};
 }catch(e){if(e instanceof WebshopError)throw e;fail(['webCustomer','webSKU','webQuantity','webTax'].includes(e.message)?e.message:'webAmounts');}
}
function initWooOrders({context,review,commit,request=requestJSON,now=Date.now}){
 const key=randomBytes(32);const sign=p=>createHmac('sha256',key).update(JSON.stringify(p)).digest('hex');
 const same=session=>{if(context().session!==session)fail('dbChanged',409);};
 return {async handle(route,b){
  if(!b||!['list','preview','import'].includes(route))fail('webInvalid');const site=siteURL(b.site);if(typeof b.key!=='string'||typeof b.secret!=='string'||!/^ck_[a-zA-Z0-9]{20,100}$/.test(b.key)||!/^cs_[a-zA-Z0-9]{20,100}$/.test(b.secret))fail('wooAuth');const auth={key:b.key,secret:b.secret},session=context().session;
  const get=async path=>{const result=await request(new URL('wp-json/wc/v3/'+path,site),auth);same(session);return result;};
  if(route==='list'){
   if(!['processing','on-hold'].includes(b.status)||!Number.isInteger(b.page)||b.page<1||b.page>10000)fail('webInvalid');const orders=await get('orders?'+new URLSearchParams({status:b.status,page:b.page,per_page:10,orderby:'id',order:'desc'}));if(!Array.isArray(orders)||orders.length>10)fail('webInvalid');
   return {page:b.page,hasMore:orders.length===10,orders:orders.map(o=>{if(!o||typeof o!=='object')return {id:0,number:'?',issues:['webInvalid'],canPreview:false};const basic={id:o.id,number:String(o.number||o.id),status:o.status,currency:o.currency,total:String(o.total||''),paid:!!(o.date_paid_gmt||o.date_paid)};try{const source=normalizeOrder(o,site),local=review(source);return {...basic,customer:source.customer.name,paid:source.paid,canPreview:true,issues:local.issues,existing:local.existing||null};}catch(e){return {...basic,canPreview:false,issues:[e instanceof WebshopError?e.message:'webInvalid']};}})};
  }
  if(route==='preview'){
   if(!Number.isSafeInteger(b.id)||b.id<1)fail('webInvalid');const raw=await get('orders/'+b.id);if(!raw||raw.id!==b.id)fail('webInvalid');const source=normalizeOrder(raw,site),local=review(source),plan={site,session,expires:now()+300000,source,local};return {plan,signature:sign(plan)};
  }
  const p=b.plan,sig=b.signature;if(!p||typeof sig!=='string'||!/^[0-9a-f]{64}$/.test(sig)||!timingSafeEqual(Buffer.from(sig),Buffer.from(sign(p)))||p.site!==site||p.session!==session||p.expires<now()||b.reviewed!==true)fail('webPlan',409);
  const existing=review(p.source).existing;if(existing)return {id:existing,duplicate:true};
  const raw=await get('orders/'+p.source.id),fresh=normalizeOrder(raw,site);if(hash(fresh)!==hash(p.source))fail('webRemoteChanged',409);
  same(session);return commit(fresh,p.local);
 }};
}
module.exports={initWooOrders,normalizeOrder,hash};
