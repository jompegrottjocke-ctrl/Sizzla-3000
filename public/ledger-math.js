function ledgerBalances(year, vouchers, accounts, through = year.end, from = year.start) {
  const rows = new Map(accounts.map(a => [a.code,{...a,opening:0,debit:0,credit:0,balance:0}]));
  const ensure = line => {
    if (!rows.has(line.account)) rows.set(line.account,{code:line.account,name:line.name,nameEn:line.nameEn,type:line.type,opening:0,debit:0,credit:0,balance:0});
    return rows.get(line.account);
  };
  for (const line of year.opening || []) ensure(line).opening += line.debit - line.credit;
  for (const voucher of vouchers.filter(v => v.yearId === year.id && v.status === 'posted' && v.date <= through)) {
    for (const line of voucher.lines) {
      const row = ensure(line);
      if (voucher.date < from) row.opening += line.debit - line.credit;
      else { row.debit += line.debit; row.credit += line.credit; }
    }
  }
  return [...rows.values()].map(row => ({...row,balance:row.opening+row.debit-row.credit})).sort((a,b)=>a.code.localeCompare(b.code));
}

if(typeof module!=='undefined'&&module.exports)module.exports={ledgerBalances};
