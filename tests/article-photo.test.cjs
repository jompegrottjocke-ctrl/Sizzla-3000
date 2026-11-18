const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../src/server.cjs');
const jpeg=(w=10,h=10)=>'data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,8,8,h>>8,h&255,w>>8,w&255,1,255,217]).toString('base64');
async function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-product-photo-'));let app=createApp({dataDir:dir});await app.listen(0);
 const state=()=>fetch(app.url+'/api/state').then(r=>r.json()),post=async(route,body)=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'X-Sizzla-Token':app.sessionToken,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};},run=async(route,body)=>{const r=await post(route,body);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 try{await fn({dir,state,post,run,get app(){return app;},restart:async()=>{app.close();app=createApp({dataDir:dir});await app.listen(0);}});}finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}}
const article={sku:'PHOTO-1',name:'Testartikel',unit:'st',price:'100',vat:25};
test('optional product photos are validated, lazy-loaded, isolated, conflict checked and preserved through restart and restore without financial changes',()=>fixture(async c=>{
 const a=await c.run('articles',{...article,photo:jpeg()});let s=await c.state(),r=s.articles[0];assert.equal(r.hasPhoto,true);assert.equal(r.photo,undefined);assert.ok(!JSON.stringify(s).includes('data:image'));
 const url=(s,r)=>c.app.url+'/api/article-photo/'+r.id+'?session='+s.databaseSession+'&v='+r.photoVersion;
 let response=await fetch(url(s,r));assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/jpeg');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(jpeg().slice(23),'base64'));
 assert.equal((await fetch(c.app.url+'/api/article-photo/'+r.id)).status,409);
 const version=r.photoVersion,fingerprint=s.closing.fingerprint;
 await c.run('articles',{...article,id:a.id,photo:jpeg(20,20),photoVersion:version,recordVersion:r.recordVersion});s=await c.state();r=s.articles[0];assert.notEqual(r.photoVersion,version);assert.equal(s.closing.fingerprint,fingerprint);assert.deepEqual(s.accounting.vouchers,[]);assert.equal(s.inventory.items[0].hasPhoto,true);
 assert.equal((await c.post('articles',{...article,id:a.id,photo:'',photoVersion:version})).status,409);
 assert.equal((await fetch(url(s,{...r,photoVersion:version}))).status,409);
 await c.run('articles',{...article,id:a.id,name:'Nytt namn'});assert.equal((await c.state()).articles[0].photoVersion,r.photoVersion);
 const exported=await fetch(c.app.url+'/api/security/export',{method:'POST',headers:{Origin:c.app.url,'X-Sizzla-Token':c.app.sessionToken,'Content-Type':'application/json'},body:'{"encrypted":false}'});const bytes=Buffer.from(await exported.arrayBuffer());
 await c.run('articles',{...article,id:a.id,photo:'',photoVersion:r.photoVersion});assert.equal((await c.state()).articles[0].hasPhoto,false);
 await c.run('security/import',{file:bytes.toString('base64'),confirm:true});await c.restart();s=await c.state();r=s.articles[0];assert.equal(r.hasPhoto,true);assert.equal((await fetch(url(s,r))).status,200);
 const oldSession=s.databaseSession;const other=await c.run('databases/create',{name:'Annat företag',revision:s.databases.revision});await c.run('databases/activate',{id:other.id,revision:(await c.state()).databases.revision,confirm:true});assert.equal((await c.state()).articles.length,0);assert.equal((await fetch(url({...s,databaseSession:oldSession},r))).status,409);
}));
test('malformed and oversized photos fail atomically and article import preserves existing photos',()=>fixture(async c=>{
 const a=await c.run('articles',{...article,photo:jpeg()}),s=await c.state(),r=s.articles[0];
 for(const photo of [null,123,'https://example.com/photo.jpg','data:image/svg+xml;base64,PHN2Zz4=',jpeg(385,10),'data:image/jpeg;base64,'+'A'.repeat(205000)])assert.equal((await c.post('articles',{...article,id:a.id,name:'Ska inte sparas',photo,photoVersion:r.photoVersion})).status,400);
 assert.deepEqual((await c.state()).articles,s.articles);assert.equal(c.app.db.prepare("SELECT count(*) n FROM records WHERE kind='article_photo'").get().n,1);
 const file=await c.run('file-import/read',{kind:'articles',name:'articles.csv',file:Buffer.from('sku;name;unit\nPHOTO-1;Importerad artikel;st').toString('base64')}),preview=await c.run('file-import/preview',{fileId:file.fileId,sheet:0,mapping:{sku:0,name:1,unit:2},policy:'update'});await c.run('file-import/commit',{previewId:preview.previewId,reviewed:true});assert.equal((await c.state()).articles[0].photoVersion,r.photoVersion);
 const {validateArticlePhotos}=require('../src/article-photo.cjs');c.app.db.prepare("UPDATE records SET data=? WHERE kind='article_photo' AND id=?").run(JSON.stringify({photo:'https://example.com/a',version:r.photoVersion}),a.id);assert.throws(()=>validateArticlePhotos(c.app.db));
}));
