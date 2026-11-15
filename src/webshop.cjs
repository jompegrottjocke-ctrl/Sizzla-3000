const https=require('node:https'),dns=require('node:dns/promises'),net=require('node:net');
const {randomBytes,createHmac,timingSafeEqual}=require('node:crypto');
class WebshopError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(key,status)=>{throw new WebshopError(key,status);};
function siteURL(value){let u;try{u=new URL(value);}catch{fail('wooSite');}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port&&u.port!=='443'||net.isIP(u.hostname)||!/^([a-z0-9-]+\.)+[a-z0-9-]+$/i.test(u.hostname))fail('wooSite');u.pathname=u.pathname.replace(/\/+$/,'')+'/';return u.href;}
function publicAddress(address){const block=new net.BlockList();for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])block.addSubnet(ip,bits,'ipv4');if(net.isIP(address)===4)return !block.check(address,'ipv4');if(net.isIP(address)!==6)return false;const allowed=new net.BlockList();allowed.addSubnet('2000::',3,'ipv6');for(const [ip,bits] of [['2001:db8::',32],['2001::',32],['2002::',16]])block.addSubnet(ip,bits,'ipv6');return allowed.check(address,'ipv6')&&!block.check(address,'ipv6');}
async function requestJSON(url,credentials,method='GET',body){
 const addresses=await dns.lookup(url.hostname,{all:true}).catch(()=>fail('wooNetwork',502));if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))fail('wooSite');const chosen=addresses[0];
 return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null;let req;const timer=setTimeout(()=>req?.destroy(new Error('timeout')),15000);timer.unref();req=https.request(url,{method,headers:{...(credentials.token?{'X-Shopify-Access-Token':credentials.token}:{Authorization:'Basic '+Buffer.from(credentials.key+':'+credentials.secret).toString('base64')}),Accept:'application/json',...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})},lookup:(_host,options,callback)=>callback(null,options.all?[chosen]:chosen.address,chosen.family)},res=>{res.setEncoding('utf8');let raw='';res.on('data',chunk=>{raw+=chunk;if(Buffer.byteLength(raw)>2*1024*1024)req.destroy(new Error('size'));});res.on('end',()=>{clearTimeout(timer);if(res.statusCode<200||res.statusCode>=300)return reject(new WebshopError(res.statusCode===401||res.statusCode===403?'wooAuth':'wooNetwork',502));try{resolve(JSON.parse(raw));}catch{reject(new WebshopError('wooNetwork',502));}});res.on('error',()=>{clearTimeout(timer);reject(new WebshopError('wooNetwork',502));});});req.on('error',()=>{clearTimeout(timer);reject(new WebshopError('wooNetwork',502));});if(data)req.write(data);req.end();});
}
const remoteState=p=>({id:p.id,sku:p.sku,type:p.type,manage_stock:p.manage_stock,stock_quantity:p.stock_quantity,backorders:p.backorders,modified:p.date_modified_gmt});
const localState=a=>({id:a.id,sku:a.sku,quantity:a.quantity,reserved:a.reserved,available:a.available,stockRevision:a.stockRevision,revision:a.revision,enabled:a.enabled});
function initWebshop({context,audit,request=requestJSON,now=Date.now}){
 const key=randomBytes(32),used=new Set();let busy=false;const sign=p=>createHmac('sha256',key).update(JSON.stringify(p)).digest('hex');
 const credentials=b=>{if(typeof b.key!=='string'||typeof b.secret!=='string'||!/^ck_[a-zA-Z0-9]{20,100}$/.test(b.key)||!/^cs_[a-zA-Z0-9]{20,100}$/.test(b.secret))fail('wooAuth');return {key:b.key,secret:b.secret};};
 const same=session=>{if(context().session!==session)fail('dbChanged',409);};
 const product=p=>{if(!p||!Number.isSafeInteger(p.id)||p.type!=='simple'||p.manage_stock!==true||p.backorders!=='no'||!Number.isSafeInteger(p.stock_quantity)||p.stock_quantity<0)fail('wooProduct');return remoteState(p);};
 return {async handle(route,b){
  if(!b||typeof b!=='object'||Array.isArray(b))fail('wooInvalid');
  if(!['preview','apply'].includes(route))fail('wooInvalid');const auth=credentials(b),site=siteURL(b.site),initial=context(),session=initial.session;
  if(route==='preview'){
   if(!Array.isArray(b.articles)||!b.articles.length||b.articles.length>20||new Set(b.articles).size!==b.articles.length)fail('wooSelection');
   const rows=[];for(const id of b.articles){same(session);const a=initial.items.find(a=>a.id===id);if(!a?.enabled||!a.sku||a.available%100)fail('wooQuantity');const url=new URL('wp-json/wc/v3/products',site);url.searchParams.set('sku',a.sku);url.searchParams.set('per_page','100');const matches=await request(url,auth);same(session);if(!Array.isArray(matches)||matches.length!==1||matches[0].sku!==a.sku)fail('wooMatch');const remote=product(matches[0]);rows.push({local:localState(a),remote,target:Math.min(a.available/100,remote.stock_quantity)});}
   const plan={site,session,expires:now()+300000,nonce:randomBytes(16).toString('hex'),rows};return {plan,signature:sign(plan)};
  }
  const p=b.plan,signature=b.signature;if(!p||typeof signature!=='string'||!/^([0-9a-f]{64})$/.test(signature)||!timingSafeEqual(Buffer.from(sign(p)),Buffer.from(signature)))fail('wooPlan',409);
  if(p.site!==site||p.session!==session||p.expires<now()||used.has(p.nonce)||b.reviewed!==true||b.checkoutPaused!==true||busy)fail('wooPlan',409);
  busy=true;used.add(p.nonce);if(used.size>10000){busy=false;fail('wooPlan',409);}const results=[];
  try{for(const row of p.rows){let action='failed';try{
    same(session);const current=context().items.find(a=>a.id===row.local.id);if(!current||JSON.stringify(localState(current))!==JSON.stringify(row.local))fail('wooStale',409);
    audit({id:row.local.id,action:'woo_started',operationId:p.nonce,site,productId:row.remote.id,sku:row.local.sku,quantity:row.target});
    const url=new URL('wp-json/wc/v3/products/'+row.remote.id,site),remote=product(await request(url,auth));same(session);if(JSON.stringify(remote)!==JSON.stringify(row.remote))fail('wooStale',409);
    // Never target a higher observed stock; checkout must be paused to prevent concurrent orders.
    if(row.target===remote.stock_quantity){action='unchanged';}else{
     const fresh=context().items.find(a=>a.id===row.local.id);if(!fresh||JSON.stringify(localState(fresh))!==JSON.stringify(row.local))fail('wooStale',409);
     action='uncertain';const response=product(await request(url,auth,'PUT',{stock_quantity:row.target}));same(session);if(response.id!==remote.id||response.sku!==remote.sku||response.stock_quantity!==row.target)fail('wooNetwork',502);action='synced';
    }
    const changed=JSON.stringify(localState(context().items.find(a=>a.id===row.local.id)||{}))!==JSON.stringify(row.local);results.push({id:row.local.id,sku:row.local.sku,action,quantity:row.target,needsReview:changed});
   }catch(e){results.push({id:row.local.id,sku:row.local.sku,action,error:e instanceof WebshopError?e.message:'wooNetwork'});}
   if(context().session===session){try{audit({id:row.local.id,action:'woo_'+results.at(-1).action,operationId:p.nonce,site,productId:row.remote.id,sku:row.local.sku,quantity:row.target,needsReview:results.at(-1).needsReview||false,error:results.at(-1).error||null});}catch{results.at(-1).auditFailed=true;}}
   if(context().session!==session)break;
  }return {session,results};}finally{busy=false;}
 }};
}
module.exports={initWebshop,WebshopError,siteURL,publicAddress,requestJSON,localState};
