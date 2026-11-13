const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../src/server.cjs'),{encode,decode}=require('../src/sie-codec.cjs'),{parse,write,crc,tokens}=require('../src/sie-format.cjs'),{snapshot}=require('../src/security.cjs');
const source=`#FLAGGA 0
#PROGRAM "Externt program" "1.0"
#FORMAT PC8
#GEN 20261113 "Extern användare"
#SIETYP 4
#FNAMN "Åke & Östen AB"
#ORGNR 559123-4567
#RAR 0 20260101 20261231
#KONTO 1930 "Företagskonto"
#KONTO 2081 "Aktiekapital"
#KONTO 3010 "Försäljning tjänster"
#IB 0 1930 1000.00
#IB 0 2081 -1000.00
#UB 0 1930 1100.01
#UB 0 2081 -1000.00
#RES 0 3010 -100.01
#VER "LEV1" 42 20261101 "Försäljning åäö" 20261102 "Extern signatur"
{
#TRANS 1930 {} 100.01
#TRANS 3010 {} -100.01 20261101 "Tjänst"
}
`;
async function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-sie-'));let app=createApp({dataDir:dir}),token;await app.listen();const state=async()=>{const s=await fetch(app.url+'/api/state').then(r=>r.json());token=s.token;return s;};await state();const post=async(route,body)=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};const run=async(route,body)=>{const r=await post(route,body);assert.equal(r.status,200,JSON.stringify(r));return r;};try{await run('company',{name:'Åke & Östen AB',org:'559123-4567'});await run('accounting/operator',{name:'Anna'});const year=await run('accounting/years',{name:'2026',start:'2026-01-01',end:'2026-12-31'});await fn({dir,post,run,state,year,get app(){return app;},get token(){return token;},restart:async()=>{app.close();app=createApp({dataDir:dir});await app.listen();return state();}});}finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}}
test('PC8 codec, strict amounts/dates/object restrictions and normative CRC retain Swedish texts',()=>{
 const bytes=Buffer.from(Array.from({length:256},(_,i)=>i));assert.deepEqual(encode(decode(bytes)),bytes);assert.equal(crc(['123456789']),3421780262);const p=parse(encode(source));assert.equal(p.company,'Åke & Östen AB');assert.equal(p.vouchers[0].lines[0].amount,10001);
 for(const [find,replace,code]of [['#FLAGGA 0','#FLAGGA 1','sieFlag'],['#FORMAT PC8','#FORMAT UTF-8','sieProfile'],['#SIETYP 4','#SIETYP 1','sieProfile'],['{} 100.01','{1 "A"} 100.01','sieDimensions'],['{} 100.01','{} 100.001','sieAmount'],['{} 100.01','{} 99.01','sieBalance'],['20261101 "Tjänst"','20261102 "Tjänst"','sieTransactionDate'],['#UB 0 1930 1100.01','#UB 0 1930 1101.01','sieTotals'],['#TRANS 1930','#RTRANS 1930','sieUnsupported'],['#GEN 20261113','#GEN 20260230','sieDate']])assert.throws(()=>parse(encode(source.replace(find,replace))),e=>e.message===code,find);
 const y={id:'year',start:'2026-01-01',end:'2026-12-31'},b=write({company:{name:'Åke "Ö" {AB}',org:'559123-4567'},year:y,accounts:[],rows:[],vouchers:[],version:'1'});assert.equal(parse(b).checksum,true);assert.equal(parse(b).company,'Åke "Ö" {AB}');const tampered=Buffer.from(b);tampered[tampered.indexOf(Buffer.from('Sizzla'))]=88;assert.throws(()=>parse(tampered),e=>e.message==='sieChecksum');assert.throws(()=>write({company:{name:'Emoji 😀',org:'559123-4567'},year:y,accounts:[],rows:[],vouchers:[],version:'1'}),e=>e.message==='sieEncoding');
});
test('comparison balances and original quote/brace characters are retained without importing extra years',()=>{
 const b=write({company:{name:'Test {AB}',org:'559123-4567'},year:{id:'y',start:'2026-01-01',end:'2026-12-31'},accounts:[{code:'1930',name:'Bank',type:'asset'}],vouchers:[],rows:[],version:'1',previous:{year:{start:'2025-01-01',end:'2025-12-31'},rows:[{code:'1930',type:'asset',opening:100,balance:200}]}});const p=parse(b);assert.throws(()=>write({company:{name:'Test',org:'559123-4567'},year:{id:'y',start:'2026-01-01',end:'2026-12-31'},accounts:[],vouchers:[],rows:[{code:'1930',type:'asset',opening:0,balance:100000000001}],version:'1'}),e=>e.message==='sieAmount');assert.equal(p.years[1].index,'-1');assert.equal(p.closing[0].amount,200);assert.equal(p.opening[0].amount,100);assert.equal(p.vouchers.length,0);assert.equal(p.checksum,true);
});
test('preview writes nothing, commit preserves provenance and opening balances, replays safely, exports and restores',()=>fixture(async c=>{
 const body={yearId:c.year.id,filename:'Konsult.se',file:encode(source).toString('base64')},p=await c.run('sie/preview',body);assert.equal(p.count,1);assert.equal(p.accountsAdded[0].code,'3010');assert.equal((await c.state()).accounting.vouchers.length,0);assert.equal((await c.post('sie/commit',{previewId:p.previewId,reviewed:true,confirmOrg:'wrong'})).error,'sieReview');
 const done=await c.run('sie/commit',{previewId:p.previewId,reviewed:true,confirmOrg:'5591234567'});assert.equal(done.count,1);assert.equal((await c.run('sie/commit',{previewId:p.previewId,reviewed:true,confirmOrg:'5591234567'})).id,done.id);let s=await c.state(),v=s.accounting.vouchers[0];assert.equal(v.status,'posted');assert.equal(v.number,1);assert.equal(v.importSource.series,'LEV1');assert.equal(v.importSource.number,'42');assert.equal(v.importSource.sign,'Extern signatur');assert.equal(v.actor.name,'Anna');assert.equal(s.accounting.years[0].opening.length,2);assert.equal(s.accounting.accounts.find(a=>a.code==='3010').name,'Försäljning tjänster');assert.equal((await c.post('sie/preview',body)).error,'sieDuplicate');
 let r=await fetch(c.app.url+'/api/sie/export',{method:'POST',headers:{Origin:c.app.url,'Content-Type':'application/json','X-Sizzla-Token':c.token},body:JSON.stringify({yearId:c.year.id,reviewed:true})});assert.equal(r.status,200);const exported=Buffer.from(await r.arrayBuffer()),parsed=parse(exported);assert.equal(parsed.checksum,true);assert.equal(parsed.vouchers.length,1);assert.equal(parsed.vouchers[0].lines.reduce((sum,l)=>sum+l.amount,0),0);assert.equal(parsed.opening.find(l=>l.account==='1930').amount,100000);
 r=await fetch(c.app.url+'/api/sie/imports/'+done.id,{headers:{'X-Sizzla-Token':c.token}});assert.deepEqual(Buffer.from(await r.arrayBuffer()),encode(source));const backup=snapshot(c.app.db);await c.run('security/import',{file:backup.toString('base64'),confirm:true});s=await c.restart();assert.equal(s.sie.history[0].id,done.id);assert.equal(s.accounting.vouchers[0].importSource.number,'42');
 const second=await c.run('databases/create',{name:'Annat',revision:s.databases.revision}),oldToken=c.token;await c.run('databases/activate',{id:second.id,revision:(await c.state()).databases.revision,confirm:true});s=await c.state();assert.equal(s.sie.history.length,0);assert.equal((await c.post('sie/commit',{previewId:p.previewId,reviewed:true,confirmOrg:'5591234567'})).error,'sieExpired');assert.equal((await fetch(c.app.url+'/api/sie/imports/'+done.id,{headers:{'X-Sizzla-Token':oldToken}})).status,409);
}));
test('company/period mismatches, stale reviews, inactive accounts and transaction failures never leave partial bookkeeping',()=>fixture(async c=>{
 const body={yearId:c.year.id,filename:'Konsult.se',file:encode(source).toString('base64')};assert.equal((await c.post('sie/preview',{...body,file:encode(source.replace('559123-4567','559999-9999')).toString('base64')})).error,'sieCompany');const p=await c.run('sie/preview',body);await c.run('accounting/accounts',{code:'3011',name:'Nytt konto'});assert.equal((await c.post('sie/commit',{previewId:p.previewId,reviewed:true,confirmOrg:'5591234567'})).error,'sieConflict');assert.equal((await c.state()).accounting.vouchers.length,0);
 const fresh=await c.run('sie/preview',body);c.app.db.exec("CREATE TRIGGER test_sie_rollback BEFORE INSERT ON ledger_vouchers BEGIN SELECT RAISE(ABORT,'simulated failure'); END");assert.equal((await c.post('sie/commit',{previewId:fresh.previewId,reviewed:true,confirmOrg:'5591234567'})).status,500);let s=await c.state();assert.equal(s.accounting.vouchers.length,0);assert.equal(s.accounting.years[0].opening.length,0);assert.equal(s.accounting.accounts.some(a=>a.code==='3010'),false);assert.equal(s.sie.history.length,0);c.app.db.exec('DROP TRIGGER test_sie_rollback');await c.run('sie/commit',{previewId:fresh.previewId,reviewed:true,confirmOrg:'5591234567'});assert.equal((await c.post('sie/preview',{...body,file:encode(source+'\n').toString('base64')})).error,'sieEmptyYear');
}));
