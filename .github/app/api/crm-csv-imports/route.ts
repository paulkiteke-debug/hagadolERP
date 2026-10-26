export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
import {authenticate,AccessError,jsonBody,securityReply,securityFailure,fingerprint} from '@/lib/security';
import {canImportCRM,canPreviewCRMImport} from '@/lib/access-policy';
import {biginRow,biginSourceKey,biginRecordType,phoneKey} from '@/lib/crm-import';
import {mapCSVSource} from '@/lib/crm-csv';
import {buildPlan} from '@/lib/erp-engine';
import type {SQLStatement} from '@/lib/storage-types';
import type {RecordRow} from '@/lib/erp-primitives';
type Session={id:string;company:string;actor:string;filename:string;source_hash:string;manifest_hash:string;kind:string;expected_rows:number;status:string;cursor:number;payload:string;summary:string;approved_by:string|null;created:string};
type StagedRow={ordinal:number;source_id:string;row_hash:string;source:string};
type StageItem={ordinal:number;source:Record<string,string>};
type CSVPlan={ordinal:number;sourceId:string;rowHash:string;record:RecordRow};


export async function POST(req:Request){try{
 const {access}=await authenticate(env,req),v=await jsonBody(req),d=env.DB;
 if(!canPreviewCRMImport(access))throw new AccessError('Your role cannot review Bigin files.');
 const now=new Date().toISOString();
 if(v.action==='start'){
  if(!access.companies.includes(v.company)||!['Hagadol','WMK'].includes(v.company))throw new AccessError('Choose an authorised company.');
  if(!['Contacts','Companies'].includes(v.kind)||!Number.isInteger(v.expectedRows)||v.expectedRows<1||v.expectedRows>10000||typeof v.filename!=='string'||!v.filename.toLowerCase().endsWith('.csv')||v.filename.length>200||/[\x00-\x1f/\\]/.test(v.filename)||!/^[a-f0-9]{64}$/.test(v.sourceHash)||!/^[a-f0-9]{64}$/.test(v.manifestHash))throw new AccessError('Choose an original Contacts or Companies CSV with at most 10,000 records.',400);
  const id='csv_'+v.company+'_'+v.sourceHash;
  const old=await d.prepare('SELECT * FROM crm_csv_sessions WHERE id=?').bind(id).first<Session>();
  if(old&&(old.actor!==access.id&&!canImportCRM(access)||old.kind!==v.kind||old.expected_rows!==v.expectedRows||old.manifest_hash!==v.manifestHash))throw new AccessError('This file already has a different import session. Ask the original reviewer to continue.',409);
  await d.prepare("INSERT OR IGNORE INTO crm_csv_sessions(id,company,actor,filename,source_hash,manifest_hash,kind,expected_rows,status,cursor,payload,summary,created) VALUES(?,?,?,?,?,?,?,?,'Uploading',0,'','{}',?)").bind(id,v.company,access.id,v.filename,v.sourceHash,v.manifestHash,v.kind,v.expectedRows,now).run();
  return securityReply({id,status:old?.status||'Uploading',cursor:old?.cursor||0});
 }
 if(typeof v.id!=='string'||v.id.length>100)throw new AccessError('Choose a staged import.',400);
 const session=await d.prepare('SELECT * FROM crm_csv_sessions WHERE id=?').bind(v.id).first<Session>();
 if(!session||!access.companies.includes(session.company)||session.actor!==access.id&&!canImportCRM(access))throw new AccessError('This import is unavailable to your account.');
 const key=biginSourceKey(session.kind);
 if(v.action==='stage'){
  if(session.status!=='Uploading')return securityReply({status:session.status});
  if(!Array.isArray(v.rows)||!v.rows.length||v.rows.length>50)throw new AccessError('Upload at most 50 source rows per request.',400);
  const ordinals=(v.rows as StageItem[]).map((item)=>item.ordinal);
  if(ordinals.some((n)=>!Number.isInteger(n)||n<0||n>=session.expected_rows)||new Set(ordinals).size!==ordinals.length)throw new AccessError('Check the source row numbers.',400);
  const staged=await d.prepare('SELECT ordinal,row_hash FROM crm_csv_rows WHERE session_id=? AND ordinal IN ('+ordinals.map(()=>'?').join(',')+')').bind(session.id,...ordinals).all<StagedRow>();
  const priorRows=new Map(staged.results.map(r=>[r.ordinal,r.row_hash]));
  const statements:SQLStatement[]=[];
  for(const item of v.rows){
   if(!Number.isInteger(item.ordinal)||item.ordinal<0||item.ordinal>=session.expected_rows)throw new AccessError('Source row is outside this file.',400);
   const source=biginRow({source:item.source,duplicateSourceIds:[]},session.kind).source,hash=await fingerprint(source);
   const prior=priorRows.get(item.ordinal);
   if(prior){if(prior!==hash)throw new AccessError('A staged source row differs from the original upload.',409);continue;}
   statements.push(d.prepare("INSERT INTO crm_csv_rows(session_id,ordinal,source_id,row_hash,source) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM crm_csv_sessions WHERE id=? AND status='Uploading')").bind(session.id,item.ordinal,source[key].trim(),hash,JSON.stringify(source),session.id));
  }
  try{await d.batch(statements);}catch{throw new AccessError('Repeated source ID or simultaneous upload. Review the file and retry.',409);}
  return securityReply({status:'Uploading'});
 }
 if(v.action==='review'){
  if(session.status!=='Uploading')return securityReply({status:session.status,summary:JSON.parse(session.summary),cursor:session.cursor});
  const rows=await d.prepare('SELECT * FROM crm_csv_rows WHERE session_id=? ORDER BY ordinal').bind(session.id).all<StagedRow>();
  if(rows.results.length!==session.expected_rows||rows.results.some((r,i)=>r.ordinal!==i)||await fingerprint(rows.results.map(r=>r.row_hash))!==session.manifest_hash)throw new AccessError('Upload all source rows before reviewing this file.',409);
  if(rows.results.reduce((n,r)=>n+new TextEncoder().encode(r.source).byteLength,0)>30*1024*1024)throw new AccessError('The source fields exceed the upload size limit.',413);
  const raw=await d.prepare("SELECT id,company,type,payload FROM records WHERE company=? AND type IN ('contact','crm_company')").bind(session.company).all<{id:string;company:string;type:string;payload:string}>();
  const existing:RecordRow[]=raw.results.map(r=>({...JSON.parse(r.payload),id:r.id,company:r.company,type:r.type}));
  const storedKey=session.kind==='Contacts'?'biginContactId':'biginCompanyId',type=biginRecordType(session.kind);
  const known=new Set(existing.filter(r=>r.type===type).map(r=>r[storedKey]).filter(Boolean));
  const sources=rows.results.map(r=>JSON.parse(r.source) as Record<string,string>);
  const channels=new Map<string,number>();
  const channelKeys=(s:Record<string,string>)=>[...(s.Email?.trim()?['e:'+s.Email.trim().toLowerCase()]:[]),...new Set([s.Phone,s.Mobile,s['Home Phone']].map(x=>phoneKey(x||'')).filter(x=>x.length>=7).map(x=>'p:'+x))];
  for(const source of sources)for(const k of channelKeys(source))channels.set(k,(channels.get(k)||0)+1);
  const existingChannels=new Map<string,Set<string>>();
  for(const r of existing.filter(r=>r.type===type))for(const k of channelKeys({Email:r.email||'',Phone:r.phone||'',Mobile:r.mobile||'','Home Phone':r.homePhone||''})){const set=existingChannels.get(k)||new Set<string>();set.add(r[storedKey]||r.id);existingChannels.set(k,set);}
  const issues:{row:number;message:string}[]=[],plans:CSVPlan[]=[];let duplicates=0,skipped=0,warningRows=0;
  for(let i=0;i<sources.length;i++){
   const source=sources[i],id=source[key].trim();
   if(known.has(id)){skipped++;continue;}
   try{
    const input=mapCSVSource(source,session.kind,session.company,existing,session.created);
    const duplicate=channelKeys(source).some(k=>(channels.get(k)||0)>1||[...(existingChannels.get(k)||[])].some(other=>other!==id));
    if(duplicate){duplicates++;input.importReviewFlags.push('Possible duplicate. Retained as a separate source identity.');}
    if(!source['Business Unit']?.trim())input.importReviewFlags.push('Business Unit is blank. Assigned to '+session.company+' by the reviewer.');
    if(input.importReviewFlags.length)warningRows++;
    const plan=buildPlan(input,{records:existing,journal:[],audit:[]});
    if(plan.writes.length!==1||plan.entries.length||plan.writes[0].type!==type)throw Error('Invalid CRM mapping.');
    plans.push({ordinal:i,sourceId:id,rowHash:rows.results[i].row_hash,record:plan.writes[0]});
   }catch(e){issues.push({row:i+2,message:e instanceof AccessError?e.message:'This source row needs review.'});}
  }
  const summary={total:sources.length,ready:plans.length,skipped,duplicates,warningRows,errors:issues.length,issues:issues.slice(0,100)};
  if(!issues.length)await d.prepare("UPDATE crm_csv_sessions SET status='Review',payload=?,summary=? WHERE id=? AND status='Uploading'").bind(JSON.stringify(plans),JSON.stringify(summary),session.id).run();
  return securityReply({status:issues.length?'Uploading':'Review',summary});
 }
 if(v.action==='approve'){
  if(!canImportCRM(access))throw new AccessError('Your role can review files but cannot approve imports.');
  if(v.confirmed!==true)throw new AccessError('Confirm the company and duplicate review before importing.',400);
  if(!['Review','Approved','Complete'].includes(session.status))throw new AccessError('Finish the server review before approval.',409);
  if(session.status==='Review')await d.batch([
   d.prepare("UPDATE crm_csv_sessions SET status='Approved',approved_by=? WHERE id=? AND status='Review'").bind(access.email,session.id),
   d.prepare('INSERT OR IGNORE INTO security_events(id,actor,action,target,date) VALUES(?,?,?,?,?)').bind('approved_'+session.id,access.email,'Approved Bigin CSV import',session.id,now),
  ]);
  return securityReply({status:session.status==='Complete'?'Complete':'Approved',cursor:session.cursor});
 }
 if(v.action==='post'){
  if(!canImportCRM(access))throw new AccessError('Your role cannot import records.');
  if(session.status==='Complete')return securityReply({status:'Complete',cursor:session.cursor,summary:JSON.parse(session.summary)});
  if(session.status!=='Approved'||!session.approved_by)throw new AccessError('Approve the reviewed file before importing.',409);
  if(v.cursor!==session.cursor)return securityReply({status:session.status,cursor:session.cursor});
  const plans=JSON.parse(session.payload) as CSVPlan[],next=Math.min(session.cursor+50,plans.length),chunk=plans.slice(session.cursor,next);
  const batchId='ci_'+session.company+'_'+session.source_hash;
  const statements:SQLStatement[]=[d.prepare('INSERT INTO operations(id,company,result,created,actor) VALUES(?,?,?,?,?)').bind(session.id+'_'+session.cursor,session.company,'CSV import batch',now,access.email),
   d.prepare("INSERT OR IGNORE INTO crm_import_batches(id,company,source_hash,filename,expected_rows,manifest_hash,kind,status,archive_key,created,actor) VALUES(?,?,?,?,?,?,?,'Uploading',?,?,?)").bind(batchId,session.company,session.source_hash,session.filename,plans.length,session.manifest_hash,session.kind,'database:'+session.id,session.created,access.email)];
  const stagedSources=chunk.length?await d.prepare('SELECT ordinal,source FROM crm_csv_rows WHERE session_id=? AND ordinal IN ('+chunk.map(()=>'?').join(',')+')').bind(session.id,...chunk.map((item)=>item.ordinal)).all<StagedRow>():{results:[]};
  const byOrdinal=new Map(stagedSources.results.map(r=>[r.ordinal,r]));
  for(const item of chunk){
   const r=item.record,source=byOrdinal.get(item.ordinal);
   if(!source)throw new AccessError('The staged source is missing.',409);
   // Stable source IDs and the records primary key reject concurrent/repeated
   // imports, including a second file containing the same customer source ID.
   r.biginImportSourceHash=session.source_hash;
   statements.push(d.prepare('INSERT INTO records(id,company,type,name,status,amount,paid,credited,version,date,due,payload,created) VALUES(?,?,?,?,?,?,0,0,0,?,?,?,?)').bind(r.id,r.company,r.type,r.name,r.status,r.amount,r.date,r.due||'',JSON.stringify(r),r.created));
   statements.push(d.prepare('INSERT INTO crm_import_rows(batch_id,source_id,record_id,row_hash,source_payload) VALUES(?,?,?,?,?)').bind(batchId,item.sourceId,r.id,item.rowHash,JSON.stringify({source:JSON.parse(source.source),duplicateSourceIds:[]})));
   statements.push(d.prepare('INSERT INTO audit(id,company,actor,action,record,date) VALUES(?,?,?,?,?,?)').bind('csv_'+r.id,r.company,access.email,'Imported Bigin '+session.kind,r.id,now));
  }
  statements.push(d.prepare("UPDATE crm_csv_sessions SET cursor=?,status=? WHERE id=? AND status='Approved' AND cursor=?").bind(next,next===plans.length?'Complete':'Approved',session.id,session.cursor));
  if(next===plans.length)statements.push(d.prepare("UPDATE crm_import_batches SET status='Complete',completed=? WHERE id=?").bind(now,batchId));
  try{await d.batch(statements);}catch{throw new AccessError('This batch was not saved. A source record may already exist or another upload is running. Retry to resume; existing records are preserved.',409);}
  return securityReply({status:next===plans.length?'Complete':'Approved',cursor:next,summary:JSON.parse(session.summary)});
 }
 throw new AccessError('Choose a valid import action.',400);
}catch(e){return securityFailure(e);}}
