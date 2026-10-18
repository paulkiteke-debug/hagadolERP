export const runtime='nodejs';
import type {SQLDatabase} from '@/lib/storage-types';
import {env} from '@/lib/runtime';
import {authenticate,accessValues,jsonBody,AccessError,securityReply,securityFailure} from '@/lib/security';
export const dynamic='force-dynamic';
const config=()=>env as unknown as {DB:SQLDatabase;ERP_OWNER_EMAIL?:string};
export async function GET(req:Request){try{
 const {access}=await authenticate(config(),req);if(access.role!=='Owner')throw new AccessError('Only the workspace owner can manage user access.');
 const d=config().DB;
 const users=(await d.prepare('SELECT id,email,role,companies,enabled,created,updated, CASE WHEN user_id IS NULL THEN 0 ELSE 1 END AS claimed FROM access_users ORDER BY created').all()).results.map((r:any)=>({...r,companies:JSON.parse(r.companies)}));
 const events=(await d.prepare('SELECT actor,action,target,date FROM security_events ORDER BY date DESC LIMIT 100').all()).results;
 return securityReply({users,events});
}catch(e){return securityFailure(e)}}
export async function POST(req:Request){try{
 const {access}=await authenticate(config(),req);if(access.role!=='Owner')throw new AccessError('Only the workspace owner can manage user access.');
 const input=await jsonBody(req),values=accessValues(input),d=config().DB,now=new Date().toISOString();
 let existing:any=null;
 if(input.id){if(typeof input.id!=='string'||input.id.length>120)throw new AccessError('Choose a valid user.',400);existing=await d.prepare('SELECT * FROM access_users WHERE id=?').bind(input.id).first();if(!existing)throw new AccessError('User not found.',404);}
 if(existing?.role==='Owner'||values.email===access.email.toLowerCase())throw new AccessError('Owner access cannot be changed from this screen.');
 if(existing&&existing.email!==values.email)throw new AccessError('Create a new user for a different email address.',400);
 const duplicate:any=await d.prepare('SELECT id FROM access_users WHERE email=?').bind(values.email).first();if(duplicate&&duplicate.id!==existing?.id)throw new AccessError('This email already has a user record.',409);
 const id=existing?.id||crypto.randomUUID(),action=existing?'Updated access':'Provisioned access';
 const statement=existing?d.prepare('UPDATE access_users SET role=?,companies=?,enabled=?,updated=? WHERE id=? AND role<>?').bind(values.role,JSON.stringify(values.companies),values.enabled,now,id,'Owner'):d.prepare('INSERT INTO access_users (id,user_id,email,role,companies,enabled,created,updated) VALUES (?,NULL,?,?,?,?,?,?)').bind(id,values.email,values.role,JSON.stringify(values.companies),values.enabled,now,now);
 await d.batch([statement,d.prepare('INSERT INTO security_events (id,actor,action,target,date) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),access.email,action+' · '+values.role+' · '+(values.enabled?'Active':'Disabled')+' · '+values.companies.join(', '),values.email,now)]);
 return securityReply({id,message:existing?'User access updated.':'User provisioned. The account must also be admitted by the site access policy.'});
}catch(e){return securityFailure(e)}}
