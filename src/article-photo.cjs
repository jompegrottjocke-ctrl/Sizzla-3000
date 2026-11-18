const {randomUUID}=require('node:crypto');
const {employeePhoto:validatePhoto}=require('./employee-photo.cjs');
function photoMetadata(db){return new Map(db.prepare("SELECT id,json_extract(data,'$.version') AS version FROM records WHERE kind='article_photo'").all().map(r=>[r.id,{hasPhoto:true,photoVersion:r.version}]));}
function readPhoto(db,id){const row=db.prepare("SELECT data FROM records WHERE kind='article_photo' AND id=?").get(id);if(!row)return null;const data=JSON.parse(row.data);return {...data,photo:validatePhoto(data.photo)};}
function writePhoto(db,id,photo){if(!photo){db.prepare("DELETE FROM records WHERE kind='article_photo' AND id=?").run(id);return;}db.prepare("INSERT INTO records VALUES('article_photo',?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(id,JSON.stringify({photo,version:randomUUID()}));}
function validateArticlePhotos(db){for(const r of db.prepare("SELECT id,data FROM records WHERE kind='article_photo'").all()){const data=JSON.parse(r.data);if(!db.prepare("SELECT id FROM records WHERE kind='article' AND id=?").get(r.id)||typeof data.version!=='string'||!/^[a-f0-9-]{36}$/.test(data.version)||!validatePhoto(data.photo))throw Error('photoInvalid');}}
module.exports={photoMetadata,readPhoto,writePhoto,validatePhoto,validateArticlePhotos};
