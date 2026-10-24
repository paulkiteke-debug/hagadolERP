import type {RecordRow as R} from './erp-engine';
import {dealStages,displayDealStage} from './company-profiles';
export const activityKinds=['Task','Call','Meeting'];
export const crmSources=['Direct','Referral','Website','Facebook','Instagram','LinkedIn','WhatsApp','Email','Tender'];
const clean=(v:unknown,n=500)=>String(v??'').trim().slice(0,n);
export function validateCRM(r:R,records:R[]){
 if(!['crm_company','contact','deal','task'].includes(r.type))return r;
 if(['crm_company','contact'].includes(r.type)){
  r.billingAddress=clean(r.billingAddress,2000);r.taxReference=clean(r.taxReference,100);
  const prior=records.find(row=>row.id===r.id&&row.company===r.company);
  if(prior?.billingVerification&&prior.billingAddress===r.billingAddress&&prior.taxReference===r.taxReference)r.billingVerification=prior.billingVerification;
  else delete r.billingVerification;
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
 if(r.type==='deal'){r.nextAction=clean(r.nextAction,2000);r.lostReason=clean(r.lostReason,2000);r.closingDate=clean(r.closingDate,10);if(r.closingDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.closingDate)||!Number.isFinite(Date.parse(r.closingDate+'T00:00:00Z'))||new Date(r.closingDate+'T00:00:00Z').toISOString().slice(0,10)!==r.closingDate))throw Error('Choose a valid expected closing date.');if(r.crm&&(!r.owner||!(r.customer||account||contact)))throw Error('An opportunity needs an owner and customer.');if(!r.customer)r.customer=account?.name||contact?.name||'';if(r.crmStage)r.crmStage=canonicalCRMStage(r.company,r.crmStage);if(r.crmStage&&!dealStages(r.company).includes(r.crmStage))throw Error('Choose a sales stage for '+r.company+'.');}
 if(r.type==='task'&&(r.crm||r.dealId||r.contactId||r.crmCompanyId)){r.crm=true;if(r.eos===true||r.meetingId||r.issueId||r.rockId)throw Error('Keep CRM activities separate from EOS To dos.');if(!r.owner||!r.due)throw Error('A CRM activity needs an owner and due date.');r.activityKind=activityKinds.includes(r.activityKind)?r.activityKind:'Task';r.activityTime=clean(r.activityTime,5);if(r.activityTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.activityTime))throw Error('Choose a valid activity time.');if(r.crmStatus&&!['Open','In progress','Done'].includes(r.crmStatus))throw Error('Choose a valid activity status.');}
 return r;
}
export function crmRecords(records:R[],company:string){return records.filter(r=>company==='Group'||r.company===company);}
export function crmActivities(records:R[]){return records.filter(r=>r.type==='task'&&(r.crm===true||r.dealId||r.contactId||r.crmCompanyId)&&r.eos!==true);}
export function crmRelated(records:R[],record:R){const rs=records.filter(r=>r.company===record.company);return rs.filter(r=>r.id!==record.id&&(record.type==='crm_company'?r.crmCompanyId===record.id:record.type==='contact'?r.contactId===record.id:record.type==='deal'?r.dealId===record.id:false));}
export function crmSummary(records:R[],today:string){const deals=records.filter(r=>r.type==='deal'),open=deals.filter(r=>!['Won','Lost'].includes(r.status)),activities=crmActivities(records),due=activities.filter(r=>r.status!=='Done'&&r.due&&r.due<=today);return {open:open.length,value:open.reduce((n,r)=>n+r.amount,0),due:due.length,won:deals.filter(r=>r.status==='Won').length};}
export function duplicateContact(records:R[],company:string,email:string,exclude=''){return email.trim()?records.filter(r=>r.type==='contact'&&r.company===company&&r.id!==exclude&&String(r.email||'').trim().toLowerCase()===email.trim().toLowerCase()):[];}
export function crmStage(r:R){return displayDealStage(r.company,r.status);}

