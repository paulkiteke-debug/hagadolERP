import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
const listener=createServer();await new Promise(resolve=>listener.listen(Number(process.env.SMOKE_PORT||0),'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const origin='http://127.0.0.1:'+port;
const env={...process.env,AUTH_SECRET:randomBytes(32).toString('base64'),AUTH_URL:origin,AUTH_TRUST_HOST:'true'};
for(const key of ['DATABASE_URL','DATABASE_AUTH_TOKEN','AUTH_GOOGLE_ID','AUTH_GOOGLE_SECRET','S3_BUCKET'])delete env[key];
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{env,stdio:['ignore','pipe','pipe']});
let log='',passed=0;server.stdout.on('data',b=>{log+=b;if(process.env.SMOKE_VERBOSE)process.stdout.write(b)});server.stderr.on('data',b=>{log+=b;if(process.env.SMOKE_VERBOSE)process.stderr.write(b)});
function check(ok,label){assert.ok(ok,label);passed++;}
async function get(path,headers={}){return fetch(origin+path,{redirect:'manual',headers,signal:AbortSignal.timeout(3000)});}
try{
 let ready=false;
 for(let i=0;i<10;i++){try{if((await get('/login')).status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'Production server ready: '+log);
 const login=await get('/login');check((await login.text()).includes('awaiting server configuration'),'Unconfigured login renders a useful status');
 for(const route of ['/','/crm','/finance','/eos','/office-display']){
  const page=await get(route);check(page.status===307&&page.headers.get('location')?.startsWith('/login?'),'Protected page redirects to login: '+route);
  check(/private|no-store/.test(page.headers.get('cache-control')||''),'Protected response cannot be shared cached: '+route);
 }
 for(const route of ['/api/finance-workflows','/api/crm','/api/erp','/api/access','/api/office','/api/release','/api/os-ai','/api/finance-imports','/api/finance-imports/files']){
  const reply=await get(route,{'x-oai-user-id':'forged-owner','x-oai-user-email':'owner@example.com','oai-authenticated-user-id':'forged-owner','oai-authenticated-user-email':'owner@example.com',cookie:'authjs.session-token=invalid'});
  check(reply.status===401,'Forged identity cannot access '+route);
  check(reply.headers.get('x-content-type-options')==='nosniff'&&reply.headers.get('cache-control')==='no-store','Security and cache headers on '+route);
 }
 const csp=login.headers.get('content-security-policy')||'';check(csp.includes("object-src 'none'")&&!csp.includes('unsafe-eval'),'Production CSP is applied by Next');
 check(!login.headers.has('x-powered-by'),'Framework identification disabled');
 console.log(JSON.stringify({passed,failed:0,server:'next start',authentication:'unauthenticated and forged identity rejection',googleRoundTripTested:false,liveProductionTouched:false}));
}finally{server.kill('SIGTERM');const timer=setTimeout(()=>server.kill('SIGKILL'),3000);await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve)});clearTimeout(timer);}
