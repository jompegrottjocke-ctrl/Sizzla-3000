const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
// Binary v1 envelope: magic | 16-byte salt | 12-byte nonce | 16-byte GCM tag | ciphertext.
const MAGIC=Buffer.from('SIZZLA-BACKUP-1\n');
function password(value,minimum=10){if(typeof value!=='string'||value.length<minimum||value.length>256)throw new Error(minimum===4?'lockPasswordLength':'passwordLength');return value;}
function key(value,salt,minimum=10){return crypto.scryptSync(password(value,minimum),salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});}
function encrypt(data,value){const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(value,salt),iv);cipher.setAAD(MAGIC);const out=Buffer.concat([cipher.update(data),cipher.final()]);return Buffer.concat([MAGIC,salt,iv,cipher.getAuthTag(),out]);}
function decrypt(data,value){if(!data.subarray(0,MAGIC.length).equals(MAGIC))return data;try{const n=MAGIC.length,decipher=crypto.createDecipheriv('aes-256-gcm',key(value,data.subarray(n,n+16)),data.subarray(n+16,n+28));decipher.setAAD(MAGIC);decipher.setAuthTag(data.subarray(n+28,n+44));return Buffer.concat([decipher.update(data.subarray(n+44)),decipher.final()]);}catch{throw new Error('backupPassword');}}
// VACUUM INTO includes committed WAL pages; copying the live main file alone would lose data.
function snapshot(db){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-backup-'));try{const file=path.join(dir,'backup.sqlite');db.prepare('VACUUM INTO ?').run(file);return fs.readFileSync(file);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
function validate(file,source){let check;try{check=new DatabaseSync(file,{readOnly:true});const version=check.prepare('PRAGMA user_version').get().user_version;if(version!==4||check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||check.prepare('PRAGMA foreign_key_check').all().length)throw Error();const expected=source.prepare("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();const actual=check.prepare("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error();
for(const {name} of check.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
 const columns=check.prepare(`PRAGMA table_info("${name}")`).all();
 if(columns.some(c=>c.name==='data'))for(const row of check.prepare(`SELECT data FROM "${name}"`).all()){const value=JSON.parse(row.data);if(!value||typeof value!=='object'||(Array.isArray(value)&&!name.endsWith('_events')))throw Error();}
}
const config=JSON.parse(check.prepare('SELECT data FROM app_security WHERE id=1').get()?.data||'{}');
if(config.hash&&(!/^[a-f0-9]{64}$/.test(config.hash)||!/^[a-f0-9]{32}$/.test(config.salt)||![0,5,15,30].includes(config.minutes)))throw Error();}catch{throw new Error('backupInvalid');}finally{check?.close();}}
function initSecurity(db,{dataDir,openDataDirectory}){
 db.exec('CREATE TABLE IF NOT EXISTS app_security(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)');
 const read=()=>JSON.parse(db.prepare('SELECT data FROM app_security WHERE id=1').get()?.data||'{}');
 let config=read(),locked=!!config.hash,lastActivity=Date.now(),nextAttempt=0;
 const enabled=()=>!!config.hash;
 const lock=()=>{if(!enabled())return false;locked=true;return true;};
 const status=()=>{if(enabled()&&config.minutes&&Date.now()-lastActivity>=config.minutes*60000)lock();return {enabled:enabled(),locked,minutes:config.minutes||0,canOpenFolder:!!openDataDirectory,importPending:fs.existsSync(path.join(dataDir,'pending-import.sqlite'))};};
 const verify=value=>{if(Date.now()<nextAttempt)throw new Error('passwordWait');if(typeof value!=='string'||value.length>256)throw new Error('passwordWrong');nextAttempt=Date.now()+1500;const valid=crypto.timingSafeEqual(key(value,Buffer.from(config.salt,'hex'),4),Buffer.from(config.hash,'hex'));if(!valid)throw new Error('passwordWrong');nextAttempt=0;};
 return {status,lock,handle:async(route,body)=>{
  if(route==='status')return status();
  if(route==='unlock'){if(enabled())verify(body.password);locked=false;lastActivity=Date.now();return {ok:true};}
  if(status().locked)throw new Error('locked');
  if(route==='activity'){lastActivity=Date.now();return {ok:true};}
  if(route==='lock'){lock();return {ok:true};}
  if(route==='configure'){
   if(enabled())verify(body.currentPassword);
   if(typeof body.enabled!=='boolean'||![0,5,15,30].includes(body.minutes))throw new Error('securityInvalid');
   let next={minutes:body.minutes};if(body.enabled){const salt=crypto.randomBytes(16);next={...next,salt:salt.toString('hex'),hash:key(body.password,salt,4).toString('hex')};}
   db.prepare('INSERT INTO app_security VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(JSON.stringify(next));config=next;lastActivity=Date.now();return {ok:true};
  }
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
