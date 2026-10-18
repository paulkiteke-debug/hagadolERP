export const runtime='nodejs';
import type {SQLDatabase,ObjectStore} from '@/lib/storage-types';
import {env} from '@/lib/runtime';
import {AccessError,jsonBody,securityReply,securityFailure,fingerprint} from '@/lib/security';
import {importRow,batchSpec,rowManifest,importCompanies} from '@/lib/finance-import';
import {financeImportReader,financeImportWriter,authorisedImportSource} from '@/lib/finance-import-access';
import {revisionMetadata,displayBatch} from '@/lib/finance-import-revisions';
export const dynamic='force-dynamic';
const cfg=()=>env as unknown as {DB:SQLDatabase;BUCKET:ObjectStore;ERP_OWNER_EMAIL?:string;FINANCE_IMPORT_KEY?:string;FINANCE_IMPORT_SOURCE_HASH?:string};
const summarySQL='SELECT b.*,COUNT(r.row_key) saved_rows,v.replaces_batch_id,v.metadata,n.batch_id superseded_by FROM finance_import_batches b LEFT JOIN finance_import_rows r ON r.batch_id=b.id LEFT JOIN finance_import_revisions v ON v.batch_id=b.id LEFT JOIN finance_import_revisions n ON n.replaces_batch_id=b.id';
export async function GET(req:Request){try{
 await financeImportReader(cfg(),req);const d=cfg().DB,url=new URL(req.url),id=url.searchParams.get('batch');
 if(!id){const result=await d.prepare(summarySQL+' GROUP BY b.id ORDER BY CASE WHEN n.batch_id IS NOT NULL THEN 2 WHEN b.status=\'Uploading\' THEN 1 ELSE 0 END,b.created DESC LIMIT 50').all<any>();return securityReply({batches:result.results.map(displayBatch)});}
 const batch:any=await d.prepare(summarySQL+' WHERE b.id=? GROUP BY b.id').bind(id).first();if(!batch)throw new AccessError('Import not found.',404);
 const company=url.searchParams.get('company')||'Group';if(company!=='Group'&&!importCompanies.includes(company))throw new AccessError('Choose a valid company filter.',400);
 const offset=Number(url.searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>10000)throw new AccessError('Choose a valid page.',400);
 const scope=company==='Group'?'':' AND company=?',args=company==='Group'?[id]:[id,company];
 const [rows,counts]=await Promise.all([d.prepare('SELECT payload FROM finance_import_rows WHERE batch_id=?'+scope+' ORDER BY source_sheet,CAST(json_extract(payload,\'$.source_row\') AS INTEGER),source_cell LIMIT 100 OFFSET ?').bind(...args,offset).all<any>(),d.prepare('SELECT company,COUNT(*) count FROM finance_import_rows WHERE batch_id=? GROUP BY company').bind(id).all<any>()]);
 const total=company==='Group'?batch.saved_rows:counts.results.find((x:any)=>x.company===company)?.count||0;
 const meta=batch.metadata?JSON.parse(batch.metadata):null,files=await d.prepare('SELECT filename,sha256,bytes FROM finance_import_files WHERE batch_id=? ORDER BY filename').bind(id).all<any>();
 return securityReply({batch:displayBatch(batch),rows:rows.results.map((r:any)=>{const row=JSON.parse(r.payload);return {...row,...(meta?.recordStatusById?.[row.id]?{record_status:meta.recordStatusById[row.id]}:{})}}),counts:counts.results,total,offset,files:files.results,reviewCounts:meta?{prepared:Object.values(meta.recordStatusById).filter(s=>s==='Prepared for staging').length,held:Object.values(meta.recordStatusById).filter(s=>s==='Hold for review').length}:null});
 }catch(e){return securityFailure(e)}}
