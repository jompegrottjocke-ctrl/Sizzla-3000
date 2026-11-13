const {ValidationError,text,decimal}=require('./domain.cjs');
function validGtin(value){if(!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value))return false;const digits=value.slice(0,-1).split('').reverse();return (10-digits.reduce((s,n,i)=>s+Number(n)*(i%2?1:3),0)%10)%10===Number(value.at(-1));}
function articleData(body){const data={name:text(body.name,'name'),sku:text(body.sku??'','sku',false),unit:text(body.unit??'st','unit'),price:decimal(body.price,'price'),vat:Number(body.vat),barcode:text(body.barcode??'','barcode',false,14)};if(![0,6,12,25].includes(data.vat))throw new ValidationError('vat');if(data.barcode&&!validGtin(data.barcode))throw new ValidationError('barcode');return data;}
module.exports={articleData,validGtin};
