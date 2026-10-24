import {and,desc,eq,inArray,lt,lte,or,sql} from 'drizzle-orm';
import type {LibSQLDatabase} from 'drizzle-orm/libsql';
import * as schema from '../db/schema';
import type {Access} from './access-policy';
import {canReadRecord,canWriteRecord} from './access-policy';
import type {RecordRow} from './erp-primitives';
import {canonicalCRMStage,type CRMStageVisit} from './crm';

export type CRMDatabase=LibSQLDatabase<typeof schema>;
export class CRMDataError extends Error {
 constructor(readonly code:string,message:string,readonly status=400,readonly field?:string){super(message);this.name='CRMDataError';}
}
export type CustomerTarget={companyId:string;contactId?:never;dealId?:never}|{contactId:string;companyId?:never;dealId?:never}|{dealId:string;companyId?:never;contactId?:never};
export type LogCRMActivityInput={companyId?:string;contactId?:string;dealId?:string;kind:typeof schema.crmTimelineKinds[number];description:string;outcome?:string;occurredAt?:string;dueAt?:string};
export type HistoryItem={id:string;kind:string;description:string;outcome:string;author:string|null;timestamp:string;dueAt:string|null;status?:string;dealId:string|null;contactId:string|null;companyId:string|null;source:'activity'|'legacy'|'stage'};
type StoredRecord=typeof schema.records.$inferSelect;
function hydrate(row:StoredRecord):RecordRow {const {payload,...stored}=row;return {...JSON.parse(payload),...stored};}
function fail(code:string,message:string,status=400,field?:string):never{throw new CRMDataError(code,message,status,field);}
function timestamp(value:unknown,field:string){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))fail('INVALID_TIMESTAMP','Use a valid UTC timestamp.',400,field);
 const normalized=new Date(value).toISOString();
 if(normalized.slice(0,19)!==value.slice(0,19))fail('INVALID_TIMESTAMP','Use a valid UTC timestamp.',400,field);
 return normalized;
}
function boundedText(value:unknown,field:string,max:number,required=false){
 if(typeof value!=='string'||value.length>max||required&&!value.trim())fail('INVALID_FIELD',`Enter a valid ${field}.`,400,field);
 return value.trim();
}
async function readRecord(db:Pick<CRMDatabase,'select'>,access:Access,id:string|undefined,type?:string,write=false){
 if(!id||typeof id!=='string'||id.length>120)fail('INVALID_LINK','Choose a valid customer, contact or opportunity.');
 const [row]=await db.select().from(schema.records).where(and(eq(schema.records.id,id),inArray(schema.records.company,access.companies))).limit(1);
 if(!row)fail('CRM_RECORD_NOT_FOUND','The CRM record is unavailable.',404);
 const record=hydrate(row);
 if(type&&record.type!==type||!canReadRecord(access,record)||write&&!canWriteRecord(access,record,'edit'))fail('CRM_ACCESS_DENIED','You cannot access this CRM record.',403);
 return record;
}
function targetReference(target:CustomerTarget){
 const entries=Object.entries(target).filter(([,value])=>value!==undefined);
 if(entries.length!==1||!['companyId','contactId','dealId'].includes(entries[0][0]))fail('INVALID_TARGET','Choose exactly one customer company, contact or opportunity.');
 return {key:entries[0][0],id:entries[0][1] as string,type:{companyId:'crm_company',contactId:'contact',dealId:'deal'}[entries[0][0]]};
}
export async function logCRMActivity(db:CRMDatabase,access:Access,input:LogCRMActivityInput){
 if(!schema.crmTimelineKinds.includes(input.kind))fail('INVALID_ACTIVITY_KIND','Choose Call, Email, Meeting, Note or Task Reminder.',400,'kind');
 const description=boundedText(input.description,'description',10000,true),outcome=boundedText(input.outcome??'','outcome',2000);
 const now=new Date().toISOString(),occurredAt=timestamp(input.occurredAt??now,'occurredAt');
 if(occurredAt>now)fail('FUTURE_ACTIVITY','Log completed interactions through now. Use dueAt for reminders.',400,'occurredAt');
 const dueAt=input.dueAt?timestamp(input.dueAt,'dueAt'):null;
 if(input.kind==='Task Reminder'&&!dueAt)fail('REMINDER_DUE_REQUIRED','Enter the reminder due time.',400,'dueAt');
 return db.transaction(async tx=>{
  const deal=input.dealId?await readRecord(tx,access,input.dealId,'deal',true):undefined;
  const contactId=input.contactId||deal?.contactId||undefined;
  const contact=contactId?await readRecord(tx,access,contactId,'contact',true):undefined;
  const companyId=input.companyId||deal?.crmCompanyId||contact?.crmCompanyId||undefined;
  const customer=companyId?await readRecord(tx,access,companyId,'crm_company',true):undefined;
  const anchor=deal||contact||customer;
  if(!anchor)fail('ACTIVITY_LINK_REQUIRED','Link the activity to a customer company, contact or opportunity.');
  if([deal,contact,customer].some(row=>row&&row.company!==anchor.company))fail('LINK_COMPANY_MISMATCH','Activity links must belong to the same business.');
  if(deal?.contactId&&contact?.id!==deal.contactId||deal?.crmCompanyId&&customer?.id!==deal.crmCompanyId||contact?.crmCompanyId&&customer?.id!==contact.crmCompanyId)fail('LINK_CUSTOMER_MISMATCH','Activity links must match the opportunity and contact.');
  const activity={id:crypto.randomUUID(),company:anchor.company,crmCompanyId:customer?.id??null,contactId:contact?.id??null,dealId:deal?.id??null,kind:input.kind,description,outcome,occurredAt,createdAt:now,dueAt,actor:access.email};
  await tx.insert(schema.crmActivities).values(activity);
  return activity;
 });
}
function legacyHistory(row:RecordRow):HistoryItem{
 const kind=row.activityKind==='Call'?'Call':row.activityKind==='Meeting'?'Meeting':'Task';
 // created is the recording time; a due date does not prove an interaction.
 return {id:'legacy:'+row.id,kind,description:row.notes||row.name,outcome:row.outcome||'',author:(row.activityCompletedAt?row.activityCompletedBy||row.activityAuthor:row.activityAuthor)||null,timestamp:row.activityCompletedAt|| (row.completedDate?new Date(row.completedDate+'T00:00:00Z').toISOString():new Date(row.created.length===10?row.created+'T00:00:00Z':row.created).toISOString()),dueAt:row.due?row.due+'T00:00:00.000Z':null,status:row.status,dealId:row.dealId||null,contactId:row.contactId||null,companyId:row.crmCompanyId||null,source:'legacy'};
}
function legacyMatches(row:RecordRow,target:RecordRow,deals:RecordRow[],contacts:RecordRow[]){
 if(row.type!=='task'||row.eos===true||row.meetingId||row.issueId||row.rockId)return false;
 if(target.type==='deal')return row.dealId===target.id;
 if(target.type==='contact')return row.contactId===target.id||deals.some(deal=>deal.id===row.dealId&&deal.contactId===target.id);
 return row.crmCompanyId===target.id||contacts.some(contact=>contact.id===row.contactId&&contact.crmCompanyId===target.id)||deals.some(deal=>deal.id===row.dealId&&deal.crmCompanyId===target.id);
}
export async function getCustomerHistory(db:CRMDatabase,access:Access,target:CustomerTarget,options:{limit?:number;before?:{timestamp:string;id:string}}={}){
 const ref=targetReference(target),anchor=await readRecord(db,access,ref.id,ref.type);
 const limit=options.limit??50;if(!Number.isInteger(limit)||limit<1||limit>100)fail('INVALID_LIMIT','Choose a history limit between 1 and 100.');
 const before=options.before?{timestamp:timestamp(options.before.timestamp,'before.timestamp'),id:boundedText(options.before.id,'before.id',200,true)}:undefined;
 // Resolve the customer's relationship graph without exposing another workspace.
 const related=await db.select().from(schema.records).where(and(eq(schema.records.company,anchor.company),inArray(schema.records.type,['contact','deal','task'])));
 const visible=related.map(hydrate).filter(row=>canReadRecord(access,row));
 const contacts=visible.filter(row=>row.type==='contact'),deals=visible.filter(row=>row.type==='deal');
 const targetDeals=deals.filter(deal=>anchor.type==='deal'?deal.id===anchor.id:anchor.type==='contact'?deal.contactId===anchor.id:deal.crmCompanyId===anchor.id||contacts.some(contact=>contact.id===deal.contactId&&contact.crmCompanyId===anchor.id));
 const relationship=anchor.type==='deal'?eq(schema.crmActivities.dealId,anchor.id):anchor.type==='contact'?or(eq(schema.crmActivities.contactId,anchor.id),targetDeals.length?inArray(schema.crmActivities.dealId,targetDeals.map(deal=>deal.id)):undefined):or(eq(schema.crmActivities.crmCompanyId,anchor.id),inArray(schema.crmActivities.contactId,contacts.filter(contact=>contact.crmCompanyId===anchor.id).map(contact=>contact.id)),targetDeals.length?inArray(schema.crmActivities.dealId,targetDeals.map(deal=>deal.id)):undefined);
 // Keep deal-only activity private from roles that cannot read opportunities.
 const readableDeals=deals.map(deal=>deal.id);
 const visibility=or(sql`${schema.crmActivities.dealId} IS NULL`,readableDeals.length?inArray(schema.crmActivities.dealId,readableDeals):undefined);
 const pagePredicate=before?or(lt(schema.crmActivities.occurredAt,before.timestamp),and(eq(schema.crmActivities.occurredAt,before.timestamp),lt(schema.crmActivities.id,before.id))):undefined;
 const rows=await db.select().from(schema.crmActivities).where(and(eq(schema.crmActivities.company,anchor.company),relationship,visibility,pagePredicate)).orderBy(desc(schema.crmActivities.occurredAt),desc(schema.crmActivities.id)).limit(limit+1);
 const interactions:HistoryItem[]=rows.map(row=>({id:row.id,kind:row.kind,description:row.description,outcome:row.outcome,author:row.actor,timestamp:row.occurredAt,dueAt:row.dueAt,dealId:row.dealId,contactId:row.contactId,companyId:row.crmCompanyId,source:'activity'}));
 const legacy=visible.filter(row=>legacyMatches(row,anchor,deals,contacts)).map(legacyHistory);
 const stageItems:HistoryItem[]=targetDeals.flatMap(deal=>(Array.isArray(deal.crmStageHistory)?deal.crmStageHistory as CRMStageVisit[]:[]).map((visit,index)=>({id:`stage:${deal.id}:${index}`,kind:'Stage change',description:`${deal.name}: ${visit.stage}`,outcome:visit.stage,author:visit.actor||null,timestamp:visit.enteredAt,dueAt:null,dealId:deal.id,contactId:deal.contactId||null,companyId:deal.crmCompanyId||null,source:'stage' as const})));
 const all=[...interactions,...legacy,...stageItems].filter(row=>!before||row.timestamp<before.timestamp||row.timestamp===before.timestamp&&row.id<before.id).sort((a,b)=>a.timestamp===b.timestamp?(a.id>b.id?-1:a.id<b.id?1:0):a.timestamp>b.timestamp?-1:1);
 const items=all.slice(0,limit),last=items[items.length-1];
 return {items,nextCursor:all.length>limit&&last?{timestamp:last.timestamp,id:last.id}:null};
}

