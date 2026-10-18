import fs from 'node:fs';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {securityHarness} from './security-harness.mjs';
const temp=fs.mkdtempSync(os.tmpdir()+'/crm-import-test-'),sql=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(q){const make=(params=[])=>({q,params,bind(...p){return make(p)},async first(){return sql.prepare(q).get(...params)||null},async all(){return {results:sql.prepare(q).all(...params)}},async run(){return sql.prepare(q).run(...params)}});return make()},async batch(items){sql.exec('BEGIN');try{const out=items.map(s=>sql.prepare(s.q).run(...s.params));sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
const objects=new Map(),BUCKET={async put(key,bytes,options){if(objects.has(key)&&options.onlyIf?.etagDoesNotMatch==='*')return null;const r={size:bytes.length,customMetadata:options.customMetadata};objects.set(key,r);return r},async head(key){return objects.get(key)||null}};
globalThis.__erpUser=null;globalThis.__erpDB={DB,BUCKET};
const h=securityHarness(temp),lib=await import(h.compile('lib/crm-import.ts')),sec=await import(h.compile('lib/security.ts')),route=await import(h.compile('app/api/crm-imports/route.ts')),files=await import(h.compile('lib/finance-import-revisions.ts'));
const source={ 'Contact Id':'zcrm_1234567890123456789','Contact Name':'Fixture customer','First Name':'Fixture','Last Name':'customer','Email':'fixture@example.com','Mobile':'0770000001','Phone':'+256770000001','Home Phone':'','Contact Owner':'Owner name','Contact Owner.id':'zcrm_1234567890123456790','Company Name':'External school','Company Name.id':'zcrm_1234567890123456791','Business Unit':'','Created Time':'2023-08-20 18:50:42','Modified Time':'2026-10-12 18:00:00','Email Opt Out':'true','Do Not WhatsApp':'true','Lead Source':'WHATSAPP - Hagadol Limited','Description':'Original note','Tag':'8'};
const raw=[{source,duplicateSourceIds:['zcrm_1234567890123456792']},{source:{...source,'Contact Id':'zcrm_1234567890123456792','Contact Name':'Second source identity'},duplicateSourceIds:[source['Contact Id']]}],rows=raw.map(lib.biginRow),archive=Uint8Array.from([80,75,3,4,5,6]);
const sourceHash=await files.bytesHash(archive),manifestHash=await lib.crmRowManifest(await Promise.all(rows.map(async r=>({source_id:r.source['Contact Id'],row_hash:await sec.fingerprint(r)})))),spec={sourceHash,manifestHash,company:'Hagadol',filename:'Fixture.zip',expectedRows:2};
Object.assign(globalThis.__erpDB,{ERP_OWNER_EMAIL:'owner@example.com',CRM_IMPORT_KEY:'fixture-source-key',CRM_IMPORT_COMPANY:'Hagadol',CRM_IMPORT_SOURCE_HASH:sourceHash,CRM_IMPORT_EXPIRES_AT:new Date(Date.now()+600000).toISOString()});
let passed=0;const check=(v,label)=>{if(!v)throw Error(label);passed++};
async function call(body,status=200,headers={}){const response=await route.POST(new Request('https://erp.local/api/crm-imports',{method:'POST',headers:{Origin:'https://erp.local','Content-Type':'application/json','x-crm-import-key':'fixture-source-key',...headers},body:JSON.stringify({...spec,...body})}));const result=await response.json();check(response.status===status,'Expected '+status+' got '+response.status+' '+JSON.stringify(result));check(response.headers.get('cache-control')==='no-store','Response is never cached');return result;}
await call({action:'append',rows},403,{'x-crm-import-key':'bad'});await call({action:'append',rows,company:'WMK'},403);await call({action:'append',rows,sourceHash:'f'.repeat(64)},403);await call({action:'append',rows},403,{Origin:'https://evil.example'});
globalThis.__erpDB.CRM_IMPORT_EXPIRES_AT='2020-01-01T00:00:00Z';await call({action:'append',rows},403);globalThis.__erpDB.CRM_IMPORT_EXPIRES_AT=new Date(Date.now()+600000).toISOString();
await call({action:'append',rows:[rows[0],rows[0]]},400);await call({action:'append',rows:[{...rows[0],source:{...source,Email:'bad email'}}]},400);await call({action:'append',rows:[{...rows[0],source:{...source,'Business Unit':'WMK'}}]},400);await call({action:'append',rows:[{...rows[0],source:{...source,'Created Time':'2026-02-31 00:00:00'}}]},400);
check(sql.prepare('SELECT COUNT(*) n FROM records').get().n===0,'Invalid imports create no contacts');
await call({action:'append',rows:[rows[0]]});await call({action:'append',rows:[rows[0]]});check(sql.prepare('SELECT COUNT(*) n FROM records').get().n===1,'Exact retries create no duplicate contacts');
await call({action:'append',rows:[{...rows[0],source:{...source,'Contact Name':'changed'}}]},409);await call({action:'complete'},409);
await call({action:'append',rows:[rows[1]]});await call({action:'complete'},409);await call({action:'archive',contentBase64:Buffer.from('wrong source').toString('base64')},409);await call({action:'archive',contentBase64:Buffer.from(archive).toString('base64')});
await call({action:'complete'});await call({action:'complete'});const result=await call({action:'verify'});check(result.status==='Complete'&&result.count===2&&result.savedContacts===2&&result.manifestHash===manifestHash&&result.duplicateContacts===2&&result.sourceArchiveSaved,'Complete import readback matches the source');
const record=JSON.parse(sql.prepare('SELECT payload FROM records WHERE id=?').get(lib.biginContactId('Hagadol',source['Contact Id'])).payload);
for(const [key,value] of Object.entries({company:'Hagadol',type:'contact',name:'Fixture customer',email:source.Email,phone:source.Mobile,officePhone:source.Phone,owner:source['Contact Owner'],customer:source['Company Name'],emailOptOut:true,doNotWhatsApp:true,source:'WhatsApp',biginLeadSource:source['Lead Source'],biginContactId:source['Contact Id'],biginCompanyId:source['Company Name.id'],role:'Unclassified',date:'2023-08-20',notes:'Original note'}))check(record[key]===value,'Preserve mapped '+key);
check(sql.prepare('SELECT COUNT(*) n FROM audit').get().n===2&&sql.prepare('SELECT COUNT(*) n FROM security_events').get().n===1,'Import and completion audit events are unique');
check(sql.prepare('SELECT COUNT(*) n FROM journal').get().n===0&&sql.prepare("SELECT COUNT(*) n FROM records WHERE type<>'contact'").get().n===0,'Imports affect only contacts');
await call({action:'append',rows},200);
const companyArchive=Uint8Array.from([80,75,3,4,7,8]),companyHash=await files.bytesHash(companyArchive);
const companyRows=[{source:{'Company Id':source['Company Name.id'],'Company Name':'External school','Company Owner':'Owner name','Created Time':'2023-08-20 18:00:00',Website:'example.com',Email:'invalid address','Company Type':'School'},duplicateSourceIds:[]}];
const companySpec={kind:'Companies',company:'Hagadol',sourceHash:companyHash,manifestHash:await lib.crmRowManifest([{source_id:companyRows[0].source['Company Id'],row_hash:await sec.fingerprint(companyRows[0])}]),filename:'Companies.zip',expectedRows:1};
globalThis.__erpDB.CRM_IMPORT_SOURCE_HASH=companyHash;
const companyCall=(body,status=200)=>call({...companySpec,...body},status);
await companyCall({action:'linkContacts'},409);await companyCall({action:'append',rows:companyRows});await companyCall({action:'append',rows:companyRows});
await companyCall({action:'append',rows:[{...companyRows[0],source:{...companyRows[0].source,'Company Name':'Changed'}}]},409);
await companyCall({action:'complete'},409);await companyCall({action:'archive',contentBase64:Buffer.from(companyArchive).toString('base64')});await companyCall({action:'complete'});
const companiesVerified=await companyCall({action:'verify'});check(companiesVerified.savedCompanies===1&&companiesVerified.savedContacts===0,'Company import reports company count separately');
const companyRecord=JSON.parse(sql.prepare("SELECT payload FROM records WHERE type='crm_company'").get().payload);
check(companyRecord.role==='Unclassified'&&companyRecord.website==='https://example.com'&&companyRecord.email===''&&companyRecord.customerType==='School'&&companyRecord.importReviewFlags.length===1,'Preserve industry and flag invalid email without inventing relationship');
const linked=await companyCall({action:'linkContacts'});check(linked.linked===2&&linked.conflicts===0,'Both contacts link by exact Bigin company ID');
const versions=sql.prepare("SELECT version FROM records WHERE type='contact'").all().map(r=>r.version);await companyCall({action:'linkContacts'});check(sql.prepare("SELECT version FROM records WHERE type='contact'").all().every((r,i)=>r.version===versions[i]),'Link retries preserve contact versions');
check(sql.prepare('SELECT COUNT(*) n FROM journal').get().n===0,'Company imports never post journal entries');
// A manually selected company link is preserved, even when the source points elsewhere.
const contactId=lib.biginContactId('Hagadol',source['Contact Id']),manual=JSON.parse(sql.prepare('SELECT payload FROM records WHERE id=?').get(contactId).payload);manual.crmCompanyId='manual-company';sql.prepare('UPDATE records SET payload=? WHERE id=?').run(JSON.stringify(manual),contactId);
const conflict=await companyCall({action:'linkContacts'});check(conflict.conflicts===1&&JSON.parse(sql.prepare('SELECT payload FROM records WHERE id=?').get(contactId).payload).crmCompanyId==='manual-company','Do not overwrite manual company links');
const saleArchive=Uint8Array.from([80,75,3,4,9,10]),saleHash=await files.bytesHash(saleArchive);
const saleRow={source:{'Sale Id':'zcrm_1234567890123456800','Sale Name':'Fixture borehole sale','Sale Owner':'Owner name','Pipeline':'Hagadol Sales','Sub-Pipeline':'Hagadol Sales Standard','Stage':'PENDING DEPOSIT','Company Name.id':source['Company Name.id'],'Contact Name.id':rows[1].source['Contact Id'],'Created Time':'2026-03-12 22:05:03','Closing Date':'2026-03-20','Next Action Date':'2026-03-16 11:00:00','Amount':'44000000','Quote Value':'169000000','Need Summary':'Rehabilitate boreholes','Site Visit Required':'true','Recommended Solution':'Site visit'},duplicateSourceIds:[]};
const saleSpec={kind:'Pipelines',company:'Hagadol',sourceHash:saleHash,manifestHash:await lib.crmRowManifest([{source_id:saleRow.source['Sale Id'],row_hash:await sec.fingerprint(saleRow)}]),filename:'Pipelines.zip',expectedRows:1};globalThis.__erpDB.CRM_IMPORT_SOURCE_HASH=saleHash;
const saleCall=(body,status=200)=>call({...saleSpec,...body},status);
await saleCall({action:'append',rows:[{...saleRow,source:{...saleRow.source,'Company Name.id':'zcrm_1234567890999999999'}}]},409);
await saleCall({action:'append',rows:[{...saleRow,source:{...saleRow.source,Stage:'UNKNOWN'}}]},400);
await saleCall({action:'append',rows:[{...saleRow,source:{...saleRow.source,Amount:'-1'}}]},400);
await saleCall({action:'append',rows:[{...saleRow,source:{...saleRow.source,'Closing Date':'2026-02-31'}}]},400);
await saleCall({action:'append',rows:[{...saleRow,source:{...saleRow.source,Pipeline:'WMK Sales'}}]},400);
await saleCall({action:'append',rows:[saleRow]});await saleCall({action:'append',rows:[saleRow]});await saleCall({action:'archive',contentBase64:Buffer.from(saleArchive).toString('base64')});await saleCall({action:'complete'});
const saleVerified=await saleCall({action:'verify'}),sale=saleVerified.opportunities[0];check(saleVerified.savedOpportunities===1&&saleVerified.savedCompanies===0&&saleVerified.savedContacts===0&&sale.amount===44000000&&sale.quoteValue===169000000&&sale.stage==='Pending deposit','Pipeline preserves amount, distinct quote value and pending deposit stage');
check(sale.contactId===lib.biginContactId('Hagadol',rows[1].source['Contact Id'])&&sale.crmCompanyId===companyRecord.id&&sale.due==='2026-03-16'&&sale.closingDate==='2026-03-20'&&sale.reviewFlags.length===1,'Exact source links, historical dates and differing quote value flag are retained');
const storedSale=sql.prepare('SELECT amount,status,due,payload FROM records WHERE id=?').get(sale.id);check(storedSale.amount===sale.amount&&storedSale.status===sale.stage&&storedSale.due===sale.due,'Database columns match opportunity payload');check(sql.prepare('SELECT COUNT(*) n FROM journal').get().n===0,'Pipeline import never posts financial entries');
globalThis.__erpDB.CRM_IMPORT_KEY=undefined;await saleCall({action:'verify'},403);
const sourcePath=process.env.BIGIN_CONTACTS_QA_SOURCE;let sourceContacts=0;
if(sourcePath){const prepared=JSON.parse(fs.readFileSync(sourcePath,'utf8'));sourceContacts=prepared.rows.length;
 for(const row of prepared.rows){const parsed=lib.biginRow(row),fields=lib.mapBiginContact(parsed,'Hagadol',[]);check(fields.name&&fields.biginContactId===row.source['Contact Id']&&fields.company==='Hagadol','Source contact maps without dropping identity');}
 const hashes=await Promise.all(prepared.rows.map(async row=>({source_id:row.source['Contact Id'],row_hash:await sec.fingerprint(lib.biginRow(row))})));
 prepared.manifestHash=await lib.crmRowManifest(hashes);fs.writeFileSync(sourcePath,JSON.stringify(prepared));
}
const companiesPath=process.env.BIGIN_COMPANIES_QA_SOURCE;let sourceCompanies=0;
if(companiesPath){const prepared=JSON.parse(fs.readFileSync(companiesPath,'utf8')),engine=await import(h.compile('lib/erp-engine.ts'));sourceCompanies=prepared.rows.length;
 for(const row of prepared.rows){const parsed=lib.biginRow(row,'Companies'),fields=lib.mapBiginCompany(parsed,'Hagadol'),plan=engine.buildPlan(fields,{records:[],journal:[],audit:[]});check(plan.writes.length===1&&plan.writes[0].biginCompanyId===row.source['Company Id']&&plan.writes[0].type==='crm_company'&&plan.entries.length===0,'Source company maps to CRM without ledger entries');}
 prepared.manifestHash=await lib.crmRowManifest(await Promise.all(prepared.rows.map(async row=>({source_id:row.source['Company Id'],row_hash:await sec.fingerprint(lib.biginRow(row,'Companies'))}))));fs.writeFileSync(companiesPath,JSON.stringify(prepared));
}
const pipelinesPath=process.env.BIGIN_PIPELINES_QA_SOURCE;let sourceOpportunities=0;
if(pipelinesPath){const p=JSON.parse(fs.readFileSync(pipelinesPath,'utf8')),engine=await import(h.compile('lib/erp-engine.ts'));sourceOpportunities=p.rows.length;
 const fixtures=p.rows.flatMap(row=>{const s=row.source;return [{id:lib.biginCompanyId('Hagadol',s['Company Name.id']),type:'crm_company',company:'Hagadol',name:s['Company Name'],biginCompanyId:s['Company Name.id']},{id:lib.biginContactId('Hagadol',s['Contact Name.id']),type:'contact',company:'Hagadol',name:s['Contact Name'],biginContactId:s['Contact Name.id'],crmCompanyId:lib.biginCompanyId('Hagadol',s['Company Name.id'])}];});
 for(const row of p.rows){const fields=lib.mapBiginSale(lib.biginRow(row,'Pipelines'),'Hagadol',fixtures),plan=engine.buildPlan(fields,{records:fixtures,journal:[],audit:[]});check(plan.writes[0].amount===Number(row.source.Amount)&&plan.writes[0].status==='Pending deposit'&&plan.writes[0].contactId&&plan.writes[0].crmCompanyId&&!plan.entries.length,'Supplied pipeline preserves money, stage and exact links');}
 p.manifestHash=await lib.crmRowManifest(await Promise.all(p.rows.map(async row=>({source_id:row.source['Sale Id'],row_hash:await sec.fingerprint(lib.biginRow(row,'Pipelines'))}))));fs.writeFileSync(pipelinesPath,JSON.stringify(p));
}
console.log(JSON.stringify({sourceOpportunities,sourceCompanies,passed,failed:0,sourceContacts,liveProductionTouched:false}));sql.close();fs.rmSync(temp,{recursive:true,force:true});
