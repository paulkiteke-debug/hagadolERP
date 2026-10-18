import type {RecordRow} from './erp-engine';
export const osVersion='Hagadol OS proposal builder 1.1';
export function buildProposal(b:RecordRow){
const clauses=String(b.requirements||'').split('\n').map(x=>x.trim()).filter(Boolean);
return [b.name,'Company: '+b.company,'Client: '+(b.customer||'[Client required]'),'Reference: '+(b.reference||'[Buyer reference required]'),'Submission deadline: '+(b.due||'[Deadline required]'),'',
'1. Client need',b.brief||'[Enter the client need and requested outcome]','',
'2. Scope and method',b.scope||'[Enter scope, technical basis, deliverables and exclusions]','',
'3. Evidence and assumptions',b.evidence||'[Add source references for measurements, specifications, experience and credentials. Mark verified, supplied, estimated or provisional.]','',
'4. Delivery and acceptance',b.delivery||'[Enter stages, owners, dates, acceptance checks and aftercare]','',
'5. Commercial schedule',b.commercial||'[Attach the checked quotation or BOQ. State currency, VAT, payment milestones, validity and assumptions.]','',
'6. Buyer compliance matrix',...(clauses.length?clauses.map((c,i)=>`${i+1}. ${c}\nResponse and supporting evidence: [Required]`):['[Enter buyer clauses and mandatory documents before submission]']),'',
'7. Risks and responsibilities',b.risks||'[Enter execution risks, controls and client responsibilities]','',
'8. Decision and next action',b.decision||'[State the requested decision, responsible person and date]','',
'Working draft for review. Verify buyer forms, evidence, commercial figures and signatories before submission.',b.company==='Hagadol'?'Water | Solar · From Source to Use.':'WMK'].join('\n');
}
export function periodBounds(period:string,date:string){if(period==='Week'){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);const end=d.toISOString().slice(0,10);return {start,end,label:'Week '+start+' to '+end};}const [y,m]=date.split('-').map(Number);const first=period==='Quarter'?Math.floor((m-1)/3)*3+1:m;const last=period==='Quarter'?first+2:first;return {start:`${y}-${String(first).padStart(2,'0')}-01`,end:new Date(Date.UTC(y,last,0)).toISOString().slice(0,10),label:period==='Quarter'?`Q${Math.ceil(m/3)} ${y}`:new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'Africa/Kampala'})};}