export async function verifyCustomerBilling(db:CRMDatabase,access:Access,companyId:string,expectedVersion:number){
 if(!['Owner','Administrator','Finance'].includes(access.role))fail('BILLING_REVIEW_DENIED','Only authorised finance or administration staff may verify billing details.',403);
 if(!Number.isInteger(expectedVersion)||expectedVersion<0)fail('VERSION_REQUIRED','Provide the customer version reviewed.',400,'expectedVersion');
 return db.transaction(async tx=>{
  const customer=await readRecord(tx,access,companyId,'crm_company');
  if(customer.version!==expectedVersion)fail('CRM_RECORD_CONFLICT','Customer details changed. Review them again.',409);
  if(!customer.billingAddress?.trim()||!customer.taxReference?.trim())fail('BILLING_DETAILS_REQUIRED','Enter the billing address and tax PIN or TIN first.');
  const now=new Date().toISOString(),billingVerification={address:customer.billingAddress,taxReference:customer.taxReference,verifiedBy:access.email,verifiedAt:now};
  const payload={...customer,billingVerification,version:customer.version+1};
  const result=await tx.update(schema.records).set({payload:JSON.stringify(payload),version:customer.version+1}).where(and(eq(schema.records.id,customer.id),eq(schema.records.company,customer.company),eq(schema.records.version,expectedVersion))).returning({id:schema.records.id});
  if(!result.length)fail('CRM_RECORD_CONFLICT','Customer details changed. Review them again.',409);
  await tx.insert(schema.audit).values({id:crypto.randomUUID(),company:customer.company,actor:access.email,action:'Verified CRM billing details',record:customer.id,date:now});
  return {id:customer.id,version:customer.version+1,billingVerification};
 });
}

