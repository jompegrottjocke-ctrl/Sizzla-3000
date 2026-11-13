(function(root){
 function whatsappPhone(value){
  if(typeof value!=='string'||!/^[+\d\s().-]+$/.test(value))return null;
  let phone=value.replace(/[\s().-]/g,'');
  if(/^07\d{8}$/.test(phone))phone='+46'+phone.slice(1);
  if(phone.startsWith('00'))phone='+'+phone.slice(2);
  if(!/^\+[1-9]\d{7,14}$/.test(phone))return null;
  return phone.slice(1);
 }
 if(typeof module==='object'&&module.exports)module.exports={whatsappPhone};else root.whatsappPhone=whatsappPhone;
})(typeof globalThis!=='undefined'?globalThis:this);
