'use client';
import {useState} from 'react';
import type {RecordRow} from '@/lib/erp-primitives';
import {reviewBiginCSV,BIGIN_MAX_FILE_BYTES,type CRMImportPreview} from '@/lib/crm-import-preview';
export default function CRMImportPreviewPanel({company,records,canImport=false}:{company:string;records:RecordRow[];canImport?:boolean}) {
  const [fileName,setFileName]=useState('');
  const [preview,setPreview]=useState<CRMImportPreview|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [reviewOnly,setReviewOnly]=useState(false);
  const [page,setPage]=useState(0);
  const [session,setSession]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [progress,setProgress]=useState('');
  const [summary,setSummary]=useState<{total:number;ready:number;skipped:number;duplicates:number;errors:number;issues:{row:number;message:string}[]}|null>(null);
  const [completed,setCompleted]=useState(false);
  async function digest(value:unknown){const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical((v as Record<string,unknown>)[k])])):v;const bytes=new TextEncoder().encode(JSON.stringify(canonical(value)));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
  async function request(body:Record<string,unknown>):Promise<{id:string;status:string;cursor:number;summary:NonNullable<typeof summary>}>{
    for(let attempt=0;attempt<3;attempt++){
      const response=await fetch('/api/crm-csv-imports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json();
      if(response.status===429&&attempt<2){setProgress('Upload paused briefly. It will continue automatically.');await new Promise(resolve=>setTimeout(resolve,60_000));continue;}
      if(!response.ok)throw Error(data.error||'The import could not continue.');return data;
    }
    throw Error('Please retry the import. Saved progress is retained.');
  }
  async function serverReview(){
    if(!preview)return;setLoading(true);setError('');setSummary(null);setConfirmed(false);
    try{
      const hashes=await Promise.all(preview.rows.map(r=>digest(r.source)));
      const start=await request({action:'start',company,filename:fileName,kind:preview.kind,expectedRows:preview.rows.length,sourceHash:await digest(preview.rows.map(r=>r.source)),manifestHash:await digest(hashes)});
      setSession(start.id);
      for(let offset=0;offset<preview.rows.length&&start.status==='Uploading';offset+=50){setProgress('Staging '+Math.min(offset+50,preview.rows.length)+' of '+preview.rows.length);await request({action:'stage',id:start.id,rows:preview.rows.slice(offset,offset+50).map((r,i)=>({ordinal:offset+i,source:r.source}))});}
      setProgress('Checking source rows and existing records…');const result=await request({action:'review',id:start.id});setSummary(result.summary);setCompleted(result.status==='Complete');setProgress(result.status==='Complete'?'This file has already been imported.':'Server review complete.');
    }catch(e){setError(e instanceof Error?e.message:'The file could not be reviewed.');}finally{setLoading(false);}
  }
  async function approveImport(){
    if(!session||!confirmed)return;setLoading(true);setError('');
    try{let result=await request({action:'approve',id:session,confirmed:true});while(result.status!=='Complete'){setProgress('Imported '+result.cursor+' of '+summary?.ready);result=await request({action:'post',id:session,cursor:result.cursor});}setCompleted(true);setProgress('Import complete. Refresh the CRM to see the saved records.');}
    catch(e){setError(e instanceof Error?e.message:'The import stopped. Retry to continue from saved progress.');}finally{setLoading(false);}
  }
  const rows=preview?.rows.filter(r=>!reviewOnly||r.errors.length||r.warnings.length)||[];
  return <section className="crm-import-review"><h2>Bigin import review</h2><p>Check an original Bigin CSV for {company}. Upload up to 10,000 records and 20 MB per file. Review the file before approving any changes.</p><label className="crm-file-picker">Choose a Bigin CSV<input type="file" accept=".csv,text/csv" disabled={loading} onChange={async e=>{const file=e.target.files?.[0];setPreview(null);setError('');setPage(0);setReviewOnly(false);setSession('');setSummary(null);setConfirmed(false);setCompleted(false);setProgress('');if(!file)return;setFileName(file.name);if(file.size>BIGIN_MAX_FILE_BYTES){setError('Choose a CSV no larger than 20 MB.');return;}setLoading(true);try{setPreview(reviewBiginCSV(await file.text(),company,records));}catch(err){setError(err instanceof Error?err.message:'This file could not be reviewed.');}finally{setLoading(false);e.target.value='';}}}/></label>{loading&&<p role="status">Reviewing your file…</p>}{error&&<p role="alert">{error}</p>}{preview&&<><p>{fileName} · {preview.kind} · {preview.rows.length} records</p><dl className="crm-import-counts"><div><dt>Valid fields</dt><dd>{preview.valid}</dd></div><div><dt>Need review</dt><dd>{preview.needsReview}</dd></div><div><dt>Duplicate candidates</dt><dd>{preview.duplicates}</dd></div></dl><p>Names, company names and telephone numbers stay together on their original row. Last Name is retained as a name; Job Title is used only when supplied.</p><label className="crm-review-only"><input type="checkbox" checked={reviewOnly} onChange={e=>{setReviewOnly(e.target.checked);setPage(0);}}/>Show only records needing review</label><div className="tablebox"><table><thead><tr><th>Source row / ID</th><th>Name / company</th><th>Email / phone</th><th>Review</th></tr></thead><tbody>{rows.slice(page*25,page*25+25).map(row=><tr key={row.row}><td>{row.row}<small>{row.sourceId||'Missing ID'}</small></td><td>{row.name}<small>{row.customerCompany}</small>{row.jobTitle&&<small>{row.jobTitle}</small>}</td><td>{row.email||'No email'}<small>{row.phone||row.mobile||'No phone'}</small>{row.phone&&row.mobile&&<small>Mobile: {row.mobile}</small>}</td><td>{[...row.errors,...row.warnings].map(message=><p key={message}>{message}</p>)}{!row.errors.length&&!row.warnings.length?'No issues found':''}</td></tr>)}</tbody></table></div>{rows.length>25&&<nav aria-label="Import review pages"><button className="secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>{page+1} of {Math.ceil(rows.length/25)}</span><button className="secondary" disabled={(page+1)*25>=rows.length} onClick={()=>setPage(p=>p+1)}>Next</button></nav>}{['Contacts','Companies'].includes(preview.kind)&&canImport?<div className="crm-import-approval"><button type="button" className="secondary" disabled={loading||preview.rows.some(r=>r.errors.length>0)||completed} onClick={serverReview}>Check with ERP</button>{summary&&<><p>{summary.total} source records · {summary.ready} ready · {summary.skipped} existing IDs skipped · {summary.duplicates} duplicate candidates · {summary.errors} errors</p>{summary.issues.map(issue=><p key={issue.row}>Row {issue.row}: {issue.message}</p>)}{!summary.errors&&!completed&&<><label><input type="checkbox" checked={confirmed} disabled={loading} onChange={e=>setConfirmed(e.target.checked)}/>I confirm assignment to {company} and have reviewed the flagged records. Existing IDs will be skipped. Other duplicate candidates will remain separate.</label><button type="button" className="primary" disabled={!confirmed||loading} onClick={approveImport}>{loading?'Importing…':'Approve and import'}</button></>}</>}{progress&&<p role="status">{progress}</p>}</div>:<p className="crm-import-limit">{!canImport?'File review only. An Owner or Administrator must approve and import Contacts and Companies.':'Pipelines and Tasks can be reviewed here. Their browser import is not yet available.'}</p>}</>}</section>;
}
