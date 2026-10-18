import React from 'react';
import {renderToReadableStream} from 'react-dom/server';
import ERP from '../app/erp.tsx';
import OfficeScreen from '../app/erp-office-screen.tsx';
import Command from '../app/erp-command.tsx';
import Calendar from '../app/erp-calendar.tsx';
import {officeDisplayPath,moduleSections} from '../lib/erp-navigation.ts';
import {sampleState} from '../lib/erp-sample.ts';
import {exportRecords} from '../lib/erp-ui.ts';
import {day} from '../lib/erp-engine.ts';
import Home,{homeAttention} from '../app/erp-home.tsx';
import CRM,{CRMForm} from '../app/erp-crm.tsx';
import Finance from '../app/erp-finance.tsx';
const sample=sampleState();
let passed=0;const check=(v,label)=>{if(!v)throw Error(label);passed++},render=async(C,p)=>{if(C===ERP&&p.initial?.sample&&!p.initial.state)p={...p,initial:{...p.initial,state:sample}};const stream=await renderToReadableStream(React.createElement(C,p));await stream.allReady;return (await new Response(stream).text()).replace(/<!--.*?-->/g,'');};
for(const company of ['Group','Hagadol','WMK']){
 const executive=await render(ERP,{initial:{sample:true,view:'Executive',company}});
 const main=executive.slice(executive.indexOf('<main id="erp-main"'),executive.indexOf('<footer class="workspacefooter"'));
 check(!main.includes('New metric')&&!main.includes('Explore workflows')&&!main.includes('Launch office display screen'),'Executive is free of setup and display buttons');
 check(executive.includes('class="livemenu"')&&executive.includes(officeDisplayPath(company).replaceAll('&','&amp;')),'Live menu offers company screen');
 const tools=await render(ERP,{initial:{sample:true,view:'Settings',tab:'Workspace tools',company}});
 check(tools.includes('New metric')&&tools.includes('Explore workflows')&&tools.includes('Copy link'),'Settings tools reachable');
 for(const layout of ['Combined','Rotating']){const path=officeDisplayPath(company,layout),q=new URL(path,'https://example.com').searchParams;check(q.get('company')===company&&q.get('layout')===layout,'Reusable screen link preserves selection');}
 for(const v of ['CRM','Tasks'])check(moduleSections(v).map(x=>x[0]).join(',')==='Pipeline,Contacts,Companies,Activities','CRM has the same simple sections');
 for(const v of ['Sales','Purchases','Banking','Accounting','Reports'])check(moduleSections(v).length===6,'Finance sections accessible');
 const sidebar=executive.slice(0,executive.indexOf('class="topbar"'));check(!sidebar.includes('class="navgroup"'),'Sidebar has direct module buttons');
}
check(officeDisplayPath('foreign','evil')==='/office-display?company=Group&layout=Combined','Screen options validated');
const state=sampleState(),date=day();
state.records.push({id:'screen-private',type:'field_activity',company:'Hagadol',name:'Public field title',date,location:'Office site',publicNote:'Office safe update',notes:'PRIVATE INTERNAL SENTINEL',amount:0,status:'Active'});
state.records.push({id:'screen-rock',type:'rock',company:'Hagadol',name:'Public Rock',date:date.slice(0,7)+'-31',periodStart:date.slice(0,7)+'-01',due:date,owner:'Lead',notes:'PRIVATE ROCK SENTINEL',blocker:'PRIVATE BLOCKER SENTINEL',amount:0,status:'Open'});
const board=await render(OfficeScreen,{initial:{state,company:'Hagadol',layout:'Combined'}});check(board.includes('Office safe update'),'Screen shows approved public notes');check(!board.includes('PRIVATE INTERNAL SENTINEL')&&!board.includes('PRIVATE BLOCKER SENTINEL')&&!board.includes('PRIVATE ROCK SENTINEL'),'Screen projection excludes private notes');check(!board.includes('erpSidebar')&&!board.includes('Customers &amp; pipeline'),'Dedicated screen has no ERP navigation');
const rotating=await render(Command,{view:'Office display',state,company:'Hagadol',sample:true,initial:{wallLayout:'Rotating',slide:3},open:()=>{},act:async()=>{},go:()=>{},refresh:async()=>{},busy:false});check(!rotating.includes('PRIVATE ROCK SENTINEL')&&!rotating.includes('PRIVATE BLOCKER SENTINEL'),'Rotating screen excludes internal Rock notes');
const initial=await render(OfficeScreen,{});check(initial.includes('Loading office display')&&!initial.includes('No monthly targets'),'Screen distinguishes loading from empty data');
const post={id:'calendar-post',type:'post',company:'WMK',name:'Calendar QA post',source:'LinkedIn',date,status:'Planned',amount:0};
const calendar=await render(Calendar,{records:[post],onOpen:()=>{}});check(calendar.includes('Calendar QA post')&&calendar.includes('WMK · LinkedIn'),'Calendar displays dated company posts');check(calendar.includes('Publishing to social accounts awaits connection'),'Calendar truthful about publishing');
const exports=exportRecords([post],[],[],'Media','Calendar','');check(exports.length===1&&exports[0].id===post.id,'Calendar export uses posts');
const fixed='2026-10-12',base={company:'Hagadol',date:fixed,status:'Open',amount:100,paid:0,credited:0};
const attention=homeAttention([
 {...base,id:'overdue',type:'task',name:'Past action',due:'2026-10-11'},
 {...base,id:'today',type:'task',name:'Today action',due:fixed},
 {...base,id:'soon',type:'bid',name:'Buyer deadline',due:'2026-10-19'},
 {...base,id:'far',type:'task',name:'Later task',due:'2026-10-20'},
 {...base,id:'done',type:'task',name:'Closed action',due:fixed,status:'Done'},
 {...base,id:'foreign',type:'task',name:'WMK action',due:fixed,company:'WMK'},
 {...base,id:'settled',type:'invoice',name:'Paid invoice',due:fixed,status:'Posted',paid:100},
 {...base,id:'future',type:'invoice',name:'Future document',date:'2026-10-13',due:fixed,status:'Posted'}
],'Hagadol',fixed);
check(attention.map(r=>r.id).join(',')==='overdue,today,soon','Home prioritises due work and excludes closed, paid, future and foreign rows');
const home=await render(Home,{state:sample,company:'Hagadol',go:()=>{},onDetail:()=>{}});
for(const label of ['Cash available','Customers owe','Suppliers owed','Open pipeline','Needs attention','Quarterly Rocks','Budget','Cash flow'])check(home.includes(label),'Simple home retains '+label);
const shell=await render(ERP,{initial:{sample:true,state:sample}});check(shell.includes('aria-label="Main modules"')&&shell.includes('class="mobilemenu"'),'Desktop and mobile use semantic module navigation');
check(shell.includes('>Home</span>')&&shell.includes('>Settings</button>'),'Home and Settings remain direct navigation');
check(!shell.includes('Find a module')&&!shell.includes('data-sidebar='),'The shell does not require the old sidebar widget');
for(const company of ['Hagadol','WMK']){
 const form=await render(CRMForm,{type:'deal',company,records:sample.records,act:async()=>false,busy:false,onDirty:()=>{},onClose:()=>{},onSaved:()=>{}});
 check(form.includes('<details')&&form.includes('More opportunity details'),'Opportunity qualification is disclosed on request');
 for(const name of ['Opportunity name','Owner','Value UGX','Stage','Next action','Next follow up'])check(form.includes(name),'Essential opportunity field '+name+' retained');
 const extras=form.slice(form.indexOf('<summary>More opportunity details'),form.indexOf('</details>',form.indexOf('<summary>More opportunity details')));
 check(!extras.includes('required=""'),'Closed opportunity details contain no required input');
}
const finance=await render(Finance,{state:sample,company:'Hagadol',tab:'Overview',changeTab:()=>{},open:()=>{},onDetail:()=>{},payment:()=>{},act:async()=>{},busy:false,go:()=>{},onDirty:()=>{}});
check(finance.includes('class="moremenu"')&&finance.includes('How finance works'),'Finance keeps advanced tools and explanations behind disclosures');
const crm=await render(CRM,{state:sample,company:'Hagadol',tab:'Contacts',busy:false,act:async()=>{},onDirty:()=>{},importContacts:()=>{}});
check(crm.includes('Filters')&&crm.includes('Import contacts')&&!crm.includes('Open opportunities'),'Contact list retains filters and import without pipeline statistics');
console.log(JSON.stringify({passed,failed:0,browserTested:false}));
