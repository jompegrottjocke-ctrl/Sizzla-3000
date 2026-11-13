const HIGH="ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xa0";
function decode(bytes){const chunks=[];for(let i=0;i<bytes.length;i+=8192)chunks.push([...bytes.subarray(i,i+8192)].map(b=>b<128?String.fromCharCode(b):HIGH[b-128]).join(''));return chunks.join('');}
function encode(value){const out=Buffer.allocUnsafe(value.length);let p=0;for(const c of value){const n=c.charCodeAt(0),i=HIGH.indexOf(c);if(n<128)out[p++]=n;else if(i>=0)out[p++]=i+128;else{const e=new Error('sieEncoding');e.character=c;throw e;}}return out.subarray(0,p);}
module.exports={decode,encode};
