import type {RecordRow,State} from './erp-engine';

export const roles=['Owner','Administrator','Leadership','Finance','Sales','Operations','Marketing','Viewer','Office display'] as const;
export type Role=typeof roles[number];
export type Access={id:string;role:Role;companies:string[];email:string;name:string};
export const modules=['Executive','CRM','Finance','EOS','Projects','Marketing','Email','OS','Documents','Settings','Office'] as const;
export type Module=typeof modules[number];
const full=(a:Access)=>['Owner','Administrator'].includes(a.role);
export function recordModule(r:Pick<RecordRow,'type'>&{[key:string]:any}):Module|null{
 if(['contact','crm_company','deal'].includes(r.type))return 'CRM';
 if(r.type==='task')return r.eos===true||r.meetingId||r.rockId||r.issueId?'EOS':r.crm===true||r.dealId||r.contactId||r.crmCompanyId?'CRM':'Projects';
 if(['quote','product','invoice','bill','expense','credit','receipt','payment','loan','loan_payment','transfer','journal','reconciliation','purchase_order','budget','cash_plan'].includes(r.type))return 'Finance';
 if(['scorecard','rock','eos_issue','eos_meeting'].includes(r.type))return 'EOS';
 if(['project','technical_log','field_activity','project_gate'].includes(r.type))return 'Projects';
 if(['post','metric','campaign'].includes(r.type))return 'Marketing';
 if(r.type==='email')return 'Email';
 if(['bid','proposal'].includes(r.type))return 'OS';
 if(['document','knowledge'].includes(r.type))return 'Documents';
 if(['setting','member'].includes(r.type))return 'Settings';
 return null;
}
export function canReadModule(a:Access,m:Module){
 if(full(a))return true;
 if(a.role==='Office display')return m==='Office';
 if(['Viewer','Leadership'].includes(a.role))return m!=='Settings';
 const allowed:Record<string,Module[]>={Finance:['Finance','CRM','Projects','Documents','Office'],Sales:['CRM','Finance','OS','Email','Documents','Office'],Operations:['Projects','EOS','Documents','Office'],Marketing:['Marketing','Email','CRM','Office']};
 return (allowed[a.role]||[]).includes(m);
}
export function canWriteModule(a:Access,m:Module){
 if(full(a))return true;
 const allowed:Record<string,Module[]>={Leadership:['EOS','OS','Documents','Projects'],Finance:['Finance'],Sales:['CRM','Finance','OS','Email'],Operations:['Projects','Documents'],Marketing:['Marketing','Email']};
 return (allowed[a.role]||[]).includes(m);
}
export function canReadRecord(a:Access,r:RecordRow){
 const m=recordModule(r);if(!m||!a.companies.includes(r.company)||!canReadModule(a,m))return false;
 if(a.role==='Sales'&&m==='Finance')return ['quote','product','invoice'].includes(r.type);
 if(a.role==='Finance'&&m==='CRM')return ['contact','crm_company'].includes(r.type);
 if(a.role==='Marketing'&&m==='CRM')return ['contact','crm_company'].includes(r.type);
 return true;
}
export function canWriteRecord(a:Access,r:RecordRow,action='edit',status?:string){
 const m=recordModule(r);if(!m||!a.companies.includes(r.company)||!canWriteModule(a,m))return false;
 if(a.role==='Sales'&&m==='Finance'&&(!['quote','product','invoice'].includes(r.type)||!['create','edit','import','convert'].includes(action)||r.type==='invoice'&&r.status!=='Draft'&&action!=='create'))return false;
 if(['advance_gate'].includes(action)||action==='stage'&&['Approved','Verified','Submitted'].includes(status||''))return full(a)||a.role==='Leadership'||m==='Finance'&&a.role==='Finance';
 if(r.type==='project_gate')return action==='advance_gate'&&(full(a)||a.role==='Leadership');
 return true;
}
export function scopeState(a:Access,s:State):State{
 const financial=canReadModule(a,'Finance')&&a.role!=='Sales';
 return {records:s.records.filter(r=>canReadRecord(a,r)),journal:financial?s.journal.filter(j=>a.companies.includes(j.company)):[],audit:full(a)?s.audit.filter(x=>a.companies.includes(x.company)):[]};
}
export function viewModule(view:string):Module{
 if(['Executive','Overview'].includes(view))return 'Executive';
 if(['CRM','Tasks'].includes(view))return 'CRM';
 if(['Finance','Sales','Purchases','Banking','Accounting','Reports'].includes(view))return 'Finance';
 if(['Media','Marketing'].includes(view))return 'Marketing';
 if(['Projects','Field activity'].includes(view))return 'Projects';
 if(['Document register','Knowledge records'].includes(view))return 'Documents';
 if(view==='Hagadol OS')return 'OS';
 if(view==='Office display')return 'Office';
 return view as Module;
}
