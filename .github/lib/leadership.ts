import type {RecordRow as R} from './erp-engine';
import {periodBounds} from './hagadol-os';
const clean=(v:unknown,max=5000)=>String(v??'').trim().slice(0,max);
export function validateRock(r:R){
for(const key of ['completionResult','blocker','nextAction'])r[key]=clean(r[key]);
if(r.progress===undefined||r.progress===null||r.progress==='')r.progress=null;
else {const value=Number(r.progress);if(!Number.isFinite(value)||value<0||value>100)throw Error('Enter Rock progress between 0 and 100 percent.');r.progress=value;}
if(r.status==='Done')r.progress=100;
return r;
}
export function validateOfficeBid(r:R){
r.showOnOffice=r.showOnOffice===true;r.officeTitle=clean(r.officeTitle,500);
if(r.showOnOffice&&(!r.officeTitle||!r.due))throw Error('Enter an office display title and deadline before displaying this bid.');
return r;
}
export function rockProgress(r:Pick<R,'status'>&{progress?:unknown}):number|null{if(r.status==='Done')return 100;return typeof r.progress==='number'&&Number.isFinite(r.progress)&&r.progress>=0&&r.progress<=100?r.progress:null;}
export function rockSummary(rocks:R[]){const values=rocks.map(rockProgress).filter((v):v is number=>v!==null);return {total:rocks.length,done:rocks.filter(r=>r.status==='Done').length,onTrack:rocks.filter(r=>r.status==='On track').length,atRisk:rocks.filter(r=>r.status==='At risk').length,recorded:values.length,average:values.length?values.reduce((s,v)=>s+v,0)/values.length:null};}
export const l10Agenda=[{name:'Segue',minutes:5},{name:'Scorecard',minutes:5},{name:'Rock review',minutes:5},{name:'Customer and employee headlines',minutes:5},{name:'To do review',minutes:5},{name:'Identify, discuss, solve',minutes:60},{name:'Conclude',minutes:5}];
export function validateWeeklyMetric(r:R){const week=periodBounds('Week',r.date);if(!r.owner)throw Error('Assign an owner to the weekly metric.');if(r.periodStart!==week.start||r.date!==week.end)throw Error('Use the full Monday to Sunday dates for a weekly metric.');}
export function validateEOS(r:R,records:R[]){
for(const [key,type] of [['meetingId','eos_meeting'],['issueId','eos_issue'],['rockId','rock'],['metricId','scorecard']] as const){r[key]=clean(r[key],100);if(r[key]&&!records.some(x=>x.id===r[key]&&x.type===type&&x.company===r.company))throw Error('Choose a linked EOS record from this company.');}
if(r.type==='task'){r.eos=r.eos===true||!!(r.meetingId||r.issueId||r.rockId);if(r.eos&&(!clean(r.owner)||!r.due))throw Error('An EOS To do needs an owner and deadline.');}
if(r.type==='eos_issue'){
r.relatedMeetingIds=Array.isArray(r.relatedMeetingIds)?[...new Set(r.relatedMeetingIds.map((id:unknown)=>clean(id,100)))]:[];
if(r.relatedMeetingIds.length>100||r.relatedMeetingIds.some((id:string)=>!records.some(x=>x.id===id&&x.type==='eos_meeting'&&x.company===r.company)))throw Error('Choose discussion meetings from this company.');
r.owner=clean(r.owner,500);if(!r.owner)throw Error('Assign an owner to this issue.');r.priority=['High','Normal','Low'].includes(r.priority)?r.priority:'Normal';
for(const key of ['identified','discussion','resolution'])r[key]=clean(r[key],10000);
if(r.status==='Solved'&&(!r.discussion||!r.resolution))throw Error('Record the discussion and solution before marking an issue solved.');
}
if(r.type==='eos_meeting'){
r.owner=clean(r.owner,500);r.attendees=clean(r.attendees,2000);for(const key of ['segue','headlines','conclusion','cascadingMessages'])r[key]=clean(r[key],10000);
if(!r.owner||!r.attendees)throw Error('Enter the meeting facilitator and attendees.');
delete r.agenda;delete r.agendaItems;delete r.agendaDurations;
r.agendaStep=l10Agenda.some(a=>a.name===r.agendaStep)?r.agendaStep:l10Agenda[0].name;
if(r.rating===undefined||r.rating===null||r.rating==='')r.rating=null;else {r.rating=Number(r.rating);if(!Number.isFinite(r.rating)||r.rating<1||r.rating>10)throw Error('Rate the meeting between 1 and 10.');}
if(r.status==='Completed'&&(!r.conclusion||r.rating===null))throw Error('Record a conclusion and meeting rating before completing the meeting.');
}
return r;
}
export function eosSnapshot(records:R[],company:string,today:string){const rs=records.filter(r=>company==='Group'||r.company===company),todos=rs.filter(r=>r.type==='task'&&r.eos===true),issues=rs.filter(r=>r.type==='eos_issue'),meetings=rs.filter(r=>r.type==='eos_meeting').sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));return {todos,issues,meetings,overdue:todos.filter(r=>r.status!=='Done'&&r.due<today),openIssues:issues.filter(r=>!['Solved','Archived'].includes(r.status)).sort((a,b)=>['High','Normal','Low'].indexOf(a.priority)-['High','Normal','Low'].indexOf(b.priority)||a.date.localeCompare(b.date))};}
export function meetingReview(records:R[],meeting:R){
const rs=records.filter(r=>r.company===meeting.company),week=periodBounds('Week',meeting.date),month=periodBounds('Month',meeting.date),quarter=periodBounds('Quarter',meeting.date);
const previous=rs.filter(r=>r.type==='eos_meeting'&&r.id!==meeting.id&&r.status==='Completed'&&r.date<meeting.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
const previousOpen=new Set((previous?.reviewSnapshot?.todos||[]).filter((r:any)=>r.status!=='Done').map((r:any)=>r.id));
return {week,month,quarter,previousMeetingDate:previous?.date||null,
scorecards:rs.filter(r=>{if(r.type!=='scorecard')return false;const p=r.period==='Week'?week:r.period==='Month'?month:r.period==='Quarter'?quarter:null;return !!p&&r.periodStart===p.start&&r.date===p.end;}).map(r=>({id:r.id,name:r.name,owner:r.owner,period:r.period,periodStart:r.periodStart,date:r.date,actual:r.actual,targetValue:r.targetValue,unit:r.unit,direction:r.direction,metricSource:r.metricSource||'Manual',metricAsOf:r.metricAsOf,metricEvidence:r.metricEvidence,metricPending:r.metricPending})),
rocks:rs.filter(r=>r.type==='rock'&&r.periodStart<=quarter.end&&r.date>=quarter.start).map(r=>({id:r.id,name:r.name,owner:r.owner,status:r.status,progress:rockProgress(r),due:r.due,completionResult:r.completionResult,blocker:r.blocker,nextAction:r.nextAction})),
todos:rs.filter(r=>r.type==='task'&&r.eos===true&&(r.status!=='Done'||r.meetingId===meeting.id||r.completedDate&&r.completedDate>=(previous?.date||week.start)&&r.completedDate<=meeting.date||previousOpen.has(r.id))).map(r=>({id:r.id,name:r.name,owner:r.owner,due:r.due,status:r.status,meetingId:r.meetingId,issueId:r.issueId,rockId:r.rockId,completedDate:r.completedDate})),
issues:rs.filter(r=>r.type==='eos_issue'&&(r.meetingId===meeting.id||(r.relatedMeetingIds||[]).includes(meeting.id)||!['Solved','Archived'].includes(r.status))).sort((a,b)=>['High','Normal','Low'].indexOf(a.priority)-['High','Normal','Low'].indexOf(b.priority)).map(r=>({id:r.id,name:r.name,owner:r.owner,priority:r.priority,status:r.status,identified:r.identified,discussion:r.discussion,resolution:r.resolution,rockId:r.rockId,metricId:r.metricId,rockName:rs.find(x=>x.id===r.rockId)?.name,metricName:rs.find(x=>x.id===r.metricId)?.name})),
notes:meeting.notes||'',segue:meeting.segue||'',headlines:meeting.headlines||'',conclusion:meeting.conclusion||'',cascadingMessages:meeting.cascadingMessages||'',rating:meeting.rating};
}
/** Allowlisted public titles only; private bid briefs and commercial values never reach the wall. */
export function bidRadar(records:R[],company:string,asOfDate:string,officeOnly=false){
const today=Date.parse(asOfDate+'T00:00:00Z');
return records.filter(r=>r.type==='bid'&&(company==='Group'||r.company===company)&&!['Won','Lost'].includes(r.status)&&r.date<=asOfDate&&r.due&&(!officeOnly||(r.showOnOffice===true&&String(r.officeTitle||'').trim())))
.map(r=>({id:r.id,company:r.company,title:officeOnly?r.officeTitle:r.name,due:r.due,status:r.status,days:Math.round((Date.parse(r.due+'T00:00:00Z')-today)/86400000)}))
.filter(r=>Number.isFinite(r.days)).sort((a,b)=>a.due.localeCompare(b.due)||a.id.localeCompare(b.id));
}

export function meetingMinutes(m:R){const s=m.reviewSnapshot;if(m.status!=='Completed'||!s)return '';const lines=[m.name,m.company+' · '+m.date,'Facilitator: '+m.owner,'Attendees: '+m.attendees,'','To dos agreed in this L10',...(s.todos||[]).filter((r:any)=>r.meetingId===m.id).map((r:any)=>r.name+' · Owner '+r.owner+' · Due '+r.due+' · '+r.status),...(!(s.todos||[]).some((r:any)=>r.meetingId===m.id)?['No follow up To dos recorded']:[]),'','Fixed L10 agenda: '+l10Agenda.map(a=>a.name+' ('+a.minutes+' min)').join('; '),'','Meeting notes',s.notes||'No additional notes','', 'Segue',s.segue||m.segue||'No notes','', 'Scorecard',...(s.scorecards||[]).map((r:any)=>r.name+' · '+(r.period||'Week')+' · Actual '+(r.actual===null?'Needs data':r.actual+' '+r.unit)+' · Target '+r.targetValue+' · '+r.owner),'','Rocks',...(s.rocks||[]).map((r:any)=>r.name+' · '+r.status+' · '+r.owner+' · Due '+r.due),'','Headlines',s.headlines||m.headlines||'No headlines','', 'To dos',...(s.todos||[]).map((r:any)=>r.name+' · '+r.status+' · '+r.owner+' · Due '+r.due),'','Issues',...(s.issues||[]).flatMap((r:any)=>[r.name+' · '+r.status,'Identify: '+(r.identified||''),'Discuss: '+(r.discussion||''),'Solve: '+(r.resolution||'')]),'','Conclusion',s.conclusion||m.conclusion,'Messages to share',s.cascadingMessages||m.cascadingMessages||'None recorded','Rating: '+(s.rating??m.rating)+' / 10','Minutes saved: '+s.recordedAt];return lines.join('\n');}

export type L10Clock={startedAt:string;runningSince:string|null;paused:boolean;elapsedByStep:Record<string,number>;completedAt?:string;reviewedSteps?:string[]};
export function startMeetingClock(now:string):L10Clock{return {startedAt:now,runningSince:now,paused:false,elapsedByStep:{},reviewedSteps:[]};}
export function meetingElapsed(m:R,now=Date.now()){
 const c=m.l10Clock as L10Clock|undefined;const elapsed:Record<string,number>={};
 for(const a of l10Agenda){const value=Number(c?.elapsedByStep?.[a.name]);elapsed[a.name]=Number.isFinite(value)?Math.max(0,value):0;}
 if(c&&!c.paused&&c.runningSince&&m.status==='In progress'){const since=Date.parse(c.runningSince);if(Number.isFinite(since))elapsed[m.agendaStep||'Segue']+=Math.max(0,(now-since)/1000);}
 return {byStep:elapsed,total:Object.values(elapsed).reduce((s,n)=>s+n,0),paused:c?.paused??true,tracked:!!c};
}
export function controlMeetingClock(m:R,command:string,target:string|undefined,now:string){
 if(m.type!=='eos_meeting'||m.status!=='In progress')throw Error('Start an open L10 meeting before using its controls.');
 if(!['Pause','Resume','Next','Previous','Go to','Finish'].includes(command))throw Error('Choose a valid meeting control.');
 const clock=m.l10Clock as L10Clock|undefined,elapsed=meetingElapsed(m,Date.parse(now));let step=m.agendaStep||'Segue';const index=l10Agenda.findIndex(a=>a.name===step);
 if(command==='Next'){if(index>=l10Agenda.length-1)throw Error('Conclude the meeting before closing it.');step=l10Agenda[index+1].name;}
 if(command==='Previous'){if(index<=0)throw Error('This is the first agenda section.');step=l10Agenda[index-1].name;}
 if(command==='Go to'){if(!l10Agenda.some(a=>a.name===target))throw Error('Choose a fixed agenda section.');step=target!;}
 const reviewedSteps=[...new Set((clock?.reviewedSteps||[]).filter(name=>l10Agenda.some(a=>a.name===name)))];
 if(command==='Next'||command==='Finish'){if(!reviewedSteps.includes(m.agendaStep||'Segue'))reviewedSteps.push(m.agendaStep||'Segue');}
 const paused=command==='Pause'||command==='Finish'?true:command==='Resume'?false:clock?.paused??false;
 return {agendaStep:step,l10Clock:{startedAt:clock?.startedAt||now,runningSince:paused?null:now,paused,elapsedByStep:elapsed.byStep,reviewedSteps,...(command==='Finish'?{completedAt:now}:{})} as L10Clock};
}
