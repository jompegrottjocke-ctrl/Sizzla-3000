const { randomUUID } = require('node:crypto');
const { ValidationError, text, decimal } = require('./domain.cjs');
class AccountingError extends Error {
  constructor(code, status = 409) { super(code); this.status = status; }
}
const invalid = key => { throw new ValidationError(key); };
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid('bookDate');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || +value.slice(0, 4) < 1900) invalid('bookDate');
  return value;
}
const accountType = code => code[0] === '1' ? 'asset' : code[0] === '2' ? 'liability' : code[0] === '3' || /^(80|81|82|83)/.test(code) ? 'income' : 'expense';
function lastFiscalDay(start) {
  const d=new Date(start),month=d.getUTCMonth()+18,year=d.getUTCFullYear();
  const day=Math.min(d.getUTCDate(),new Date(Date.UTC(year,month+1,0)).getUTCDate());
  const limit=new Date(Date.UTC(year,month,day));limit.setUTCDate(limit.getUTCDate()-1);
  return limit.toISOString().slice(0,10);
}
const starterAccounts = [
  ['3960','Valutakursvinster på rörelsefordringar och rörelseskulder','Exchange gains on trade receivables and payables'],['7960','Valutakursförluster på rörelsefordringar och rörelseskulder','Exchange losses on trade receivables and payables'],
  ['1220','Inventarier och verktyg','Equipment and tools'],['1229','Ackumulerade avskrivningar på inventarier','Accumulated equipment depreciation'],['7832','Avskrivningar på inventarier och verktyg','Equipment depreciation'],['3973','Vinst vid avyttring av maskiner och inventarier','Gain on equipment disposal'],['7973','Förlust vid avyttring av maskiner och inventarier','Loss on equipment disposal'],
  ['1510','Kundfordringar','Trade receivables'],['1610','Fordringar hos anställda','Employee receivables'],['1910','Kassa','Cash'],['1930','Företagskonto','Business bank account'],
  ['2010','Eget kapital, enskild firma','Owner equity, sole trader'],['2019','Årets resultat, enskild firma','Current year result, sole trader'],['2081','Aktiekapital','Share capital'],['2091','Balanserat resultat','Retained earnings'],['2099','Årets resultat','Current year result'],
  ['2440','Leverantörsskulder','Trade payables'],['2611','Utgående moms 25 %','Output VAT 25%'],['2621','Utgående moms 12 %','Output VAT 12%'],['2631','Utgående moms 6 %','Output VAT 6%'],['2641','Ingående moms','Input VAT'],['2650','Redovisningskonto för moms','VAT settlement'],
  ['2710','Personalskatt','Payroll tax withheld'],['2731','Avräkning sociala avgifter','Employer contributions payable'],['2910','Upplupna löner','Wages payable'],
  ['3001','Försäljning, 25 % moms','Sales, 25% VAT'],['3002','Försäljning, 12 % moms','Sales, 12% VAT'],['3003','Försäljning, 6 % moms','Sales, 6% VAT'],['3044','Momsfri försäljning','VAT-exempt sales'],
  ['3740','Öres- och kronutjämning','Rounding differences'],['4000','Inköp av varor','Purchases of goods'],['5010','Lokalhyra','Rent'],['5410','Förbrukningsinventarier','Low-value equipment'],['5800','Resekostnader','Travel expenses'],['6110','Kontorsmaterial','Office supplies'],['6210','Telekommunikation','Telecommunications'],['6540','IT-tjänster','IT services'],['6570','Bankkostnader','Bank charges'],
  ['7010','Löner till kollektivanställda','Wages'],['7210','Löner till tjänstemän','Salaries'],['7390','Övriga kostnadsersättningar och förmåner','Other employee expenses and benefits'],['7510','Arbetsgivaravgifter','Employer contributions'],['8310','Ränteintäkter','Interest income'],['8410','Räntekostnader','Interest expense'],['8999','Årets resultat, omföring','Result transfer']
];
function validateLines(input, accounts, opening = false) {
  if (!Array.isArray(input) || input.length < 2 || input.length > 500) invalid('bookLines');
  let debit = 0, credit = 0;const byCode=new Map(accounts.map(a=>[a.code,a]));
  const lines = input.map(line => {
    if (!line || typeof line !== 'object') invalid('bookLines');
    const account = byCode.get(line.account);
    if (!account || !account.active || (opening && !['asset','liability'].includes(account.type))) invalid('bookAccount');
    const d = decimal(line.debit ?? '0','bookAmount',{max:100000000000});
    const c = decimal(line.credit ?? '0','bookAmount',{max:100000000000});
    if ((d > 0) === (c > 0)) invalid('bookOneSide');
    debit += d; credit += c;
    return { account:account.code, name:account.name, nameEn:account.nameEn, type:account.type, debit:d, credit:c, note:text(line.note ?? '', 'bookLineNote', false, 300) };
  });
  if (debit !== credit) invalid('bookUnbalanced');
  return lines;
}
const {ledgerBalances:balances}=require('../public/ledger-math.js');
function initAccounting(db, { beforeReverse = () => {}, afterReverse = () => {} } = {}) {
  db.exec('BEGIN IMMEDIATE');
  try {
  db.exec(`CREATE TABLE IF NOT EXISTS ledger_accounts(code TEXT PRIMARY KEY, name TEXT NOT NULL, name_en TEXT NOT NULL, active INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS ledger_years(id TEXT PRIMARY KEY, start TEXT NOT NULL UNIQUE, end TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ledger_vouchers(id TEXT PRIMARY KEY,year_id TEXT NOT NULL REFERENCES ledger_years(id),number INTEGER,status TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,corrects TEXT REFERENCES ledger_vouchers(id),reversed_by TEXT REFERENCES ledger_vouchers(id),source_kind TEXT,source_id TEXT,UNIQUE(year_id,number));
    CREATE UNIQUE INDEX IF NOT EXISTS ledger_unique_source ON ledger_vouchers(source_kind,source_id) WHERE source_kind IS NOT NULL AND reversed_by IS NULL;
    CREATE TABLE IF NOT EXISTS ledger_events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,entity TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS ledger_immutable_update BEFORE UPDATE OF data,number,year_id,status,corrects,source_kind,source_id ON ledger_vouchers WHEN OLD.status='posted' BEGIN SELECT RAISE(ABORT,'Posted vouchers are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS ledger_immutable_delete BEFORE DELETE ON ledger_vouchers WHEN OLD.status='posted' BEGIN SELECT RAISE(ABORT,'Posted vouchers cannot be deleted'); END;`);
  const insert = db.prepare('INSERT OR IGNORE INTO ledger_accounts VALUES(?,?,?,1)');
  for (const [code,name,en] of starterAccounts) insert.run(code,name,en);
  if(db.prepare('PRAGMA user_version').get().user_version<3)db.exec('PRAGMA user_version=3;');
  db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
  const accounts = () => db.prepare('SELECT * FROM ledger_accounts ORDER BY code').all().map(a=>({code:a.code,name:a.name,nameEn:a.name_en,active:!!a.active,type:accountType(a.code)}));
  const years = () => db.prepare('SELECT * FROM ledger_years ORDER BY start DESC').all().map(y=>({...JSON.parse(y.data),id:y.id,start:y.start,end:y.end,revision:y.revision}));
  const voucherData=v=>({...JSON.parse(v.data),id:v.id,yearId:v.year_id,number:v.number,status:v.status,revision:v.revision,corrects:v.corrects,reversedBy:v.reversed_by,sourceKind:v.source_kind,sourceId:v.source_id});
  const vouchers = () => db.prepare('SELECT * FROM ledger_vouchers ORDER BY rowid DESC').all().map(voucherData);
  // A local declared operator is attribution, not authentication. Never backfill historical actors.
  const operator = () => JSON.parse(db.prepare("SELECT data FROM records WHERE kind='accounting_operator' AND id='active'").get()?.data || 'null');
  const requireOperator = () => {const actor=operator();if(!actor)throw new AccountingError('bookActorRequired',400);return actor;};
  const programVersion = require('../package.json').version;
  const event = (entity,id,action,data={}) => db.prepare('INSERT INTO ledger_events(at,entity,entity_id,action,data) VALUES(?,?,?,?,?)').run(new Date().toISOString(),entity,id,action,JSON.stringify({details:data,actor:operator(),programVersion}));
  const previousVersion=db.prepare("SELECT data FROM records WHERE kind='accounting_runtime' AND id='version'").get();
  if(!previousVersion || JSON.parse(previousVersion.data).version!==programVersion){
    db.exec('BEGIN IMMEDIATE');try{event('system','version','version',{previous:previousVersion?JSON.parse(previousVersion.data).version:null,current:programVersion,effectiveAt:new Date().toISOString()});db.prepare("INSERT INTO records VALUES('accounting_runtime','version',?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(JSON.stringify({version:programVersion}));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  }

  const yearById = id => { const y=years().find(y=>y.id===id);if(!y)throw new AccountingError('bookMissing',404);return y; };
  const current = (items,body) => { const row=items.find(v=>v.id===body.id);if(!row)throw new AccountingError('bookMissing',404);if(row.revision!==body.revision)throw new AccountingError('bookConflict');return row; };
  const checkDate = (year,date) => { validDate(date);if(year.closed)throw new AccountingError('bookYearClosed');if(date<year.start||date>year.end)invalid('bookOutsideYear');if(year.lockedThrough&&date<=year.lockedThrough)throw new AccountingError('bookPeriodLocked'); };
  const saveYear = year => { const {id,start,end,revision,...data}=year;db.prepare('UPDATE ledger_years SET revision=?,data=? WHERE id=?').run(revision+1,JSON.stringify(data),id); };
  const activeSource = (kind,id) => {const v=db.prepare("SELECT * FROM ledger_vouchers WHERE source_kind=? AND source_id=? AND reversed_by IS NULL AND status='posted'").get(kind,id);return v?{...JSON.parse(v.data),id:v.id,yearId:v.year_id,number:v.number,status:v.status,revision:v.revision,corrects:v.corrects,reversedBy:v.reversed_by,sourceKind:v.source_kind,sourceId:v.source_id}:undefined;};
  function createPosted(year,data,{id=randomUUID(),revision=1,corrects=null,sourceKind=null,sourceId=null}={}) {
    if(!data.company?.name||!/^\d{6}-?\d{4}$/.test(data.company.org||''))throw new AccountingError('bookCompanyChanged');
    checkDate(year,data.date);
    if(corrects||(sourceKind&&db.prepare('SELECT 1 FROM ledger_vouchers WHERE source_kind=? AND source_id=? AND reversed_by IS NOT NULL').get(sourceKind,sourceId)))requireOperator();
    if(sourceKind&&activeSource(sourceKind,sourceId))throw new AccountingError('bookSourcePosted');
    // Validate again inside the posting transaction; snapshots use the current account names.
    const lines=validateLines(data.lines.map(l=>({...l,debit:(l.debit/100).toFixed(2),credit:(l.credit/100).toFixed(2)})),accounts());
    const number=db.prepare("SELECT COALESCE(MAX(number),0)+1 AS next FROM ledger_vouchers WHERE year_id=? AND status='posted'").get(year.id).next;
    const snapshot={date:data.date,description:data.description,reference:data.reference,lines,company:data.company,wagesPayableAccount:data.wagesPayableAccount||null,liabilityAccount:data.liabilityAccount||null,purchaseInvoiceId:data.purchaseInvoiceId||null,importSource:data.importSource||null,actor:operator(),programVersion,created:data.created||new Date().toISOString(),posted:new Date().toISOString()};
    const existing=db.prepare('SELECT id FROM ledger_vouchers WHERE id=?').get(id);
    if(existing)db.prepare("UPDATE ledger_vouchers SET number=?,status='posted',revision=?,data=? WHERE id=?").run(number,revision,JSON.stringify(snapshot),id);
    else db.prepare("INSERT INTO ledger_vouchers VALUES(?,?,?,'posted',?,?,?,?,?,?)").run(id,year.id,number,revision,JSON.stringify(snapshot),corrects,null,sourceKind,sourceId);
    saveYear({...year,openingLocked:true});event('voucher',id,'posted',snapshot);return {id,number};
  }
  function reversePosted(v,body,company) {
    if(v.status!=='posted'||v.corrects||v.reversedBy)throw new AccountingError('bookImmutable');
    if(validDate(body.date)<v.date)invalid('bookReversalDate');
    if(v.sourceKind==='payroll'&&activeSource('payrollPayment',v.sourceId))throw new AccountingError('bookReversePaymentFirst');
    beforeReverse(v,body);
    requireOperator();
    const reason=text(body.reason,'bookReason'),y=yearById(body.yearId);
    const result=createPosted(y,{date:body.date,description:reason,reference:`A${v.number} / ${yearById(v.yearId).name}`,lines:v.lines.map(l=>({...l,debit:l.credit,credit:l.debit})),company},{corrects:v.id});
    db.prepare('UPDATE ledger_vouchers SET reversed_by=?,revision=revision+1 WHERE id=?').run(result.id,v.id);event('voucher',v.id,'reversed',{reversal:result.id,reason});
    afterReverse(v,result,reason);return result;
  }
  return {
    operator,requireOperator,
    importSie(yearId,{opening,vouchers:incoming,accounts:incomingAccounts,batchId,filename,hash},company){
      requireOperator();const year=yearById(yearId);checkDate(year,year.start);
      if(year.openingLocked||year.opening.length||year.lockedThrough||vouchers().some(v=>v.yearId===yearId&&v.status!=='discarded'))throw new AccountingError('sieEmptyYear');
      const knownAccounts=new Set(accounts().map(a=>a.code));for(const a of incomingAccounts)if(!knownAccounts.has(a.code)){knownAccounts.add(a.code);db.prepare('INSERT INTO ledger_accounts VALUES(?,?,?,1)').run(a.code,a.name,a.name);event('account',a.code,'saved',{source:'sie',batchId,name:a.name});}
      const lines=opening.length?validateLines(opening.map(l=>({account:l.account,debit:(Math.max(0,l.amount)/100).toFixed(2),credit:(Math.max(0,-l.amount)/100).toFixed(2)})),accounts(),true):[];
      saveYear({...year,opening:lines,openingLocked:true});event('year',year.id,'opening',{source:'sie',batchId,lines});const mappings=[];
      for(let i=0;i<incoming.length;i++){const v=incoming[i],reference=`SIE ${filename.slice(0,100)} / ${v.series} ${v.number}`,importSource={batchId,filename,hash,series:v.series,number:v.number,registered:v.registered,sign:v.sign,rows:v.lines.map(l=>({...l}))};
        const posted=createPosted(yearById(yearId),{date:v.date,description:v.description||`SIE ${v.series} ${v.number}`,reference,lines:v.lines.filter(l=>l.amount).map(l=>({account:l.account,debit:Math.max(0,l.amount),credit:Math.max(0,-l.amount),note:l.note})),company,importSource},{sourceKind:'sie',sourceId:batchId+':'+i});mappings.push({series:v.series,number:v.number,...posted});
      }event('year',year.id,'sieImported',{batchId,filename,hash,mappings});return mappings;
    },
    source:activeSource,
    sources:kind=>db.prepare("SELECT * FROM ledger_vouchers WHERE source_kind=? AND reversed_by IS NULL AND status='posted'").all(kind).map(voucherData),
    postSource:(yearId,data,source)=>createPosted(yearById(yearId),data,source),
    reverseSource:(id,body,company)=>reversePosted(current(vouchers(),{id,revision:body.revision}),body,company),
    account:code=>accounts().find(a=>a.code===code&&a.active),
    payrollHasPosting:id=>!!activeSource('payroll',id),
    hasPosted:()=>!!db.prepare("SELECT 1 FROM ledger_vouchers WHERE status='posted' LIMIT 1").get(),
    state:()=>({accounts:accounts(),years:years(),vouchers:vouchers(),operator:operator(),events:db.prepare('SELECT id,at,entity,entity_id AS entityId,action,data FROM ledger_events ORDER BY id DESC').all().map(e=>{const data=JSON.parse(e.data);return {...e,data,actor:data.actor||null,programVersion:data.programVersion||null};})}),
    handle(route,body,company) {
      db.exec('BEGIN IMMEDIATE');
      try {
        let result;
        if(route==='/api/accounting/operator') {
          const name=text(body.name,'bookActorRequired',true,100),old=operator();
          const actor=old?.name===name?old:{id:randomUUID(),name};
          db.prepare("INSERT INTO records VALUES('accounting_operator','active',?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(JSON.stringify(actor));event('operator',actor.id,'selected',{previous:old,selected:actor});result=actor;
        } else if(route==='/api/accounting/accounts') {
          const code=text(body.code,'bookAccount');if(!/^[1-8]\d{3}$/.test(code))invalid('bookAccount');
          const name=text(body.name,'name'),nameEn=text(body.nameEn||body.name,'nameEn'),active=body.active!==false;
          if(!active&&years().filter(y=>!y.closed).some(y=>balances(y,vouchers(),accounts()).some(a=>a.code===code&&a.balance!==0)))throw new AccountingError('bookAccountBalance');
          const before=accounts().find(a=>a.code===code)||null;
          db.prepare('INSERT INTO ledger_accounts VALUES(?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name,name_en=excluded.name_en,active=excluded.active').run(code,name,nameEn,+active);
          event('account',code,'saved',{before,name,nameEn,active,effectiveAt:new Date().toISOString()});result={code};
        } else if(route==='/api/accounting/years') {
          const start=validDate(body.start),end=validDate(body.end);
          if(end<start||end>lastFiscalDay(start))invalid('bookYearDates');
          if(years().some(y=>y.start<=end&&y.end>=start))throw new AccountingError('bookYearOverlap');
          const id=randomUUID(),data={name:text(body.name||`${start} – ${end}`,'name'),closed:false,lockedThrough:'',opening:[],openingLocked:false};
          db.prepare('INSERT INTO ledger_years VALUES(?,?,?,?,?)').run(id,start,end,1,JSON.stringify(data));event('year',id,'created',data);result={id};
        } else if(route==='/api/accounting/opening') {
          const y=current(years(),body);checkDate(y,y.start);
          if(y.openingLocked)throw new AccountingError('bookOpeningLocked');
          if(!Array.isArray(body.lines))invalid('bookLines');
          const lines=body.lines?.length?validateLines(body.lines,accounts(),true):[];
          saveYear({...y,opening:lines});event('year',y.id,'opening',lines);result={id:y.id};
        } else if(route==='/api/accounting/vouchers') {
          const old=body.id?current(vouchers(),body):null;if(old&&old.status!=='draft')throw new AccountingError('bookImmutable');
          const y=yearById(body.yearId);checkDate(y,body.date);
          const data={date:body.date,description:text(body.description,'bookDescription'),reference:text(body.reference,'bookReference'),lines:validateLines(body.lines,accounts()),created:old?.created||new Date().toISOString(),company};
          const id=old?.id||randomUUID();
          db.prepare("INSERT INTO ledger_vouchers VALUES(?,?,NULL,'draft',?,?,NULL,NULL,NULL,NULL) ON CONFLICT(id) DO UPDATE SET year_id=excluded.year_id,revision=excluded.revision,data=excluded.data").run(id,y.id,(old?.revision||0)+1,JSON.stringify(data));event('voucher',id,'draft',data);result={id};
        } else if(route==='/api/accounting/post') {
          const v=current(vouchers(),body);if(v.status!=='draft')throw new AccountingError('bookImmutable');
          if(!company.name||JSON.stringify(company)!==JSON.stringify(v.company))throw new AccountingError('bookCompanyChanged');
          result=createPosted(yearById(v.yearId),v,{id:v.id,revision:v.revision+1});
        } else if(route==='/api/accounting/discard') {
          const v=current(vouchers(),body);if(v.status!=='draft')throw new AccountingError('bookImmutable');
          db.prepare("UPDATE ledger_vouchers SET status='discarded',revision=revision+1 WHERE id=?").run(v.id);event('voucher',v.id,'discarded');result={id:v.id};
        } else if(route==='/api/accounting/reverse') {
          result=reversePosted(current(vouchers(),body),body,company);
        } else if(route==='/api/accounting/lock') {
          const y=current(years(),body),through=validDate(body.through);
          if(y.closed||through<y.start||through>=y.end||(y.lockedThrough&&through<=y.lockedThrough))invalid('bookLockDate');
          if(vouchers().some(v=>v.yearId===y.id&&v.status==='draft'&&v.date<=through))throw new AccountingError('bookPendingDrafts');
          const reason=text(body.reason,'bookReason');saveYear({...y,lockedThrough:through});event('year',y.id,'locked',{through,reason});result={id:y.id};
        } else if(route==='/api/accounting/close') {
          const y=current(years(),body);if(y.closed)throw new AccountingError('bookYearClosed');
          if(vouchers().some(v=>v.yearId===y.id&&v.status==='draft'))throw new AccountingError('bookPendingDrafts');
          const rows=balances(y,vouchers(),accounts());
          if(rows.filter(a=>!['asset','liability'].includes(a.type)).reduce((s,a)=>s+a.balance,0)!==0)throw new AccountingError('bookTransferResultFirst');
          if(body.nextYearId) {
            const next=yearById(body.nextYearId),dayAfter=new Date(y.end);dayAfter.setUTCDate(dayAfter.getUTCDate()+1);
            if(next.closed||next.openingLocked||next.opening.length||next.lockedThrough||next.start!==dayAfter.toISOString().slice(0,10))throw new AccountingError('bookCarryTarget');
            const opening=rows.filter(a=>['asset','liability'].includes(a.type)&&a.balance!==0).map(a=>({account:a.code,name:a.name,nameEn:a.nameEn,type:a.type,debit:Math.max(0,a.balance),credit:Math.max(0,-a.balance),note:`IB ${y.end}`}));
            saveYear({...next,opening});event('year',next.id,'carried',{from:y.id,opening});
          }
          const reason=text(body.reason,'bookReason');saveYear({...y,closed:true,lockedThrough:y.end,openingLocked:true});event('year',y.id,'closed',{reason,nextYearId:body.nextYearId||null});result={id:y.id};
        } else if(route==='/api/accounting/result') {
          const y=yearById(body.yearId),target=accounts().find(a=>a.code===body.account&&a.active&&/^20\d{2}$/.test(a.code));
          if(!target)invalid('bookResultAccount');
          const amount=-balances(y,vouchers(),accounts()).filter(a=>!['asset','liability'].includes(a.type)).reduce((s,a)=>s+a.balance,0);
          if(!amount)throw new AccountingError('bookNoResult');
          const n=Math.abs(amount),lines=[{account:'8999',debit:amount>0?n:0,credit:amount<0?n:0},{account:target.code,debit:amount<0?n:0,credit:amount>0?n:0}];
          result=createPosted(y,{date:y.end,description:text(body.description,'bookDescription'),reference:text(body.reference,'bookReference'),lines,company},{sourceKind:'yearResult',sourceId:y.id});
        } else if(route==='/api/accounting/payroll') {
          if(body.reviewed!==true)invalid('bookReview');
          const record=db.prepare('SELECT * FROM payruns WHERE id=?').get(String(body.runId));
          if(!record||!['approved','paid'].includes(record.status))invalid('bookPayrollStatus');
          const run=JSON.parse(record.data),y=yearById(body.yearId),payment=body.payment===true;
          if((run.company.org||'').replace('-','')!==(company.org||'').replace('-',''))invalid('bookPayrollCompany');
          if(payment&&record.status!=='paid')invalid('bookPayrollStatus');
          if(payment&&!activeSource('payroll',record.id))throw new AccountingError('bookAccrualFirst');
          const allowed=(code,types)=>{const a=accounts().find(a=>a.code===code&&a.active&&types.includes(a.type));if(!a)invalid('bookAccount');return code;};
          const lines=[],add=(code,amount,debit,types)=>{if(amount)lines.push({account:allowed(code,types),debit:debit?amount:0,credit:debit?0:amount});};
          const sum=key=>run.entries.reduce((s,e)=>s+e[key],0);
          if(payment){
            const accrual=activeSource('payroll',record.id),wageAccount=accrual.wagesPayableAccount;
            if(!wageAccount)throw new AccountingError('bookAccrualFirst');
            add(wageAccount,sum('net'),true,['liability']);add(body.bankAccount,sum('net'),false,['asset']);
          } else {
            add(body.wageAccount,sum('cashGross'),true,['expense']);add(body.contributionExpense,sum('contribution'),true,['expense']);
            add(body.expenseAccount,sum('reimbursement'),true,['expense']);add(body.taxAccount,sum('tax'),false,['liability']);
            add(body.contributionLiability,sum('contribution'),false,['liability']);add(body.receivableAccount,sum('netDeduction'),false,['asset']);
            if(sum('net'))lines.push({account:allowed(body.wagesPayable,['liability']),debit:0,credit:sum('net')});
          }
          if(!lines.length)invalid('bookNoAmounts');
          result=createPosted(y,{date:body.date,description:text(body.description,'bookDescription'),reference:`Lön #${record.number} / ${run.period}`,lines,company,wagesPayableAccount:payment?null:body.wagesPayable},{sourceKind:payment?'payrollPayment':'payroll',sourceId:record.id});
        } else result=null;
        db.exec('COMMIT');return result;
      } catch(error) {db.exec('ROLLBACK');throw error;}
    }
  };
}
module.exports={validDate,initAccounting,AccountingError,validateLines,balances,accountType};
