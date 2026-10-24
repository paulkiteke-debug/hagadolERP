import {and,eq,inArray} from 'drizzle-orm';
import * as schema from '../db/schema';
import type {Access} from './access-policy';
import {buildPlan,applyPlan,type State,cashAccounts,accounts,day} from './erp-engine';
import {importRow,rowManifest,type ImportRow} from './finance-import';
import {fingerprint} from './security';
import {readFinanceState,persistFinancePlan,type FinanceDatabase} from './finance-persistence';
import {FinanceWorkflowError,requireFinanceAmount} from './revenue-recognition';

export type ImportPosting=
 |{type:'invoice';partyId:string;taxRate:number;projectId?:string;deferred?:boolean;expenseAccount?:string}
 |{type:'bill';partyId:string;taxRate:number;projectId?:string;deferred?:boolean;expenseAccount:string}
 |{type:'expense';account:string;expenseAccount:string;projectId?:string}
 |{type:'settlement';targetId:string;expectedVersion:number;account:string;interestUGX?:number}
 |{type:'cashSale';account:string;projectId?:string}
 |{type:'deferredReceipt';account:string;projectId?:string}
 |{type:'funding';account:string;creditAccount:'Capital'|'Opening equity'}
 |{type:'loan';account:string}
 |{type:'opening';account:'Accounts receivable'|'Accounts payable';partyId?:string};
