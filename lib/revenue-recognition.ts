import {day,type State,type RecordRow} from './erp-primitives';
import {lifecycleStages} from './governance';
export type RevenueMilestone={stage:string;amount:number};
export type RevenueSchedule={contractValue:number;milestones:RevenueMilestone[];approvedBy:string;approvedAt:string;approvalNote:string};
export class FinanceWorkflowError extends Error {
 constructor(readonly code:string,message:string,readonly status=400,readonly issues:{rowId?:string;field:string;code:string;message:string}[]=[]){super(message);this.name='FinanceWorkflowError';}
}
export function requireFinanceAmount(value:unknown,field='amount'):number{
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<=0||value>1e12)throw new FinanceWorkflowError('INVALID_AMOUNT',`Enter a positive whole UGX ${field}.`);
 return value;
}
export function validateRevenueSchedule(project:RecordRow,contractValue:number,milestones:RevenueMilestone[]){
 requireFinanceAmount(contractValue,'contract value');
 if(!Array.isArray(milestones)||!milestones.length||milestones.length>20||new Set(milestones.map(m=>m.stage)).size!==milestones.length)throw new FinanceWorkflowError('INVALID_MILESTONES','Use distinct operational stages for the revenue milestones.');
 let sum=0;for(const milestone of milestones){if(!lifecycleStages[project.company]?.includes(milestone.stage))throw new FinanceWorkflowError('INVALID_GATE_STAGE','Choose a gate stage for this project business.');sum+=requireFinanceAmount(milestone.amount);}
 if(sum!==contractValue)throw new FinanceWorkflowError('SCHEDULE_TOTAL_MISMATCH','Milestone amounts must total the contract value, excluding VAT.');
}
export function projectDeferredBalance(state:State,project:RecordRow,cutoff=day()){
 const sources=new Set(state.records.filter(r=>r.company===project.company&&r.projectId===project.id).map(r=>r.id));
 return state.journal.filter(j=>j.company===project.company&&j.account==='Deferred revenue'&&j.date<=cutoff&&sources.has(j.source.replace(/^reversal\//,''))).reduce((sum,j)=>sum+j.credit-j.debit,0);
}
export function milestoneRecognition(project:RecordRow,gate:RecordRow,state:State){
 if(project.type!=='project'||gate.type!=='project_gate'||gate.company!==project.company||gate.projectId!==project.id||gate.status!=='Approved'||!gate.approvedBy||!gate.approvedAt||gate.date>day()||!project.gateHistory?.includes(gate.id))throw new FinanceWorkflowError('GATE_NOT_APPROVED','Recognition requires an approved gate recorded in this project history.');
 const schedule=project.revenueSchedule as RevenueSchedule|undefined;
 if(!schedule?.approvedBy||!schedule.approvedAt||!schedule.approvalNote)throw new FinanceWorkflowError('REVENUE_SCHEDULE_REQUIRED','Finance must approve a milestone revenue schedule first.');
 validateRevenueSchedule(project,schedule.contractValue,schedule.milestones);
 const milestone=schedule.milestones.find(m=>m.stage===gate.gateStage);if(!milestone)return null;
 const id='rev_'+gate.id;
 const prior=state.records.find(r=>r.company===project.company&&r.id===id);
 if(prior){if(prior.type!=='journal'||prior.recognitionGateId!==gate.id||prior.projectId!==project.id||prior.amount!==milestone.amount||prior.status!=='Posted')throw new FinanceWorkflowError('RECOGNITION_CONFLICT','An existing recognition entry needs finance review.',409);return {id,amount:milestone.amount,alreadyPosted:true,availableDeferred:projectDeferredBalance(state,project)};}
 if(state.records.some(r=>r.company===project.company&&r.projectId===project.id&&r.recognitionStage===gate.gateStage))throw new FinanceWorkflowError('MILESTONE_ALREADY_RECOGNISED','This milestone stage already has a recognition entry.',409);
 const deferred=projectDeferredBalance(state,project);
 if(deferred<milestone.amount)throw new FinanceWorkflowError('INSUFFICIENT_DEFERRED_REVENUE','The project has insufficient deferred revenue for this milestone.',409);
 return {id,amount:milestone.amount,alreadyPosted:false,availableDeferred:deferred};
}
