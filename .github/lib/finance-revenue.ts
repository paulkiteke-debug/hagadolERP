import {and,eq} from 'drizzle-orm';
import * as schema from '../db/schema';
import type {Access} from './access-policy';
import {isModuleEnabled} from './module-profile';
import {buildPlan} from './erp-engine';
import {readFinanceState,persistFinancePlan,type FinanceDatabase} from './finance-persistence';
import {requireFinanceAccess} from './finance-import-posting';
import {FinanceWorkflowError,validateRevenueSchedule,projectDeferredBalance,type RevenueMilestone,type RevenueSchedule} from './revenue-recognition';
function projectsEnabled(){if(!isModuleEnabled('Projects'))throw new FinanceWorkflowError('PROJECTS_DEFERRED','Operational Projects are disabled in the current release.',403);}
export async function configureRevenueSchedule(db:FinanceDatabase,access:Access,projectId:string,input:{expectedVersion:number;contractValue:number;milestones:RevenueMilestone[];confirmed:true;approvalNote:string}){
 projectsEnabled();requireFinanceAccess(access);
 if(input.confirmed!==true||typeof input.approvalNote!=='string'||!input.approvalNote.trim()||input.approvalNote.length>2000)throw new FinanceWorkflowError('SCHEDULE_SIGN_OFF_REQUIRED','Confirm the contract milestones and record the finance approval.');
 return db.transaction(async tx=>{
  const state=await readFinanceState(tx,access.companies),project=state.records.find(row=>row.id===projectId&&row.type==='project');
  if(!project)throw new FinanceWorkflowError('PROJECT_NOT_FOUND','The project is unavailable.',404);
  requireFinanceAccess(access,project.company);
  if(project.version!==input.expectedVersion)throw new FinanceWorkflowError('PROJECT_CHANGED','Review the latest project version.',409);
  validateRevenueSchedule(project,input.contractValue,input.milestones);
  if(state.records.some(row=>row.projectId===projectId&&(row.recognitionGateId||row.type==='project_gate'&&row.status==='Approved'&&input.milestones.some(milestone=>milestone.stage===row.gateStage))))throw new FinanceWorkflowError('SCHEDULE_LOCKED','Revenue already recognised or completed milestone stages require controlled finance review. Choose future milestones before they are approved.',409);
  const now=new Date().toISOString(),schedule:RevenueSchedule={contractValue:input.contractValue,milestones:input.milestones.map(m=>({stage:m.stage,amount:m.amount})),approvedBy:access.email,approvedAt:now,approvalNote:input.approvalNote.trim()};
  const result=await tx.update(schema.records).set({version:project.version+1,payload:JSON.stringify({...project,revenueSchedule:schedule,version:project.version+1})}).where(and(eq(schema.records.id,project.id),eq(schema.records.company,project.company),eq(schema.records.version,project.version))).returning({id:schema.records.id});
  if(result.length!==1)throw new FinanceWorkflowError('PROJECT_CHANGED','The project changed during approval.',409);
  await tx.insert(schema.audit).values({id:crypto.randomUUID(),company:project.company,actor:access.email,action:'Approved contract revenue milestones',record:project.id,date:now});
  return {projectId,version:project.version+1,schedule};
 });
}
export async function recognizeMilestoneRevenue(db:FinanceDatabase,access:Access,projectId:string,gateId:string){
 projectsEnabled();requireFinanceAccess(access);
 return db.transaction(async tx=>{
  const state=await readFinanceState(tx,access.companies),project=state.records.find(row=>row.id===projectId&&row.type==='project'),gate=state.records.find(row=>row.id===gateId&&row.type==='project_gate');
  if(!project||!gate||project.company!==gate.company)throw new FinanceWorkflowError('GATE_NOT_FOUND','The project gate is unavailable.',404);
  requireFinanceAccess(access,project.company);
  const plan=buildPlan({action:'recognize_milestone',id:gateId,projectId,actor:access.email,requestId:crypto.randomUUID()},state);
  if(plan.writes.length)await persistFinancePlan(tx,plan,access.email);
  const amount=plan.writes.find(row=>row.id===plan.focusId)?.amount??state.records.find(row=>row.id===plan.focusId)?.amount??0;
  return {projectId,gateId,recordId:plan.focusId,amount,alreadyPosted:!plan.writes.length,remainingDeferred:projectDeferredBalance({...state,records:[...state.records,...plan.writes],journal:[...state.journal,...plan.entries]},project)};
 });
}
