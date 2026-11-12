const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
class DatabaseError extends Error{constructor(message,status=409){super(message);this.status=status;}}
function initDatabases(root){
 const file=path.join(root,'databases.json');
 const validId=id=>id==='default'||typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);
 const label=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>100)throw new DatabaseError('dbNameInvalid',400);return value.trim();};
 function read(){try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<1||!Array.isArray(data.entries)||!data.entries.length||!data.entries.some(e=>e.id==='default')||!data.entries.some(e=>e.id===data.activeId)||new Set(data.entries.map(e=>e.id)).size!==data.entries.length)throw Error();for(const e of data.entries)if(!validId(e.id)||label(e.name)!==e.name)throw Error();return data;}catch{throw new DatabaseError('dbCatalogInvalid',500);}}
 function save(next){const tmp=file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(tmp,file);}finally{fs.rmSync(tmp,{force:true});}}
 const created=!fs.existsSync(file);
 if(created)save({version:1,revision:1,activeId:'default',entries:[{id:'default',name:'Företag 1',created:new Date().toISOString()}]});
 let data=read();
 const directory=id=>{if(!validId(id)||!data.entries.some(e=>e.id===id))throw new DatabaseError('dbMissing',404);if(id==='default')return root;const parent=path.join(root,'databases'),dir=path.join(parent,id);if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink()||fs.existsSync(dir)&&fs.lstatSync(dir).isSymbolicLink())throw new DatabaseError('dbUnavailable');return dir;};
 function check(revision){const latest=read();if(latest.revision!==data.revision||latest.activeId!==data.activeId||revision!==data.revision)throw new DatabaseError('dbConflict');}
 function commit(next){save(next);data=next;}
 return {
  created,
  get activeId(){return data.activeId;},directory,
  state:()=>({activeId:data.activeId,revision:data.revision,entries:data.entries.map(e=>({...e,active:e.id===data.activeId}))}),
  create(body,initialize){check(body.revision);const name=label(body.name);if(data.entries.some(e=>e.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new DatabaseError('dbNameUsed',400);const id=randomUUID(),parent=path.join(root,'databases');if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw new DatabaseError('dbUnavailable');fs.mkdirSync(parent,{recursive:true,mode:0o700});const dir=path.join(parent,id);fs.mkdirSync(dir,{mode:0o700});try{initialize(dir,name);commit({...data,revision:data.revision+1,entries:[...data.entries,{id,name,created:new Date().toISOString()}]});}catch(error){fs.rmSync(dir,{recursive:true,force:true});throw error;}return {id};},
  rename(body){check(body.revision);const name=label(body.name);directory(body.id);if(data.entries.some(e=>e.id!==body.id&&e.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new DatabaseError('dbNameUsed',400);commit({...data,revision:data.revision+1,entries:data.entries.map(e=>e.id===body.id?{...e,name}:e)});return {ok:true};},
  activate(body,open){check(body.revision);if(body.confirm!==true)throw new DatabaseError('dbConfirm',400);const dir=directory(body.id);if(body.id===data.activeId)return {unchanged:true};if(!fs.existsSync(path.join(dir,'sizzla.sqlite'))||!fs.statSync(path.join(dir,'sizzla.sqlite')).size)throw new DatabaseError('dbUnavailable');const candidate=open(dir);try{commit({...data,activeId:body.id,revision:data.revision+1});}catch(error){candidate.db.close();throw error;}return {candidate};}
 };
}
module.exports={initDatabases,DatabaseError};
