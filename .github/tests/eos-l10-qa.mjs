import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildPlan,applyPlan,day,uid} from '../lib/erp-engine.ts';
import {l10Agenda,meetingReview,meetingMinutes} from '../lib/leadership.ts';
import {periodBounds} from '../lib/hagadol-os.ts';
import {resolveLinkedState} from '../lib/metric-links.ts';
import L10 from '../app/erp-l10.tsx';
import EOS from '../app/erp-eos.tsx';
let state={records:[],journal:[],audit:[]},passed=0;
const check=(v,label)=>{if(!v)throw Error(label);passed++},record=id=>state.records.find(r=>r.id===id);
function run(x){const p=buildPlan({...x,requestId:uid()},state);state=applyPlan(state,p);return p.focusId;}
function reject(x,label){let failed=false;try{buildPlan({...x,requestId:uid()},state)}catch{failed=true}check(failed,label);}
check(l10Agenda.length===7&&l10Agenda.reduce((s,a)=>s+a.minutes,0)===90,'Fixed seven section 90 minute agenda');
const today=day(),quarter=periodBounds('Quarter',today);
for(const company of ['Hagadol','WMK']){
 const meeting=run({action:'create',company,type:'eos_meeting',name:company+' test L10',date:today,owner:'Facilitator',attendees:'Leadership',agenda:[{name:'Forged'}],agendaDurations:[1],agendaItems:['Forged']});
 check(!record(meeting).agenda&&!record(meeting).agendaDurations&&!record(meeting).agendaItems,'Custom agenda injection removed');
 run({action:'edit',id:meeting,fields:{agendaStep:'Conclude',conclusion:'Decisions saved',rating:8}});
 reject({action:'stage',id:meeting,status:'Completed'},'Cannot close meeting without starting');
 run({action:'stage',id:meeting,status:'In progress'});check(record(meeting).agendaStep==='Segue','Starting begins at fixed first step');
 const metricIds=[];
 for(const period of ['Week','Month','Quarter']){const b=periodBounds(period,today);metricIds.push(run({action:'create',company,type:'scorecard',name:company+' '+period+' measure',period,periodStart:b.start,date:b.end,owner:'Finance',targetValue:1,metricSource:'Posted revenue'}));}
 const rock=run({action:'create',company,type:'rock',name:company+' quarterly priority',owner:'Operations',period:'Quarter',periodStart:quarter.start,date:quarter.end,due:quarter.end,completionResult:'Acceptance signed'});
 const carried=run({action:'create',company,type:'eos_issue',name:'Carried issue',owner:'Lead',discussion:'Prior discussion',resolution:'Agreed decision'});run({action:'stage',id:carried,status:'Solved',discussionMeetingId:meeting});check(record(carried).relatedMeetingIds.includes(meeting),'Solving an existing issue links this discussion meeting');
 const issue=run({action:'create',company,type:'eos_issue',name:company+' IDS review',owner:'Operations',meetingId:meeting,metricId:metricIds[0],rockId:rock,identified:'Review delivery constraint'});
 const todo=run({action:'create',company,type:'task',name:company+' agreed action',owner:'Operations',meetingId:meeting,issueId:issue,rockId:rock,eos:true,due:today});
 reject({action:'create',company:company==='WMK'?'Hagadol':'WMK',type:'eos_issue',name:'Foreign metric',owner:'Lead',metricId:metricIds[0]},'Issue cannot use another company metric');
 reject({action:'stage',id:issue,status:'Solved'},'IDS needs discussion and decision');
 run({action:'edit',id:issue,fields:{discussion:'Review the constraint',resolution:'Confirm delivery plan',relatedMeetingIds:[meeting]}});run({action:'stage',id:issue,status:'Solved'});
 run({action:'stage',id:todo,status:'Done'});check(record(todo).completedDate===today,'To do completion is dated');
 run({action:'edit',id:todo,fields:{notes:'Action clarification'}});check(record(todo).completedDate===today,'Editing preserves completion date');
 let review=meetingReview(resolveLinkedState(state,today).records,record(meeting));
 check(['Week','Month','Quarter'].every(p=>review.scorecards.some(r=>r.period===p)),'All reporting periods reviewed in L10');
 check(review.scorecards.every(r=>r.name.startsWith(company)),'Metric review isolated by company');
 check(review.rocks.some(r=>r.id===rock)&&review.todos.some(r=>r.id===todo)&&review.issues.some(r=>r.id===issue),'Rock, action and solved linked issue are part of meeting');
 check(review.issues.find(r=>r.id===issue).metricName===record(metricIds[0]).name,'Original metric context saved');
 run({action:'edit',id:meeting,fields:{segue:'Win for the team',headlines:'Client feedback',cascadingMessages:'Share delivery date',conclusion:'Confirm delivery plan',rating:9,agendaStep:'Conclude'}});
 const common={state:resolveLinkedState(state,today),meeting:record(meeting),open:()=>{},create:()=>{},act:async()=>{},busy:false};
 for(const a of l10Agenda){const html=renderToStaticMarkup(React.createElement(L10,{...common,initialStep:a.name,initialIssue:issue}));check(html.includes('Live meeting agenda')&&html.includes(a.name),'Agenda section renders '+a.name);check(html.includes('Add To do')&&html.includes('Add issue'),'Actions available inside '+a.name);if(a.name==='Scorecard')check(html.includes('Weekly metrics')&&html.includes('Monthly metrics')&&html.includes('Quarterly metrics'),'Meeting shows all metric periods');if(a.name==='Identify, discuss, solve')check(html.includes('Mark solved')&&html.includes('Save IDS notes'),'IDS edited inside L10');}
 run({action:'stage',id:meeting,status:'Completed'});const before=JSON.stringify(record(meeting).reviewSnapshot);check(record(meeting).reviewSnapshot.segue==='Win for the team'&&record(meeting).reviewSnapshot.rating===9,'Notes and rating snapshotted');
 run({action:'edit',id:metricIds[0],fields:{name:'Later metric name',targetValue:9000}});run({action:'stage',id:rock,status:'At risk'});run({action:'stage',id:todo,status:'Open'});check(!record(todo).completedDate,'Reopening To do clears completion date');check(JSON.stringify(record(meeting).reviewSnapshot)===before,'Completed minutes immutable after source updates');
 reject({action:'edit',id:meeting,fields:{headlines:'Changed'}},'Completed notes locked');reject({action:'stage',id:meeting,status:'In progress'},'Completed meeting cannot reopen');
 const text=meetingMinutes(record(meeting));check(text.includes(company+' Week measure')&&!text.includes('Later metric name')&&text.includes('Confirm delivery plan')&&text.includes('Win for the team'),'Download uses saved minutes');
 for(const a of l10Agenda){const html=renderToStaticMarkup(React.createElement(L10,{...common,state,meeting:record(meeting),initialStep:a.name,initialIssue:issue}));check(!html.includes('Mark solved')&&!html.includes('Save meeting notes')&&!html.includes('Update actual')&&!html.includes('Update Rock'),'Archived section is read only '+a.name);check(html.includes('Download minutes')&&html.includes('Start L10 meeting'),'Archive offers minutes and next meeting');}
 const future=new Date(Date.parse(today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 const follow=run({action:'create',company,type:'eos_meeting',name:'Follow up',date:future,owner:'Facilitator',attendees:'Team'});
 const followReview=meetingReview(state.records,record(follow));check(followReview.todos.some(r=>r.id===todo),'Unfinished action carries forward');
 const oldDone=run({action:'create',company,type:'task',name:'Ancient done action',owner:'Lead',due:today,eos:true});state={...state,records:state.records.map(r=>r.id===oldDone?{...r,status:'Done',completedDate:'2020-01-01'}:r)};
 check(!meetingReview(state.records,record(follow)).todos.some(r=>r.id===oldDone),'Old completed actions excluded from review');
 const page=renderToStaticMarkup(React.createElement(EOS,{state,company,open:()=>{},create:()=>{},act:async()=>{},busy:false}));check((page.includes('Fixed L10 agenda')||page.includes('Live meeting agenda'))&&page.includes('Select L10 meeting'),'EOS opens on meeting workspace');
}
console.log(JSON.stringify({passed,failed:0,browserTested:false}));
