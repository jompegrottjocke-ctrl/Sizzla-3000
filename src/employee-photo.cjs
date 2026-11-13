const {ValidationError}=require('./domain.cjs');
// Only bounded JPEG thumbnails are persisted; the UI re-encodes uploaded images.
function employeePhoto(value){
 const bad=()=>{throw new ValidationError('photoInvalid');};
 if(value===undefined||value==='')return '';
 if(typeof value!=='string'||value.length>205000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))bad();
 const bytes=Buffer.from(value.slice(23),'base64');if(bytes.length>150*1024||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)bad();
 let offset=2;while(offset+4<=bytes.length){if(bytes[offset++]!==255)bad();while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===218||marker===217)break;if(offset+2>bytes.length)bad();const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)bad();if([192,193,194].includes(marker)){if(length<8)bad();const h=bytes.readUInt16BE(offset+3),w=bytes.readUInt16BE(offset+5);if(!w||!h||w>384||h>384)bad();return value;}offset+=length;}
 bad();
}
module.exports={employeePhoto};
