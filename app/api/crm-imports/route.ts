export const runtime='nodejs';
import type {SQLDatabase,SQLStatement,ObjectStore} from '@/lib/storage-types';
import {env} from '@/lib/runtime';
import {authenticate,AccessError,jsonBody,securityReply,securityFailure,verifyWrite,rateLimit,fingerprint} from '@/lib/security';
import {canWriteRecord,canReadRecord} from '@/lib/access-policy';
import {buildPlan} from '@/lib/erp-engine';
import {biginRow,crmImportSpec,mapBiginContact,mapBiginCompany,mapBiginSale,mapBiginTask,mapBiginStageHistory,biginDate,crmRowManifest} from '@/lib/crm-import';
import {bytesHash} from '@/lib/finance-import-revisions';
export const dynamic='force-dynamic';
const cfg=()=>env as unknown as {DB:SQLDatabase;BUCKET:ObjectStore;ERP_OWNER_EMAIL?:string;CRM_IMPORT_KEY?:string;CRM_IMPORT_SOURCE_HASH?:string;CRM_IMPORT_COMPANY?:string;CRM_IMPORT_EXPIRES_AT?:string};
async function writer(req:Request,company:string,hash:string){
 const c=cfg(),key=req.headers.get('x-crm-import-key');
 if(key){if(!c.CRM_IMPORT_KEY||key.length>200||await fingerprint(key)!==await fingerprint(c.CRM_IMPORT_KEY)||!c.CRM_IMPORT_SOURCE_HASH?.split(',').includes(hash)||c.CRM_IMPORT_COMPANY!==company||!c.CRM_IMPORT_EXPIRES_AT||Date.parse(c.CRM_IMPORT_EXPIRES_AT)<=Date.now()||!Number.isFinite(Date.parse(c.CRM_IMPORT_EXPIRES_AT)))throw new AccessError('CRM import access could not be verified.');verifyWrite(req);await rateLimit(c.DB,'bigin-import-'+hash);return 'Authorised Bigin CRM import';}
 const {access}=await authenticate(c,req);if(!canWriteRecord(access,{company,type:'contact',status:'Active'} as any,'create'))throw new AccessError('Your role cannot import these contacts.');return access.email;
}
export async function POST(req:Request){try{
 const input:any=await jsonBody(req),spec=crmImportSpec(input),actor=await writer(req,spec.company,spec.sourceHash),c=cfg(),d=c.DB;
 const batch:any=await d.prepare('SELECT * FROM crm_import_batches WHERE id=?').bind(spec.id).first();
 if(batch&&(batch.manifest_hash!==spec.manifestHash||batch.expected_rows!==spec.expectedRows||batch.filename!==spec.filename||batch.kind!==spec.kind))throw new AccessError('This source export already has different import details.',409);
 if(input.action==='verify'){
  if(!batch)throw new AccessError('CRM import not found.',404);
  const rows=await d.prepare('SELECT source_id,row_hash,record_id,source_payload FROM crm_import_rows WHERE batch_id=?').bind(spec.id).all<any>(),saved=await d.prepare("SELECT r.id,r.company,r.type,r.payload FROM records r JOIN crm_import_rows i ON i.record_id=r.id WHERE i.batch_id=?").bind(spec.id).all<any>();
  return securityReply({id:spec.id,status:batch.status,count:rows.results.length,savedTasks:spec.kind==='Tasks'?saved.results.length:0,taskStatuses:spec.kind==='Tasks'?{open:saved.results.filter((r:any)=>JSON.parse(r.payload).status==='Open').length,inProgress:saved.results.filter((r:any)=>JSON.parse(r.payload).status==='In progress').length,done:saved.results.filter((r:any)=>JSON.parse(r.payload).status==='Done').length}:undefined,tasks:spec.kind==='Tasks'?saved.results.map((r:any)=>{const p=JSON.parse(r.payload);return {sourceId:p.biginTaskId,status:p.status,due:p.due,completedDate:p.completedDate,contactId:p.contactId,crmCompanyId:p.crmCompanyId,reviewFlags:p.importReviewFlags}}):undefined,currentOpportunities:spec.kind==='StageHistory'?[...new Map(saved.results.map((r:any)=>{const p=JSON.parse(r.payload);return [r.id,{id:r.id,name:p.name,stage:p.status,amount:p.amount,version:p.version}]})).values()]:undefined,savedHistoryEntries:spec.kind==='StageHistory'?rows.results.length:0,stageHistory:spec.kind==='StageHistory'?rows.results.map((r:any)=>mapBiginStageHistory(biginRow(JSON.parse(r.source_payload),'StageHistory'),spec.company,saved.results.map((s:any)=>({...JSON.parse(s.payload),id:s.id,company:s.company,type:s.type})))):undefined,savedOpportunities:spec.kind==='Pipelines'?saved.results.length:0,opportunities:spec.kind==='Pipelines'?saved.results.map((r:any)=>{const p=JSON.parse(r.payload);return {id:r.id,sourceId:p.biginSaleId,name:p.name,stage:p.status,amount:p.amount,quoteValue:p.quoteValue,contactId:p.contactId,crmCompanyId:p.crmCompanyId,closingDate:p.closingDate,due:p.due,reviewFlags:p.importReviewFlags}}):undefined,savedContacts:spec.kind==='Contacts'?saved.results.length:0,savedCompanies:spec.kind==='Companies'?saved.results.length:0,manifestHash:await crmRowManifest(rows.results),company:spec.company,duplicateCompanies:spec.kind==='Companies'?saved.results.filter((r:any)=>JSON.parse(r.payload).biginDuplicateSourceIds?.length).length:0,reviewCompanies:spec.kind==='Companies'?saved.results.filter((r:any)=>JSON.parse(r.payload).importReviewFlags?.length).length:0,duplicateContacts:saved.results.filter((r:any)=>{const p=JSON.parse(r.payload);return p.biginDuplicateSourceIds?.length||p.existingDuplicateContactIds?.length}).length,withoutContactChannel:saved.results.filter((r:any)=>{const p=JSON.parse(r.payload);return ![p.email,p.phone,p.mobile,p.officePhone,p.homePhone].some(Boolean)}).length,sourceArchiveSaved:!!batch.archive_key});
 }
 if(input.action==='linkContacts'){
  if(!batch||batch.status!=='Complete'||spec.kind!=='Companies')throw new AccessError('Complete the companies import before linking contacts.',409);
  const accounts=await d.prepare("SELECT r.id,r.payload FROM records r JOIN crm_import_rows i ON i.record_id=r.id WHERE i.batch_id=? AND r.company=? AND r.type='crm_company'").bind(spec.id,spec.company).all<any>();
  const bySource=new Map(accounts.results.map((r:any)=>[JSON.parse(r.payload).biginCompanyId,r.id]));
  const contacts=await d.prepare("SELECT id,version,payload FROM records WHERE company=? AND type='contact'").bind(spec.company).all<any>();
  const edits:SQLStatement[]=[];let linked=0,conflicts=0,unmatched=0;
  for(const r of contacts.results){const p=JSON.parse(r.payload),account=bySource.get(p.biginCompanyId);if(!p.biginCompanyId)continue;if(!account){unmatched++;continue;}if(p.crmCompanyId){if(p.crmCompanyId===account)linked++;else conflicts++;continue;}
   p.crmCompanyId=account;p.version=r.version+1;
   edits.push(d.prepare("UPDATE records SET payload=?,version=version+1 WHERE id=? AND company=? AND type='contact' AND version=? AND COALESCE(json_extract(payload,'$.crmCompanyId'),'')=''").bind(JSON.stringify(p),r.id,spec.company,r.version));
   edits.push(d.prepare("INSERT OR IGNORE INTO audit (id,company,actor,action,record,date) SELECT ?,?,?,'Linked Bigin company',?,? WHERE EXISTS (SELECT 1 FROM records WHERE id=? AND version=? AND json_extract(payload,'$.crmCompanyId')=?)").bind('crm-link-'+spec.id+'-'+r.id,spec.company,actor,r.id,new Date().toISOString(),r.id,p.version,account));
  }
  for(let n=0;n<edits.length;n+=100)await d.batch(edits.slice(n,n+100));
  const checked=await d.prepare("SELECT payload FROM records WHERE company=? AND type='contact'").bind(spec.company).all<any>();linked=checked.results.filter((r:any)=>{const p=JSON.parse(r.payload);return !!p.biginCompanyId&&bySource.get(p.biginCompanyId)===p.crmCompanyId}).length;
  return securityReply({linked,conflicts,unmatched});
 }
 if(input.action==='archive'){
  if(!batch)throw new AccessError('Start the contacts import before saving its source.',409);
  if(typeof input.contentBase64!=='string'||input.contentBase64.length>400000)throw new AccessError('Check the Bigin source archive.',400);
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(input.contentBase64),ch=>ch.charCodeAt(0));}catch{throw new AccessError('The source archive encoding is invalid.',400);}
  if(bytes.length<4||bytes[0]!==80||bytes[1]!==75||await bytesHash(bytes)!==spec.sourceHash)throw new AccessError('The archive does not match the authorised source.',409);
  const key='crm-imports/'+spec.id+'/'+spec.filename;
  const object=await c.BUCKET.put(key,bytes,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/zip'},customMetadata:{sha256:spec.sourceHash}});
  if(!object){const old=await c.BUCKET.head(key);if(!old||old.customMetadata?.sha256!==spec.sourceHash||old.size!==bytes.length)throw new AccessError('The saved source archive differs.',409);}
  await d.prepare('UPDATE crm_import_batches SET archive_key=? WHERE id=? AND (archive_key=\'\' OR archive_key=?)').bind(key,spec.id,key).run();return securityReply({sourceArchiveSaved:true,sourceHash:spec.sourceHash});
 }
 if(input.action==='complete'){
  if(!batch)throw new AccessError('Start the contacts import first.',409);
  const rows=await d.prepare('SELECT source_id,row_hash,record_id FROM crm_import_rows WHERE batch_id=?').bind(spec.id).all<any>();
  if(rows.results.length!==spec.expectedRows||await crmRowManifest(rows.results)!==spec.manifestHash)throw new AccessError('The saved CRM records do not match the complete export.',409);
  const saved:any=await d.prepare("SELECT COUNT(*) count FROM records r JOIN crm_import_rows i ON i.record_id=r.id WHERE i.batch_id=? AND r.type=? AND r.company=?").bind(spec.id,spec.recordType,spec.company).first();
  const archive=batch.archive_key?await c.BUCKET.head(batch.archive_key):null;if(saved.count!==spec.expectedRows||!archive||archive.customMetadata?.sha256!==spec.sourceHash)throw new AccessError('Verify all saved CRM records and the source archive.',409);
  const now=new Date().toISOString();await d.batch([d.prepare("INSERT INTO security_events (id,actor,action,target,date) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM crm_import_batches WHERE id=? AND status='Uploading')").bind('crm-complete-'+spec.id,actor,'Bigin '+spec.kind.toLowerCase()+' import completed',spec.id,now,spec.id),d.prepare("UPDATE crm_import_batches SET status='Complete',completed=? WHERE id=? AND status='Uploading'").bind(now,spec.id)]);return securityReply({id:spec.id,status:'Complete',count:saved.count,company:spec.company});
 }
 if(input.action!=='append'||!Array.isArray(input.rows)||input.rows.length<1||input.rows.length>50)throw new AccessError('Import between 1 and 50 Bigin records at a time.',400);
 const rows=await Promise.all(input.rows.map(async(v:any)=>{const row=biginRow(v,spec.kind);return {row,hash:await fingerprint(row)}}));
 if(new Set(rows.map(r=>r.row.source[spec.sourceKey])).size!==rows.length)throw new AccessError('Repeated Bigin source IDs in this request.',400);
 const raw=spec.kind==='Companies'?await d.prepare("SELECT * FROM records WHERE company=? AND type='crm_company' AND (json_extract(payload,'$.biginCompanyId') IN ("+rows.map(()=>'?').join(',')+"))").bind(spec.company,...rows.map(r=>r.row.source[spec.sourceKey])).all<any>():await d.prepare("SELECT * FROM records WHERE company=? AND type IN ('contact','crm_company','deal','task')").bind(spec.company).all<any>(),records=raw.results.map((r:any)=>({...JSON.parse(r.payload),...r}));
 const prior=await d.prepare('SELECT source_id,row_hash FROM crm_import_rows WHERE batch_id=? AND source_id IN ('+rows.map(()=>'?').join(',')+')').bind(spec.id,...rows.map(r=>r.row.source[spec.sourceKey])).all<any>(),priorById=new Map(prior.results.map((r:any)=>[r.source_id,r]));
 const now=new Date().toISOString(),statements=[d.prepare("INSERT OR IGNORE INTO crm_import_batches (id,company,source_hash,filename,expected_rows,manifest_hash,kind,status,archive_key,created,actor) VALUES (?,?,?,?,?,?,?,'Uploading','',?,?)").bind(spec.id,spec.company,spec.sourceHash,spec.filename,spec.expectedRows,spec.manifestHash,spec.kind,now,actor)];
 for(const {row,hash} of rows){
  const sourceId=row.source[spec.sourceKey],stored:any=priorById.get(sourceId);
  if(stored){if(stored.row_hash!==hash)throw new AccessError('A saved Bigin source row differs from this export.',409);continue;}
  if(batch?.status==='Complete')throw new AccessError('This completed contacts import is preserved.',409);
  if(spec.kind==='StageHistory'){
   const history=mapBiginStageHistory(row,spec.company,records);
   const priorHistory:any=await d.prepare("SELECT source_payload FROM crm_import_rows i JOIN crm_import_batches b ON b.id=i.batch_id WHERE b.company=? AND b.kind='StageHistory' AND i.source_id=?").bind(spec.company,sourceId).first();if(priorHistory)throw new AccessError('This stage history already exists from an earlier export.',409);
   statements.push(d.prepare("INSERT INTO crm_import_rows (batch_id,source_id,record_id,row_hash,source_payload) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM crm_import_batches WHERE id=? AND status='Uploading') AND (SELECT COUNT(*) FROM crm_import_rows WHERE batch_id=?)<?").bind(spec.id,sourceId,history.dealId,hash,JSON.stringify(row),spec.id,spec.id,spec.expectedRows));
   statements.push(d.prepare("INSERT INTO audit (id,company,actor,action,record,date) SELECT ?,?,?,'Imported Bigin stage history',?,? WHERE EXISTS (SELECT 1 FROM crm_import_rows WHERE batch_id=? AND source_id=? AND row_hash=?)").bind('crm-history-'+spec.company+'-'+sourceId,spec.company,actor,history.dealId,now,spec.id,sourceId,hash));continue;
  }
  const input=spec.kind==='Companies'?mapBiginCompany(row,spec.company):spec.kind==='Pipelines'?mapBiginSale(row,spec.company,records):spec.kind==='Tasks'?mapBiginTask(row,spec.company,records):mapBiginContact(row,spec.company,records),existing=records.find((r:any)=>r.id===input.requestId||(r.type===spec.recordType&&(spec.kind==='Companies'?r.biginCompanyId:spec.kind==='Pipelines'?r.biginSaleId:spec.kind==='Tasks'?r.biginTaskId:r.biginContactId)===sourceId));
  if(existing)throw new AccessError('This Bigin contact already exists from an earlier export. Review updates separately.',409);
  const plan=buildPlan(input,{records,journal:[],audit:[]}),r=plan.writes[0];if(plan.writes.length!==1||plan.entries.length||r.type!==spec.recordType||r.company!==spec.company)throw new AccessError('The CRM mapping is invalid.',400);r.biginImportSourceHash=spec.sourceHash;if(spec.kind==='Tasks'&&r.status==='Done')r.completedDate=biginDate(row.source['Closed Time']);
  statements.push(d.prepare("INSERT INTO records (id,company,type,name,status,amount,paid,credited,version,date,due,payload,created) SELECT ?,?,?,?,?,?,0,0,0,?,?,?,? WHERE EXISTS (SELECT 1 FROM crm_import_batches WHERE id=? AND status='Uploading') AND (SELECT COUNT(*) FROM crm_import_rows WHERE batch_id=?)<?").bind(r.id,r.company,spec.recordType,r.name,r.status,r.amount,r.date,r.due,JSON.stringify(r),r.created,spec.id,spec.id,spec.expectedRows));
  statements.push(d.prepare("INSERT INTO crm_import_rows (batch_id,source_id,record_id,row_hash,source_payload) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM records WHERE id=? AND company=? AND type=?)").bind(spec.id,sourceId,r.id,hash,JSON.stringify(row),r.id,spec.company,spec.recordType));
  statements.push(d.prepare("INSERT INTO audit (id,company,actor,action,record,date) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM crm_import_rows WHERE batch_id=? AND source_id=? AND row_hash=?)").bind('crm-import-'+r.id,r.company,actor,'Imported Bigin '+(spec.kind==='Companies'?'company':spec.kind==='Pipelines'?'opportunity':spec.kind==='Tasks'?'task':'contact'),r.id,now,spec.id,sourceId,hash));
 }
 const count:any=await d.prepare('SELECT COUNT(*) count FROM crm_import_rows WHERE batch_id=?').bind(spec.id).first();if((count?.count||0)+rows.filter(x=>!priorById.has(x.row.source[spec.sourceKey])).length>spec.expectedRows)throw new AccessError('The import exceeds the expected record count.',409);
 await d.batch(statements);const saved:any=await d.prepare('SELECT COUNT(*) count FROM crm_import_rows WHERE batch_id=?').bind(spec.id).first();
 const checked=await d.prepare('SELECT source_id,row_hash FROM crm_import_rows WHERE batch_id=? AND source_id IN ('+rows.map(()=>'?').join(',')+')').bind(spec.id,...rows.map(r=>r.row.source[spec.sourceKey])).all<any>();if(checked.results.length!==rows.length||checked.results.some((r:any)=>rows.find(x=>x.row.source[spec.sourceKey]===r.source_id)?.hash!==r.row_hash))throw new AccessError('The source contacts could not all be saved as supplied.',409);
 return securityReply({id:spec.id,status:batch?.status||'Uploading',count:saved.count,company:spec.company});
 }catch(e){return securityFailure(e)}}
