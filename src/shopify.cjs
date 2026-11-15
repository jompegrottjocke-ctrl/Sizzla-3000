const {randomBytes,randomUUID,createHmac,timingSafeEqual}=require('node:crypto');
const {WebshopError,siteURL,requestJSON,localState}=require('./webshop.cjs');
const API_VERSION='2026-10';
const fail=(message,status=400)=>{throw new WebshopError(message,status);};
function shopURL(value){const u=new URL(siteURL(value));if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(u.hostname)||u.pathname!=='/')fail('shopSite');return u.origin+'/';}
const gid=(v,type)=>typeof v==='string'&&new RegExp('^gid://shopify/'+type+'/[1-9][0-9]*$').test(v);
const ITEM_QUERY=`query StockItem($query:String!,$location:ID!){ inventoryItems(first:2,query:$query){ nodes { id sku tracked variant { inventoryPolicy } inventoryLevel(locationId:$location){ quantities(names:["available"]){name quantity} } } pageInfo {hasNextPage} } }`;
const LOCATION_QUERY=`query StockLocations {locations(first:100,includeInactive:false){nodes{id name isActive} pageInfo{hasNextPage}}}`;
const SET_QUERY=`mutation SetStock($input:InventorySetQuantitiesInput!,$key:String!){inventorySetQuantities(input:$input) @idempotent(key:$key){inventoryAdjustmentGroup{createdAt} userErrors{field message code}}}`;
function initShopify({context,audit,request=requestJSON,now=Date.now}){
 const secret=randomBytes(32),used=new Map();let busy=false;
 const sign=plan=>createHmac('sha256',secret).update(JSON.stringify(plan)).digest('hex');
 const same=session=>{if(context().session!==session)fail('dbChanged',409);};
 async function graphql(site,token,query,variables){let response;try{response=await request(new URL('admin/api/'+API_VERSION+'/graphql.json',site),{token},'POST',{query,variables});}catch(e){if(e instanceof WebshopError&&e.message==='wooAuth')fail('shopAuth',502);fail('shopNetwork',502);}if(!response||response.errors?.length||!response.data)fail('shopAPI',502);return response.data;}
 async function locations(site,token){const d=await graphql(site,token,LOCATION_QUERY,{}),list=d.locations;if(!Array.isArray(list?.nodes)||list.pageInfo?.hasNextPage!==false)fail('shopLocations');const values=list.nodes.filter(l=>l.isActive);if(!values.length||values.some(l=>!gid(l.id,'Location')||typeof l.name!=='string'))fail('shopLocations');return values.map(l=>({id:l.id,name:l.name}));}
 async function stock(site,token,sku,location){const query='sku:'+JSON.stringify(sku),d=await graphql(site,token,ITEM_QUERY,{query,location}),items=d.inventoryItems;if(!Array.isArray(items?.nodes)||items.pageInfo?.hasNextPage!==false||items.nodes.length!==1)fail('shopMatch');const a=items.nodes[0],qs=a.inventoryLevel?.quantities;if(a.sku!==sku||!a.tracked||a.variant?.inventoryPolicy!=='DENY'||!gid(a.id,'InventoryItem')||!Array.isArray(qs)||qs.length!==1||qs[0].name!=='available'||!Number.isSafeInteger(qs[0].quantity)||qs[0].quantity<0)fail('shopProduct');return {id:a.id,sku:a.sku,location,quantity:qs[0].quantity};}
 return {async handle(route,b){
  if(!b||typeof b!=='object'||!['locations','preview','apply'].includes(route))fail('shopInvalid');const site=shopURL(b.site);if(typeof b.key!=='string'||b.key.length<20||b.key.length>300||!/^[A-Za-z0-9_-]+$/.test(b.key))fail('shopAuth');const token=b.key,initial=context(),session=initial.session;
  if(route==='locations'){const values=await locations(site,token);same(session);return {locations:values};}
  if(route==='preview'){
   if(!gid(b.location,'Location')||!Array.isArray(b.articles)||!b.articles.length||b.articles.length>20||new Set(b.articles).size!==b.articles.length)fail('shopSelection');const ls=await locations(site,token);same(session);const location=ls.find(l=>l.id===b.location);if(!location)fail('shopLocations');const rows=[];
   for(const id of b.articles){same(session);const a=initial.items.find(a=>a.id===id);if(!a?.enabled||!a.sku||a.available%100)fail('wooQuantity');const remote=await stock(site,token,a.sku,location.id);same(session);rows.push({local:localState(a),remote,target:Math.min(a.available/100,remote.quantity),operation:randomUUID()});}
   const plan={site,session,version:API_VERSION,location,expires:now()+300000,nonce:randomUUID(),rows};return {plan,signature:sign(plan)};
  }
  const p=b.plan,sig=b.signature;if(!p||typeof sig!=='string'||!/^[0-9a-f]{64}$/.test(sig)||!timingSafeEqual(Buffer.from(sig),Buffer.from(sign(p))))fail('wooPlan',409);
  for(const [k,t] of used)if(t<now())used.delete(k);
  if(p.site!==site||p.session!==session||p.version!==API_VERSION||b.location!==p.location.id||p.expires<now()||used.has(p.nonce)||used.size>=10000||b.reviewed!==true||b.checkoutPaused!==true||busy)fail('wooPlan',409);
  used.set(p.nonce,p.expires);busy=true;const results=[];
  try{for(const row of p.rows){let action='failed';try{
   same(session);const a=context().items.find(a=>a.id===row.local.id);if(!a||JSON.stringify(localState(a))!==JSON.stringify(row.local))fail('wooStale',409);
   audit({id:a.id,action:'shopify_started',platform:'shopify',operationId:row.operation,site,locationId:p.location.id,productId:row.remote.id,sku:a.sku,quantity:row.target});
   const remote=await stock(site,token,row.local.sku,p.location.id);same(session);if(JSON.stringify(remote)!==JSON.stringify(row.remote))fail('wooStale',409);
   if(row.target===remote.quantity)action='unchanged';else{
    const fresh=context().items.find(a=>a.id===row.local.id);if(!fresh||JSON.stringify(localState(fresh))!==JSON.stringify(row.local))fail('wooStale',409);
    action='uncertain';const d=await graphql(site,token,SET_QUERY,{key:row.operation,input:{name:'available',reason:'correction',referenceDocumentUri:'sizzla-3000://stock-sync/'+row.operation,ignoreCompareQuantity:false,quantities:[{inventoryItemId:remote.id,locationId:p.location.id,quantity:row.target,compareQuantity:remote.quantity}]}});same(session);
    const result=d.inventorySetQuantities;if(!result||!Array.isArray(result.userErrors))fail('shopAPI',502);if(result.userErrors.length){action='failed';fail('shopCompare',409);}if(!result.inventoryAdjustmentGroup)fail('shopAPI',502);action='synced';
   }
   const fresh=context().items.find(a=>a.id===row.local.id);results.push({id:a.id,sku:a.sku,action,quantity:row.target,needsReview:!fresh||JSON.stringify(localState(fresh))!==JSON.stringify(row.local)});
  }catch(e){results.push({id:row.local.id,sku:row.local.sku,action,error:e instanceof WebshopError?e.message:'shopNetwork'});}
  if(context().session===session){try{audit({id:row.local.id,action:'shopify_'+results.at(-1).action,platform:'shopify',operationId:row.operation,site,locationId:p.location.id,productId:row.remote.id,sku:row.local.sku,quantity:row.target,error:results.at(-1).error||null,needsReview:results.at(-1).needsReview||false});}catch{results.at(-1).auditFailed=true;}}else break;
  }return {session,results};}finally{busy=false;}
 }};
}
module.exports={initShopify,shopURL,API_VERSION,ITEM_QUERY,LOCATION_QUERY,SET_QUERY};
