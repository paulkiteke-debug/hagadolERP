import type {RecordRow as R} from './erp-engine';
import {dealStages,displayDealStage} from './company-profiles';
export const activityKinds=['Task','Call','Meeting'];
export const crmSources=['Direct','Referral','Website','Facebook','Instagram','LinkedIn','WhatsApp','Email','Tender'];
const clean=(v:unknown,n=500)=>String(v??'').trim().slice(0,n);
export function validateCRM(r:R,records:R[]){
 if(!['crm_company','contact','deal','task'].includes(r.type))return r;
 if(['crm_company','contact'].includes(r.type)){
  r.billingAddress=clean(r.billingAddress,2000);r.taxReference=clean(r.taxReference,100);
  if(r.paymentTermsDays!==undefined&&r.paymentTermsDays!==''){const terms=Number(r.paymentTermsDays);if(!Number.isInteger(terms)||terms<0||terms>365)throw Error('Payment terms must be between 0 and 365 days.');r.paymentTermsDays=terms;}else delete r.paymentTermsDays;
 }
 r.crm=r.crm===true;
 if(r.type==='task'&&!r.crm&&!r.dealId&&!r.contactId&&!r.crmCompanyId)return r;
 for(const k of ['crmCompanyId','contactId','dealId'])r[k]=clean(r[k],100);
 const ref=(key:string,type:string)=>{if(!r[key])return undefined;const row=records.find(x=>x.id===r[key]&&x.type===type&&x.company===r.company);if(!row)throw Error('Choose a '+type.replace('crm_company','customer company')+' from '+r.company+'.');return row;};
 if(r.type==='contact'){delete r.contactId;delete r.dealId;}if(r.type==='deal')delete r.dealId;
 const deal=r.type==='task'?ref('dealId','deal'):undefined;
 if(deal){for(const k of ['contactId','crmCompanyId']){if(r[k]&&deal[k]&&r[k]!==deal[k])throw Error('Activity links must match the opportunity.');if(!r[k])r[k]=deal[k]||'';}}
 const contact=r.type!=='contact'?ref('contactId','contact'):undefined;
 if(contact?.crmCompanyId){if(r.crmCompanyId&&r.crmCompanyId!==contact.crmCompanyId)throw Error('Choose the company linked to this contact.');r.crmCompanyId=contact.crmCompanyId;}
 const account=ref('crmCompanyId','crm_company');
 if(r.type==='crm_company'){delete r.crmCompanyId;delete r.contactId;delete r.dealId;r.website=clean(r.website,2000);if(r.website){let u:URL;try{u=new URL(r.website)}catch{throw Error('Use a full website address starting with https://.');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Use a website address starting with https://.');}r.location=clean(r.location,2000);r.email=clean(r.email,500);r.phone=clean(r.phone);if(r.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))throw Error('Enter a valid company email or leave it blank.');r.role=['Customer','Prospect','Partner','Supplier','Unclassified'].includes(r.role)?r.role:'Prospect';}
 if(r.type==='deal'){r.nextAction=clean(r.nextAction,2000);r.lostReason=clean(r.lostReason,2000);r.closingDate=clean(r.closingDate,10);if(r.closingDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.closingDate)||!Number.isFinite(Date.parse(r.closingDate+'T00:00:00Z'))||new Date(r.closingDate+'T00:00:00Z').toISOString().slice(0,10)!==r.closingDate))throw Error('Choose a valid expected closing date.');if(r.crm&&(!r.owner||!(r.customer||account||contact)))throw Error('An opportunity needs an owner and customer.');if(!r.customer)r.customer=account?.name||contact?.name||'';if(r.crmStage)r.crmStage=displayDealStage(r.company,r.crmStage);if(r.crmStage&&!dealStages(r.company).includes(r.crmStage))throw Error('Choose a sales stage for '+r.company+'.');}
 if(r.type==='task'&&(r.crm||r.dealId||r.contactId||r.crmCompanyId)){r.crm=true;if(r.eos===true||r.meetingId||r.issueId||r.rockId)throw Error('Keep CRM activities separate from EOS To dos.');if(!r.owner||!r.due)throw Error('A CRM activity needs an owner and due date.');r.activityKind=activityKinds.includes(r.activityKind)?r.activityKind:'Task';r.activityTime=clean(r.activityTime,5);if(r.activityTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.activityTime))throw Error('Choose a valid activity time.');if(r.crmStatus&&!['Open','In progress','Done'].includes(r.crmStatus))throw Error('Choose a valid activity status.');}
 return r;
}
export function crmRecords(records:R[],company:string){return records.filter(r=>company==='Group'||r.company===company);}
export function crmActivities(records:R[]){return records.filter(r=>r.type==='task'&&(r.crm===true||r.dealId||r.contactId||r.crmCompanyId)&&r.eos!==true);}
export function crmRelated(records:R[],record:R){const rs=records.filter(r=>r.company===record.company);return rs.filter(r=>r.id!==record.id&&(record.type==='crm_company'?r.crmCompanyId===record.id:record.type==='contact'?r.contactId===record.id:record.type==='deal'?r.dealId===record.id:false));}
export function crmSummary(records:R[],today:string){const deals=records.filter(r=>r.type==='deal'),open=deals.filter(r=>!['Won','Lost'].includes(r.status)),activities=crmActivities(records),due=activities.filter(r=>r.status!=='Done'&&r.due&&r.due<=today);return {open:open.length,value:open.reduce((n,r)=>n+r.amount,0),due:due.length,won:deals.filter(r=>r.status==='Won').length};}
export function duplicateContact(records:R[],company:string,email:string,exclude=''){return email.trim()?records.filter(r=>r.type==='contact'&&r.company===company&&r.id!==exclude&&String(r.email||'').trim().toLowerCase()===email.trim().toLowerCase()):[];}
export function crmStage(r:R){return displayDealStage(r.company,r.status);}
