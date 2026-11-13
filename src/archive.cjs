const {randomUUID,createHash}=require('node:crypto');
const {text}=require('./domain.cjs');
const MAX_FILE=10*1024*1024;
const areas=['bank','receivables','payables','vat','payroll','assets','inventory','accruals','equity'];
class ArchiveError extends Error{constructor(code,status=400){super(code);this.status=status;}}
const fail=k=>{throw new ArchiveError(k);};
function fileType(bytes,name){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>MAX_FILE)fail('archiveSize');const ext=String(name).split('.').at(-1).toLowerCase();
 if(ext==='pdf'&&bytes.subarray(0,5).toString()==='%PDF-'&&bytes.subarray(-2048).includes(Buffer.from('%%EOF')))return 'application/pdf';
 if(ext==='png'&&bytes.length>=45&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.subarray(12,16).toString()==='IHDR'&&bytes.subarray(-8,-4).toString()==='IEND'){
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);if(w&&h&&w<=20000&&h<=20000&&w*h<=100000000)return 'image/png';
 }
 if(['jpg','jpeg'].includes(ext)&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){
  let p=2;while(p+4<bytes.length){if(bytes[p++]!==255)break;while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===218||marker===217)break;const n=bytes.readUInt16BE(p);if(n<2||p+n>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&n>=8){const h=bytes.readUInt16BE(p+3),w=bytes.readUInt16BE(p+5);if(w&&h&&w<=20000&&h<=20000&&w*h<=100000000)return 'image/jpeg';break;}p+=n;}
 }
 fail('archiveType');
}
function validateArchive(db){for(const d of db.prepare('SELECT * FROM archive_documents').iterate()){const bytes=Buffer.from(d.content);if(bytes.length!==d.size||fileType(bytes,d.filename)!==d.mime||createHash('sha256').update(bytes).digest('hex')!==d.hash)fail('archiveIntegrity');}}
function archiveManifest(db){if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='archive_documents'").get())return [];return db.prepare('SELECT d.id,d.filename,d.mime,d.hash,d.size,l.target_kind AS kind,l.target_id AS targetId,l.area,l.data FROM archive_documents d JOIN archive_links l ON l.document_id=d.id WHERE l.active=1 ORDER BY d.id,l.id').all().map(r=>({...r,data:JSON.parse(r.data)}));}
function initArchive(db,accounting){db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS archive_documents(id TEXT PRIMARY KEY,created TEXT NOT NULL,filename TEXT NOT NULL,mime TEXT NOT NULL,hash TEXT NOT NULL UNIQUE,size INTEGER NOT NULL,content BLOB NOT NULL);
 CREATE TABLE IF NOT EXISTS archive_metadata(document_id TEXT PRIMARY KEY REFERENCES archive_documents(id),revision INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS archive_links(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES archive_documents(id),target_kind TEXT NOT NULL,target_id TEXT NOT NULL,area TEXT NOT NULL,active INTEGER NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS archive_active_link ON archive_links(document_id,target_kind,target_id,area) WHERE active=1;
 CREATE TABLE IF NOT EXISTS archive_events(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES archive_documents(id),at TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS archive_original_update BEFORE UPDATE ON archive_documents BEGIN SELECT RAISE(ABORT,'Archive originals are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS archive_original_delete BEFORE DELETE ON archive_documents BEGIN SELECT RAISE(ABORT,'Archive originals are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS archive_link_target BEFORE UPDATE OF document_id,target_kind,target_id,area ON archive_links BEGIN SELECT RAISE(ABORT,'Archive link targets are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS archive_link_delete BEFORE DELETE ON archive_links BEGIN SELECT RAISE(ABORT,'Archive link history is preserved'); END;
 CREATE TRIGGER IF NOT EXISTS archive_event_update BEFORE UPDATE ON archive_events BEGIN SELECT RAISE(ABORT,'Archive history is immutable'); END;
 CREATE TRIGGER IF NOT EXISTS archive_event_delete BEFORE DELETE ON archive_events BEGIN SELECT RAISE(ABORT,'Archive history is preserved'); END;
 COMMIT;`);if(db.prepare('PRAGMA user_version').get().user_version<10)db.exec('PRAGMA user_version=10');
 const metadata=id=>{const r=db.prepare('SELECT d.id,d.created,d.filename,d.mime,d.hash,d.size,m.revision,m.data FROM archive_documents d JOIN archive_metadata m ON m.document_id=d.id WHERE d.id=?').get(String(id));if(!r)throw new ArchiveError('archiveMissing',404);return {...r,...JSON.parse(r.data),data:undefined};};
 const links=id=>db.prepare('SELECT * FROM archive_links WHERE document_id=? ORDER BY rowid DESC').all(id).map(l=>({...l,active:!!l.active,data:JSON.parse(l.data)}));
 const detail=id=>({...metadata(id),links:links(id),events:db.prepare('SELECT * FROM archive_events WHERE document_id=? ORDER BY rowid DESC').all(id).map(e=>({...e,data:JSON.parse(e.data)}))});
 const event=(id,action,data)=>db.prepare('INSERT INTO archive_events VALUES(?,?,?,?)').run(randomUUID(),id,new Date().toISOString(),JSON.stringify({action,...data,actor:accounting.operator(),programVersion:require('../package.json').version}));
 function target(t){if(!t||typeof t.id!=='string')fail('archiveTarget');let r,label;
  if(t.kind==='voucher'){r=accounting.state().vouchers.find(v=>v.id===t.id&&v.status==='posted');label=r?`A${r.number} · ${r.date} · ${r.description}`:'';}
  else if(t.kind==='purchaseInvoice'){r=db.prepare('SELECT revision,data,number FROM purchase_invoices WHERE id=?').get(t.id);label=r?`LF${r.number} · ${JSON.parse(r.data).invoiceNo||''}`:'';}
  else if(t.kind==='asset'){const row=db.prepare("SELECT data FROM records WHERE kind='fixed_asset' AND id=?").get(t.id);r=row?JSON.parse(row.data):null;label=r?`${r.code} · ${r.name}`:'';}
  else if(t.kind==='closingCheck'){const row=db.prepare('SELECT revision,data,year_id FROM closing_cases WHERE id=?').get(t.id);r=row?{...row,...JSON.parse(row.data)}:null;if(r?.status!=='draft'||!areas.includes(t.area))fail('archiveTarget');label=r?accounting.state().years.find(y=>y.id===r.year_id)?.name||'':'';}
  if(!r)fail('archiveTarget');if(r.revision!==t.revision)throw new ArchiveError('archiveConflict',409);return {kind:t.kind,id:t.id,area:t.kind==='closingCheck'?t.area:'',label,revision:r.revision};
 }
 function link(id,input){metadata(id);const t=target(input),existing=db.prepare('SELECT id FROM archive_links WHERE document_id=? AND target_kind=? AND target_id=? AND area=? AND active=1').get(id,t.kind,t.id,t.area);if(existing)return existing.id;
  const linkId=randomUUID(),data={label:t.label,targetRevision:t.revision,created:new Date().toISOString(),actor:accounting.operator()};db.prepare('INSERT INTO archive_links VALUES(?,?,?,?,?,1,1,?)').run(linkId,id,t.kind,t.id,t.area,JSON.stringify(data));event(id,'linked',{linkId,target:t});return linkId;
 }
 return {summary:()=>({count:db.prepare('SELECT COUNT(*) n FROM archive_documents').get().n}),detail,file(id){const meta=metadata(id),r=db.prepare('SELECT content FROM archive_documents WHERE id=?').get(id),bytes=Buffer.from(r.content);if(createHash('sha256').update(bytes).digest('hex')!==meta.hash)fail('archiveIntegrity');return {...meta,bytes};},list(params={}){let rows=db.prepare('SELECT id FROM archive_documents ORDER BY rowid DESC').all().map(r=>metadata(r.id));const q=String(params.q||'').trim().toLocaleLowerCase();if(q.length>200)fail('archiveSearch');if(q)rows=rows.filter(r=>[r.title,r.note,r.filename].some(v=>String(v).toLocaleLowerCase().includes(q)));if(params.unlinked==='1')rows=rows.filter(r=>!links(r.id).some(l=>l.active));if(params.kind&&params.targetId)rows=rows.filter(r=>links(r.id).some(l=>l.active&&l.target_kind===params.kind&&l.target_id===params.targetId&&(!params.area||l.area===params.area)));const offset=Number(params.offset||0);if(!Number.isSafeInteger(offset)||offset<0)fail('archiveSearch');return {total:rows.length,rows:rows.slice(offset,offset+25).map(r=>({...r,linkCount:links(r.id).filter(l=>l.active).length}))};},handle(route,body){db.exec('BEGIN IMMEDIATE');try{let result;
  if(route==='/api/archive/upload'){
   const filename=text(body.filename,'archiveFilename',true,200);if(/[\\/\x00-\x1f]/.test(filename))fail('archiveFilename');if(typeof body.file!=='string'||body.file.length>Math.ceil(MAX_FILE/3)*4||!body.file.length||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.file)||body.file.length%4)fail('archiveSize');const bytes=Buffer.from(body.file,'base64'),mime=fileType(bytes,filename),hash=createHash('sha256').update(bytes).digest('hex');let d=db.prepare('SELECT id FROM archive_documents WHERE hash=?').get(hash),duplicate=!!d;
   if(!d){d={id:randomUUID()};const data={title:text(body.title||filename,'archiveTitle',true,200),note:text(body.note||'','archiveNote',false,2000)};db.prepare('INSERT INTO archive_documents VALUES(?,?,?,?,?,?,?)').run(d.id,new Date().toISOString(),filename,mime,hash,bytes.length,bytes);db.prepare('INSERT INTO archive_metadata VALUES(?,1,?)').run(d.id,JSON.stringify(data));event(d.id,'imported',{filename,mime,hash,size:bytes.length});}
   if(body.target)link(d.id,body.target);result={id:d.id,duplicate};
  }else if(route==='/api/archive/link'){result={id:body.id,linkId:link(body.id,body.target)};
  }else if(route==='/api/archive/unlink'){
   metadata(body.id);const l=links(body.id).find(l=>l.id===body.linkId);if(!l||!l.active||l.revision!==body.revision)throw new ArchiveError('archiveConflict',409);const actor=accounting.requireOperator(),reason=text(body.reason,'archiveReason',true,1000),data={...l.data,unlinkedAt:new Date().toISOString(),unlinkedBy:actor,reason};db.prepare('UPDATE archive_links SET active=0,revision=revision+1,data=? WHERE id=?').run(JSON.stringify(data),l.id);event(body.id,'unlinked',{linkId:l.id,reason,target:{kind:l.target_kind,id:l.target_id,area:l.area}});result={id:body.id};
  }else if(route==='/api/archive/metadata'){
   const before=metadata(body.id);if(before.revision!==body.revision)throw new ArchiveError('archiveConflict',409);const after={title:text(body.title,'archiveTitle',true,200),note:text(body.note||'','archiveNote',false,2000)};db.prepare('UPDATE archive_metadata SET revision=revision+1,data=? WHERE document_id=?').run(JSON.stringify(after),body.id);event(body.id,'metadata',{before:{title:before.title,note:before.note},after});result={id:body.id};
  }else throw new ArchiveError('archiveMissing',404);
  db.exec('COMMIT');return result;
 }catch(e){db.exec('ROLLBACK');throw e;}}};
}
module.exports={initArchive,ArchiveError,fileType,validateArchive,archiveManifest,MAX_FILE};
