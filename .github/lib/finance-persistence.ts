import {and,eq,inArray} from 'drizzle-orm';
import type {LibSQLDatabase} from 'drizzle-orm/libsql';
import * as schema from '../db/schema';
import {type State,type RecordRow,RecordConflictError,buildPlan} from './erp-engine';
export type FinanceDatabase=LibSQLDatabase<typeof schema>;
export type FinanceTransaction=Parameters<Parameters<FinanceDatabase['transaction']>[0]>[0];
export async function readFinanceState(db:Pick<FinanceDatabase,'select'>,companies:string[]):Promise<State>{
 const [rows,journal,audit]=await Promise.all([
  db.select().from(schema.records).where(inArray(schema.records.company,companies)),
  db.select().from(schema.journal).where(inArray(schema.journal.company,companies)),
  db.select().from(schema.audit).where(inArray(schema.audit.company,companies)),
 ]);
 return {records:rows.map(({payload,...stored})=>({...JSON.parse(payload),...stored}) as RecordRow),journal,audit};
}
export async function persistFinancePlan(tx:FinanceTransaction,plan:ReturnType<typeof buildPlan>,actor:string){
 for(const expected of plan.expected){
  const [record]=await tx.select({version:schema.records.version}).from(schema.records).where(eq(schema.records.id,expected.id));
  if(!record||record.version!==expected.version)throw new RecordConflictError();
 }
 for(const row of plan.writes){
  const previous=plan.expected.find(expected=>expected.id===row.id);
  const {biginStageHistory:_,...payload}=row;void _;
  const values={name:row.name,status:row.status,amount:row.amount,paid:row.paid,credited:row.credited,version:row.version,date:row.date,due:row.due,payload:JSON.stringify(payload),documentCode:row.type==='document'?String(row.documentCode):null};
  if(previous){const changed=await tx.update(schema.records).set(values).where(and(eq(schema.records.id,row.id),eq(schema.records.company,row.company),eq(schema.records.version,previous.version))).returning({id:schema.records.id});if(changed.length!==1)throw new RecordConflictError();}
  else await tx.insert(schema.records).values({id:row.id,company:row.company,type:row.type,created:row.created,...values});
 }
 for(const entry of plan.entries)await tx.insert(schema.journal).values(entry);
 await tx.insert(schema.audit).values({...plan.audit,actor});
 await tx.insert(schema.operations).values({id:plan.id,company:plan.company,result:JSON.stringify({id:plan.focusId,message:plan.label}),created:plan.audit.date,actor});
}
