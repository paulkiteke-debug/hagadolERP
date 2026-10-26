'use client';
import React,{useEffect,useState} from 'react';
import {releaseVersion,releaseDate,releaseScope} from '@/lib/release';
import {fullWorkspace} from '@/lib/module-profile';
export default function ReleaseReadiness({sample,initialStatus}: {sample:boolean;initialStatus?:any}){
const [status,setStatus]=useState<any>(initialStatus||null),[error,setError]=useState('');
useEffect(()=>{if(sample)return;const c=new AbortController();fetch('/api/release',{cache:'no-store',signal:c.signal}).then(async r=>{const x:any=await r.json();if(!r.ok)throw Error(x.error);if(!c.signal.aborted)setStatus(x);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[sample]);
return <section className="releasereadiness"><h2>Release {releaseVersion}</h2><p>{releaseScope} · {releaseDate} · WMK, Hagadol and Group reporting</p>{error&&<p className="notice" role="alert">{error}</p>}<table><thead><tr><th>Control</th><th>Current state</th><th>Next action</th></tr></thead><tbody>
<tr><td>Workspace</td><td>{sample?'Sample records':status?'Authenticated live records':'Checking live records'}</td><td>Use sample data for practice. Enter business records in Live workspace.</td></tr>
<tr><td>Database</td><td>{sample?'Live check required':status?.database||'Checking'}</td><td>Export a complete database backup from Turso before opening balance changes.</td></tr>
<tr><td>CRM</td><td>Contacts, companies, pipeline and activities</td><td>Save and edit a test contact, refresh, then verify company separation.</td></tr>
<tr><td>Finance</td><td>Invoices, bills, payments, budgets and cash flow</td><td>Verify a posted invoice, payment, bank balance and balanced trial balance.</td></tr>
<tr><td>Supporting file storage</td><td>{sample?'Live check required':status?.fileStorage?.configured?'Configured, upload check required':'Awaiting private storage configuration'}</td><td>Configure private file storage before importing supporting attachments. Test upload and download.</td></tr>
{fullWorkspace&&<><tr><td>Proposal approval</td><td>Reviewer and four checks required</td><td>Review buyer requirements, evidence, commercial terms and signatories.</td></tr><tr><td>Document and knowledge review</td><td>Sources, owner and review dates required</td><td>Verify current evidence before using company facts or advancing a project.</td></tr><tr><td>Project gates</td><td>Company specific evidence checks</td><td>Register and verify the required documents, then record the approval decision.</td></tr><tr><td>EOS metric links</td><td>Calculated from recorded sources</td><td>Set a metric owner and target. Reconcile overlapping snapshots.</td></tr><tr><td>OpenAI</td><td>{status?.ai?.openai?.ready?'Configured, provider check required':'Awaiting API account and model'}</td><td>Configure the server secret and model, then verify a controlled draft.</td></tr><tr><td>Claude</td><td>{status?.ai?.claude?.ready?'Configured, provider check required':'Awaiting API account and model'}</td><td>Configure the server secret and model, then verify a controlled review.</td></tr><tr><td>Gmail, analytics and social</td><td>Awaiting connection</td><td>Authorise each account and reconcile one test record.</td></tr></>}
<tr><td>Browser acceptance</td><td>Pending</td><td>Verify keyboard access, small screens, downloads and printing.</td></tr>
<tr><td>Staff access</td><td>Roles and company access enforced</td><td>Provision Google emails under User access and test each assigned role.</td></tr>
<tr><td>Security acceptance</td><td>Server checks implemented</td><td>Complete browser acceptance and review dependency advisories before business rollout.</td></tr>
<tr><td>Historical migration</td><td>Not reconciled</td><td>Import mapped Bigin and Books records and compare company totals.</td></tr>
</tbody></table><p className="notice">Operational acceptance requires browser checks and reconciled opening data.{!fullWorkspace&&' Additional modules are retained for later releases.'}</p></section>;
}
