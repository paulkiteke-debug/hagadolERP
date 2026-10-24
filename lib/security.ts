import type {SQLDatabase} from '@/lib/storage-types';
import type {ChatGPTUser} from '../app/chatgpt-auth';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {roles,activeRoles,type Access,type Role} from './access-policy';

export class AccessError extends Error{constructor(message:string,public status=403){super(message)}}
export type SecurityConfig={DB:SQLDatabase;ERP_OWNER_EMAIL?:string};
const emailKey=(s:string)=>s.trim().toLowerCase();
const member=(r:any,name:string):Access=>({id:r.id,email:r.email,name,role:r.role,companies:JSON.parse(r.companies)});
export async function membership(c:SecurityConfig,u:ChatGPTUser):Promise<Access>{
 if(!u.userId||!u.email)throw new AccessError('Sign in to access your ERP.',401);
 let r:any=await c.DB.prepare('SELECT * FROM access_users WHERE user_id=?').bind(u.userId).first();
 if(!r&&c.ERP_OWNER_EMAIL&&emailKey(u.email)===emailKey(c.ERP_OWNER_EMAIL)){
  // The configured Google account owner is configured out of band. First visitor never wins ownership.
  await c.DB.prepare("INSERT OR IGNORE INTO access_users (id,user_id,email,role,companies,enabled,created,updated) VALUES ('workspace-owner',?,?, 'Owner','[\"WMK\",\"Hagadol\"]',1,?,?)").bind(u.userId,emailKey(u.email),new Date().toISOString(),new Date().toISOString()).run();
  await c.DB.prepare("UPDATE access_users SET user_id=?,updated=? WHERE id='workspace-owner' AND email=? AND role='Owner' AND enabled=1 AND user_id IS NULL").bind(u.userId,new Date().toISOString(),emailKey(u.email)).run();
  r=await c.DB.prepare('SELECT * FROM access_users WHERE user_id=?').bind(u.userId).first();
 }
 if(!r){
  await c.DB.prepare('UPDATE access_users SET user_id=?,updated=? WHERE email=? AND user_id IS NULL AND enabled=1 AND role<>?').bind(u.userId,new Date().toISOString(),emailKey(u.email),'Owner').run();
  r=await c.DB.prepare('SELECT * FROM access_users WHERE user_id=?').bind(u.userId).first();
 }
 if(!r||r.enabled!==1||!roles.includes(r.role))throw new AccessError('Your account has no active ERP access. Contact the workspace owner.');
 if(!activeRoles.includes(r.role))throw new AccessError('Your role is scheduled for a later release. Contact the workspace owner for CRM or Finance access.');
 const a=member(r,u.displayName);if(!a.companies.length||a.companies.some(x=>!['WMK','Hagadol'].includes(x)))throw new AccessError('Your company access needs review. Contact the workspace owner.');return a;
}
export function verifyWrite(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin||['cross-site','same-site'].includes(req.headers.get('sec-fetch-site')||''))throw new AccessError('This request could not be verified.');
 if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new AccessError('Send a JSON request.',415);
}
export async function authenticate(c:SecurityConfig,req?:Request){
 const u=await getChatGPTUser();if(!u)throw new AccessError('Sign in to access your ERP.',401);
 const access=await membership(c,u);if(req&&req.method!=='GET'&&req.method!=='HEAD'){verifyWrite(req);await rateLimit(c.DB,access.id);}return {user:u,access};
}
export async function rateLimit(d:SQLDatabase,id:string){
 const window=Math.floor(Date.now()/60000),key=id+':'+window;
 await d.prepare('INSERT INTO request_limits (id,window,count) VALUES (?,?,1) ON CONFLICT(id) DO UPDATE SET count=count+1').bind(key,window).run();
 const r:any=await d.prepare('SELECT count FROM request_limits WHERE id=?').bind(key).first();
 if(r.count>120)throw new AccessError('Too many changes in one minute. Please wait and try again.',429);
 await d.prepare('DELETE FROM request_limits WHERE window<?').bind(window-5).run();
}
export async function jsonBody(req:Request,limit=512*1024){
 if(Number(req.headers.get('content-length')||0)>limit)throw new AccessError('The request is too large. Import fewer records at once.',413);
 if(!req.body)throw new AccessError('Provide a valid JSON request.',400);
 const reader=req.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new AccessError('The request is too large. Import fewer records at once.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.byteLength;}
 let input:any;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new AccessError('Provide a valid JSON request.',400);}
 if(!input||typeof input!=='object'||Array.isArray(input))throw new AccessError('Provide a valid record request.',400);return input;
}
export const securityReply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const securityFailure=(e:unknown)=>securityReply({error:e instanceof AccessError?e.message:'The workspace is temporarily unavailable. Please try again.'},e instanceof AccessError?e.status:503);
export async function fingerprint(input:unknown){
 const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(input))));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export function accessValues(input:any):{email:string;role:Role;companies:string[];enabled:number}{
 const email=emailKey(String(input.email||''));if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new AccessError('Enter a valid email address.',400);
 if(!roles.includes(input.role)||input.role==='Owner')throw new AccessError('Choose a staff role. Ownership cannot be assigned here.',400);
 if(input.enabled!==false&&!activeRoles.includes(input.role))throw new AccessError('Choose a role available for CRM and Finance.',400);
 if(!Array.isArray(input.companies)||!input.companies.length||input.companies.length>2||input.companies.some((x:any)=>!['WMK','Hagadol'].includes(x)))throw new AccessError('Choose WMK, Hagadol or both.',400);
 if(input.enabled!==undefined&&typeof input.enabled!=='boolean')throw new AccessError('Choose an active or disabled account.',400);
 return {email,role:input.role,companies:[...new Set(input.companies)] as string[],enabled:input.enabled===false?0:1};
}
