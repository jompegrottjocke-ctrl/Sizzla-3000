const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { ValidationError, text, decimal, invoice } = require('./domain.cjs');
const { initHr, HrError } = require('./hr.cjs');
const { initAccounting, AccountingError } = require('./accounting.cjs');
const {initPrinting,PrintError}=require('./printing.cjs');
const {initSecurity,applyPending}=require('./security.cjs');
const { initPurchases, PurchaseError } = require('./purchases.cjs');
function createApp({ dataDir = process.env.SIZZLA_DATA_DIR || path.join(__dirname, '..', '.local'), openDataDirectory } = {}) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  applyPending(dataDir);
  const db = new DatabaseSync(path.join(dataDir, 'sizzla.sqlite'));
  let hr, accounting, purchases;
  try {
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS preferences (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);`);
  hr=initHr(db,{payrollHasPosting:id=>accounting?.payrollHasPosting(id)??false});
  accounting=initAccounting(db,{beforeReverse:v=>purchases?.beforeReverse(v),afterReverse:(v,r,reason)=>purchases?.afterReverse(v,r,reason)});
  purchases=initPurchases(db,accounting);
  } catch(error) { db.close(); throw error; }
  const printing=initPrinting(db);
  const security=initSecurity(db,{dataDir,openDataDirectory});
  const token = randomBytes(32).toString('hex');
  const all = kind => db.prepare('SELECT id,data FROM records WHERE kind=? ORDER BY rowid DESC').all(kind).map(row => ({ id: row.id, ...JSON.parse(row.data) }));
  const get = (kind,id) => { const row = db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind,id); return row ? { id, data: JSON.parse(row.data) } : null; };
  const settings = () => JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get()?.data || '{}');
  const preferences = () => JSON.parse(db.prepare('SELECT data FROM preferences WHERE id=1').get()?.data || '{}');
  function send(res, status, value, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
  }
  const server = http.createServer(async (req,res) => {
    try {
      if (req.headers.host !== `127.0.0.1:${server.address().port}`) return send(res,403,{ error:'host' });
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && ['/','/app.js','/printing.js','/printing.css','/security.js','/accessibility.css','/hr.js','/accounting.js','/purchases.js','/purchases.css','/ledger-math.js','/style.css','/hr.css','/accounting.css','/dark.css','/print'].includes(url.pathname)) {
        const file = url.pathname === '/' || url.pathname === '/print' ? 'index.html' : url.pathname.slice(1);
        return send(res,200,fs.readFileSync(path.join(__dirname,'..','public',file)),file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8');
      }
      if(req.method==='GET'&&url.pathname==='/api/prints')return send(res,200,printing.list(Object.fromEntries(url.searchParams)));
      const pdfMatch=url.pathname.match(/^\/api\/prints\/([a-f0-9-]{36})\/pdf$/);
      if(req.method==='GET'&&pdfMatch){const doc=printing.document(pdfMatch[1]);if(!doc.pdf)return send(res,404,{error:'printPdfFailed'});res.setHeader('Content-Disposition',`inline; filename="Sizzla-${doc.id}.pdf"`);return send(res,200,doc.pdf,'application/pdf');}
      if (req.method === 'GET' && url.pathname === '/api/state') return send(res,200,{ token, security:security.status(), preferences:preferences(), company:settings(), customers:all('customer'), articles:all('article'), invoices:all('invoice'),...hr.state(),accounting:accounting.state(),purchases:purchases.state() });
      if (req.method !== 'POST' || req.headers['x-sizzla-token'] !== token || req.headers.origin !== `http://127.0.0.1:${server.address().port}` || !req.headers['content-type']?.startsWith('application/json')) return send(res,403,{ error:'access' });
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > (url.pathname==='/api/security/import'?90*1024*1024:262144)) return send(res,413,{error:'size'}); }
      let body;
      try { body = JSON.parse(raw); } catch { return send(res,400,{error:'json'}); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('data');
      if(url.pathname.startsWith('/api/security/')){
        try{const result=await security.handle(url.pathname.slice('/api/security/'.length),body);
        if(result.download){res.setHeader('Content-Disposition',`attachment; filename="Sizzla-3000-${new Date().toISOString().replace(/[:.]/g,'-')}.${result.extension}"`);return send(res,200,result.download,'application/octet-stream');}
        return send(res,200,result);}catch(error){if(['passwordLength','securityInvalid','desktopOnly','backupPassword','backupInvalid'].includes(error.message))return send(res,400,{error:error.message});throw error;}
      }
      if(url.pathname.startsWith('/api/purchases/')){
        const result=purchases.handle(url.pathname,body,settings());return send(res,result?200:404,result||{error:'route'});
      }
      if(url.pathname.startsWith('/api/accounting/')){
        const result=accounting.handle(url.pathname,body,settings());
        return send(res,result?200:404,result||{error:'route'});
      }
      if(url.pathname==='/api/preferences') {
        if(!['sv','en'].includes(body.language)||!['light','dark','system'].includes(body.theme))throw new ValidationError('preferences');
        if(body.textSize!==undefined&&(![100,125,150,175,200].includes(body.textSize)||typeof body.bold!=='boolean'))throw new ValidationError('preferences');
        db.prepare('INSERT INTO preferences VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(JSON.stringify({...preferences(),language:body.language,theme:body.theme,...(body.textSize!==undefined?{textSize:body.textSize,bold:body.bold}:{})}));
        return send(res,200,{ok:true});
      }
      if (/^\/api\/(employees|payruns|leaves)(\/|$)/.test(url.pathname)) {
        const result=hr.handle(url.pathname,body,settings());
        return send(res,result?200:404,result||{error:'route'});
      }
      if (url.pathname === '/api/company') {
        const data = {};
        for (const key of ['name','org','email','phone','address','postal','city','bankgiro']) data[key] = text(body[key] ?? '',key,key === 'name');
        if (data.org && !/^\d{6}-?\d{4}$/.test(data.org)) throw new ValidationError('org');
        if(accounting.hasPosted()&&data.org.replace('-','')!==(settings().org||'').replace('-',''))throw new AccountingError('bookCompanyIdentityLocked');
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
        kind = 'article'; data = { name:text(body.name,'name'), sku:text(body.sku ?? '','sku',false), unit:text(body.unit ?? 'st','unit'), price:decimal(body.price,'price'), vat:Number(body.vat) };
        if (![0,6,12,25].includes(data.vat)) throw new ValidationError('vat');
      } else if (url.pathname === '/api/invoices') {
        kind = 'invoice';
        if (!settings().name) throw new ValidationError('company');
        data = { ...invoice(body,get('customer',String(body.customerId))), company:settings(), status:'draft', updated:new Date().toISOString() };
      } else return send(res,404,{error:'route'});
      const id = body.id === undefined ? randomUUID() : text(body.id,'id');
      if (body.id && !get(kind,id)) return send(res,404,{error:'missing'});
      db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind,id,JSON.stringify(data));
      send(res,200,{id});
    } catch (error) {
      if(error instanceof SyntaxError&&req.url.startsWith('/api/prints'))send(res,400,{error:'printInvalid'});
      else if(error instanceof PrintError)send(res,error.message==='printMissing'?404:400,{error:error.message});
      else if (error instanceof HrError || error instanceof AccountingError || error instanceof PurchaseError) send(res,error.status,{error:error.message});
      else if (error instanceof ValidationError) send(res,400,{error:error.message});
      else { console.error(error); send(res,500,{error:'internal'}); }
    }
  });
  return { server, db, printing, get url() { return `http://127.0.0.1:${server.address().port}`; },
    listen(port=0) { return new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); }); },
    close() { server.closeAllConnections(); server.close(); db.close(); } };
}
if (require.main === module) {
  const app = createApp();
  app.listen(Number(process.env.PORT || 3000)).then(() => console.log(`Sizzla 3000: ${app.url}`));
  for (const event of ['SIGTERM','SIGINT']) process.on(event,() => { app.close(); process.exit(); });
}
module.exports = { createApp };
