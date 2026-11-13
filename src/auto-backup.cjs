const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {snapshot,validate}=require('./security.cjs');
const DAY=24*60*60*1000;
class BackupError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function initAutoBackup(db,{dataDir,now=()=>Date.now(),openDirectory}){
 const configFile=path.join(dataDir,'automatic-backup.json');
 const defaults=()=>({version:1,id:randomUUID(),enabled:false,directory:'',schedule:'both',keep:10,lastSuccess:null,lastAttempt:null,error:null,warning:null});
 const validTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const validAttempt=v=>v===null||v&&validTime(v.at)&&['manual','daily','exit','switch'].includes(v.reason);
 const validSuccess=(v,id)=>v===null||validAttempt(v)&&typeof v.directory==='string'&&path.isAbsolute(v.directory)&&typeof v.filename==='string'&&v.filename.startsWith('Sizzla-auto-'+id+'-')&&path.basename(v.filename)===v.filename&&v.filename.endsWith('.sqlite')&&Number.isSafeInteger(v.bytes)&&v.bytes>0&&typeof v.hash==='string'&&/^[a-f0-9]{64}$/.test(v.hash);
 let config=defaults(),broken=false;
 try{if(fs.existsSync(configFile)){const c=JSON.parse(fs.readFileSync(configFile,'utf8'));if(c.version!==1||typeof c.id!=='string'||!/^[-a-f0-9]{36}$/.test(c.id)||!validAttempt(c.lastAttempt)||!validSuccess(c.lastSuccess,c.id)||typeof c.enabled!=='boolean'||typeof c.directory!=='string'||!['daily','exit','both'].includes(c.schedule)||!Number.isInteger(c.keep)||c.keep<2||c.keep>100||c.enabled&&(!path.isAbsolute(c.directory)||!c.directory))throw Error();config=c;}}catch{broken=true;}
 function save(next){const tmp=configFile+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(tmp,configFile);config=next;}finally{fs.rmSync(tmp,{force:true});}}
 const folder=()=>path.join(config.directory,'Sizzla-'+config.id);
 function status(){return {...config,folder:config.directory?folder():'',error:broken?'autoSettingsInvalid':config.error,canOpenFolder:!!openDirectory,due:config.enabled&&config.schedule!=='exit'&&(!config.lastSuccess||now()-Date.parse(config.lastSuccess.at)>=DAY)};}
 function configure(body){if(broken)throw new BackupError('autoSettingsInvalid');if(typeof body.enabled!=='boolean'||!['daily','exit','both'].includes(body.schedule)||!Number.isInteger(body.keep)||body.keep<2||body.keep>100||typeof body.directory!=='string'||body.directory.length>2000||body.directory.includes('\0'))throw new BackupError('autoInvalid');const directory=body.directory.trim();if(directory&&!path.isAbsolute(directory)||body.enabled&&(!directory||body.acceptPlain!==true))throw new BackupError('autoConsent');try{if(body.enabled){fs.mkdirSync(directory,{recursive:true});if(!fs.statSync(directory).isDirectory())throw Error();const probe=path.join(directory,'.sizzla-write-'+randomUUID());try{fs.writeFileSync(probe,'',{flag:'wx',mode:0o600});}finally{fs.rmSync(probe,{force:true});}}save({...config,enabled:body.enabled,directory,schedule:body.schedule,keep:body.keep,error:null,warning:null});}catch{throw new BackupError('autoDestination');}return {ok:true};}
 function run(reason='manual'){
  if(broken)throw new BackupError('autoSettingsInvalid');
  if(!config.enabled||!config.directory)throw new BackupError('autoDisabled');
  if(fs.existsSync(path.join(dataDir,'pending-import.sqlite')))throw new BackupError('autoPending');
  const at=new Date(now()).toISOString();let temp;
  try{
   // The selected parent must remain available; never recreate a missing external destination.
   if(!fs.statSync(config.directory).isDirectory())throw Error();
   const dir=folder();if(fs.existsSync(dir)&&fs.lstatSync(dir).isSymbolicLink())throw Error();if(!fs.existsSync(dir))fs.mkdirSync(dir,{mode:0o700});
  }catch(error){config={...config,lastAttempt:{at,reason},error:'autoDestination'};try{save(config);}catch{}throw new BackupError('autoDestination');}
  try{
   const dir=folder(),filename='Sizzla-auto-'+config.id+'-'+at.replace(/[:.]/g,'-')+'-'+randomUUID()+'.sqlite';
   temp=path.join(dir,'.'+filename+'.tmp');const bytes=snapshot(db);if(bytes.length>256*1024*1024)throw new BackupError('autoTooLarge');
   const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   validate(temp,db);const hash=createHash('sha256').update(bytes).digest('hex');fs.renameSync(temp,path.join(dir,filename));temp=null;
   save({...config,lastSuccess:{at,reason,filename,directory:dir,bytes:bytes.length,hash},lastAttempt:{at,reason},error:null,warning:null});
   // Rotate only this database's own named files, only after a new validated copy is durable.
   const pattern=new RegExp('^Sizzla-auto-'+config.id+'-\\d{4}-\\d{2}-\\d{2}T[\\d-]+Z-[a-f0-9-]{36}\\.sqlite$');
   try{const files=fs.readdirSync(dir).filter(name=>pattern.test(name)&&fs.lstatSync(path.join(dir,name)).isFile()).sort().reverse();files.sort((a,b)=>a===filename?-1:b===filename?1:0);for(const file of files.slice(config.keep))fs.unlinkSync(path.join(dir,file));}catch{save({...config,warning:'autoRotation'});}
   return {ok:true,lastSuccess:config.lastSuccess};
  }catch(error){const code=error.message==='backupInvalid'?'backupInvalid':error instanceof BackupError?error.message:'autoWriteFailed';config={...config,lastAttempt:{at,reason},error:code};try{save(config);}catch{}throw new BackupError(code);}
  finally{if(temp)try{fs.rmSync(temp,{force:true});}catch{}}
 }
 function due(reason='daily'){if(!config.enabled||broken)return null;if(reason==='daily'&&(config.schedule==='exit'||!status().due))return null;if(reason!=='daily'&&config.schedule==='daily')return null;if(fs.existsSync(path.join(dataDir,'pending-import.sqlite')))return null;try{return run(reason);}catch(error){return {error:error.message};}}
 function verifyLast(){if(broken||!config.lastSuccess)throw new BackupError('autoNoCopy');const last=config.lastSuccess;try{const file=path.join(last.directory,last.filename);if(path.basename(last.filename)!==last.filename||!fs.lstatSync(file).isFile()||fs.statSync(file).size>256*1024*1024)throw Error();const bytes=fs.readFileSync(file);if(createHash('sha256').update(bytes).digest('hex')!==last.hash)throw Error();validate(file,db);return {ok:true,at:new Date(now()).toISOString(),filename:last.filename,bytes:bytes.length};}catch{throw new BackupError('backupInvalid');}}
 return {status,configure,run,due,verifyLast,async open(){if(!openDirectory)throw new BackupError('desktopOnly');if(!config.directory)throw new BackupError('autoDisabled');try{await openDirectory(folder());return {ok:true};}catch{throw new BackupError('autoDestination');}}};
}
module.exports={initAutoBackup,BackupError,DAY};