export async function POST(req:Request){try{
 const c=cfg(),auth=await financeImportWriter(c,req),d=c.DB,input:any=await jsonBody(req),spec=batchSpec(input);
 authorisedImportSource(auth,req,spec.sourceHash);
 const old:any=await d.prepare('SELECT * FROM finance_import_batches WHERE id=?').bind(spec.id).first();
 if(old&&(old.filename!==spec.filename||old.expected_rows!==spec.expectedRows||old.manifest_hash!==spec.manifestHash))throw new AccessError('This workbook already has different import details.',409);
 if(input.action==='activate_revision'){
  if(!old)throw new AccessError('Start the source import first.',409);
  const rows=await d.prepare('SELECT row_key,row_hash FROM finance_import_rows WHERE batch_id=?').bind(spec.id).all<any>();
  if(rows.results.length!==spec.expectedRows||await rowManifest(rows.results)!==spec.manifestHash)throw new AccessError('The revision rows do not match the complete extract.',409);
  const meta=revisionMetadata(input.metadata,rows.results.map((r:any)=>r.row_key)),pre=input.replaces;
  if(!pre||!/^fi_[a-f0-9]{64}$/.test(pre.id)||pre.id===spec.id||!/^[a-f0-9]{64}$/.test(pre.manifestHash))throw new AccessError('Choose the earlier source import to supersede.',400);
  const previous:any=await d.prepare('SELECT b.*,v.metadata FROM finance_import_batches b LEFT JOIN finance_import_revisions v ON v.batch_id=b.id WHERE b.id=?').bind(pre.id).first();
  if(!previous||previous.status!=='Review'||previous.manifest_hash!==pre.manifestHash||(previous.metadata?JSON.parse(previous.metadata).originalSource.sha256:previous.source_hash)!==meta.originalSource.sha256)throw new AccessError('The earlier import does not match this source revision.',409);
  const files=await d.prepare('SELECT filename,sha256,bytes,object_key FROM finance_import_files WHERE batch_id=?').bind(spec.id).all<any>();
  if(files.results.length!==meta.files.length||meta.files.some(f=>!files.results.some((v:any)=>v.filename===f.filename&&v.sha256===f.sha256&&v.bytes===f.bytes)))throw new AccessError('Upload and verify all supporting files before activating the revision.',409);
  const objects=await Promise.all(files.results.map((f:any)=>c.BUCKET.head(f.object_key)));if(objects.some((o:any,i:number)=>!o||o.size!==files.results[i].bytes||o.customMetadata?.sha256!==files.results[i].sha256))throw new AccessError('A supporting file needs verification.',409);
  const revision:any=await d.prepare('SELECT * FROM finance_import_revisions WHERE batch_id=? OR replaces_batch_id=?').bind(spec.id,pre.id).first();
  if(revision){if(revision.batch_id!==spec.id||revision.replaces_batch_id!==pre.id||await fingerprint(JSON.parse(revision.metadata))!==await fingerprint(meta))throw new AccessError('A different revision already supersedes this source.',409);return securityReply({id:spec.id,status:'Review',count:rows.results.length,replaces:pre.id,files:files.results.length});}
  if(old.status!=='Uploading')throw new AccessError('This completed source import is preserved.',409);
  const overlap:any=await d.prepare('SELECT COUNT(*) count FROM finance_import_rows a JOIN finance_import_rows b ON a.row_key=b.row_key AND a.source_sheet=b.source_sheet AND a.source_cell=b.source_cell WHERE a.batch_id=? AND b.batch_id=?').bind(spec.id,pre.id).first();
  if(overlap.count<Math.min(previous.expected_rows,spec.expectedRows)*0.9)throw new AccessError('This revision does not sufficiently match the earlier source records.',409);
  const now=new Date().toISOString();
  await d.batch([d.prepare('INSERT INTO finance_import_revisions (batch_id,replaces_batch_id,metadata,created,actor) VALUES (?,?,?,?,?)').bind(spec.id,pre.id,JSON.stringify(meta),now,auth.actor),d.prepare("UPDATE finance_import_batches SET status='Review',completed=? WHERE id=? AND status='Uploading'").bind(now,spec.id),d.prepare("INSERT INTO security_events (id,actor,action,target,date) VALUES (?,?,'Cleaned finance revision activated',?,?)").bind('finance-revision-'+spec.sourceHash,auth.actor,spec.id,now)]);
  return securityReply({id:spec.id,status:'Review',count:rows.results.length,replaces:pre.id,files:files.results.length});
 }
 if(input.action==='inspect'){
  if(!old)throw new AccessError('Import not found.',404);
  const [revision,counts,files,rows,retired]=await Promise.all([d.prepare('SELECT * FROM finance_import_revisions WHERE batch_id=?').bind(spec.id).first<any>(),d.prepare('SELECT company,COUNT(*) count FROM finance_import_rows WHERE batch_id=? GROUP BY company').bind(spec.id).all<any>(),d.prepare('SELECT filename,sha256,bytes FROM finance_import_files WHERE batch_id=? ORDER BY filename').bind(spec.id).all<any>(),d.prepare('SELECT row_key,row_hash,payload FROM finance_import_rows WHERE batch_id=?').bind(spec.id).all<any>(),d.prepare('SELECT batch_id FROM finance_import_revisions WHERE replaces_batch_id=?').bind(spec.id).first<any>()]);
  const meta=revision?JSON.parse(revision.metadata):null;
  return securityReply({id:spec.id,status:retired?'Superseded':old.status,count:rows.results.length,manifestHash:await rowManifest(rows.results),counts:counts.results,files:files.results,replaces:revision?.replaces_batch_id||null,reviewCounts:meta?{prepared:Object.values(meta.recordStatusById).filter(s=>s==='Prepared for staging').length,held:Object.values(meta.recordStatusById).filter(s=>s==='Hold for review').length}:null,checks:{duplicateRecords:rows.results.filter((r:any)=>JSON.parse(r.payload).possible_duplicates).length,missingAmounts:rows.results.filter((r:any)=>JSON.parse(r.payload).amount_UGX===null).length},ledgerPosting:'Not posted'});
 }
 if(input.action==='verify'){
  if(!old)throw new AccessError('Import not found.',404);
  const rows=await d.prepare('SELECT row_key,row_hash FROM finance_import_rows WHERE batch_id=?').bind(spec.id).all<any>();
  return securityReply({id:spec.id,status:old.status,count:rows.results.length,manifestHash:await rowManifest(rows.results)});
 }
 if(input.action==='complete'){
  if(!old)throw new AccessError('Start the import first.',400);
  const rows=await d.prepare('SELECT row_key,row_hash FROM finance_import_rows WHERE batch_id=?').bind(spec.id).all<any>();
  if(rows.results.length!==spec.expectedRows||await rowManifest(rows.results)!==spec.manifestHash)throw new AccessError('The uploaded rows do not match the complete workbook extract.',409);
  const now=new Date().toISOString();
  await d.batch([d.prepare("INSERT INTO security_events (id,actor,action,target,date) SELECT ?,?,'Workbook uploaded for finance review',?,? WHERE EXISTS (SELECT 1 FROM finance_import_batches WHERE id=? AND status='Uploading')").bind('finance-import-'+spec.sourceHash,auth.actor,spec.id,now,spec.id),d.prepare("UPDATE finance_import_batches SET status='Review',completed=? WHERE id=? AND status='Uploading'").bind(now,spec.id)]);
  return securityReply({id:spec.id,status:'Review',count:rows.results.length});
 }
 if(input.action!=='append'||!Array.isArray(input.rows)||input.rows.length<1||input.rows.length>50)throw new AccessError('Upload between 1 and 50 source rows at a time.',400);
 if(old?.status==='Review')throw new AccessError('This completed source import is preserved. Start a new workbook for further data.',409);
 const rows=await Promise.all(input.rows.map(async(v:any)=>{const r=importRow(v);return {row:r,hash:await fingerprint(r)}}));
 if(new Set(rows.map(x=>x.row.id)).size!==rows.length||new Set(rows.map(x=>x.row.source_sheet+'|'+x.row.source_cell)).size!==rows.length)throw new AccessError('The upload contains repeated source cells.',400);
 const existing=await d.prepare('SELECT row_key,row_hash FROM finance_import_rows WHERE batch_id=? AND row_key IN ('+rows.map(()=>'?').join(',')+')').bind(spec.id,...rows.map(x=>x.row.id)).all<any>();
 if(existing.results.some((x:any)=>rows.find(r=>r.row.id===x.row_key)?.hash!==x.row_hash))throw new AccessError('A saved source row differs from this upload.',409);
 const now=new Date().toISOString(),statements=[d.prepare('INSERT OR IGNORE INTO finance_import_batches (id,source_hash,filename,expected_rows,manifest_hash,status,created,actor) VALUES (?,?,?,?,?,\'Uploading\',?,?)').bind(spec.id,spec.sourceHash,spec.filename,spec.expectedRows,spec.manifestHash,now,auth.actor)];
 for(const {row:r,hash} of rows)statements.push(d.prepare("INSERT OR IGNORE INTO finance_import_rows (batch_id,row_key,company,source_sheet,source_cell,payload,row_hash) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM finance_import_batches WHERE id=? AND status='Uploading' AND manifest_hash=? AND expected_rows=? AND filename=?) AND (SELECT COUNT(*) FROM finance_import_rows WHERE batch_id=?)<?").bind(spec.id,r.id,r.company,r.source_sheet,r.source_cell,JSON.stringify(r),hash,spec.id,spec.manifestHash,spec.expectedRows,spec.filename,spec.id,spec.expectedRows));
 await d.batch(statements);
 const saved=await d.prepare('SELECT row_key,row_hash FROM finance_import_rows WHERE batch_id=? AND row_key IN ('+rows.map(()=>'?').join(',')+')').bind(spec.id,...rows.map(x=>x.row.id)).all<any>();
 if(saved.results.length!==rows.length||saved.results.some((x:any)=>rows.find(r=>r.row.id===x.row_key)?.hash!==x.row_hash))throw new AccessError('The source rows could not be saved as supplied. Review the workbook batch.',409);
 const count:any=await d.prepare('SELECT COUNT(*) count FROM finance_import_rows WHERE batch_id=?').bind(spec.id).first();if(count.count>spec.expectedRows)throw new AccessError('The import has more rows than expected. Review its source.',409);
 return securityReply({id:spec.id,status:'Uploading',count:count.count});
 }catch(e){return securityFailure(e)}}
