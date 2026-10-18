export const runtime='nodejs';
import type {SQLDatabase,ObjectStore} from '@/lib/storage-types';
import {env} from '@/lib/runtime';
import {AccessError,jsonBody,securityReply,securityFailure} from '@/lib/security';
import {financeImportReader,financeImportWriter,authorisedImportSource} from '@/lib/finance-import-access';
import {batchSpec} from '@/lib/finance-import';
import {supportFile,supportFiles,bytesHash} from '@/lib/finance-import-revisions';
export const dynamic='force-dynamic';
const cfg=()=>env as unknown as {DB:SQLDatabase;BUCKET:ObjectStore;ERP_OWNER_EMAIL?:string;FINANCE_IMPORT_KEY?:string;FINANCE_IMPORT_SOURCE_HASH?:string};
export async function POST(req:Request){try{
 const c=cfg(),auth=await financeImportWriter(c,req),input:any=await jsonBody(req,6*1024*1024),spec=batchSpec(input),file=supportFile(input.file);authorisedImportSource(auth,req,spec.sourceHash);
 const batch:any=await c.DB.prepare('SELECT * FROM finance_import_batches WHERE id=?').bind(spec.id).first();
 if(!batch||batch.manifest_hash!==spec.manifestHash||batch.filename!==spec.filename||batch.expected_rows!==spec.expectedRows)throw new AccessError('Start the matching source import before uploading files.',409);
 if(typeof input.contentBase64!=='string'||input.contentBase64.length>6*1024*1024)throw new AccessError('Provide the supporting file content.',400);
 let bytes:Uint8Array;try{const decoded=atob(input.contentBase64);bytes=Uint8Array.from(decoded,ch=>ch.charCodeAt(0));}catch{throw new AccessError('The supporting file encoding is invalid.',400);}
 if(bytes.byteLength!==file.bytes||await bytesHash(bytes)!==file.sha256)throw new AccessError('The supporting file does not match its checksum.',409);
 const old:any=await c.DB.prepare('SELECT * FROM finance_import_files WHERE batch_id=? AND filename=?').bind(spec.id,file.filename).first();
 if(old){if(old.sha256!==file.sha256||old.bytes!==file.bytes)throw new AccessError('This saved supporting file is preserved.',409);return securityReply({filename:file.filename,sha256:file.sha256,bytes:file.bytes,saved:true});}
 if(batch.status!=='Uploading')throw new AccessError('Completed import files are preserved.',409);
 const key='finance-imports/'+spec.id+'/'+file.filename,mime=file.filename.endsWith('.csv')?'text/csv':file.filename.endsWith('.json')?'application/json':'text/plain';
 const stored=await c.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime},customMetadata:{sha256:file.sha256},onlyIf:{etagDoesNotMatch:'*'}});
 if(!stored){const existing=await c.BUCKET.head(key);if(!existing||existing.customMetadata?.sha256!==file.sha256||existing.size!==file.bytes)throw new AccessError('This supporting file differs from the saved file.',409);}
 await c.DB.prepare("INSERT OR IGNORE INTO finance_import_files (batch_id,filename,sha256,bytes,object_key,created) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM finance_import_batches WHERE id=? AND status='Uploading')").bind(spec.id,file.filename,file.sha256,file.bytes,key,new Date().toISOString(),spec.id).run();
 const saved:any=await c.DB.prepare('SELECT sha256,bytes FROM finance_import_files WHERE batch_id=? AND filename=?').bind(spec.id,file.filename).first();if(!saved||saved.sha256!==file.sha256||saved.bytes!==file.bytes)throw new AccessError('The supporting file could not be saved as supplied.',409);
 return securityReply({filename:file.filename,sha256:file.sha256,bytes:file.bytes,saved:true});
 }catch(e){return securityFailure(e)}}
export async function GET(req:Request){try{
 const c=cfg();await financeImportReader(c,req);const url=new URL(req.url),id=url.searchParams.get('batch')||'',filename=url.searchParams.get('file')||'';
 if(!/^fi_[a-f0-9]{64}$/.test(id)||!supportFiles.includes(filename))throw new AccessError('Choose a saved supporting file.',400);
 const file:any=await c.DB.prepare('SELECT * FROM finance_import_files WHERE batch_id=? AND filename=?').bind(id,filename).first();if(!file)throw new AccessError('Supporting file not found.',404);
 const object=await c.BUCKET.get(file.object_key);if(!object||object.customMetadata?.sha256!==file.sha256||object.size!==file.bytes)throw new AccessError('The supporting file needs verification.',503);
 return new Response(object.body,{headers:{'Content-Type':filename.endsWith('.csv')?'text/csv; charset=utf-8':filename.endsWith('.json')?'application/json':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="'+filename+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return securityFailure(e)}}
