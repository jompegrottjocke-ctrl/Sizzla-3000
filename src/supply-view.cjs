const summary=d=>{const {lines,company,received,...rest}=d;return {...rest,supplier:{name:d.supplier.name}};};
function supplyView(data){return {suppliers:data.suppliers,orders:data.orders.map(summary),invoices:data.invoices.map(summary)};}
module.exports={supplyView};
