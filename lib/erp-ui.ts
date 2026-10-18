export const navigationGroups=[
{name:'Executive',views:['Executive','Overview']},
{name:'CRM',views:['CRM','Tasks'],sections:[['Pipeline','CRM','Pipeline'],['Contacts','CRM','Contacts'],['Companies','CRM','Companies'],['Activities','CRM','Activities']]},
{name:'Finance',views:['Finance','Sales','Purchases','Banking','Accounting','Reports']},
{name:'Media',views:['Media'],sections:[['Content planner','Media','Content'],['Social performance','Media','Performance']]},
{name:'EOS',views:['EOS'],sections:[['Overview','EOS','Overview'],['Scorecard','EOS','Scorecard'],['Rocks','EOS','Rocks'],['To dos','EOS','To dos'],['Issues','EOS','Issues'],['L10 meetings','EOS','L10 meetings']]},
{name:'Projects',views:['Projects','Field activity']},
{name:'Email',views:['Email'],sections:[['Drafts','Email','Drafts'],['Google access','Email','Google access']]},
{name:'Marketing',views:['Marketing'],sections:[['Campaigns','Marketing','Campaigns'],['Website traffic','Marketing','Performance']]},
{name:'Bids and proposals',views:['Hagadol OS'],sections:[['Bids','Hagadol OS','Bids'],['Proposals','Hagadol OS','Proposals']]},
{name:'Office display',views:['Office display'],sections:[['Combined screen','Office display','Combined'],['Rotating screen','Office display','Rotating']]},
{name:'Knowledge and documents',views:['Document register','Knowledge records']},
{name:'Administration',views:['Settings']}];
export function channelMetrics(records:any[],view:string){return records.filter(r=>r.type==='metric'&&(view==='Media'?r.source!=='Website':r.source==='Website'));}
export function isOverdue(due:string,status:string,today:string){return !!due&&due<today&&!['Done','Completed','Voided'].includes(status);}
export function formChanged(current:unknown,baseline:string){return JSON.stringify(current)!==baseline;}
export function toCSV(rows:Record<string,any>[]){
if(!rows.length)return '';
const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>k!=='payload');
const esc=(value:any)=>{const raw=value!==null&&typeof value==='object'?JSON.stringify(value):String(value??'');const safe=typeof value==='string'&&/^[=+@\-\t\r]/.test(raw)?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"';};
return '\uFEFF'+[keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\r\n');
}
export function exportRecords(records:any[],journal:any[],audit:any[],view:string,tab:string,report:string){
const type:Record<string,string>={'Document register':'document','Knowledge records':'knowledge',Executive:'scorecard','Hagadol OS':tab==='Proposals'?'proposal':'bid','Field activity':'field_activity',CRM:tab==='Contacts'?'contact':tab==='Companies'?'crm_company':tab==='Activities'?'task':'deal',Tasks:'task',Sales:tab==='Quotations'?'quote':tab==='Products & services'?'product':tab==='Credits'?'credit':'invoice',Purchases:tab==='Expenses'?'expense':tab==='Purchase orders'?'purchase_order':'bill',Projects:'project',Email:'email',Media:['Content','Calendar'].includes(tab)?'post':'metric',Marketing:tab==='Content'?'post':tab==='Performance'?'metric':'campaign',Accounting:'journal',Settings:tab==='Team'?'member':'setting'};
if(view==='Sales'&&tab==='Industry analysis')return records.filter(r=>['invoice','bill','expense','credit'].includes(r.type)&&r.status==='Posted');
if(view==='Reports')return report==='Audit trail'?audit:report==='Receivables'?records.filter(r=>r.type==='invoice'&&r.status==='Posted'&&r.amount-(r.paid||0)-(r.credited||0)>0):report==='Payables'?records.filter(r=>r.type==='bill'&&r.status==='Posted'&&r.amount-(r.paid||0)-(r.credited||0)>0):journal;
if(view==='CRM'&&tab==='Activities')return records.filter(r=>r.type==='task'&&(r.crm===true||r.dealId||r.contactId||r.crmCompanyId)&&r.eos!==true);
if(view==='EOS')return records.filter(r=>['rock','scorecard','eos_issue','eos_meeting'].includes(r.type)||r.type==='task'&&r.eos===true);
if(view==='Banking'){const types=tab==='Payments'?['receipt','payment','loan_payment']:tab==='Loans'?['loan']:tab==='Reconciliation'?['reconciliation']:tab==='Transfers'?['transfer']:[];return types.length?records.filter(r=>types.includes(r.type)):journal.filter(j=>['Bank','Cash','Mobile money'].includes(j.account));}
return ['Media','Marketing'].includes(view)&&type[view]==='metric'?channelMetrics(records,view):type[view]?records.filter(r=>r.type===type[view]):records;
}

export function validLiveState(x:any){return !!x&&['records','journal','audit'].every(k=>Array.isArray(x[k]));}
