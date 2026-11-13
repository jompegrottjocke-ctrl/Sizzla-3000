const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { ValidationError, text, decimal, invoice } = require('./domain.cjs');
const {initClosing,ClosingError}=require('./closing.cjs');
const {initAssets,AssetError}=require('./assets.cjs');
const { initHr, HrError } = require('./hr.cjs');
const { initAccounting, AccountingError } = require('./accounting.cjs');
const {initFileImport,FileImportError}=require('./file-import.cjs');
const {template:importTemplate}=require('./import-files.cjs');
const {articleData}=require('./articles.cjs');
const {initTime,TimeError}=require('./time.cjs');
const {initSales,SalesError}=require('./sales.cjs');
const {initInventory,InventoryError}=require('./inventory.cjs');
const {initPrinting,PrintError}=require('./printing.cjs');
const {initSecurity,applyPending}=require('./security.cjs');
const {initDatabases,DatabaseError}=require('./databases.cjs');
const { initPurchases, PurchaseError } = require('./purchases.cjs');
function openDatabase(dataDir,openDataDirectory){
  applyPending(dataDir);
  const db=new DatabaseSync(path.join(dataDir,'sizzla.sqlite'));
  let hr, accounting, purchases,inventory,sales,time,printing,security,imports,assets,closing;
  try {
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS preferences (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);`);
  hr=initHr(db,{payrollHasPosting:id=>accounting?.payrollHasPosting(id)??false});
  accounting=initAccounting(db,{beforeReverse:(v,b)=>{assets?.beforeReverse(v,b);purchases?.beforeReverse(v);sales?.beforeReverse(v);},afterReverse:(v,r,reason)=>{assets?.afterReverse(v,r,reason);purchases?.afterReverse(v,r,reason);sales?.afterReverse(v,r,reason);}});
  purchases=initPurchases(db,accounting,{prepareOrderLines:lines=>inventory.prepareOrderLines(lines),assertOrderLines:lines=>inventory.assertOrderLines(lines),receive:(o,r)=>inventory.receive(o,r),reverseReceipt:(r,reason)=>inventory.reverseReceipt(r,reason)});
  inventory=initInventory(db);
  sales=initSales(db,accounting);
  time=initTime(db);
  assets=initAssets(db,accounting);
  closing=initClosing(db,accounting);
  imports=initFileImport(db,inventory);
  printing=initPrinting(db);
  security=initSecurity(db,{dataDir,openDataDirectory:openDataDirectory?()=>openDataDirectory(dataDir):undefined});
  } catch(error) { db.close(); throw error; }
  return {db,hr,accounting,purchases,inventory,sales,time,printing,security,imports,assets,closing};
}
function createApp({ dataDir = process.env.SIZZLA_DATA_DIR || path.join(__dirname, '..', '.local'), openDataDirectory, canSwitchDatabase=()=>true, onDatabaseChanged=()=>{} } = {}) {
  fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
  const databases=initDatabases(dataDir);
  if(!databases.created&&(!fs.existsSync(path.join(databases.directory(databases.activeId),'sizzla.sqlite'))||!fs.statSync(path.join(databases.directory(databases.activeId),'sizzla.sqlite')).size))throw new DatabaseError('dbUnavailable');
  let {db,hr,accounting,purchases,inventory,sales,time,printing,security,imports,assets,closing}=openDatabase(databases.directory(databases.activeId),openDataDirectory);
  let token=randomBytes(32).toString('hex'),databaseSession=randomUUID();
  const all = kind => db.prepare('SELECT id,data FROM records WHERE kind=? ORDER BY rowid DESC').all(kind).map(row => ({ id: row.id, ...JSON.parse(row.data) }));
  const get = (kind,id) => { const row = db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind,id); return row ? { id, data: JSON.parse(row.data) } : null; };
  const settings = () => JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get()?.data || '{}');
  const preferences = () => JSON.parse(db.prepare('SELECT data FROM preferences WHERE id=1').get()?.data || '{}');
  function send(res, status, value, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
  }
  let closed=false;
  const server = http.createServer(async (req,res) => {
    try {
      if (req.headers.host !== `127.0.0.1:${server.address().port}`) return send(res,403,{ error:'host' });
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && ['/','/app.js','/closing.js','/closing.css','/assets.js','/assets.css','/file-import.js','/file-import.css','/appearance.js','/analysis.js','/analysis-math.js','/analysis.css','/themes.css','/cloud.js','/cloud.css','/time.css','/time.js','/databases.js','/sales.js','/sales.css','/inventory.js','/inventory.css','/printing.js','/printing.css','/security.js','/accessibility.css','/hr.js','/whatsapp-phone.js','/accounting.js','/purchases.js','/purchases.css','/ledger-math.js','/style.css','/hr.css','/accounting.css','/dark.css','/print'].includes(url.pathname)) {
        const file = url.pathname === '/' || url.pathname === '/print' ? 'index.html' : url.pathname.slice(1);
        return send(res,200,fs.readFileSync(path.join(__dirname,'..','public',file)),file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8');
      }
      if(req.method==='GET'&&url.pathname==='/api/file-import/template'){const kind=url.searchParams.get('kind'),format=url.searchParams.get('format'),bytes=importTemplate(kind,format,url.searchParams.get('lang'));res.setHeader('Content-Disposition',`attachment; filename="Sizzla-${kind}-mall.${format}"`);return send(res,200,bytes,format==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'text/csv; charset=utf-8');}
      if(req.method==='GET'&&url.pathname.startsWith('/api/prints')&&((req.headers['x-sizzla-token']&&req.headers['x-sizzla-token']!==token)||(url.searchParams.has('databaseSession')&&url.searchParams.get('databaseSession')!==databaseSession)))return send(res,409,{error:'dbChanged'});
      if(req.method==='GET'&&url.pathname==='/api/prints')return send(res,200,printing.list(Object.fromEntries(url.searchParams)));
      const pdfMatch=url.pathname.match(/^\/api\/prints\/([a-f0-9-]{36})\/pdf$/);
      if(req.method==='GET'&&pdfMatch){const doc=printing.document(pdfMatch[1]);if(!doc.pdf)return send(res,404,{error:'printPdfFailed'});res.setHeader('Content-Disposition',`inline; filename="Sizzla-${doc.id}.pdf"`);return send(res,200,doc.pdf,'application/pdf');}
      if (req.method === 'GET' && url.pathname === '/api/state') return send(res,200,{ token, databaseSession,databases:databases.state(), security:security.status(), preferences:preferences(), assets:assets.state(), closing:closing.state(), company:settings(), customers:all('customer'), articles:all('article'), invoices:all('invoice').filter(d=>!sales.isIssuedDraft(d.id)),...hr.state(),accounting:accounting.state(),purchases:purchases.state(),inventory:inventory.state(),sales:sales.state(),time:time.state() });
      if(req.method==='POST'&&req.headers.origin===`http://127.0.0.1:${server.address().port}`&&req.headers['x-sizzla-token']&&req.headers['x-sizzla-token']!==token)return send(res,409,{error:'dbChanged'});
      if(req.method==='GET'&&url.pathname==='/api/assets/report'&&req.headers['x-sizzla-token']&&req.headers['x-sizzla-token']!==token)return send(res,409,{error:'dbChanged'});
      if(req.method==='GET'&&url.pathname==='/api/assets/report')return send(res,200,{date:url.searchParams.get('date'),items:assets.report(url.searchParams.get('date'))});
      if (req.method !== 'POST' || req.headers['x-sizzla-token'] !== token || req.headers.origin !== `http://127.0.0.1:${server.address().port}` || !req.headers['content-type']?.startsWith('application/json')) return send(res,403,{ error:'access' });
      const requestToken=token;
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > (url.pathname==='/api/security/import'?90*1024*1024:url.pathname.startsWith('/api/file-import/')?8*1024*1024:262144)) return send(res,413,{error:'size'}); }
      if(requestToken!==token)return send(res,409,{error:'dbChanged'});
      let body;
      try { body = JSON.parse(raw); } catch { return send(res,400,{error:'json'}); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('data');
      if(url.pathname.startsWith('/api/databases/')){
        const route=url.pathname.slice('/api/databases/'.length);
        if(route==='create')return send(res,200,databases.create(body,(dir,name)=>{const fresh=openDatabase(dir,openDataDirectory);try{fresh.db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify({name}));fresh.db.prepare('INSERT INTO preferences VALUES(1,?)').run(JSON.stringify(preferences()));}finally{fresh.db.close();}}));
        if(route==='rename')return send(res,200,databases.rename(body));
        if(route==='activate'){
          if(security.status().importPending)throw new DatabaseError('dbImportPending');
          if(!canSwitchDatabase())throw new DatabaseError('dbPrintBusy');
          const result=databases.activate(body,dir=>{if(fs.existsSync(path.join(dir,'pending-import.sqlite')))throw new DatabaseError('dbImportPending');let candidate;try{candidate=openDatabase(dir,openDataDirectory);if(candidate.db.prepare('PRAGMA quick_check').get().quick_check!=='ok'||candidate.db.prepare('PRAGMA foreign_key_check').all().length)throw Error();for(const row of candidate.db.prepare('SELECT data FROM records UNION ALL SELECT data FROM settings UNION ALL SELECT data FROM preferences').all()){const value=JSON.parse(row.data);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();}candidate.hr.state();candidate.accounting.state();candidate.purchases.state();candidate.inventory.state();candidate.sales.state();candidate.time.state();candidate.assets.state();candidate.closing.state();return candidate;}catch{candidate?.db.close();throw new DatabaseError('dbUnavailable');}});
          if(!result.unchanged){const old=db;({db,hr,accounting,purchases,inventory,sales,time,printing,security,imports,assets,closing}=result.candidate);token=randomBytes(32).toString('hex');databaseSession=randomUUID();old.close();try{onDatabaseChanged();}catch(error){console.error(error);}}
          return send(res,200,{ok:true});
        }
        throw new DatabaseError('dbMissing',404);
      }
      if(url.pathname.startsWith('/api/security/')){
        try{const result=await security.handle(url.pathname.slice('/api/security/'.length),body);
        if(result.download){res.setHeader('Content-Disposition',`attachment; filename="Sizzla-3000-${databases.state().entries.find(e=>e.active).name.normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60)}-${new Date().toISOString().replace(/[:.]/g,'-')}.${result.extension}"`);return send(res,200,result.download,'application/octet-stream');}
        return send(res,200,result);}catch(error){if(['passwordLength','securityInvalid','desktopOnly','backupPassword','backupInvalid'].includes(error.message))return send(res,400,{error:error.message});throw error;}
      }
      if(url.pathname.startsWith('/api/file-import/')){const activeImporter=imports;let result;if(url.pathname==='/api/file-import/read')result=await activeImporter.read(body);else if(url.pathname==='/api/file-import/preview')result=activeImporter.preview(body);else if(url.pathname==='/api/file-import/commit')result=activeImporter.commit(body);else throw new FileImportError('importInvalid',404);if(requestToken!==token)return send(res,409,{error:'dbChanged'});return send(res,200,result);}
      if(url.pathname.startsWith('/api/closing/'))return send(res,200,closing.handle(url.pathname,body));
      if(url.pathname.startsWith('/api/assets/'))return send(res,200,assets.handle(url.pathname,body,settings()));
      if(url.pathname.startsWith('/api/time/'))return send(res,200,time.handle(url.pathname,body,settings()));
      if(url.pathname.startsWith('/api/sales/'))return send(res,200,sales.handle(url.pathname,body,settings()));
      if(url.pathname.startsWith('/api/inventory/'))return send(res,200,inventory.handle(url.pathname,body));
      if(url.pathname.startsWith('/api/purchases/')){
        const result=purchases.handle(url.pathname,body,settings());return send(res,result?200:404,result||{error:'route'});
      }
      if(url.pathname.startsWith('/api/accounting/')){
        const result=accounting.handle(url.pathname,body,settings());
        return send(res,result?200:404,result||{error:'route'});
      }
      if(url.pathname==='/api/preferences') {
        if(!['sv','en'].includes(body.language)||!['light','dark','contrast','blue','warm','system'].includes(body.theme))throw new ValidationError('preferences');
        if(body.whatsappEnabled!==undefined&&typeof body.whatsappEnabled!=='boolean')throw new ValidationError('preferences');
        if(body.textSize!==undefined&&(![100,125,150,175,200].includes(body.textSize)||typeof body.bold!=='boolean'))throw new ValidationError('preferences');
        db.prepare('INSERT INTO preferences VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(JSON.stringify({...preferences(),...(body.whatsappEnabled!==undefined?{whatsappEnabled:body.whatsappEnabled}:{}),language:body.language,theme:body.theme,...(body.textSize!==undefined?{textSize:body.textSize,bold:body.bold}:{})}));
        return send(res,200,{ok:true});
      }
      if (/^\/api\/(employees|payruns|leaves)(\/|$)/.test(url.pathname)) {
        const result=hr.handle(url.pathname,body,settings());
        return send(res,result?200:404,result||{error:'route'});
      }
      if (url.pathname === '/api/company') {
        const data = {};
        for (const key of ['name','org','email','phone','address','postal','city','bankgiro','vatNumber']) data[key] = text(body[key] ?? '',key,key === 'name');
        data.vatNumber=data.vatNumber.replace(/[ -]/g,'').toUpperCase();
        if(data.vatNumber&&(!/^SE\d{10}01$/.test(data.vatNumber)||data.vatNumber.slice(2,12)!==data.org.replace('-','')))throw new SalesError('saleVatNumber',400);
        if (data.org && !/^\d{6}-?\d{4}$/.test(data.org)) throw new ValidationError('org');
        if((accounting.hasPosted()||assets.hasActive())&&data.org.replace('-','')!==(settings().org||'').replace('-',''))throw new AccountingError('bookCompanyIdentityLocked');
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new ValidationError('email');
        db.prepare('INSERT INTO settings VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(JSON.stringify(data));
        return send(res,200,{ok:true});
      }
      let kind, data;
      if (url.pathname === '/api/customers') {
        kind = 'customer'; data = {};
        for (const key of ['name','org','email','phone','address','postal','city']) data[key] = text(body[key] ?? '',key,key === 'name');
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new ValidationError('email');
      } else if (url.pathname === '/api/articles') {
        kind = 'article'; data=articleData(body);
        if (![0,6,12,25].includes(data.vat)) throw new ValidationError('vat');
      } else if (url.pathname === '/api/invoices') {
        kind = 'invoice';
        if(body.id!==undefined&&typeof body.id!=='string')throw new ValidationError('id');
        if(body.id&&sales.isIssuedDraft(body.id))throw new SalesError('saleLocked');
        if (!settings().name) throw new ValidationError('company');
        data = { ...invoice(body,get('customer',String(body.customerId))), company:settings(), status:'draft', updated:new Date().toISOString() };
        for(const line of data.lines)if(line.articleId&&!get('article',line.articleId))throw new ValidationError('articleId');
      } else return send(res,404,{error:'route'});
      const id = body.id === undefined ? randomUUID() : text(body.id,'id');
      if (body.id && !get(kind,id)) return send(res,404,{error:'missing'});
      if(kind==='article')inventory.assertArticleChange(id,data);
      db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind,id,JSON.stringify(data));
      send(res,200,{id});
    } catch (error) {
      if(error instanceof FileImportError)send(res,error.status,{error:error.message,...(error.details?{details:error.details}:{})});
      else if(error instanceof SyntaxError&&req.url.startsWith('/api/prints'))send(res,400,{error:'printInvalid'});
      else if(error instanceof PrintError)send(res,error.message==='printMissing'?404:400,{error:error.message});
      else if (error instanceof ClosingError || error instanceof AssetError || error instanceof TimeError || error instanceof DatabaseError || error instanceof HrError || error instanceof AccountingError || error instanceof PurchaseError || error instanceof InventoryError || error instanceof SalesError) send(res,error.status,{error:error.message});
      else if (error instanceof ValidationError) send(res,400,{error:error.message});
      else { console.error(error); send(res,500,{error:'internal'}); }
    }
  });
  return { server,get db(){return db;},get printing(){return printing;},get sessionToken(){return token;},get databaseSession(){return databaseSession;},get dataDir(){return databases.directory(databases.activeId);}, get url() { return `http://127.0.0.1:${server.address().port}`; },
    listen(port=0) { return new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); }); },
    close() { if(closed)return;closed=true;server.closeAllConnections(); server.close(); db.close(); } };
}
if (require.main === module) {
  const app = createApp();
  app.listen(Number(process.env.PORT || 3000)).then(() => console.log(`Sizzla 3000: ${app.url}`));
  for (const event of ['SIGTERM','SIGINT']) process.on(event,() => { app.close(); process.exit(); });
}
module.exports = { createApp };
