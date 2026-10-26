export const runtime='nodejs';
import type {SQLDatabase} from '@/lib/storage-types';
import {env} from '@/lib/runtime';
import {authenticate,jsonBody,AccessError} from '@/lib/security';
import {canReadRecord,canWriteRecord} from '@/lib/access-policy';
import {AIError,aiStatus,dailyLimit,generateAI,providerReady,validateAIRequest,AIConfig} from '@/lib/os-ai';
import {day} from '@/lib/erp-engine';
import {isModuleEnabled} from '@/lib/module-profile';
export const dynamic='force-dynamic';
const config=()=>env as unknown as AIConfig&{DB:SQLDatabase};
const reply=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const failure=(e:unknown)=>reply({error:e instanceof AIError||e instanceof AccessError?e.message:e instanceof SyntaxError?'The request was unreadable.':'The OS assistant is temporarily unavailable.'},e instanceof AIError||e instanceof AccessError?e.status:e instanceof SyntaxError?400:503);
export async function GET(req:Request){try{const {access}=await authenticate(config(),req);if(!isModuleEnabled('OS'))throw new AccessError('The OS assistant is scheduled for a later release.');if(!['Owner','Administrator','Leadership','Sales'].includes(access.role))throw new AccessError('Your role cannot use the OS assistant.');const c=config(),company=new URL(req.url).searchParams.get('company');if(company&&!access.companies.includes(company))throw new AccessError('You cannot access this company.');const histories=company&&['WMK','Hagadol'].includes(company)?(await c.DB.prepare('SELECT id,record_id,provider,intent,status,units,failure,created FROM ai_runs WHERE company=? ORDER BY created DESC LIMIT 20').bind(company).all()).results:[];return reply({...aiStatus(c),history:histories});}catch(e){return failure(e);}}
export async function POST(req:Request){let claimed:string|undefined;try{const {user,access}=await authenticate(config(),req);if(!isModuleEnabled('OS'))throw new AccessError('The OS assistant is scheduled for a later release.');if(!['Owner','Administrator','Leadership','Sales'].includes(access.role))throw new AccessError('Your role cannot use the OS assistant.');const input:any=await jsonBody(req),spec=validateAIRequest(input),c=config();
const row:any=await c.DB.prepare('SELECT * FROM records WHERE id=? AND company IN ('+access.companies.map(()=>'?').join(',')+')').bind(spec.recordId,...access.companies).first();if(!row)throw new AIError('Saved record not found.',404);const source={...JSON.parse(row.payload),...row};delete source.payload;
if(!canReadRecord(access,source)||!canWriteRecord(access,source,'edit'))throw new AccessError('You cannot use this source record.');
if(source.version!==spec.expectedVersion)throw new AIError('This record changed. Refresh before requesting an AI draft.',409);
if(spec.intent==='draft'&&source.type!=='bid'||spec.intent==='review'&&source.type!=='proposal')throw new AIError('Choose a bid for drafting or a proposal for review.');
let bid=source;if(spec.intent==='review'){const b:any=await c.DB.prepare('SELECT * FROM records WHERE id=? AND company=? AND type=?').bind(source.sourceBid,source.company,'bid').first();if(!b)throw new AIError('This proposal needs a source bid from its company.');bid={...JSON.parse(b.payload),...b};}
const actor=user.userId||user.email,requestSpec=JSON.stringify(spec);
const previous:any=await c.DB.prepare('SELECT * FROM ai_runs WHERE id=?').bind(input.requestId).first();if(previous){if(previous.actor!==actor||previous.request_spec!==requestSpec)throw new AIError('This request reference belongs to a different AI run.',409);if(previous.status==='Completed')return reply({id:previous.id,result:JSON.parse(previous.result)});throw new AIError(previous.status==='Pending'?'This AI request is already running. Retry the same request later to retrieve its result.':previous.failure||'This AI run failed. Start a new run.',previous.status==='Pending'?409:502);}
if(!providerReady(c,spec.provider))throw new AIError('Configure the selected AI provider and model first.',503);
const units=spec.provider==='both'?2:1;
await c.DB.prepare('INSERT INTO ai_runs (id,company,record_id,actor,provider,intent,status,units,day_key,request_spec,result,failure,created) SELECT ?,?,?,?,?,?,\'Pending\',?,?,?,\'\',\'\',? WHERE COALESCE((SELECT SUM(units) FROM ai_runs WHERE company=? AND day_key=?),0)+?<=?').bind(input.requestId,source.company,source.id,actor,spec.provider,spec.intent,units,day(),requestSpec,new Date().toISOString(),source.company,day(),units,dailyLimit(c)).run();
if(!await c.DB.prepare('SELECT id FROM ai_runs WHERE id=?').bind(input.requestId).first())throw new AIError('The company daily AI limit has been reached. Try again tomorrow.',429);claimed=input.requestId;
const result=await generateAI(c,bid,source,spec);
await c.DB.prepare('UPDATE ai_runs SET status=\'Completed\',result=? WHERE id=?').bind(JSON.stringify(result),claimed).run();return reply({id:claimed,result});
}catch(e){if(claimed)try{await config().DB.prepare('UPDATE ai_runs SET status=\'Failed\',failure=? WHERE id=?').bind(e instanceof AIError||e instanceof AccessError?e.message:'The OS assistant request failed.',claimed).run();}catch{}return failure(e);}}
