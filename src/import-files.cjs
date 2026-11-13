const {createHash}=require('node:crypto');
const {unzipSync,strFromU8,zipSync,strToU8}=require('fflate');
const readExcel=require('read-excel-file/node');
const MAX_BYTES=5*1024*1024,MAX_ROWS=5000,MAX_COLUMNS=50;
class FileImportError extends Error{constructor(message,status=400,details){super(message);this.status=status;this.details=details;}}
const fail=key=>{throw new FileImportError(key);};
function csvRows(value,delimiter='auto'){
 let text=value.replace(/^\uFEFF/,''),offset=0;const directive=text.match(/^sep=([;,\t])\r?\n/i);if(directive){if(delimiter==='auto')delimiter=directive[1];text=text.slice(directive[0].length);offset=1;}
 if(delimiter==='auto'){const counts=new Map([[';',0],[',',0],['\t',0]]);let quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue;}quoted=!quoted;}if(!quoted){if(c==='\n'||c==='\r')break;if(counts.has(c))counts.set(c,counts.get(c)+1);}}delimiter=[...counts].sort((a,b)=>b[1]-a[1])[0][0];}
 if(![';',',','\t'].includes(delimiter))fail('importDelimiter');const rows=[];let cells=[],cell='',quoted=false,closed=false,line=1+offset,start=line;
 const field=()=>{if(cell.length>10000)fail('importCellLimit');cells.push(cell);cell='';closed=false;if(cells.length>MAX_COLUMNS)fail('importColumns');};
 const row=()=>{field();if(cells.some(c=>c.trim()))rows.push({row:start,cells});cells=[];if(rows.length>MAX_ROWS+1)fail('importRowLimit');};
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else{cell+=c;if(c==='\n')line++;}continue;}
  if(c===delimiter){field();continue;}if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row();line++;start=line;continue;}if(c==='"'){if(cell||closed)fail('importCsvSyntax');quoted=true;continue;}if(closed){if(c===' '||c==='\t')continue;fail('importCsvSyntax');}cell+=c;
 }
 if(quoted)fail('importCsvSyntax');if(cell||cells.length||closed)row();return {rows,delimiter};
}
function validateZip(buffer){let total=0,entries=0;try{unzipSync(buffer,{filter:entry=>{entries++;total+=entry.originalSize;if(entries>1000||entry.originalSize>20*1024*1024||total>30*1024*1024)fail('importWorkbookLimit');return false;}});}catch(e){if(e instanceof FileImportError)throw e;fail('importWorkbook');}
 let files;try{files=unzipSync(buffer,{filter:e=>/\.(xml|rels)$/i.test(e.name)});}catch{fail('importWorkbook');}
 if(!files['xl/workbook.xml'])fail('importWorkbook');let rowCount=0,cellCount=0,sheetCount=0;
 for(const [name,data] of Object.entries(files)){const xml=strFromU8(data);if(/<!DOCTYPE|<!ENTITY/i.test(xml))fail('importWorkbook');if(!/<(?:[\w.-]+:)?worksheet\b/.test(xml))continue;sheetCount++;if(sheetCount>20)fail('importWorkbookLimit');if(/<(?:[\w.-]+:)?f(?:\s|\/?>)/.test(xml))fail('importFormula');
  for(const match of xml.matchAll(/<(?:[\w.-]+:)?row\b[^>]*\br=["'](\d+)["']/g)){rowCount++;if(+match[1]>MAX_ROWS+1||rowCount>10002)fail('importRowLimit');}
  for(const match of xml.matchAll(/<(?:[\w.-]+:)?c\b[^>]*\br=["']([A-Z]+)(\d+)["']/g)){cellCount++;let col=0;for(const c of match[1])col=col*26+c.charCodeAt(0)-64;if(col>MAX_COLUMNS||+match[2]>MAX_ROWS+1||cellCount>250050)fail('importWorkbookLimit');}
 }
 return files;
}
function normalizeSheet(rows){if(!rows.length)fail('importEmpty');const header=rows[0];if(!header.cells.length||header.cells.length>MAX_COLUMNS)fail('importColumns');const headers=header.cells.map(v=>String(v??'').trim());if(headers.some(h=>!h||h.length>200))fail('importHeader');return {headers,headerRow:header.row,rows:rows.slice(1).map(r=>({...r,cells:r.cells.map(v=>v==null?'':v)}))};}
async function parseFile(body){if(!['articles','counts'].includes(body.kind))fail('importInvalid');if(typeof body.name!=='string'||!body.name||body.name.length>200)fail('importFile');const name=body.name.replace(/^.*[\\/]/,'');if(!/\.(csv|xlsx)$/i.test(name))fail('importFormat');if(typeof body.file!=='string'||!body.file.length||body.file.length>Math.ceil(MAX_BYTES/3)*4+4||(body.file.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.file)))fail('importFile');const bytes=Buffer.from(body.file,'base64');if(!bytes.length||bytes.length>MAX_BYTES)fail('importFile');const fileHash=createHash('sha256').update(bytes).digest('hex');
 if(/\.csv$/i.test(name)){if(!['utf-8','windows-1252'].includes(body.encoding||'utf-8'))fail('importEncoding');let text;try{text=new TextDecoder(body.encoding||'utf-8',{fatal:true}).decode(bytes);}catch{fail('importEncoding');}if(text.includes('\0'))fail('importCsvSyntax');const parsed=csvRows(text,body.delimiter||'auto');return {name,fileHash,kind:body.kind,format:'csv',delimiter:parsed.delimiter,sheets:[{name:'CSV',...normalizeSheet(parsed.rows)}]};}
 validateZip(bytes);let workbook;try{workbook=await readExcel(bytes,{trim:false,parseNumber:value=>({number:value})});}catch(e){if(e instanceof FileImportError)throw e;fail('importWorkbook');}
 const sheets=workbook.map(sheet=>{if(sheet.data.length>MAX_ROWS+1)fail('importRowLimit');const rows=sheet.data.map((row,i)=>({row:i+1,cells:row.map(cell=>{if(cell instanceof Date)return {invalid:'date'};if(cell&&typeof cell==='object'&&'number'in cell)return {number:String(cell.number)};if(cell===null||cell===undefined)return '';if(typeof cell==='boolean')return {invalid:'boolean'};return String(cell);})})).filter(r=>r.cells.some(c=>typeof c!=='string'||c.trim()));if(!rows.length)return null;const header=rows[0];if(header.cells.some(c=>typeof c!=='string'))fail('importHeader');return {name:sheet.sheet,...normalizeSheet(rows)};}).filter(Boolean);if(!sheets.length)fail('importEmpty');return {name,fileHash,kind:body.kind,format:'xlsx',sheets};
}
function workbook(rows,sheetName='Import'){
 const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const column=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
 const files={
 '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+xml(sheetName)+'" sheetId="1" r:id="rId1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
 'xl/styles.xml':'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>',
 'xl/worksheets/sheet1.xml':'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((value,j)=>'<c r="'+column(j)+(i+1)+'" t="inlineStr" s="0"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>'
 };return Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([name,value])=>[name,strToU8(value)]))));
}
function template(kind,format,lang='sv'){
 if(!['articles','counts'].includes(kind)||!['csv','xlsx'].includes(format))fail('importFormat');const rows=kind==='articles'?[(lang==='en'?['SKU','Name','Unit','Price','VAT','GTIN']:['Artikelnummer','Namn','Enhet','Pris','Moms','GTIN']),['VARA-001',lang==='en'?'Example product':'Exempelvara','st','125,00','25','4006381333931']]:[(lang==='en'?['SKU','Counted quantity','Unit','Location']:['Artikelnummer','Räknat antal','Enhet','Lagerplats']),['VARA-001','10,50','st','A1']];
 if(format==='xlsx')return workbook(rows);return Buffer.from('\uFEFF'+rows.map(row=>row.map(value=>'"'+value.replace(/"/g,'""')+'"').join(';')).join('\r\n')+'\r\n');
}
module.exports={FileImportError,parseFile,csvRows,workbook,template,MAX_BYTES,MAX_ROWS,MAX_COLUMNS};
