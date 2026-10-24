import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import React from 'react';
import {renderToReadableStream} from 'react-dom/server';
import ERP from '../app/erp.tsx';
import Home,{homeAttention} from '../app/erp-home.tsx';
import Release from '../app/erp-release.tsx';
import {sampleState} from '../lib/erp-sample.ts';
import {activeRoles,canReadModule,canWriteModule,landingView} from '../lib/access-policy.ts';
import {fullWorkspace,deferredModules} from '../lib/module-profile.ts';
import {securityHarness} from './security-harness.mjs';

let passed=0;
function check(value,label){assert.ok(value,label);passed++;}
check(!fullWorkspace,'The default release exposes CRM and Finance');
async function render(Component,props){const stream=await renderToReadableStream(React.createElement(Component,props));await stream.allReady;return (await new Response(stream).text()).replace(/<!--.*?-->/g,'');}
const sample=sampleState();
for(const company of ['Group','Hagadol','WMK']){
 const home=await render(ERP,{initial:{sample:true,state:sample,company}});
 const nav=home.slice(home.indexOf('aria-label="Main modules"'),home.indexOf('</nav>'));
 check(['Home','CRM','Finance'].every(label=>nav.includes('>'+label+'</span>')),'Three main navigation buttons: '+company);
 check(!/EOS|Marketing|Media|Projects|Email|Documents|Bids/.test(nav),'Deferred modules absent from navigation');
 check(!home.includes('office-display?')&&!home.includes('L10 meeting')&&!home.includes('Quarterly Rocks'),'Home and Live menu contain only active work');
 for(const label of ['Open Finance','Budget','Cash flow','Sales follow ups','Needs attention'])check(home.includes(label),'Home retains '+label);
 const tools=await render(ERP,{initial:{sample:true,state:sample,view:'Settings',tab:'Workspace tools',company}});
 check(tools.includes('Explore workflows')&&!tools.includes('New metric')&&!tools.includes('Copy link'),'Settings has active guidance without deferred actions');
 const data=await render(ERP,{initial:{sample:true,state:sample,view:'Settings',tab:'Data',company}});
 check(data.includes('Workspace backup')&&data.includes('Turso exports'),'Exports explain their actual scope');
 for(const view of ['EOS','Projects','Marketing','Email','Hagadol OS','Office display','Document register']){
  const page=await render(ERP,{initial:{sample:true,state:sample,view,company}});
  check(page.includes('<h1>Today</h1>'),'Deferred initial view returns to Home: '+view);
 }
}
const status=await render(Release,{sample:true});
check(!/Awaiting API account|Proposal approval|EOS metric|Gmail, analytics/.test(status),'Readiness only lists this release');
check(status.includes('Supporting file storage')&&status.includes('Historical migration'),'Readiness retains import dependencies');
const attention=homeAttention([
 {id:'crm',type:'task',crm:true,name:'Call buyer',company:'Hagadol',date:'2026-10-01',due:'2026-10-18',status:'Open'},
 {id:'eos',type:'task',crm:true,eos:true,name:'Meeting action',company:'Hagadol',date:'2026-10-01',due:'2026-10-18',status:'Open'},
 {id:'project',type:'project',name:'Site',company:'Hagadol',date:'2026-10-01',due:'2026-10-18',status:'Active'}
],'Hagadol','2026-10-18');
check(attention.map(r=>r.id).join(',')==='crm','Attention excludes paused work even with overlapping task flags');
for(const role of ['Owner','Administrator','Leadership','Finance','Sales','Viewer','Operations','Marketing','Office display']){
 const access={role,companies:['Hagadol'],id:'test',email:'test@example.com',name:'Test'};
 for(const module of deferredModules){check(!canReadModule(access,module),'No deferred reads for '+role+' '+module);check(!canWriteModule(access,module),'No deferred writes for '+role+' '+module);}
 if(['Operations','Marketing','Office display'].includes(role))check(!landingView(access),'Paused role cannot enter another workspace');
}
check(activeRoles.join(',')==='Owner,Administrator,Leadership,Finance,Sales,Viewer','Role picker only offers roles with current responsibilities');

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'erp-core-release-'));
const sql=new DatabaseSync(':memory:');
try{
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 const DB={prepare(q){const make=(params=[])=>({q,params,bind(...values){return make(values)},async first(){return sql.prepare(q).get(...params)||null},async all(){return {results:sql.prepare(q).all(...params)}},async run(){return sql.prepare(q).run(...params)}});return make()},async batch(items){sql.exec('BEGIN');try{const result=items.map(s=>sql.prepare(s.q).run(...s.params));sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 globalThis.__coreDB={DB,ERP_OWNER_EMAIL:'owner@example.com'};
 globalThis.__coreUser={userId:'owner',email:'owner@example.com',displayName:'Owner'};
 const harness=securityHarness(temp,'__coreDB','__coreUser');
 const routes=Object.fromEntries(await Promise.all(['erp','office','os-ai','access','release'].map(async name=>[name,await import(harness.compile('app/api/'+name+'/route.ts'))])));
 let seq=0;
 async function request(name,body,expected=200,query=''){
  const response=await routes[name][body?'POST':'GET'](new Request('https://erp.local/api/'+name+query,{method:body?'POST':'GET',headers:body?{Origin:'https://erp.local','Content-Type':'application/json'}:{},...(body?{body:JSON.stringify({requestId:'core-'+seq++,...body})}:{})}));
  const data=await response.json();check(response.status===expected,name+' returned '+response.status+': '+JSON.stringify(data));return data;
 }
 await request('erp');
 const contact=await request('erp',{action:'create',type:'contact',company:'Hagadol',name:'Hagadol buyer'});
 await request('erp',{action:'edit',id:contact.id,fields:{phone:'0700000000'}});
 const other=await request('erp',{action:'create',type:'contact',company:'WMK',name:'WMK buyer'});
 const invoice=await request('erp',{action:'create',type:'invoice',company:'Hagadol',name:'Water service',date:'2026-10-18',lines:[{description:'Service',qty:1,rate:1000}]});
 await request('erp',{action:'post',id:invoice.id});
 await request('erp',{action:'pay',id:invoice.id,amount:400,date:'2026-10-18',account:'Bank'});
 let saved=await request('erp');
 check(saved.records.find(r=>r.id===invoice.id)?.paid===400,'Posting and partial payment persist');
 check(saved.records.find(r=>r.id===contact.id)?.phone==='0700000000','CRM edit persists');
 check(saved.journal.reduce((sum,j)=>sum+j.debit-j.credit,0)===0,'Finance ledger remains balanced');
 const retained=[];
 for(const type of ['rock','scorecard','eos_issue','eos_meeting','project','technical_log','field_activity','project_gate','post','campaign','metric','email','bid','proposal','document','knowledge']){
  await request('erp',{action:'create',type,company:'Hagadol',name:'Blocked '+type},403);
  const id='retained-'+type,payload={id,type,company:'Hagadol',name:'RETAINED_PRIVATE_'+type,status:'Draft',amount:0,date:'2026-10-18',due:'',version:0,created:'2026-10-18'};
  sql.prepare('INSERT INTO records (id,company,type,name,status,amount,paid,credited,version,date,due,payload,created) VALUES (?,?,?,?,?,0,0,0,0,?,?,?,?)').run(id,'Hagadol',type,payload.name,'Draft',payload.date,'',JSON.stringify(payload),payload.created);
  retained.push(sql.prepare('SELECT * FROM records WHERE id=?').get(id));
  await request('erp',{action:'edit',id,fields:{name:'Should not change'}},403);
 }
 await request('erp',{action:'start_l10',company:'Hagadol',owner:'Owner'},403);
 const crmTask=await request('erp',{action:'create',type:'task',company:'Hagadol',crm:true,name:'CRM call',owner:'Sales',due:'2026-10-20'});
 await request('erp',{action:'edit',id:crmTask.id,fields:{eos:true}},403);
 for(const endpoint of ['office','os-ai'])await request(endpoint,undefined,403);
 await request('os-ai',{intent:'draft'},403);
 saved=await request('erp',undefined,200,'?profile=full');
 check(!JSON.stringify(saved).includes('RETAINED_PRIVATE_'),'A request cannot enable paused modules or retrieve retained records');
 for(const row of retained)check(JSON.stringify(sql.prepare('SELECT * FROM records WHERE id=?').get(row.id))===JSON.stringify(row),'Retained row unchanged: '+row.type);
 for(const role of ['Operations','Marketing','Office display'])await request('access',{email:'paused@example.com',role,companies:['Hagadol'],enabled:true},400);
 await request('access',{email:'sales@example.com',role:'Sales',companies:['Hagadol'],enabled:true});
 globalThis.__coreUser={userId:'sales',email:'sales@example.com',displayName:'Sales'};
 const sales=await request('erp');check(sales.records.every(r=>r.company==='Hagadol')&&sales.journal.length===0,'Sales retains company scope and cannot read the ledger');
 await request('erp',{action:'edit',id:other.id,fields:{name:'Wrong company'}},403);
 await request('erp',{action:'pay',id:invoice.id,amount:1},403);
 globalThis.__coreUser={userId:'owner',email:'owner@example.com',displayName:'Owner'};
 const readiness=await request('release');check(readiness.modules.join(',')==='Executive,CRM,Finance,Settings'&&!readiness.ai,'Readiness reports the active module profile');
 console.log(JSON.stringify({passed,failed:0,liveProductionTouched:false,browserTested:false}));
}finally{sql.close();fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__coreDB;delete globalThis.__coreUser;}