// This module stays safe for client imports. Database helpers live in crm-data.ts.
export type CRMAttachmentReference={name:string;url:string};
export type CRMBillingVerification={address:string;taxReference:string;verifiedBy:string;verifiedAt:string};
export type CRMTechnicalSiteSurvey={reference:string;assessedBy:string;assessedOn:string;findings:string};
export type CRMContractMetadata={reference:string;signedOn:string;clientName:string};
export type CRMDealMetadata={siteAssessmentAttachment?:CRMAttachmentReference;technicalSiteSurvey?:CRMTechnicalSiteSurvey;designBrief?:string;contractMetadata?:CRMContractMetadata;contractAttachment?:CRMAttachmentReference};
export type CRMFieldIssue={code:string;field:string;message:string};
export type StageValidation={ok:true;stage:string}|{ok:false;code:'CRM_STAGE_VALIDATION';stage:string;errors:CRMFieldIssue[]};
export class CRMValidationError extends Error {
 readonly code='CRM_STAGE_VALIDATION';
 constructor(readonly errors:CRMFieldIssue[]){super(errors.map(issue=>issue.message).join(' '));this.name='CRMValidationError';}
}
export type CRMStageVisit={stage:string;enteredAt:string;exitedAt?:string;actor:string};
export function canonicalCRMStage(company:string,stage:string){
 const value=stage.trim();
 if(value==='Closed Won')return 'Won';
 if(value==='Closed Lost')return 'Lost';
 if(['Proposal','Proposal Sent'].includes(value))return company==='WMK'?'Fee proposal':'Quotation';
 return displayDealStage(company,value);
}
function crmISODate(value:unknown){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const time=Date.parse(value+'T00:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
}
function crmAttachment(value:unknown){
 if(!value||typeof value!=='object')return false;
 const attachment=value as {name?:unknown;url?:unknown};
 if(typeof attachment.name!=='string'||!attachment.name.trim()||attachment.name.length>255||typeof attachment.url!=='string'||attachment.url.length>2048)return false;
 try{const url=new URL(attachment.url);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function validateDealStageTransition(deal:R,toStage:string,today=new Date().toISOString().slice(0,10),records:R[]=[]):StageValidation {
 const stage=canonicalCRMStage(deal.company,toStage),errors:CRMFieldIssue[]=[];
 const issue=(code:string,field:string,message:string)=>errors.push({code,field,message});
 if(!['WMK','Hagadol'].includes(deal.company)||deal.type!=='deal')issue('INVALID_DEAL','id','Choose an opportunity from WMK or Hagadol.');
 if(!dealStages(deal.company).includes(stage))issue('INVALID_STAGE','status','Choose a stage available for this company.');
 const proposalStages=deal.company==='WMK'?['Fee proposal','Negotiation','Won']:['Quotation','Negotiation','Pending deposit','Won'];
 if(proposalStages.includes(stage)){
  const contact=records.find(row=>row.id===deal.contactId&&row.company===deal.company&&row.type==='contact');
  const customerId=deal.crmCompanyId||contact?.crmCompanyId;
  const customer=records.find(row=>row.id===customerId&&row.company===deal.company&&row.type==='crm_company');
  if(!customer)issue('CUSTOMER_COMPANY_REQUIRED','crmCompanyId','Link the opportunity to its customer company.');
  if(customer){
   if(!clean(customer.taxReference,100))issue('CUSTOMER_TAX_REFERENCE_REQUIRED','customer.taxReference','Enter the customer tax PIN or TIN.');
   if(!clean(customer.billingAddress,2000))issue('CUSTOMER_BILLING_ADDRESS_REQUIRED','customer.billingAddress','Enter the customer billing address.');
   const verification=customer.billingVerification as Partial<CRMBillingVerification>|undefined;
   if(!verification||verification.address!==customer.billingAddress||verification.taxReference!==customer.taxReference||typeof verification.verifiedBy!=='string'||!verification.verifiedBy.trim()||typeof verification.verifiedAt!=='string'||!Number.isFinite(Date.parse(verification.verifiedAt))||verification.verifiedAt.slice(0,10)>today)issue('CUSTOMER_BILLING_UNVERIFIED','customer.billingVerification','An authorised reviewer must verify the current billing and tax details.');
  }

  if(!Number.isSafeInteger(deal.amount)||deal.amount<=0)issue('DEAL_VALUE_REQUIRED','amount','Enter a deal value above zero.');
  if(deal.company==='Hagadol'){
   const survey=deal.technicalSiteSurvey;
   if(!survey||typeof survey!=='object'||!clean(survey.reference,200)||!clean(survey.assessedBy,500)||!crmISODate(survey.assessedOn)||survey.assessedOn>today||!clean(survey.findings,10000))issue('TECHNICAL_SURVEY_REQUIRED','technicalSiteSurvey','Record the survey reference, assessor, assessment date and findings.');
   if(!crmAttachment(deal.siteAssessmentAttachment))issue('SITE_ASSESSMENT_REQUIRED','siteAssessmentAttachment','Attach the site assessment using a document name and HTTPS link.');
  }
  if(deal.company==='WMK'&&!clean(deal.designBrief,5000))issue('DESIGN_BRIEF_REQUIRED','designBrief','Enter the client design brief before sending the fee proposal.');
 }
 if(stage==='Lost'&&!clean(deal.lostReason,2000))issue('LOSS_REASON_REQUIRED','lostReason','Enter a reason for losing this deal.');
 if(stage==='Won'){
  const contract=(deal.contractMetadata&&typeof deal.contractMetadata==='object'?deal.contractMetadata:{}) as {reference?:unknown;signedOn?:unknown;clientName?:unknown};
  if(typeof contract.reference!=='string'||!contract.reference.trim()||contract.reference.length>200)issue('CONTRACT_REFERENCE_REQUIRED','contractMetadata.reference','Enter the signed contract or appointment reference.');
  if(!crmISODate(contract.signedOn)||String(contract.signedOn)>today)issue('CONTRACT_DATE_INVALID','contractMetadata.signedOn','Enter a valid signature date through today.');
  if(typeof contract.clientName!=='string'||!contract.clientName.trim()||contract.clientName.length>500)issue('CONTRACT_CLIENT_REQUIRED','contractMetadata.clientName','Enter the client name on the contract.');
  if(!crmAttachment(deal.contractAttachment))issue('CONTRACT_ATTACHMENT_REQUIRED','contractAttachment','Attach the signed contract or appointment using a document name and HTTPS link.');
 }
 return errors.length?{ok:false,code:'CRM_STAGE_VALIDATION',stage,errors}:{ok:true,stage};
}
export function assertDealStageTransition(deal:R,toStage:string,today?:string,records:R[]=[]){
 const result=validateDealStageTransition(deal,toStage,today,records);if(!result.ok)throw new CRMValidationError(result.errors);return result.stage;
}
// A stage visit records elapsed time, including revisits. Imported historical
// stages are not guessed. Uninstrumented deals start tracking at their next move.
export function trackCRMStage(deal:R,previous:R|undefined,actor:string,now:string){
 const prior=Array.isArray(previous?.crmStageHistory)?previous.crmStageHistory as CRMStageVisit[]:[];
 const history=prior.map(visit=>({...visit}));
 const previousStage=previous?canonicalCRMStage(previous.company,previous.status):undefined;
 if(previousStage===deal.status){deal.crmStageHistory=history;return;}
 if(history.length&&!history[history.length-1].exitedAt)history[history.length-1].exitedAt=now;
 history.push({stage:deal.status,enteredAt:now,actor});deal.crmStageHistory=history;
}

// Lazy wrappers keep the shared validation module independent of a live client.
// Supply getDb() and the authenticated Access object from a server route.
export async function getCustomerHistory(...args:Parameters<typeof import('./crm-data').getCustomerHistory>){return (await import('./crm-data')).getCustomerHistory(...args);}
export async function logCRMActivity(...args:Parameters<typeof import('./crm-data').logCRMActivity>){return (await import('./crm-data')).logCRMActivity(...args);}
export async function getPipelineVelocity(...args:Parameters<typeof import('./crm-data').getPipelineVelocity>){return (await import('./crm-data')).getPipelineVelocity(...args);}