export async function getPipelineVelocity(db:CRMDatabase,access:Access,company:string,options:{asOf?:string;stagnantDays?:number}={}){
 if(!access.companies.includes(company))fail('CRM_ACCESS_DENIED','You cannot access this business.',403);
 const asOf=timestamp(options.asOf??new Date().toISOString(),'asOf'),threshold=options.stagnantDays??14;
 if(!Number.isInteger(threshold)||threshold<1||threshold>365)fail('INVALID_THRESHOLD','Choose a stagnation threshold from 1 to 365 days.');
 const rows=await db.select().from(schema.records).where(and(eq(schema.records.company,company),eq(schema.records.type,'deal')));
 const deals=rows.map(hydrate).filter(deal=>canReadRecord(access,deal));
 const lastInteractions=await db.select({dealId:schema.crmActivities.dealId,latest:sql<string>`max(${schema.crmActivities.occurredAt})`}).from(schema.crmActivities).where(and(eq(schema.crmActivities.company,company),lte(schema.crmActivities.occurredAt,asOf),sql`${schema.crmActivities.kind} <> 'Task Reminder'`)).groupBy(schema.crmActivities.dealId);
 const legacy=await db.select().from(schema.records).where(and(eq(schema.records.company,company),eq(schema.records.type,'task')));
 const lastByDeal=new Map(lastInteractions.map(row=>[row.dealId,row.latest]));
 for(const task of legacy.map(hydrate).filter(row=>row.status==='Done'&&row.eos!==true&&!row.meetingId&&!row.issueId&&!row.rockId&&row.dealId)){
  const date=legacyHistory(task).timestamp;
  if(date<=asOf&&date>(lastByDeal.get(task.dealId)||''))lastByDeal.set(task.dealId,date);
 }
 const now=Date.parse(asOf),stageTotals=new Map<string,{stage:string;totalHours:number;completedVisits:number;openVisits:number}>();
 const metrics=deals.filter(deal=>Date.parse(deal.created.length===10?deal.created+'T00:00:00Z':deal.created)<=now).map(deal=>{
  const history=(Array.isArray(deal.crmStageHistory)?deal.crmStageHistory:[]) as CRMStageVisit[];
  const stageTimes=history.filter(visit=>visit.enteredAt<=asOf).map(visit=>{
   const end=visit.exitedAt&&visit.exitedAt<=asOf?visit.exitedAt:asOf;
   const hours=Math.max(0,(Date.parse(end)-Date.parse(visit.enteredAt))/3600000);
   const closed=!!visit.exitedAt&&visit.exitedAt<=asOf;
   const aggregate=stageTotals.get(visit.stage)||{stage:visit.stage,totalHours:0,completedVisits:0,openVisits:0};
   aggregate.totalHours+=hours;if(closed)aggregate.completedVisits++;else aggregate.openVisits++;stageTotals.set(visit.stage,aggregate);
   return {...visit,hours,completed:closed};
  });
  const createdAt=deal.created.length===10?deal.created+'T00:00:00.000Z':deal.created;
  const lastActivityAt=lastByDeal.get(deal.id)||null,daysInactive=Math.max(0,(now-Date.parse(lastActivityAt||createdAt))/86400000);
  const stage=stageTimes[stageTimes.length-1]?.stage||canonicalCRMStage(company,deal.status);
  return {id:deal.id,name:deal.name,stage,lastActivityAt,daysInactive,stagnant:!['Won','Lost'].includes(stage)&&daysInactive>=threshold,stageTimes,historyComplete:history.length>0&&history[0].enteredAt===createdAt};
 });
 return {asOf,stagnantDays:threshold,deals:metrics,stages:[...stageTotals.values()].map(stage=>({...stage,averageCompletedHours:stage.completedVisits?metrics.flatMap(deal=>deal.stageTimes).filter(visit=>visit.stage===stage.stage&&visit.completed).reduce((sum,visit)=>sum+visit.hours,0)/stage.completedVisits:null}))};
}
