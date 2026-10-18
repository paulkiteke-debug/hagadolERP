import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildPlan,applyPlan,day,uid} from '../lib/erp-engine.ts';
import {crmActivities,crmRelated,crmSummary,duplicateContact} from '../lib/crm.ts';
import CRM,{CRMForm} from '../app/erp-crm.tsx';
import {exportRecords} from '../lib/erp-ui.ts';
let state={records:[],journal:[],audit:[]},passed=0;
const check=(v,m)=>{if(!v)throw Error(m);passed++};
const record=id=>state.records.find(r=>r.id===id),run=input=>{const p=buildPlan({...input,requestId:uid()},state);state=applyPlan(state,p);return p.focusId},reject=(input,m)=>{let failed=false;try{buildPlan({...input,requestId:uid()},state)}catch{failed=true}check(failed,m)};
const render=(C,p)=>renderToStaticMarkup(React.createElement(C,p));
const accounts={};
for(const company of ['Hagadol','WMK']){
 accounts[company]=run({action:'create',company,type:'crm_company',name:company+' client company',crm:true,website:'https://example.com',email:'client@example.com'});
 const contact=run({action:'create',company,type:'contact',name:company+' client person',email:'person@example.com',crm:true,crmCompanyId:accounts[company]});
 const stage=company==='Hagadol'?'Site assessment':'Design brief';
 const deal=run({action:'create',company,type:'deal',name:company+' opportunity',owner:'Sales lead',amount:1000,crm:true,contactId:contact,crmStage:stage,nextAction:'Confirm brief',closingDate:day()});
 check(record(deal).crmCompanyId===accounts[company]&&record(deal).customer===record(accounts[company]).name,'Contact derives customer company');
 check(record(deal).status===stage,'Industry stage persisted on creation');
 reject({action:'create',company,type:'deal',name:'Bad stage',owner:'Lead',customer:'Client',crm:true,crmStage:company==='Hagadol'?'Design brief':'Site assessment'},'Other industry stage rejected');
 reject({action:'create',company,type:'deal',name:'Bad owner',customer:'Client',crm:true},'New CRM opportunity requires owner');
 reject({action:'create',company,type:'deal',name:'Bad customer',owner:'Lead',crm:true},'New CRM opportunity requires customer');
 reject({action:'create',company,type:'deal',name:'Invalid date',owner:'Lead',customer:'Client',closingDate:'2026-02-30'},'Invalid closing date rejected');
 for(const kind of ['Task','Call','Meeting']){
  const activity=run({action:'create',company,type:'task',name:kind+' action',owner:'Lead',due:day(),crm:true,dealId:deal,activityKind:kind,activityTime:'14:30'});
  check(record(activity).contactId===contact&&record(activity).crmCompanyId===accounts[company]&&record(activity).activityKind===kind,'Activity inherits opportunity references');
  run({action:'stage',id:activity,expectedVersion:record(activity).version,status:'Done'});check(record(activity).completedDate===day()&&record(activity).crmStatus==='Done','Activity completion and time saved');
  run({action:'edit',id:activity,expectedVersion:record(activity).version,fields:{notes:'Saved call outcome'}});check(record(activity).status==='Done','Editing a completed activity preserves status');
  run({action:'stage',id:activity,status:'Open'});check(!record(activity).completedDate&&record(activity).crmStatus==='Open','Reopening clears completion date');
 }
 const done=run({action:'create',company,type:'task',name:'Logged call',owner:'Lead',due:day(),crm:true,dealId:deal,activityKind:'Call',crmStatus:'Done',notes:'Client confirmed scope'});check(record(done).status==='Done'&&record(done).completedDate,'Completed call can be logged directly');
 reject({action:'create',company,type:'task',name:'No owner',due:day(),crm:true},'Activity owner required');
 reject({action:'create',company,type:'task',name:'No due',owner:'Lead',crm:true},'Activity deadline required');
 reject({action:'create',company,type:'task',name:'Invalid time',owner:'Lead',due:day(),crm:true,activityTime:'25:90'},'Invalid activity time rejected');
 reject({action:'create',company,type:'task',name:'Mixed EOS',owner:'Lead',due:day(),crm:true,eos:true},'EOS and CRM flags cannot mix');
 const version=record(deal).version;run({action:'stage',id:deal,status:'Won'});run({action:'edit',id:deal,fields:{notes:'Appointment signed'}});check(record(deal).status==='Won','Editing notes does not regress opportunity stage');
 reject({action:'edit',id:deal,expectedVersion:version,fields:{name:'Stale'}},'Stale opportunity edits rejected');
 run({action:'edit',id:deal,fields:{crmStage:'Negotiation'}});check(record(deal).status==='Negotiation','Stage can be edited atomically with opportunity fields');
 const eos=run({action:'create',company,type:'task',name:'EOS sentinel',owner:'Lead',due:day(),eos:true});check(!crmActivities(state.records).some(r=>r.id===eos),'CRM activities exclude EOS');
 check(crmRelated(state.records,record(accounts[company])).some(r=>r.id===deal),'Customer company includes linked opportunities');
 check(crmRelated(state.records,record(contact)).some(r=>r.id===done),'Contact history includes linked calls');
 check(duplicateContact(state.records,company,' PERSON@EXAMPLE.COM ').length===1,'Duplicate hint ignores email case and spaces within company');
 const common={state,company,tab:'Pipeline',busy:false,act:async()=>false,onDirty:()=>{},importContacts:()=>{}};
 for(const tab of ['Pipeline','Contacts','Companies','Activities']){const html=render(CRM,{...common,tab});check(html.includes('New ')&&html.includes('Search')&&!html.includes('NaN'),'CRM section renders '+tab);}
 for(const id of [accounts[company],contact,deal,done]){const html=render(CRM,{...common,initialDetail:id});check(html.includes(record(id).name)&&html.includes('Activities and history')&&!html.includes('EOS sentinel'),'Customer profile renders with scoped history');}
 for(const type of ['contact','crm_company','deal','task']){const html=render(CRMForm,{type,company,records:state.records,act:async()=>false,busy:false,onDirty:()=>{},onClose:()=>{},onSaved:()=>{}});check(html.includes('Save ')&&html.includes('Owner'),'Simple CRM form renders '+type);if(type==='deal')check(html.includes(company==='Hagadol'?'Site requirements':'Design brief'),'Qualification fields match business');}
 const exported=exportRecords(state.records.filter(r=>r.company===company),[],[],'CRM','Activities','');check(exported.every(r=>r.type==='task'&&r.crm&&!r.eos),'Activity export matches CRM scope');
 const summary=crmSummary(state.records.filter(r=>r.company===company),day());check(summary.open===1&&summary.value===1000&&summary.due===3,'Summary derives recorded open opportunities and due activities');
}
reject({action:'create',company:'WMK',type:'contact',name:'Cross company contact',crmCompanyId:accounts.Hagadol},'Contact cannot link across businesses');
reject({action:'create',company:'WMK',type:'task',name:'Cross company activity',owner:'Lead',due:day(),crm:true,dealId:state.records.find(r=>r.company==='Hagadol'&&r.type==='deal').id},'Activity cannot link across businesses');
reject({action:'create',company:'Hagadol',type:'crm_company',name:'Unsafe URL',website:'javascript:alert(1)'},'Unsafe company website rejected');
reject({action:'create',company:'Hagadol',type:'crm_company',name:'Unsafe URL',website:'https://secret@example.com'},'Credential carrying website rejected');
check(state.journal.length===0,'CRM writes do not change ledger');
console.log(JSON.stringify({passed,failed:0,browserTested:false,liveProductionTouched:false}));
