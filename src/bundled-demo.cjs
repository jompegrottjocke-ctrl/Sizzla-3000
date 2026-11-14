const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {validate}=require('./security.cjs');
const FILE=path.join(__dirname,'..','examples','demo','Sizzla-3000-Demo-0.28.1.sqlite');
const SHA256='85ea717d4929fe4a233e98cb314dc4de65e93acb7097b683a4f76427f1361778';
function installBundledDemo(directory,reference){
 const bytes=fs.readFileSync(FILE);
 if(createHash('sha256').update(bytes).digest('hex')!==SHA256)throw Error('demoInvalid');
 const target=path.join(directory,'sizzla.sqlite');
 fs.writeFileSync(target,bytes,{flag:'wx',mode:0o600});
 validate(target,reference);
}
module.exports={installBundledDemo};
