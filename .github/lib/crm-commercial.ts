import type {RecordRow as R} from './erp-primitives';
import {documentUsable,validDate} from './governance';
import type {CRMFieldIssue} from './crm';
const kampalaDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kampala',year:'numeric',month:'2-digit',day:'2-digit'});
export function crmDateKey(value:unknown){if(typeof value!=='string'||!value)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const time=Date.parse(value);return Number.isFinite(time)?kampalaDate.format(new Date(time)):'';}
export const isDrilling=(deal:R)=>deal.company==='Hagadol'&&(deal.serviceType==='drilling'||deal.businessLine==='Boreholes');
export function surveyIssues(deal:R,records:R[],today:string):CRMFieldIssue[]{
 if(!isDrilling(deal))return [];
 const doc=records.find(r=>r.id===deal.surveyDocumentId&&r.company===deal.company&&r.type==='document');
 const verification=doc?.crmVerification;
 if(!doc||doc.documentKind!=='Hydrogeological survey'||doc.dealId!==deal.id||!documentUsable(doc,today)||!verification||verification.dealId!==deal.id||verification.documentVersion!==doc.version||verification.decision!=='Approved')return [{code:'SURVEY_APPROVAL_REQUIRED',field:'surveyDocumentId',message:'Link a current, verified hydrogeological survey for this deal and document version.'}];
 return [];
}
export function requireCommercialFields(deal:R){
 if(deal.currency&&deal.currency!=='UGX')throw Error('Commercial deal values must use UGX.');
 if(!Number.isSafeInteger(deal.amount)||deal.amount<=0)throw Error('Enter a deal value above zero.');
 if(!deal.closingDate)throw Error('Enter the expected closing date.');validDate(deal.closingDate,true);
}
export function handoverQuote(deal:R,records:R[]){
 const quote=records.find(r=>r.id===deal.approvedQuoteId&&r.type==='quote'&&r.company===deal.company&&r.dealId===deal.id);
 if(!quote||quote.status!=='Draft'||!quote.quoteApproval||quote.quoteApproval.approvedVersion!==quote.version||!quote.quoteApproval.approvedBy||quote.amount!==deal.amount)throw Error('Link an approved quote for this deal with a matching contract value.');
 return quote;
}
export function handoverProject(deal:R,requestId:string,today:string){
 requireCommercialFields(deal);const due=validDate(deal.targetHandoverDate,true);if(due<today)throw Error('Choose a target handover date from today onwards.');
 return {type:'project',projectCode:(deal.company==='WMK'?'WMK':'HGD')+'/'+today.slice(0,4)+'/'+deal.id,name:deal.name,company:deal.company,amount:deal.amount,customer:deal.customer,date:today,due,owner:'',leadEngineer:'',projectKind:deal.company==='WMK'?'Architecture':isDrilling(deal)?'Borehole':deal.businessLine==='Solar pumping'?'Solar pumping':deal.businessLine==='Water treatment'?'Water treatment':deal.businessLine==='Irrigation'?'Irrigation':'Water system',technicalScope:deal.notes||'',sourceDealId:deal.id,crmOwnerId:deal.crmOwnerId||'',crmCompanyId:deal.crmCompanyId||'',contactId:deal.contactId||'',handoverRequestId:requestId,handoverStatus:'Awaiting assignment',targetHandoverDate:due,contractValue:deal.amount};
}
export function validateSalesTarget(r:R){
 const start=validDate(r.date,true),end=validDate(r.due,true);if(start>end)throw Error('Target end date must be on or after its start.');
 const value=Number(r.targetContractValue||0),count=Number(r.targetWonDealsCount||0);
 if(!Number.isSafeInteger(value)||value<0||value>1e12||!Number.isSafeInteger(count)||count<0||count>100000||!value&&!count)throw Error('Enter a positive contract value target or won deal count target.');
 r.targetContractValue=value;r.targetWonDealsCount=count;r.currency='UGX';
}
export function commercialReview(deal:R){return [!deal.amount?'Deal value missing':'',!deal.closingDate?'Expected closing date missing':''].filter(Boolean);}
export function crmPerformance(records:R[],start:string,end:string,today:string){
 const activities=records.filter(r=>r.type==='task'&&r.crm===true&&r.eos!==true),open=activities.filter(r=>r.status!=='Done');
 const won=records.filter(r=>r.type==='deal'&&r.status==='Won'&&r.closedAt&&crmDateKey(r.closedAt)>=start&&crmDateKey(r.closedAt)<=end);
 const groups=new Map<string,{id:string;name:string;count:number;value:number;cycles:number[]}>();
 for(const r of won){const key=r.crmOwnerId||'unassigned';const group=groups.get(key)||{id:key,name:r.crmOwnerId?r.owner||'Assigned user':'Unassigned historical owner',count:0,value:0,cycles:[] as number[]};group.count++;group.value+=r.amount;const began=Date.parse(r.date+'T00:00:00Z'),closed=Date.parse(r.closedAt);if(r.dateBasis!=='imported'&&Number.isFinite(began)&&Number.isFinite(closed)&&closed>=began)group.cycles.push((closed-began)/86400000);groups.set(key,group);}
 return {overdue:open.filter(r=>r.due&&r.due<today).length,dueToday:open.filter(r=>r.due===today).length,upcoming:open.filter(r=>r.due>today).length,completed:activities.filter(r=>r.status==='Done'&&crmDateKey(r.activityCompletedAt||r.completedDate)>=start&&crmDateKey(r.activityCompletedAt||r.completedDate)<=end).length,won,missingCloseDates:records.filter(r=>r.type==='deal'&&r.status==='Won'&&!r.closedAt).length,leaders:[...groups.values()].sort((a,b)=>b.value-a.value).map(r=>({...r,cycleDays:r.cycles.length?Math.round(r.cycles.reduce((a,b)=>a+b,0)/r.cycles.length):null})),targets:records.filter(r=>r.type==='crm_target'&&r.status!=='Archived'&&r.date===start&&r.due===end)};
}
