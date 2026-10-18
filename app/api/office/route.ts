export const runtime='nodejs';
import type {SQLDatabase} from '@/lib/storage-types';
import {env} from '@/lib/runtime';
import {authenticate,securityReply,securityFailure,AccessError} from '@/lib/security';
import {read} from '@/lib/erp-store';
import {resolveLinkedState} from '@/lib/metric-links';
import {day} from '@/lib/erp-engine';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const c=env as unknown as {DB:SQLDatabase;ERP_OWNER_EMAIL?:string};const {access}=await authenticate(c,req);
 const requested=new URL(req.url).searchParams.get('company');if(requested&&requested!=='Group'&&!access.companies.includes(requested))throw new AccessError('This screen cannot access that company.');
 const s=await read(c.DB,access.companies);s.records=s.records.filter(r=>access.companies.includes(r.company));s.journal=s.journal.filter(j=>access.companies.includes(j.company));
 const allowed:Record<string,string[]>={field_activity:['publicNote','location','projectId'],project:['officeLabel','projectCode','projectKind','deliveryStage','lifecycleStage','gatesEnabled','owner','progress'],post:['source','channel','publicNote','publishedDate'],metric:['source','visits','leads','clicks','reach','periodStart'],scorecard:['actual','targetValue','direction','unit','period','periodStart','owner','metricPending','metricEvidence','metricAsOf'],rock:['owner','period','periodStart','progress']};
 const linked=resolveLinkedState(s,day());const records=linked.records.filter(r=>allowed[r.type]&&(!requested||requested==='Group'||r.company===requested)).filter(r=>r.type!=='post'||['Ready','Published'].includes(r.status)).map(r=>{const projected=Object.fromEntries(['id','company','type','name','status','date','due','version','created',...allowed[r.type]].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));if(r.type==='project')projected.name=r.officeLabel||r.projectCode||'Project';return projected;});
 return securityReply({records,journal:[],audit:[],companies:access.companies});
}catch(e){return securityFailure(e)}}
