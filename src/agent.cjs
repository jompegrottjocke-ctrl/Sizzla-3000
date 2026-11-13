const {randomUUID}=require('node:crypto');
const {text,ValidationError}=require('./domain.cjs');
const scopes=['accounting','sales','inventory','payroll','drafts'];
class AgentError extends Error{constructor(code,status=400){super(code);this.status=status;}}
const invalid=()=>{throw new ValidationError('agentInvalid');};
function initAgent(db,accounting){
 const config=()=>JSON.parse(db.prepare("SELECT data FROM records WHERE kind='ai_agent_config' AND id='active'").get()?.data||JSON.stringify({revision:0,enabled:false,provider:'external',endpoint:'',model:'',permissions:Object.fromEntries(scopes.map(s=>[s,false]))}));
 const event=(action,data)=>db.prepare('INSERT INTO records VALUES(?,?,?)').run('ai_agent_event',randomUUID(),JSON.stringify({at:new Date().toISOString(),action,actor:accounting.operator(),programVersion:require('../package.json').version,...data}));
 return {state(){return {config:config(),connected:false,available:false,history:db.prepare("SELECT id,data FROM records WHERE kind='ai_agent_event' ORDER BY rowid DESC LIMIT 100").all().map(r=>({id:r.id,...JSON.parse(r.data)}))};},handle(route,body){
  db.exec('BEGIN IMMEDIATE');try{const before=config();if(body.revision!==before.revision)throw new AgentError('agentConflict',409);let result;
   if(route==='/api/agent/config'){
    if(Object.keys(body).some(k=>!['revision','enabled','provider','endpoint','model','permissions'].includes(k))||typeof body.enabled!=='boolean'||!['external','selfHosted'].includes(body.provider)||!body.permissions||typeof body.permissions!=='object'||Array.isArray(body.permissions)||Object.keys(body.permissions).length!==scopes.length||scopes.some(s=>typeof body.permissions[s]!=='boolean'))invalid();
    const endpoint=text(body.endpoint??'','agentEndpoint',false,500),model=text(body.model??'','agentModel',false,120);
    if(endpoint){let url;try{url=new URL(endpoint);}catch{throw new AgentError('agentEndpoint');}if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new AgentError('agentEndpoint');}
    if(body.enabled&&(!endpoint||!model))throw new AgentError('agentSetup');
    const next={revision:before.revision+1,enabled:body.enabled,provider:body.provider,endpoint,model,permissions:Object.fromEntries(scopes.map(s=>[s,body.permissions[s]]))};
    db.prepare("INSERT INTO records VALUES('ai_agent_config','active',?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(JSON.stringify(next));event('saved',{before,after:next});result={ok:true};
   }else if(route==='/api/agent/check'){
    event('unavailable',{message:'Agent transport is not implemented; no connection attempted and no data sent.'});result={available:false,connected:false,message:'agentLater'};
   }else throw new AgentError('agentMissing',404);
   db.exec('COMMIT');return result;
  }catch(e){db.exec('ROLLBACK');throw e;}
 }};
}
module.exports={initAgent,AgentError};
