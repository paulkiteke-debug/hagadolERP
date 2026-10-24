import {z} from 'zod';
import {getDb} from '@/db';
import {env} from '@/lib/runtime';
import {authenticate,jsonBody,securityReply,securityFailure} from '@/lib/security';
import {getCustomerHistory,logCRMActivity,getPipelineVelocity,verifyCustomerBilling,CRMDataError,type CustomerTarget} from '@/lib/crm-data';
import type {SQLDatabase} from '@/lib/storage-types';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const config=()=>env as unknown as {DB:SQLDatabase;ERP_OWNER_EMAIL?:string};
const id=z.string().trim().min(1).max(120);
const logSchema=z.object({action:z.literal('log'),companyId:id.optional(),contactId:id.optional(),dealId:id.optional(),kind:z.enum(['Call','Email','Meeting','Note','Task Reminder']),description:z.string().trim().min(1).max(10000),outcome:z.string().max(2000).optional(),occurredAt:z.string().optional(),dueAt:z.string().optional()}).strict();
const verifySchema=z.object({action:z.literal('verifyBilling'),companyId:id,expectedVersion:z.number().int().nonnegative()}).strict();
const inputSchema=z.discriminatedUnion('action',[logSchema,verifySchema]);
function failure(error:unknown){
 if(error instanceof CRMDataError)return securityReply({error:error.message,code:error.code,errors:error.field?[{field:error.field,code:error.code,message:error.message}]:[]},error.status);
 if(error instanceof z.ZodError)return securityReply({error:'Review the CRM request fields.',code:'CRM_REQUEST_INVALID',errors:error.issues.map(issue=>({field:issue.path.join('.'),code:issue.code,message:issue.message}))},400);
 return securityFailure(error);
}
export async function GET(req:Request){try{
 const {access}=await authenticate(config(),req),query=new URL(req.url).searchParams;
 if(query.get('view')==='velocity')return securityReply(await getPipelineVelocity(getDb(),access,query.get('company')||'',{stagnantDays:query.has('stagnantDays')?Number(query.get('stagnantDays')):undefined}));
 const targets=['companyId','contactId','dealId'].filter(key=>query.has(key));
 if(targets.length!==1)throw new CRMDataError('INVALID_TARGET','Choose one companyId, contactId or dealId.');
 const value=query.get(targets[0])||'';
 const target:CustomerTarget=targets[0]==='companyId'?{companyId:value}:targets[0]==='contactId'?{contactId:value}:{dealId:value};
 const before=query.has('beforeTimestamp')||query.has('beforeId')?{timestamp:query.get('beforeTimestamp')||'',id:query.get('beforeId')||''}:undefined;
 return securityReply(await getCustomerHistory(getDb(),access,target,{limit:query.has('limit')?Number(query.get('limit')):undefined,before}));
}catch(error){return failure(error);}}
export async function POST(req:Request){try{
 const {access}=await authenticate(config(),req),input=inputSchema.parse(await jsonBody(req));
 if(input.action==='verifyBilling')return securityReply(await verifyCustomerBilling(getDb(),access,input.companyId,input.expectedVersion));
 return securityReply(await logCRMActivity(getDb(),access,input),201);
}catch(error){return failure(error);}}
