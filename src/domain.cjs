class ValidationError extends Error {}
const fail = message => { throw new ValidationError(message); };
function text(value, label, required = true, max = 200) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(label);
  return value.trim();
}
function decimal(value, label, { min = 0, max = 100000000 } = {}) {
  if (typeof value !== 'string' && typeof value !== 'number') fail(label);
  const input = String(value).replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(input)) fail(label);
  const [whole, fraction = ''] = input.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result < min || result > max) fail(label);
  return result;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0,4)) < 1900) fail('date');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) fail('date');
  return value;
}
function invoice(input, customer) {
  if (!customer) fail('customer');
  const issued = date(input.date);
  const due = date(input.due);
  if (due < issued) fail('due');
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 100) fail('lines');
  const lines = input.lines.map(line => {
    const description = text(line.description, 'description');
    const quantity = decimal(line.quantity, 'quantity', { min: 1, max: 10000000 });
    const price = decimal(line.price, 'price');
    const vat = Number(line.vat);
    if (![0, 6, 12, 25].includes(vat)) fail('vat');
    const net = Math.round(quantity * price / 100);
    const tax = Math.round(net * vat / 100);
    return { description,unit:text(line.unit??'st','unit'),quantity,price,vat,net,tax };
  });
  const net = lines.reduce((sum,line) => sum + line.net, 0);
  const tax = lines.reduce((sum,line) => sum + line.tax, 0);
  if (net + tax > 10000000000) fail('total');
  return { customerId: customer.id, customer: customer.data, date: issued, due, lines,
    note: text(input.note ?? '', 'note', false, 2000), net, tax, total: net + tax, currency: 'SEK' };
}
module.exports = { ValidationError, text, decimal, date, invoice };
