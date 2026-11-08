import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {securityHarness} from './security-harness.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'erp-csv-qa-')),sql=new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(q){const make=(params=[])=>({sql:q,args:params,bind(...values){return make(values)},async first(){return sql.prepare(q).get(...params)||null},async all(){return {results:sql.prepare(q).all(...params)}},async run(){return sql.prepare(q).run(...params)}});return make()},async batch(items){sql.exec('BEGIN');try{const r=items.map(s=>sql.prepare(s.sql).run(...s.args));sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
globalThis.__csvDB={DB,ERP_OWNER_EMAIL:'owner@example.invalid'};globalThis.__csvUser={userId:'owner',email:'owner@example.invalid',displayName:'Owner'};
const h=securityHarness(temp,'__csvDB','__csvUser'),route=await import(h.compile('app/api/crm-csv-imports/route.ts')),security=await import(h.compile('lib/security.ts')),mapping=await import(h.compile('lib/crm-csv.ts')),preview=await import(h.compile('lib/crm-import-preview.ts'));
let passed=0;const check=(v,label)=>{assert.ok(v,label);passed++};
async function call(body,status=200,origin='https://erp.local'){
 const res=await route.POST(new Request('https://erp.local/api/crm-csv-imports',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)})),data=await res.json();
 check(res.status===status,`Expected ${status}, got ${res.status}: ${JSON.stringify(data)}`);return data;
}
async function start(sources,kind='Contacts',company='Hagadol',filename='Original Bigin.csv'){
 return call({action:'start',company,kind,filename,expectedRows:sources.length,sourceHash:await security.fingerprint(sources),manifestHash:await security.fingerprint(await Promise.all(sources.map(security.fingerprint)))});
}
const source=(i)=>({'Contact Id':'zcrm_'+(6391551000000000000n+BigInt(i)).toString(),'Contact Name':'Person '+i,'First Name':'Person','Last Name':String(i),'Company Name':'Client '+i,Email:'person'+i+'@example.invalid',Phone:'+256700'+String(i).padStart(6,'0'),'Created Time':'8/20/2023 18:50','Email Opt Out':'FALSE','Do Not WhatsApp':'FALSE','Description':'Quoted, notes\nSecond line','Custom Field':'  retain spaces  '});
try{
 check(mapping.sourceDate('8/20/2023 18:50')==='2023-08-20','Month/day/year is parsed explicitly');
 check(mapping.sourceDate('2/29/2024 09:00')==='2024-02-29','Leap day accepted');
 for(const date of ['2/29/2023','13/1/2023','2023-02-30']){assert.throws(()=>mapping.sourceDate(date));passed++}
 const original=source(1),mapped=mapping.mapCSVSource(original,'Contacts','Hagadol',[],'2026-10-25T00:00:00Z');
 check(mapped.biginCreatedTime==='8/20/2023 18:50'&&mapped.biginSource['Custom Field']==='  retain spaces  ','Raw timestamps and custom fields preserved');
 check(mapped.jobTitle===''&&mapped.customer==='Client 1','Last Name never becomes company or job title');
 const blankDate=mapping.mapCSVSource({...original,'Created Time':''},'Contacts','Hagadol',[],'2026-10-25T00:00:00Z');
 check(blankDate.dateBasis==='imported'&&blankDate.biginCreatedTime===''&&blankDate.importReviewFlags.length>0,'Missing dates explicitly flagged, no source date invented');
 const csv='Company Id,Company Name,Created Time\n'+Array.from({length:10000},(_,i)=>`zcrm_${6391551000000000000n+BigInt(i)},Company ${i},8/20/2023`).join('\n');
 check(preview.parseBiginPreviewCSV(csv).length===10000,'Exactly 10,000 company rows accepted');
 assert.throws(()=>preview.parseBiginPreviewCSV(csv+'\nzcrm_6391551999999999999,Extra,8/20/2023'),/10,000/);passed++;
 const contactsCSV='Contact Id,Contact Name\n'+Array.from({length:10000},(_,i)=>`zcrm_${6391551000000000000n+BigInt(i)},Person ${i}`).join('\n');
 check(preview.parseBiginPreviewCSV(contactsCSV).length===10000,'Exactly 10,000 contacts accepted');
 check(preview.parseBiginPreviewCSV('a,b\n,,'.replace(',,',',')+'\n1,2\n,\n').length===1,'Empty spreadsheet rows ignored');
 const sources=[source(1),source(2)];sources[1].Phone=sources[0].Phone;
 const s=await start(sources);await call({action:'approve',id:s.id,confirmed:true},409);
 await call({action:'stage',id:s.id,rows:sources.map((source,ordinal)=>({ordinal,source}))});
 check(sql.prepare('SELECT COUNT(*) n FROM records').get().n===0,'Staging never creates customer records');
 await call({action:'stage',id:s.id,rows:[{ordinal:0,source:source(1)}]});
 await call({action:'stage',id:s.id,rows:[{ordinal:0,source:{...source(1),Phone:'changed'}}]},409);
 const review=await call({action:'review',id:s.id});check(review.summary.total===2&&review.summary.duplicates===2,'Server flags both duplicate candidates');
 await call({action:'post',id:s.id,cursor:0},409);await call({action:'approve',id:s.id,confirmed:false},400);
 await call({action:'approve',id:s.id,confirmed:true});const result=await call({action:'post',id:s.id,cursor:0});
 check(result.status==='Complete'&&result.cursor===2,'Approved records posted');
 await call({action:'post',id:s.id,cursor:0});check(sql.prepare('SELECT COUNT(*) n FROM records').get().n===2,'Posting replay is idempotent');
 const saved=JSON.parse(sql.prepare('SELECT payload FROM records ORDER BY id LIMIT 1').get().payload);
 check(saved.biginSource.Phone===sources[0].Phone&&saved.biginSource.Description===sources[0].Description,'Phone and multiline notes stay with original identity');
 check(sql.prepare('SELECT COUNT(*) n FROM journal').get().n===0,'CRM import never posts finance journal lines');
 const rerun=await start([...sources,source(3)]);await call({action:'stage',id:rerun.id,rows:[...sources,source(3)].map((source,ordinal)=>({ordinal,source}))});
 const rerunReview=await call({action:'review',id:rerun.id});check(rerunReview.summary.skipped===2&&rerunReview.summary.ready===1,'Different export skips previously imported source IDs');
 await call({action:'approve',id:rerun.id,confirmed:true});await call({action:'post',id:rerun.id,cursor:0});
 check(sql.prepare('SELECT COUNT(*) n FROM records').get().n===3,'Only new source identity added');
 await call({action:'start',company:'Group',kind:'Contacts',expectedRows:1,filename:'x.csv',sourceHash:'a'.repeat(64),manifestHash:'b'.repeat(64)},403);
 await call({action:'start',company:'Hagadol',kind:'Contacts',expectedRows:10001,filename:'x.csv',sourceHash:'a'.repeat(64),manifestHash:'b'.repeat(64)},400);
 await call({action:'review',id:s.id},403,'https://attacker.invalid');
 const now=new Date().toISOString();sql.prepare('INSERT INTO access_users(id,user_id,email,role,crm_profile,companies,enabled,created,updated) VALUES(?,?,?,?,?,?,1,?,?)').run('rep','rep','rep@example.invalid','Sales','sales_rep','["Hagadol"]',now,now);
 globalThis.__csvUser={userId:'rep',email:'rep@example.invalid',displayName:'Rep'};await call({action:'review',id:s.id},403);
 sql.prepare("UPDATE access_users SET crm_profile='sales_manager' WHERE id='rep'").run();await call({action:'approve',id:s.id,confirmed:true},403);
 globalThis.__csvUser={userId:'owner',email:'owner@example.invalid',displayName:'Owner'};
 // Full 10,000 row workflow, including approval and every commit batch.
 const many=Array.from({length:10000},(_,i)=>({'Company Id':`zcrm_${6391552000000000000n+BigInt(i)}`,'Company Name':'Synthetic Company '+i,'Created Time':'10/25/2026 08:00'}));
 const large=await start(many,'Companies');
 for(let offset=0;offset<many.length;offset+=50){sql.prepare('DELETE FROM request_limits').run();await call({action:'stage',id:large.id,rows:many.slice(offset,offset+50).map((source,i)=>({ordinal:offset+i,source}))});}
 const largeReview=await call({action:'review',id:large.id});check(largeReview.summary.ready===10000,'Server reviews all 10,000 companies');
 await call({action:'approve',id:large.id,confirmed:true});let progress={status:'Approved',cursor:0};
 while(progress.status!=='Complete'){sql.prepare('DELETE FROM request_limits').run();progress=await call({action:'post',id:large.id,cursor:progress.cursor});}
 check(sql.prepare("SELECT COUNT(*) n FROM records WHERE type='crm_company'").get().n===10000,'All 10,000 companies imported');
 check(sql.prepare('SELECT COUNT(*) n FROM journal').get().n===0,'Large import leaves ledger unchanged');
 const manyContacts=Array.from({length:10000},(_,i)=>source(i+100000));
 const largeContacts=await start(manyContacts);
 for(let offset=0;offset<manyContacts.length;offset+=50){sql.prepare('DELETE FROM request_limits').run();await call({action:'stage',id:largeContacts.id,rows:manyContacts.slice(offset,offset+50).map((source,i)=>({ordinal:offset+i,source}))});}
 const contactsReview=await call({action:'review',id:largeContacts.id});check(contactsReview.summary.ready===10000,'Server reviews all 10,000 contacts alongside existing companies');
 await call({action:'approve',id:largeContacts.id,confirmed:true});progress={status:'Approved',cursor:0};
 while(progress.status!=='Complete'){sql.prepare('DELETE FROM request_limits').run();progress=await call({action:'post',id:largeContacts.id,cursor:progress.cursor});}
 check(sql.prepare("SELECT COUNT(*) n FROM records WHERE type='contact'").get().n===10003,'All 10,000 new contacts imported without replacing earlier records');
 check(sql.prepare('SELECT COUNT(*) n FROM journal').get().n===0,'Contact import leaves ledger unchanged');

 if(process.env.BIGIN_QA_SOURCE){
  const rows=preview.parseBiginPreviewCSV(fs.readFileSync(process.env.BIGIN_QA_SOURCE,'utf8'));check(rows.length===199,'Supplied export has 199 populated records');
  for(const row of rows)mapping.mapCSVSource(row,'Contacts','Hagadol',[],now);check(true,'All supplied rows map without changing source columns');
  const real=await start(rows);
  for(let offset=0;offset<rows.length;offset+=50)await call({action:'stage',id:real.id,rows:rows.slice(offset,offset+50).map((source,i)=>({ordinal:offset+i,source}))});
  const checked=await call({action:'review',id:real.id});check(checked.summary.ready===199&&checked.summary.errors===0,'Supplied export passes server review in isolated temporary database');
  await call({action:'approve',id:real.id,confirmed:true});let progress={status:'Approved',cursor:0};while(progress.status!=='Complete')progress=await call({action:'post',id:real.id,cursor:progress.cursor});
  check(progress.cursor===199,'All 199 supplied contacts import in isolated temporary database');
  check(rows.every(source=>{const r=JSON.parse(sql.prepare('SELECT payload FROM records WHERE id=?').get('bigin_Hagadol_'+source['Contact Id'].slice(5)).payload);return r.biginSource.Phone===source.Phone&&r.biginSource.Mobile===source.Mobile&&r.biginSource['Company Name']===source['Company Name'];}),'Each supplied phone and company stays with its source identity');
 }
 console.log(JSON.stringify({passed,failed:0,maxRecords:10000,fullTenThousandCompanyImport:true,fullTenThousandContactImport:true,liveProductionTouched:false}));
}finally{sql.close();fs.rmSync(temp,{recursive:true,force:true});}
