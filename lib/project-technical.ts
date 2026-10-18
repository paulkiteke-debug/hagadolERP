import type {RecordRow as R} from './erp-engine';
import {periodBounds} from './hagadol-os';
export const projectKinds:Record<string,string[]>={Hagadol:['Water system','Borehole','Solar pumping','Water treatment','Irrigation'],WMK:['Architecture','Interior design','Site supervision','Construction management']};
export const deliveryStages:Record<string,string[]>={Hagadol:['Brief','Survey','Drilling','Pump testing','Design','Installation','Commissioning','Handover'],WMK:['Brief','Concept','Design development','Drawings','Approval','Construction','Supervision','Handover']};
export const logKinds:Record<string,string[]>={Hagadol:['Survey','Drilling','Pump testing','Equipment installation','Commissioning','Handover'],WMK:['Design review','Drawing issue','Approval','Site supervision','Handover']};
export const evidenceKinds=['Measured','Client supplied','Supplier stated','Estimated','Provisional'];
export const measurements:[string,string,string,number][]=[['boreholeDepth','Borehole depth','m',2000],['staticLevel','Static water level','m below ground',2000],['dynamicLevel','Dynamic water level','m below ground',2000],['testFlow','Test discharge','m³/hour',100000],['testHours','Test duration','hours',10000],['installationDepth','Pump installation depth','m',2000],['pumpHead','Specified pump head','m',10000],['pumpFlow','Specified pump flow','m³/hour',100000],['solarCapacity','Solar array capacity','kWp',100000],['tankCapacity','Tank storage','litres',100000000]];
const clean=(v:any,max=2000)=>String(v??'').trim().slice(0,max);
export function validateProject(r:R,records:R[]){
r.projectCode=clean(r.projectCode,100)||`${r.company==='Hagadol'?'HGD':'WMK'}/${r.date.slice(0,4)}/${r.id.slice(0,8).toUpperCase()}`;
if(records.some(x=>x.type==='project'&&x.company===r.company&&x.id!==r.id&&x.projectCode?.toUpperCase()===r.projectCode.toUpperCase()))throw Error('This project reference is already in use in this company.');
r.projectKind=projectKinds[r.company].includes(r.projectKind)?r.projectKind:projectKinds[r.company][0];r.deliveryStage=deliveryStages[r.company].includes(r.deliveryStage)?r.deliveryStage:'Brief';
for(const k of ['location','leadEngineer','officeLabel'])r[k]=clean(r[k],500);r.technicalScope=clean(r.technicalScope,10000);
for(const [key,limit] of [['latitude',90],['longitude',180]] as const){if(r[key]===undefined||r[key]===null||r[key]===''){r[key]=null;continue}const value=Number(r[key]);if(!Number.isFinite(value)||Math.abs(value)>limit)throw Error('Enter a valid '+key+'.');r[key]=value;}
return r;
}
export function validateTechnicalLog(r:R,records:R[]){
const p=records.find(p=>p.id===r.projectId&&p.type==='project'&&p.company===r.company);if(!p)throw Error('Choose a project from this company.');
if(!logKinds[r.company].includes(r.logKind))throw Error('Choose a technical record type for this company.');if(!evidenceKinds.includes(r.evidenceKind))throw Error('Choose the evidence status.');
r.sourceRef=clean(r.sourceRef,2000);if(!r.sourceRef)throw Error('Enter the report, drawing or source reference.');
for(const k of ['vesReference','drillingMethod','casingSpec','pumpModel','treatmentSystem','drawingRef','revision','approvalRef','reviewer'])r[k]=clean(r[k],500);
r.checks=clean(r.checks,10000);r.notes=clean(r.notes,10000);
for(const [key,label,,limit] of measurements){if(r[key]===undefined||r[key]===null||r[key]===''){r[key]=null;continue}const value=Number(r[key]);if(!Number.isFinite(value)||value<0||value>limit)throw Error('Check '+label.toLowerCase()+'.');r[key]=value;}
if(r.boreholeDepth!==null)for(const k of ['staticLevel','dynamicLevel','installationDepth'])if(r[k]!==null&&r[k]>r.boreholeDepth)throw Error('Recorded water levels and pump depth must be within the borehole depth.');
if(r.company==='WMK'){for(const [key] of measurements)r[key]=null;for(const key of ['vesReference','drillingMethod','casingSpec','pumpModel','treatmentSystem'])r[key]='';}else{for(const key of ['drawingRef','revision','approvalRef'])r[key]='';}r.status='Recorded';return r;
}
export function projectTechnicalRecords(records:R[],projectId:string){return records.filter(r=>r.type==='technical_log'&&r.projectId===projectId).sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));}
/** Current delivery facts, one latest record per project and record type. No yield aggregation. */
export function operationsSnapshot(records:R[],company:string,asOfDate:string){
const projects=records.filter(r=>r.type==='project'&&(company==='Group'||r.company===company)&&r.date<=asOfDate);
const rows=projects.map(p=>{
const logs=projectTechnicalRecords(records,p.id).filter(r=>r.company===p.company&&r.date<=asOfDate&&String(r.sourceRef||'').trim());
const latest=(kind:string)=>logs.find(r=>r.logKind===kind);
const test=latest('Pump testing'),installation=latest('Equipment installation'),drawing=latest('Drawing issue'),approval=latest('Approval');
const measured=(r:R|undefined,key:string)=>r?.evidenceKind==='Measured'&&typeof r[key]==='number'&&Number.isFinite(r[key])&&r[key]>=0?r[key] as number:null;
return {project:p,recordCount:logs.length,testFlow:measured(test,'testFlow'),testDate:test?.date||'',solarCapacity:measured(installation,'solarCapacity'),installationDate:installation?.date||'',drawingRef:drawing?.drawingRef||'',revision:drawing?.revision||'',approvalRef:approval?.approvalRef||'',latestDate:logs[0]?.date||''};
});
const open=rows.filter(r=>r.project.status!=='Completed');
return {asOfDate,rows,active:rows.filter(r=>r.project.status==='Active').length,onHold:rows.filter(r=>r.project.status==='On hold').length,overdue:open.filter(r=>r.project.due&&r.project.due<asOfDate).length,missingEvidence:open.filter(r=>!r.recordCount).length,
solarCapacity:rows.reduce((s,r)=>s+(r.solarCapacity??0),0),solarProjects:rows.filter(r=>r.solarCapacity!==null).length,
drawingProjects:rows.filter(r=>r.project.company==='WMK'&&r.drawingRef).length,approvalProjects:rows.filter(r=>r.project.company==='WMK'&&r.approvalRef).length,
stages:open.reduce((counts,r)=>{const key=r.project.company+' · '+(r.project.deliveryStage||r.project.status);counts[key]=(counts[key]||0)+1;return counts},{} as Record<string,number>)};
}
/** Explicit projections keep private notes, client records and financial balances off the wall. */
export function officeSnapshot(records:R[],company:string,date:string,asOfDate=date){
const rs=records.filter(r=>company==='Group'||r.company===company),month=periodBounds('Month',date),quarter=periodBounds('Quarter',date),cutoff=month.end<asOfDate?month.end:asOfDate;
const score=(period:string,bounds:{start:string;end:string})=>rs.filter(r=>r.type==='scorecard'&&r.period===period&&r.periodStart===bounds.start&&r.date===bounds.end).map(r=>({id:r.id,name:r.name,company:r.company,actual:r.actual,targetValue:r.targetValue,unit:r.unit,direction:r.direction}));
return {month,quarter,cutoff,monthly:score('Month',month),quarterly:score('Quarter',quarter),
field:rs.filter(r=>r.type==='field_activity'&&r.date<=cutoff).sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created)).slice(0,4).map(r=>({id:r.id,name:r.name,company:r.company,date:r.date,location:r.location,publicNote:r.publicNote})),
projects:rs.filter(r=>r.type==='project'&&!['Completed','On hold'].includes(r.status)).slice(0,5).map(r=>({id:r.id,company:r.company,label:r.officeLabel||r.projectCode||'Project reference pending',stage:r.deliveryStage||r.status,due:r.due})),
posts:rs.filter(r=>r.type==='post'&&r.date>=month.start&&r.date<=month.end).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4).map(r=>({id:r.id,name:r.name,company:r.company,source:r.source,date:r.date,status:r.status})),
rocks:rs.filter(r=>r.type==='rock'&&r.periodStart<=quarter.end&&r.date>=quarter.start).slice(0,7).map(r=>({id:r.id,name:r.name,company:r.company,owner:r.owner,due:r.due||r.date,status:r.status,progress:r.progress})),
traffic:rs.filter(r=>r.type==='metric'&&r.periodStart>=month.start&&r.date<=month.end).reduce((s,r)=>({visits:s.visits+(Number(r.visits)||0),leads:s.leads+(Number(r.leads)||0)}),{visits:0,leads:0})};
}