export type ImportDecision={rowId:string;action:'exclude';reason:string}|{rowId:string;action:'post';posting:ImportPosting;resolution?:string};
export type ApprovalSignOff={confirmed:true;reviewHash:string;note:string};
export type ImportIssue={rowId?:string;field:string;code:string;message:string};
export function requireFinanceAccess(access:Access,company?:string){
 if(!['Owner','Administrator','Finance'].includes(access.role)||company&&!access.companies.includes(company))throw new FinanceWorkflowError('FINANCE_ACCESS_DENIED','Finance access to the owning business is required.',403);
}
function error(code:string,message:string,status=400,issues:ImportIssue[]=[]):never{throw new FinanceWorkflowError(code,message,status,issues);}
function dateOf(row:ImportRow){return row.date.replaceAll('/','-');}
const normal=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
function postingType(posting:ImportPosting,state:State){if(posting.type==='settlement'){const target=state.records.find(r=>r.id===posting.targetId);return target?.type==='invoice'?'receipt':target?.type==='loan'?'loan_payment':'payment';}return posting.type;}
async function economicKey(company:string,date:string,type:string,description:string,amount:number){return fingerprint([company,date,type,normal(description),amount]);}
const eligible:Record<ImportRow['kind'],string[]>={
 'Invoice':['invoice'], 'Supplier bill':['bill'],
 'Cash in':['cashSale','deferredReceipt','settlement'], 'Cash out':['expense','settlement'],
 'Client receipt':['settlement','deferredReceipt'], 'Company account funding':['funding','loan'],
 'Debt balance':['opening'], 'Debt payment':['settlement'], 'Personal funding':['funding','loan'], 'Loan proceeds':['loan'],
 'Expected receipt':[], 'Pending balance':[], 'Salary schedule':[], 'Unpriced item':[],
};
async function loadSource(tx:Pick<FinanceDatabase,'select'>,access:Access,importId:string){
 requireFinanceAccess(access);
 const [batch]=await tx.select().from(schema.financeImportBatches).where(eq(schema.financeImportBatches.id,importId));
 if(!batch)error('IMPORT_NOT_FOUND','The source import is unavailable.',404);
 if(batch.status!=='Review')error('IMPORT_NOT_COMPLETE','Complete and validate the source upload first.',409);
 const retired=await tx.select().from(schema.financeImportRevisions).where(eq(schema.financeImportRevisions.replacesBatchId,importId));
 if(retired.length)error('IMPORT_SUPERSEDED','Use the current source revision.',409);
 const stored=await tx.select().from(schema.financeImportRows).where(eq(schema.financeImportRows.batchId,importId));
 const rows:ImportRow[]=[];
 for(const row of stored){const source=importRow(JSON.parse(row.payload));if(source.id!==row.rowKey||source.company!==row.company||await fingerprint(source)!==row.rowHash)error('SOURCE_ROW_CHANGED','A staged source row failed its integrity check.',409);rows.push(source);}
 if(rows.length!==batch.expectedRows||await rowManifest(stored.map(row=>({row_key:row.rowKey,row_hash:row.rowHash})))!==batch.manifestHash)error('SOURCE_MANIFEST_MISMATCH','Source row count or hashes no longer match the reviewed workbook.',409);
 if(rows.some(row=>['WMK','Hagadol'].includes(row.company)?!access.companies.includes(row.company):!['WMK','Hagadol'].every(company=>access.companies.includes(company))))error('FINANCE_ACCESS_DENIED','This import includes another business.',403);
 const [revision]=await tx.select().from(schema.financeImportRevisions).where(eq(schema.financeImportRevisions.batchId,importId));
 return {batch,rows,revision};
}
function rowInput(row:ImportRow,posting:ImportPosting,state:State){
 const amount=requireFinanceAmount(row.amount_UGX),company=row.company,date=dateOf(row),base={company,date,name:row.description,actor:'',sourceImportRow:row.id};
 if('account' in posting&&!cashAccounts.includes(posting.account)&&posting.type!=='opening')error('INVALID_CASH_ACCOUNT','Choose Bank, Cash or Mobile money.');
 if(posting.type==='invoice'||posting.type==='bill'){
  const party=state.records.find(r=>r.id===posting.partyId&&r.company===company&&['contact','crm_company'].includes(r.type));if(!party)error('PARTY_REQUIRED','Choose a customer or supplier from this business.');
  if(posting.type==='bill'&&!['Operating expenses','Equipment','Inventory','Interest expenses'].includes(posting.expenseAccount))error('INVALID_EXPENSE_ACCOUNT','Choose the bill expense or asset account.');
  if(posting.deferred&&posting.type!=='invoice')error('INVALID_DEFERRAL','Only an external customer invoice can defer revenue.');
  if(!Number.isFinite(posting.taxRate)||posting.taxRate<0||posting.taxRate>100)error('TAX_RATE_REQUIRED','Explicitly review the document tax rate, including zero for no VAT.');
  const net=Math.round(amount/(1+posting.taxRate/100));
  if(net+Math.round(net*posting.taxRate/100)!==amount)error('TAX_ROUNDING_MISMATCH','The gross source amount cannot be represented by this simple tax mapping. Review a detailed document separately.');
  return {...base,action:'create',type:posting.type,partyId:party.id,projectId:posting.projectId||'',revenueRecognition:posting.deferred?'Deferred':'Immediate',expenseAccount:posting.expenseAccount||'Operating expenses',lines:[{description:row.description,qty:1,rate:net}],taxRate:posting.taxRate};
 }
 if(posting.type==='expense'){
  if(!['Operating expenses','Equipment','Inventory','Interest expenses'].includes(posting.expenseAccount))error('INVALID_EXPENSE_ACCOUNT','Choose an existing expense or asset account.');
  return {...base,action:'create',type:'expense',amount,account:posting.account,expenseAccount:posting.expenseAccount,projectId:posting.projectId||''};
 }
 if(posting.type==='loan')return {...base,action:'create',type:'loan',amount,account:posting.account};
 if(posting.type==='settlement'){
  const target=state.records.find(r=>r.id===posting.targetId&&r.company===company&&['invoice','bill','loan'].includes(r.type));
  if(!target||target.status!=='Posted'||target.version!==posting.expectedVersion)error('SETTLEMENT_TARGET_CHANGED','Review the current invoice, bill or loan version.',409);
  if(row.kind==='Client receipt'&&target.type!=='invoice'||row.kind==='Cash in'&&target.type!=='invoice'||['Cash out','Debt payment'].includes(row.kind)&&target.type==='invoice')error('SETTLEMENT_DIRECTION','The settlement direction does not match its source row.');
  const interest=target.type==='loan'?posting.interestUGX:0;
  if(target.type==='loan'&&(typeof interest!=='number'||!Number.isSafeInteger(interest)||interest<0||interest>amount)||target.type!=='loan'&&posting.interestUGX)error('INTEREST_SPLIT_REQUIRED','Review the loan interest explicitly, including zero for principal only.');
  return {...base,action:'pay',id:target.id,expectedVersion:target.version,amount:amount-(interest||0),interest:interest||0,account:posting.account,reference:row.source_sheet+'!'+row.source_cell};
 }
 if(posting.type==='funding'&&!['Capital','Opening equity'].includes(posting.creditAccount))error('INVALID_FUNDING_ACCOUNT','Choose an existing capital or opening equity account.');
 let debit:string,credit:string;
 if(posting.type==='opening'){
  if(!['Accounts receivable','Accounts payable'].includes(posting.account))error('INVALID_OPENING_ACCOUNT','Choose an existing opening balance account.');
  if(!posting.partyId||!state.records.some(r=>r.id===posting.partyId&&r.company===company&&['contact','crm_company'].includes(r.type)))error('PARTY_REQUIRED','An opening party balance needs an existing customer or supplier.');
  debit=posting.account==='Accounts receivable'?posting.account:'Opening equity';credit=posting.account==='Accounts payable'?posting.account:'Opening equity';
 }else{debit=posting.account;credit=posting.type==='cashSale'?'Sales revenue':posting.type==='deferredReceipt'?'Deferred revenue':posting.creditAccount;}
 if(!accounts.includes(debit)||!accounts.includes(credit)||debit===credit)error('INVALID_ACCOUNTS','Use distinct existing posting accounts.');
 if(posting.type==='deferredReceipt'&&!posting.projectId)error('PROJECT_REQUIRED','A customer advance needs its project.');
 return {...base,action:'create',type:'journal',projectId:'projectId' in posting?posting.projectId||'':'',partyId:'partyId' in posting?posting.partyId||'':'',entries:[{account:debit,debit:amount,credit:0},{account:credit,debit:0,credit:amount}]};
}
function currentPosting(posting:ImportPosting,state:State):ImportPosting{
 if(posting.type!=='settlement')return posting;
 return {...posting,expectedVersion:state.records.find(record=>record.id===posting.targetId)?.version??posting.expectedVersion};
}
async function validateDecisions(source:Awaited<ReturnType<typeof loadSource>>,decisions:ImportDecision[],state:State,tx:Pick<FinanceDatabase,'select'>){
 if(!Array.isArray(decisions)||decisions.length!==source.rows.length||new Set(decisions.map(d=>d.rowId)).size!==decisions.length)error('DECISIONS_INCOMPLETE','Review every row exactly once, including rows excluded from posting.');
 if(decisions.filter(decision=>decision.action==='post').length>100)error('POSTING_LIMIT','Post at most 100 transactions per reviewed source batch. Split larger workbooks into independently reconciled batches.');
 const issues:ImportIssue[]=[],seen=new Set<string>(),postingKeys=new Map<string,string>();
 const statuses=source.revision?JSON.parse(source.revision.metadata).recordStatusById as Record<string,string>:undefined;
 const nativeKeys=new Set<string>();
 for(const record of state.records.filter(r=>['invoice','bill','expense','receipt','payment','loan','loan_payment'].includes(r.type)&&!['Draft','Voided','Converted'].includes(r.status)))nativeKeys.add(await economicKey(record.company,record.date,record.type,record.name,record.amount));
 const claims=await tx.select({key:schema.financeImportPostings.economicKey}).from(schema.financeImportPostings).where(inArray(schema.financeImportPostings.company,[...new Set(source.rows.map(row=>row.company))]));
 const postedKeys=new Set(claims.map(claim=>claim.key));
 for(const row of source.rows){
  const decision=decisions.find(d=>d.rowId===row.id);if(!decision)error('DECISIONS_INCOMPLETE','Each decision must reference a staged source row.');
  const issue=(code:string,field:string,message:string)=>issues.push({rowId:row.id,code,field,message});
  if(decision.action==='exclude'){if(typeof decision.reason!=='string'||!decision.reason.trim()||decision.reason.length>2000)issue('EXCLUSION_REASON_REQUIRED','reason','Explain why this source row is excluded.');continue;}
  if(decision.action!=='post'||!decision.posting){issue('INVALID_DECISION','action','Choose post or exclude.');continue;}
  if(!['Hagadol','WMK'].includes(row.company))issue('COMPANY_UNRESOLVED','company','Resolve shared or unassigned entries before posting.');
  if(!row.date||dateOf(row)>day())issue('DATE_UNRESOLVED','date','Posting requires an actual source date through today.');
  if(!row.description.trim())issue('DESCRIPTION_REQUIRED','description','Enter a transaction description.');
  if(/^(?:grand total|sub[ ]?total|total)(?:[ :].*)?$/i.test(row.description.trim())||/subtotal/i.test(row.category))issue('AGGREGATE_ROW','description','Subtotal and total rows must be excluded.');
  if(!/UGX/i.test(row.currency_basis))issue('CURRENCY_UNRESOLVED','currency_basis','Confirm a UGX source amount before posting.');
  if(row.total_fees_UGX!=null&&row.paid_UGX!=null&&row.paid_UGX>row.total_fees_UGX)issue('SOURCE_TOTAL_ANOMALY','paid_UGX','The source paid amount exceeds its stated total fees.');
  if(row.amount_UGX===null||row.amount_UGX<=0)issue('AMOUNT_UNRESOLVED','amount_UGX','Resolve missing, zero or negative values before posting.');
  if(row.possible_duplicates.trim())issue('SOURCE_DUPLICATE_FLAG','possible_duplicates','Resolve duplicate candidates in a corrected source revision or exclude them.');
  if(statuses?.[row.id]==='Hold for review')issue('SOURCE_ROW_HELD','record_status','A held source row cannot be posted.');
  if(/assum|infer|context|estimate|unverified/i.test(row.date_basis+' '+row.currency_basis)&&!decision.resolution?.trim())issue('SOURCE_BASIS_REVIEW_REQUIRED','resolution','Confirm inferred dates and currency assumptions against evidence.');
  if(row.review.trim()&&(!decision.resolution?.trim()||decision.resolution.length>2000))issue('ANOMALY_REVIEW_REQUIRED','resolution','Record how the source anomaly was resolved.');
  if(!eligible[row.kind]?.includes(decision.posting.type))issue('MAPPING_REQUIRES_RECLASSIFICATION','posting.type','This source category does not support the selected posting. Forecasts and unresolved balances stay outside the ledger.');
  if(row.amount_UGX!==null){
   const key=await economicKey(row.company,dateOf(row),postingType(decision.posting,state),row.description,row.amount_UGX);postingKeys.set(row.id,key);
   if(seen.has(key)||postedKeys.has(key)||nativeKeys.has(key))issue('DUPLICATE_TRANSACTION','posting','A matching transaction exists in this batch or the ledger.');seen.add(key);
  }
  try{rowInput(row,decision.posting,state);}catch(cause){issue(cause instanceof FinanceWorkflowError?cause.code:'POSTING_INVALID','posting',cause instanceof Error?cause.message:'Review the posting mapping.');}
 }
 if(issues.length)error('IMPORT_VALIDATION_FAILED','Resolve the import validation issues before approval.',422,issues);
 let simulated=state;
 for(const decision of decisions){if(decision.action!=='post')continue;
  const row=source.rows.find(sourceRow=>sourceRow.id===decision.rowId)!;
  try{
   let plan=buildPlan({...rowInput(row,currentPosting(decision.posting,simulated),simulated),actor:'Import preflight',requestId:crypto.randomUUID()},simulated);
   simulated=applyPlan(simulated,plan);const created=simulated.records.find(record=>record.id===plan.focusId)!;
   if(['invoice','bill','expense','loan'].includes(created.type)){plan=buildPlan({action:'post',id:created.id,expectedVersion:created.version,requestId:crypto.randomUUID()},simulated);simulated=applyPlan(simulated,plan);}
  }catch(cause){error('IMPORT_PREFLIGHT_FAILED','The mapped batch cannot be posted.',422,[{rowId:row.id,field:'posting',code:'POSTING_INVALID',message:cause instanceof Error?cause.message:'Review this mapping.'}]);}
 }
 return postingKeys;
}
export async function prepareImportPosting(db:FinanceDatabase,access:Access,importId:string,decisions:ImportDecision[]){
 return db.transaction(async tx=>{
  const source=await loadSource(tx,access,importId),state=await readFinanceState(tx,access.companies);
  const [old]=await tx.select().from(schema.financeImportReviews).where(eq(schema.financeImportReviews.importId,importId));
  if(old?.status==='Posted')error('IMPORT_ALREADY_POSTED','The approved import is preserved.',409);
  await validateDecisions(source,decisions,state,tx);
  const ordered=[...decisions].sort((a,b)=>a.rowId.localeCompare(b.rowId));
  const reviewHash=await fingerprint({importId,sourceHash:source.batch.sourceHash,filename:source.batch.filename,source:source.batch.manifestHash,decisions:ordered}),version=(old?.version||0)+1;
  const values={version,status:'Prepared' as const,decisions:JSON.stringify(ordered),reviewHash,preparedBy:access.email,preparedAt:new Date().toISOString()};
  await tx.insert(schema.financeImportReviews).values({importId,...values}).onConflictDoUpdate({target:schema.financeImportReviews.importId,set:values});
  return {importId,version,reviewHash,postRows:ordered.filter(row=>row.action==='post').length,excludedRows:ordered.filter(row=>row.action==='exclude').length};
 });
}
export async function approveAndPostImport(db:FinanceDatabase,access:Access,importId:string,signOff:ApprovalSignOff){
 requireFinanceAccess(access);
 if(signOff?.confirmed!==true||typeof signOff.note!=='string'||!signOff.note.trim()||signOff.note.length>2000||!/^[a-f0-9]{64}$/.test(signOff.reviewHash||''))error('SIGN_OFF_REQUIRED','Confirm the reviewed import and record the approval note.');
 return db.transaction(async tx=>{
  const source=await loadSource(tx,access,importId);
  const [review]=await tx.select().from(schema.financeImportReviews).where(eq(schema.financeImportReviews.importId,importId));
  if(!review||review.reviewHash!==signOff.reviewHash)error('REVIEW_CHANGED','Review the current posting plan before signing it off.',409);
  if(review.status==='Posted')return JSON.parse(review.result!) as {importId:string;recordIds:string[];postedRows:number;excludedRows:number};
  const decisions=JSON.parse(review.decisions) as ImportDecision[];
  if(await fingerprint({importId,sourceHash:source.batch.sourceHash,filename:source.batch.filename,source:source.batch.manifestHash,decisions})!==review.reviewHash)error('REVIEW_INTEGRITY_FAILED','The reviewed posting plan has changed.',409);
  let state=await readFinanceState(tx,access.companies);const keys=await validateDecisions(source,decisions,state,tx),recordIds:string[]=[];
  // Draft creation, posting, settlement, keys and approval all share one write transaction.
  for(const decision of decisions){if(decision.action!=='post')continue;
   const row=source.rows.find(sourceRow=>sourceRow.id===decision.rowId)!;
   const posting=currentPosting(decision.posting,state);
   const input={...rowInput(row,posting,state),actor:access.email,requestId:crypto.randomUUID()};
   let plan=buildPlan(input,state);await persistFinancePlan(tx,plan,access.email);state=applyPlan(state,plan);
   let id=plan.focusId;const created=state.records.find(record=>record.id===id)!;
   if(['invoice','bill','expense','loan'].includes(created.type)){
    plan=buildPlan({action:'post',id,expectedVersion:created.version,actor:access.email,requestId:crypto.randomUUID()},state);
    await persistFinancePlan(tx,plan,access.email);state=applyPlan(state,plan);id=plan.focusId;
   }
   recordIds.push(id);
   await tx.insert(schema.financeImportPostings).values({id:crypto.randomUUID(),importId,rowKey:row.id,company:row.company,economicKey:keys.get(row.id)!,recordId:id,postedAt:new Date().toISOString()});
  }
  const result={importId,recordIds,postedRows:recordIds.length,excludedRows:decisions.length-recordIds.length},now=new Date().toISOString();
  await tx.update(schema.financeImportReviews).set({status:'Posted',approvedBy:access.email,approvedAt:now,approvalNote:signOff.note.trim(),result:JSON.stringify(result)}).where(and(eq(schema.financeImportReviews.importId,importId),eq(schema.financeImportReviews.reviewHash,signOff.reviewHash)));
  await tx.insert(schema.securityEvents).values({id:crypto.randomUUID(),actor:access.email,action:'Approved and posted reviewed finance import',target:importId,date:now});
  return result;
 });
}

export async function getImportPostingReview(db:FinanceDatabase,access:Access,importId:string){
 const source=await loadSource(db,access,importId);
 const [review]=await db.select().from(schema.financeImportReviews).where(eq(schema.financeImportReviews.importId,importId));
 return {importId,sourceManifest:source.batch.manifestHash,status:review?.status||'Not prepared',reviewHash:review?.reviewHash||null,decisions:review?JSON.parse(review.decisions) as ImportDecision[]:[],approvedBy:review?.approvedBy||null,approvedAt:review?.approvedAt||null,result:review?.result?JSON.parse(review.result):null};
}
