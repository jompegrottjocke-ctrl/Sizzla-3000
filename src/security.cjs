const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
// Binary v1 envelope: magic | 16-byte salt | 12-byte nonce | 16-byte GCM tag | ciphertext.
const MAGIC=Buffer.from('SIZZLA-BACKUP-1\n');
function password(value){if(typeof value!=='string'||value.length<10||value.length>256)throw new Error('passwordLength');return value;}
function key(value,salt){return crypto.scryptSync(password(value),salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});}
function encrypt(data,value){const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(value,salt),iv);cipher.setAAD(MAGIC);const out=Buffer.concat([cipher.update(data),cipher.final()]);return Buffer.concat([MAGIC,salt,iv,cipher.getAuthTag(),out]);}
function decrypt(data,value){if(!data.subarray(0,MAGIC.length).equals(MAGIC))return data;try{const n=MAGIC.length,decipher=crypto.createDecipheriv('aes-256-gcm',key(value,data.subarray(n,n+16)),data.subarray(n+16,n+28));decipher.setAAD(MAGIC);decipher.setAuthTag(data.subarray(n+28,n+44));return Buffer.concat([decipher.update(data.subarray(n+44)),decipher.final()]);}catch{throw new Error('backupPassword');}}
// VACUUM INTO includes committed WAL pages; copying the live main file alone would lose data.
function snapshot(db){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-backup-'));try{const file=path.join(dir,'backup.sqlite');db.prepare('VACUUM INTO ?').run(file);return fs.readFileSync(file);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
function validate(file,source){let check;try{check=new DatabaseSync(file,{readOnly:true});const version=check.prepare('PRAGMA user_version').get().user_version;if(![4,5,6,7,8,9].includes(version)||check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||check.prepare('PRAGMA foreign_key_check').all().length)throw Error();let expected=source.prepare("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();if(version<9)expected=expected.filter(row=>!row.name.startsWith('closing_'));if(version<8)expected=expected.filter(row=>!row.name.startsWith('time_'));if(version<7)expected=expected.filter(row=>!row.name.startsWith('sales_'));if(version<6)expected=expected.filter(row=>!row.name.startsWith('inventory_'));if(version===4)expected=expected.filter(row=>!row.name.startsWith('print_'));const actual=check.prepare("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error();
for(const {name} of check.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
 const columns=check.prepare(`PRAGMA table_info("${name}")`).all();
 for(const column of ['data','source','snapshot'])if(columns.some(c=>c.name===column))for(const row of check.prepare(`SELECT "${column}" AS json FROM "${name}"`).all()){const value=JSON.parse(row.json);if(!value||typeof value!=='object'||(Array.isArray(value)&&!name.endsWith('_events')))throw Error();}
}
if(version>=5&&check.prepare("SELECT id FROM print_documents WHERE pdf IS NOT NULL AND (typeof(pdf)!='blob' OR length(pdf)>? OR substr(pdf,1,5)!=?) LIMIT 1").get(20*1024*1024,Buffer.from('%PDF-')))throw Error();
const config=JSON.parse(check.prepare('SELECT data FROM app_security WHERE id=1').get()?.data||'{}');
if(config.hash&&(!/^[a-f0-9]{64}$/.test(config.hash)||!/^[a-f0-9]{32}$/.test(config.salt)||![0,5,15,30].includes(config.minutes)))throw Error();}catch{throw new Error('backupInvalid');}finally{check?.close();}}
function initSecurity(db,{dataDir,openDataDirectory}){
 db.exec('CREATE TABLE IF NOT EXISTS app_security(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)');
 // Retain the legacy table for backup compatibility; application locking is disconnected.
 const status=()=>({canOpenFolder:!!openDataDirectory,importPending:fs.existsSync(path.join(dataDir,'pending-import.sqlite'))});
 return {status,handle:async(route,body)=>{
  if(route==='open-folder'){if(!openDataDirectory)throw new Error('desktopOnly');await openDataDirectory();return {ok:true};}
  if(route==='export'){if(typeof body.encrypted!=='boolean')throw new Error('securityInvalid');if(body.encrypted)password(body.password);const data=snapshot(db);return {download:body.encrypted?encrypt(data,body.password):data,extension:body.encrypted?'sizzla':'sqlite'};}
  if(route==='cancel-import'){fs.rmSync(path.join(dataDir,'pending-import.sqlite'),{force:true});return {ok:true};}
  if(route==='import'){
   if(body.confirm!==true||typeof body.file!=='string'||!body.file.length)throw new Error('backupInvalid');
   const data=decrypt(Buffer.from(body.file,'base64'),body.password);
   const dir=fs.mkdtempSync(path.join(dataDir,'.import-'));try{const file=path.join(dir,'check.sqlite');fs.writeFileSync(file,data,{mode:0o600});validate(file,db);fs.writeFileSync(path.join(dataDir,'before-import-'+Date.now()+'.sqlite'),snapshot(db),{mode:0o600});fs.renameSync(file,path.join(dataDir,'pending-import.sqlite'));}finally{fs.rmSync(dir,{recursive:true,force:true});}return {ok:true};
  }
  throw new Error('securityInvalid');
 }};
}
// Apply only before opening the live application connection. Keep a complete last-moment copy.
function applyPending(dataDir){const pending=path.join(dataDir,'pending-import.sqlite');if(!fs.existsSync(pending))return;const file=path.join(dataDir,'sizzla.sqlite'),db=new DatabaseSync(file);try{validate(pending,db);fs.writeFileSync(path.join(dataDir,'before-restart-import-'+Date.now()+'.sqlite'),snapshot(db),{mode:0o600});db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}finally{db.close();}fs.renameSync(pending,file);}
module.exports={initSecurity,applyPending,encrypt,decrypt,snapshot};
