const {randomUUID}=require('node:crypto');
const KINDS=['payment_reminder','sales_quote','customer_order','delivery_note','closing_report','asset_report','invoice','payroll','voucher','report','purchase_order','purchase_invoice','inventory_report','inventory_count','sales_invoice','time_report','analysis_report'];
class PrintError extends Error{}
const field=(value,max=200)=>{if(typeof value!=='string'||value.length>max)throw new PrintError('printInvalid');return value;};
function initPrinting(db){
 db.exec(`CREATE TABLE IF NOT EXISTS print_documents(id TEXT PRIMARY KEY,created TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,number TEXT NOT NULL,recipient TEXT NOT NULL,source TEXT NOT NULL,pdf BLOB);
 CREATE TABLE IF NOT EXISTS print_attempts(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES print_documents(id),created TEXT NOT NULL,action TEXT NOT NULL CHECK(action IN ('print','save_pdf')),status TEXT NOT NULL CHECK(status IN ('preparing','dialog','submitted','pdf_saved','cancelled','failed','unknown')),error TEXT NOT NULL DEFAULT '');
 CREATE INDEX IF NOT EXISTS print_attempts_created ON print_attempts(created DESC);
 CREATE TRIGGER IF NOT EXISTS print_document_immutable BEFORE UPDATE ON print_documents BEGIN SELECT RAISE(ABORT,'Print snapshots are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS print_document_preserved BEFORE DELETE ON print_documents BEGIN SELECT RAISE(ABORT,'Print snapshots are preserved'); END;
 `);
 if(db.prepare('PRAGMA user_version').get().user_version<5)db.exec('PRAGMA user_version=5;');
 // A previous process may have stopped with a native dialog open. Never infer success.
 db.prepare("UPDATE print_attempts SET status='unknown' WHERE status IN ('preparing','dialog')").run();
 function create(meta,pdf,allowMissing=false){
  if(!meta||!KINDS.includes(meta.kind)||!meta.source||meta.source.kind!==meta.kind)throw new PrintError('printInvalid');
  const source={kind:meta.kind};for(const key of ['id','employeeId','type','yearId','report','from','to','account','compareFrom','compareTo'])if(meta.source[key]!==undefined&&meta.source[key]!==null)source[key]=field(meta.source[key]);
  if(!source.id&&!(meta.kind==='report'&&source.yearId))throw new PrintError('printInvalid');
  if(!(allowMissing&&pdf===null)&&(!(pdf instanceof Uint8Array)||pdf.length>20*1024*1024||Buffer.from(pdf).subarray(0,5).toString()!=='%PDF-'))throw new PrintError('printPdfFailed');
  const id=randomUUID();db.prepare('INSERT INTO print_documents VALUES(?,?,?,?,?,?,?,?)').run(id,new Date().toISOString(),meta.kind,field(meta.title),field(meta.number,100),field(meta.recipient,1000),JSON.stringify(source),pdf);return id;
 }
 function document(id){field(id,50);const row=db.prepare('SELECT * FROM print_documents WHERE id=?').get(id);if(!row)throw new PrintError('printMissing');return {...row,source:JSON.parse(row.source),pdf:row.pdf===null?null:Buffer.from(row.pdf)};}
 function list(params={}){
  const where=[],args=[];
  for(const [key,column] of [['kind','d.kind'],['status','a.status'],['documentId','d.id']])if(params[key]){where.push(column+'=?');args.push(field(params[key],100));}
  if(params.source){const source=JSON.parse(field(params.source,2048));if(!source||!KINDS.includes(source.kind))throw new PrintError('printInvalid');where.push("d.kind=? AND json_extract(d.source,'$.id') IS ? AND json_extract(d.source,'$.yearId') IS ?");args.push(source.kind,source.id||null,source.yearId||null);if(source.employeeId){where.push("json_extract(d.source,'$.employeeId')=?");args.push(field(source.employeeId));}}
  for(const key of ['from','to'])if(params[key]){if(!/^\d{4}-\d{2}-\d{2}$/.test(params[key])||!Number.isFinite(Date.parse(params[key]+'T00:00:00Z')))throw new PrintError('printInvalid');where.push(`a.created ${key==='from'?'>=':'<'} ?`);const date=new Date(params[key]+'T00:00:00Z');if(key==='to')date.setUTCDate(date.getUTCDate()+1);args.push(date.toISOString());}
  for(const key of ['fromInstant','toInstant'])if(params[key]){const value=field(params[key],32);if(!/^\d{4}-\d\d-\d\dT/.test(value)||!Number.isFinite(Date.parse(value)))throw new PrintError('printInvalid');where.push(`a.created ${key==='fromInstant'?'>=':'<'} ?`);args.push(new Date(value).toISOString());}
  if(params.q){const q=field(params.q).replace(/[\\%_]/g,'\\$&');where.push("(d.title LIKE ? ESCAPE '\\' OR d.number LIKE ? ESCAPE '\\' OR d.recipient LIKE ? ESCAPE '\\')");args.push(...Array(3).fill('%'+q+'%'));}
  const clause=where.length?' WHERE '+where.join(' AND '):'',offset=Number(params.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw new PrintError('printInvalid');
  const from=' FROM print_attempts a JOIN print_documents d ON d.id=a.document_id';
  const rows=db.prepare('SELECT a.id,a.document_id AS documentId,a.created,a.action,a.status,a.error,d.kind,d.title,d.number,d.recipient,d.source,d.created AS snapshotCreated,(d.pdf IS NOT NULL) AS hasPdf'+from+clause+' ORDER BY a.created DESC,a.rowid DESC LIMIT 25 OFFSET ?').all(...args,offset).map(r=>({...r,source:JSON.parse(r.source)}));
  return {rows,total:db.prepare('SELECT count(*) AS total'+from+clause).get(...args).total};
 }
 async function attempt(id,action,driver){
  if(!['print','save_pdf'].includes(action))throw new PrintError('printInvalid');
  const doc=document(id);if(!doc.pdf)throw new PrintError('printPdfFailed');const attemptId=randomUUID();db.prepare('INSERT INTO print_attempts(id,document_id,created,action,status) VALUES(?,?,?,?,?)').run(attemptId,id,new Date().toISOString(),action,'preparing');
  let status,error='';try{const result=await driver(doc,action,()=>db.prepare("UPDATE print_attempts SET status='dialog' WHERE id=? AND status='preparing'").run(attemptId));status=result?.cancelled?'cancelled':action==='print'?'submitted':'pdf_saved';}catch(e){status='failed';error=String(e.message||e).slice(0,500);}
  db.prepare("UPDATE print_attempts SET status=?,error=? WHERE id=? AND status IN ('preparing','dialog')").run(status,error,attemptId);return {id:attemptId,documentId:id,status};
 }
 function captureFailure(meta,action,error){if(!['print','save_pdf'].includes(action))throw new PrintError('printInvalid');const documentId=create(meta,null,true),id=randomUUID();db.prepare('INSERT INTO print_attempts VALUES(?,?,?,?,?,?)').run(id,documentId,new Date().toISOString(),action,'failed',String(error?.message||error).slice(0,500));return {id,documentId,status:'failed'};}
 return {create,document,list,attempt,captureFailure};
}
module.exports={initPrinting,PrintError};
