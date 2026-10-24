import {z} from 'zod';
import {getDb} from '@/db';
import {env} from '@/lib/runtime';
import {authenticate,jsonBody,securityFailure,securityReply} from '@/lib/security';
import {prepareImportPosting,approveAndPostImport,getImportPostingReview} from '@/lib/finance-import-posting';
import {configureRevenueSchedule,recognizeMilestoneRevenue} from '@/lib/finance-revenue';
import {RecordConflictError} from '@/lib/erp-primitives';
import {FinanceWorkflowError} from '@/lib/revenue-recognition';
import type {SQLDatabase} from '@/lib/storage-types';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const config=()=>env as unknown as {DB:SQLDatabase;ERP_OWNER_EMAIL?:string};
const id=z.string().trim().min(1).max(150),account=z.enum(['Bank','Cash','Mobile money']),projectId=id.optional();
const documentFields={partyId:id,taxRate:z.number().min(0).max(100),projectId,deferred:z.boolean().optional(),expenseAccount:z.enum(['Operating expenses','Equipment','Inventory','Interest expenses']).optional()};
const posting=z.discriminatedUnion('type',[
 z.object({type:z.literal('invoice'),...documentFields}).strict(),z.object({type:z.literal('bill'),...documentFields,expenseAccount:z.enum(['Operating expenses','Equipment','Inventory','Interest expenses'])}).strict(),
 z.object({type:z.literal('expense'),account,expenseAccount:z.enum(['Operating expenses','Equipment','Inventory','Interest expenses']),projectId}).strict(),
 z.object({type:z.literal('settlement'),targetId:id,expectedVersion:z.number().int().nonnegative(),account,interestUGX:z.number().int().nonnegative().max(1e12).optional()}).strict(),
 z.object({type:z.literal('cashSale'),account,projectId}).strict(),z.object({type:z.literal('deferredReceipt'),account,projectId}).strict(),
 z.object({type:z.literal('funding'),account,creditAccount:z.enum(['Capital','Opening equity'])}).strict(),
 z.object({type:z.literal('loan'),account}).strict(),z.object({type:z.literal('opening'),account:z.enum(['Accounts receivable','Accounts payable']),partyId:id.optional()}).strict(),
]);
const decision=z.discriminatedUnion('action',[
 z.object({rowId:id,action:z.literal('exclude'),reason:z.string().trim().min(1).max(2000)}).strict(),
 z.object({rowId:id,action:z.literal('post'),posting,resolution:z.string().max(2000).optional()}).strict(),
]);
const inputSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('prepareImport'),importId:id,decisions:z.array(decision).min(1).max(10000)}).strict(),
 z.object({action:z.literal('approveImport'),importId:id,confirmed:z.literal(true),reviewHash:z.string().regex(/^[a-f0-9]{64}$/),note:z.string().trim().min(1).max(2000)}).strict(),
 z.object({action:z.literal('configureRevenue'),projectId:id,expectedVersion:z.number().int().nonnegative(),contractValue:z.number().int().positive().max(1e12),milestones:z.array(z.object({stage:z.string().min(1).max(100),amount:z.number().int().positive().max(1e12)}).strict()).min(1).max(20),confirmed:z.literal(true),approvalNote:z.string().trim().min(1).max(2000)}).strict(),
 z.object({action:z.literal('recognizeMilestone'),projectId:id,gateId:id}).strict(),
]);
export async function POST(req:Request){try{
 const {access}=await authenticate(config(),req),input=inputSchema.parse(await jsonBody(req)),db=getDb();
 if(input.action==='prepareImport')return securityReply(await prepareImportPosting(db,access,input.importId,input.decisions));
 if(input.action==='approveImport')return securityReply(await approveAndPostImport(db,access,input.importId,input));
 if(input.action==='configureRevenue')return securityReply(await configureRevenueSchedule(db,access,input.projectId,input));
 return securityReply(await recognizeMilestoneRevenue(db,access,input.projectId,input.gateId));
}catch(cause){
 if(cause instanceof RecordConflictError)return securityReply({code:'FINANCE_RECORD_CHANGED',error:cause.message},409);
 if(cause instanceof FinanceWorkflowError)return securityReply({code:cause.code,error:cause.message,issues:cause.issues},cause.status);
 if(cause instanceof z.ZodError)return securityReply({code:'FINANCE_REQUEST_INVALID',error:'Review the finance request fields.',issues:cause.issues.map(issue=>({field:issue.path.join('.'),message:issue.message}))},400);
 return securityFailure(cause);
}}

export async function GET(req:Request){try{
 const {access}=await authenticate(config(),req),importId=id.parse(new URL(req.url).searchParams.get('importId'));
 return securityReply(await getImportPostingReview(getDb(),access,importId));
}catch(cause){
 if(cause instanceof RecordConflictError)return securityReply({code:'FINANCE_RECORD_CHANGED',error:cause.message},409);
 if(cause instanceof FinanceWorkflowError)return securityReply({code:cause.code,error:cause.message,issues:cause.issues},cause.status);
 if(cause instanceof z.ZodError)return securityReply({code:'FINANCE_REQUEST_INVALID',error:'Provide a valid importId.'},400);
 return securityFailure(cause);
}}
