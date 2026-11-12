const {randomUUID}=require('node:crypto');
const {text,decimal}=require('./domain.cjs');
class InventoryError extends Error{constructor(code,status=409){super(code);this.status=status;}}
const bad=code=>{throw new InventoryError(code,400);};
const localToday=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'});
function stockDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value<'1900-01-01'||value>localToday())bad('invDate');return value;}
function initInventory(db){
 db.exec(`CREATE TABLE IF NOT EXISTS inventory_settings(article_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,enabled INTEGER NOT NULL,minimum INTEGER NOT NULL,location TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS inventory_movements(id INTEGER PRIMARY KEY,article_id TEXT NOT NULL,date TEXT NOT NULL,kind TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity!=0),reference TEXT NOT NULL,reason TEXT NOT NULL,snapshot TEXT NOT NULL,created TEXT NOT NULL,source_kind TEXT,source_id TEXT,source_line TEXT,reverses INTEGER REFERENCES inventory_movements(id),reversed_by INTEGER REFERENCES inventory_movements(id));
 CREATE UNIQUE INDEX IF NOT EXISTS inventory_source_unique ON inventory_movements(source_kind,source_id,source_line) WHERE source_id IS NOT NULL;
 CREATE UNIQUE INDEX IF NOT EXISTS inventory_reverse_unique ON inventory_movements(reverses) WHERE reverses IS NOT NULL;
 CREATE INDEX IF NOT EXISTS inventory_article_date ON inventory_movements(article_id,date,id);
 CREATE TABLE IF NOT EXISTS inventory_counts(id TEXT PRIMARY KEY,number INTEGER UNIQUE NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,date TEXT NOT NULL,reference TEXT NOT NULL,data TEXT NOT NULL,reason TEXT);
 CREATE TABLE IF NOT EXISTS inventory_events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,entity TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS inventory_movement_locked BEFORE UPDATE OF id,article_id,date,kind,quantity,reference,reason,snapshot,created,source_kind,source_id,source_line,reverses ON inventory_movements BEGIN SELECT RAISE(ABORT,'Inventory movements are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS inventory_movement_preserved BEFORE DELETE ON inventory_movements BEGIN SELECT RAISE(ABORT,'Inventory movements are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS inventory_count_locked BEFORE UPDATE ON inventory_counts WHEN OLD.status!='draft' BEGIN SELECT RAISE(ABORT,'Posted inventory counts are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS inventory_count_preserved BEFORE DELETE ON inventory_counts BEGIN SELECT RAISE(ABORT,'Inventory counts are preserved'); END;
 PRAGMA user_version=6;`);
 const articles=()=>db.prepare("SELECT id,data FROM records WHERE kind='article' ORDER BY rowid DESC").all().map(r=>({id:r.id,...JSON.parse(r.data)}));
 const article=id=>{const a=articles().find(a=>a.id===id);if(!a)throw new InventoryError('invMissing');return a;};
 const settings=id=>db.prepare('SELECT * FROM inventory_settings WHERE article_id=?').get(id)||{article_id:id,revision:0,enabled:0,minimum:0,location:''};
 const quantity=(id,date='9999-12-31')=>db.prepare('SELECT COALESCE(SUM(quantity),0) AS n FROM inventory_movements WHERE article_id=? AND date<=?').get(id,date).n;
 const latestCountDate=id=>db.prepare("SELECT MAX(c.date) AS date FROM inventory_counts c,json_each(c.data,'$.lines') l WHERE c.status='posted' AND json_extract(l.value,'$.articleId')=?").get(id).date||'';
 const checkCountDate=(id,date)=>{if(date<latestCountDate(id))throw new InventoryError('invCountDate');};
 const stockRevision=id=>db.prepare('SELECT COALESCE(MAX(id),0) AS n FROM inventory_movements WHERE article_id=?').get(id).n;
 const snap=id=>{const a=article(id);return {name:a.name,sku:a.sku,unit:a.unit};};
 const requireActive=id=>{article(id);if(!settings(id).enabled)throw new InventoryError('invInactive');};
 const event=(entity,id,action,data={})=>db.prepare('INSERT INTO inventory_events(at,entity,entity_id,action,data) VALUES(?,?,?,?,?)').run(new Date().toISOString(),entity,String(id),action,JSON.stringify(data));
 const openOrder=id=>db.prepare("SELECT data FROM purchase_orders WHERE status='issued'").all().some(r=>JSON.parse(r.data).lines.some(l=>l.articleId===id&&l.stockTracked));
 function assertArticleChange(id,data){
  const old=articles().find(a=>a.id===id);if(old&&(settings(id).enabled||stockRevision(id)||openOrder(id))&&(old.sku!==data.sku||old.unit!==data.unit))throw new InventoryError('invArticleLocked');
  if(data.sku&&articles().some(a=>a.id!==id&&settings(a.id).enabled&&a.sku.toLocaleUpperCase('sv-SE')===data.sku.toLocaleUpperCase('sv-SE')))throw new InventoryError('invSku');
 }
 function checkBalance(id){const rows=db.prepare('SELECT quantity FROM inventory_movements WHERE article_id=? ORDER BY date,id').all(id);let balance=0;for(const r of rows){balance+=r.quantity;if(balance<0)throw new InventoryError('invNegative');if(!Number.isSafeInteger(balance)||balance>1000000000000)bad('invQuantityInvalid');}}
 function move({articleId,date,kind,quantity:qty,reference,reason,sourceKind=null,sourceId=null,sourceLine=null,reverses=null}){
  requireActive(articleId);checkCountDate(articleId,date);if(!Number.isSafeInteger(qty)||qty===0)bad('invQuantityInvalid');stockDate(date);
  const id=Number(db.prepare('INSERT INTO inventory_movements(article_id,date,kind,quantity,reference,reason,snapshot,created,source_kind,source_id,source_line,reverses) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(articleId,date,kind,qty,reference,reason,JSON.stringify(snap(articleId)),new Date().toISOString(),sourceKind,sourceId,sourceLine,reverses).lastInsertRowid);
  checkBalance(articleId);event('movement',id,kind,{articleId,quantity:qty});return id;
 }
 function prepareOrderLines(lines){return lines.map(l=>{if(!l.articleId)return {...l,articleId:'',stockTracked:false};const a=article(l.articleId);if(a.unit!==l.unit)throw new InventoryError('invUnit');return {...l,stockTracked:!!settings(a.id).enabled};});}
 function assertOrderLines(lines){for(const l of lines){if(!l.articleId)continue;const a=article(l.articleId);if(a.unit!==l.unit||!!l.stockTracked!==!!settings(a.id).enabled)throw new InventoryError('invOrderChanged');}}
 function receive(order,receipt){for(const received of receipt.lines){const line=order.lines.find(l=>l.id===received.lineId);if(!line?.articleId||!line.stockTracked)continue;const a=article(line.articleId);if(a.unit!==line.unit)throw new InventoryError('invUnit');move({articleId:a.id,date:receipt.date,kind:'receipt',quantity:received.quantity,reference:receipt.reference,reason:'IO'+order.number,sourceKind:'receipt',sourceId:receipt.id,sourceLine:line.id});}}
 function reverseReceipt(receipt,reason){const rows=db.prepare("SELECT * FROM inventory_movements WHERE source_kind='receipt' AND source_id=? ORDER BY id").all(receipt.id);for(const r of rows){if(r.reversed_by)throw new InventoryError('invReversed');if(localToday()<r.date)bad('invDate');const id=move({articleId:r.article_id,date:localToday(),kind:'reverse',quantity:-r.quantity,reference:r.reference,reason,sourceKind:'receipt_reverse',sourceId:receipt.id,sourceLine:r.source_line,reverses:r.id});db.prepare('UPDATE inventory_movements SET reversed_by=? WHERE id=?').run(id,r.id);}}
 const counts=()=>db.prepare('SELECT * FROM inventory_counts ORDER BY number DESC').all().map(r=>({...r,...JSON.parse(r.data),data:undefined}));
 function currentCount(body){const row=counts().find(c=>c.id===body.id);if(!row)throw new InventoryError('invMissing');if(row.revision!==body.revision||row.status!=='draft')throw new InventoryError('invConflict');return row;}
 function state(){return {items:articles().map(a=>({...a,enabled:!!settings(a.id).enabled,minimum:settings(a.id).minimum,location:settings(a.id).location,revision:settings(a.id).revision,quantity:quantity(a.id),stockRevision:stockRevision(a.id)})),movements:db.prepare('SELECT * FROM inventory_movements ORDER BY date DESC,id DESC').all().map(r=>({...r,articleId:r.article_id,sourceKind:r.source_kind,sourceId:r.source_id,reversedBy:r.reversed_by,...JSON.parse(r.snapshot),snapshot:undefined})),counts:counts(),events:db.prepare('SELECT * FROM inventory_events ORDER BY id DESC LIMIT 500').all().map(r=>({...r,data:JSON.parse(r.data)}))};}
 function handle(route,body){
  db.exec('BEGIN IMMEDIATE');try{let result;
   if(route==='/api/inventory/settings'){
    const a=article(body.articleId),old=settings(a.id);if(body.revision!==old.revision)throw new InventoryError('invConflict');if(typeof body.enabled!=='boolean')bad('invInvalid');
    if(body.enabled&&(!a.sku||articles().some(x=>x.id!==a.id&&x.sku.toLocaleUpperCase('sv-SE')===a.sku.toLocaleUpperCase('sv-SE'))))throw new InventoryError('invSku');
    if(!body.enabled&&(quantity(a.id)!==0||openOrder(a.id)))throw new InventoryError('invInUse');
    const minimum=decimal(body.minimum??'0','invQuantityInvalid',{max:1000000000000}),location=text(body.location??'','invLocation',false);
    db.prepare('INSERT INTO inventory_settings VALUES(?,?,?,?,?) ON CONFLICT(article_id) DO UPDATE SET revision=excluded.revision,enabled=excluded.enabled,minimum=excluded.minimum,location=excluded.location').run(a.id,old.revision+1,body.enabled?1:0,minimum,location);event('article',a.id,'settings',{enabled:body.enabled,minimum,location});result={id:a.id};
   }else if(route==='/api/inventory/movements'){
    requireActive(body.articleId);if(body.stockRevision!==stockRevision(body.articleId)||body.settingsRevision!==settings(body.articleId).revision)throw new InventoryError('invConflict');if(!['opening','in','out'].includes(body.kind))bad('invInvalid');if(body.kind==='opening'&&stockRevision(body.articleId))throw new InventoryError('invOpening');
    const qty=decimal(body.quantity,'invQuantityInvalid',{min:1,max:10000000});const id=move({articleId:body.articleId,date:stockDate(body.date),kind:body.kind,quantity:body.kind==='out'?-qty:qty,reference:text(body.reference,'invReference'),reason:text(body.reason,'invReason')});result={id};
   }else if(route==='/api/inventory/movements/reverse'){
    if(!Number.isSafeInteger(body.id)||body.id<1)bad('invInvalid');const r=db.prepare('SELECT * FROM inventory_movements WHERE id=?').get(Number(body.id));if(!r)throw new InventoryError('invMissing');if(r.reversed_by)throw new InventoryError('invReversed');if(!['opening','in','out'].includes(r.kind))throw new InventoryError('invReverseSource');
    const date=stockDate(body.date);if(date<r.date)bad('invDate');const id=move({articleId:r.article_id,date,kind:'reverse',quantity:-r.quantity,reference:r.reference,reason:text(body.reason,'invReason'),reverses:r.id});db.prepare('UPDATE inventory_movements SET reversed_by=? WHERE id=?').run(id,r.id);result={id};
   }else if(route==='/api/inventory/counts'){
    const date=stockDate(body.date);if(!Array.isArray(body.lines)||!body.lines.length||body.lines.length>500)bad('invLines');const seen=new Set();
    const lines=body.lines.map(l=>{if(!l||seen.has(l.articleId))bad('invLines');seen.add(l.articleId);requireActive(l.articleId);checkCountDate(l.articleId,date);if(l.stockRevision!==stockRevision(l.articleId)||l.settingsRevision!==settings(l.articleId).revision)throw new InventoryError('invConflict');return {articleId:l.articleId,...snap(l.articleId),expected:quantity(l.articleId,date),stockRevision:stockRevision(l.articleId),settingsRevision:settings(l.articleId).revision,counted:decimal(l.counted,'invQuantityInvalid',{max:1000000000000})};});
    const id=randomUUID(),number=db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM inventory_counts').get().n;db.prepare("INSERT INTO inventory_counts VALUES(?,?,1,'draft',?,?,?,NULL)").run(id,number,date,text(body.reference,'invReference'),JSON.stringify({lines}));event('count',id,'created');result={id};
   }else if(route==='/api/inventory/counts/post'){
    const c=currentCount(body);if(body.reviewed!==true)bad('invReview');for(const l of c.lines){requireActive(l.articleId);checkCountDate(l.articleId,c.date);if(stockRevision(l.articleId)!==l.stockRevision||settings(l.articleId).revision!==l.settingsRevision||article(l.articleId).unit!==l.unit||article(l.articleId).sku!==l.sku)throw new InventoryError('invConflict');}
    for(const l of c.lines){const delta=l.counted-l.expected;if(delta)move({articleId:l.articleId,date:c.date,kind:'count',quantity:delta,reference:c.reference,reason:'IN'+c.number,sourceKind:'count',sourceId:c.id,sourceLine:l.articleId});}
    db.prepare("UPDATE inventory_counts SET status='posted',revision=revision+1 WHERE id=?").run(c.id);event('count',c.id,'posted');result={id:c.id};
   }else if(route==='/api/inventory/counts/cancel'){
    const c=currentCount(body);db.prepare("UPDATE inventory_counts SET status='cancelled',revision=revision+1,reason=? WHERE id=?").run(text(body.reason,'invReason'),c.id);event('count',c.id,'cancelled',{reason:body.reason});result={id:c.id};
   }else throw new InventoryError('invInvalid',404);
   db.exec('COMMIT');return result;
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
 return {state,handle,assertArticleChange,prepareOrderLines,assertOrderLines,receive,reverseReceipt};
}
module.exports={initInventory,InventoryError,stockDate};
