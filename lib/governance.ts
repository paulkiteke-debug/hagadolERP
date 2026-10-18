import type {RecordRow as R} from './erp-engine';
export const classifications=['Working Draft','Reference','Verified Evidence','Authoritative','Historical','Restricted'];
export const documentKinds=['Company fact','Policy','Licence','Lead assessment','Site assessment','Survey and design','BOQ','Contract','Mobilisation','Daily report','Commissioning','Handover','Care plan','Design brief','Concept design','Appointment','Design development','Drawing approval','Supervision report','Defects record','Other'];
export const knowledgeCategories=['Company facts','Services','Credentials','Project evidence','Products','Pricing','Technical procedure','Brand standards'];
export const lifecycleStages:Record<string,string[]>={Hagadol:['Qualification','Site assessment','Survey and design','Proposal and contract','Mobilisation','Execution','Testing and commissioning','Handover','Care'],WMK:['Qualification','Design brief','Fee proposal and appointment','Concept design','Design development','Drawings and approvals','Site supervision','Handover','Defects follow up']};
const requirements:Record<string,Record<string,string[]>>={Hagadol:{Qualification:['Lead assessment'],'Site assessment':['Site assessment'],'Survey and design':['Survey and design','BOQ'],'Proposal and contract':['Contract'],Mobilisation:['Mobilisation'],Execution:['Daily report'],'Testing and commissioning':['Commissioning'],Handover:['Handover'],Care:['Care plan']},WMK:{Qualification:['Lead assessment'],'Design brief':['Design brief'],'Concept design':['Concept design'],'Fee proposal and appointment':['Appointment'],'Design development':['Design development'],'Drawings and approvals':['Drawing approval'],'Site supervision':['Supervision report'],Handover:['Handover'],'Defects follow up':['Defects record']}};
export const gateRequirements=(company:string,stage:string)=>requirements[company]?.[stage]||[];
const clean=(v:any,max=5000)=>String(v??'').trim().slice(0,max);
export function validDate(v:any,required=false){if(!v){if(required)throw Error('Enter the review date.');return '';}const s=String(v);const d=new Date(s+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('Enter a valid review date.');return s;}
export function documentUsable(r:R|undefined,today:string){return !!r&&r.type==='document'&&r.status==='Verified'&&['Verified Evidence','Authoritative','Restricted'].includes(r.classification)&&!!r.verifiedBy&&!!r.verifiedAt&&(!r.reviewDue||r.reviewDue>=today)&&r.date<=today;}
export function validateGovernance(r:R,records:R[]){
if(r.type==='document'){
r.documentCode=clean(r.documentCode,100)||`${r.company==='Hagadol'?'HOS':'WMKOS'}/${r.date.slice(0,4)}/${r.id.slice(0,8).toUpperCase()}`;
if(records.some(x=>x.type==='document'&&x.company===r.company&&x.id!==r.id&&String(x.documentCode||'').toLowerCase()===r.documentCode.toLowerCase()))throw Error('This document ID is already in use.');
r.documentKind=documentKinds.includes(r.documentKind)?r.documentKind:'Other';r.classification=classifications.includes(r.classification)?r.classification:'Working Draft';
for(const k of ['sourceRef','owner','revisionLabel'])r[k]=clean(r[k],500);r.summary=clean(r.summary,10000);r.reviewDue=validDate(r.reviewDue);r.sourceUrl=clean(r.sourceUrl,2000);
if(r.sourceUrl){let u:URL;try{u=new URL(r.sourceUrl)}catch{throw Error('Enter a valid HTTPS document link.');}if(u.protocol!=='https:'||u.username||u.password)throw Error('Use an HTTPS document link without credentials.');}
if(r.previousDocumentId&&!records.some(x=>x.id===r.previousDocumentId&&x.type==='document'&&x.company===r.company))throw Error('Choose a previous document from this company.');
}else if(r.type==='knowledge'){
r.statement=clean(r.statement,20000);r.category=knowledgeCategories.includes(r.category)?r.category:'Company facts';r.owner=clean(r.owner,500);r.reviewDue=validDate(r.reviewDue);r.sourceDocumentId=clean(r.sourceDocumentId,100);r.externalUseAllowed=r.externalUseAllowed===true;
if(!r.statement||!r.owner)throw Error('Enter the knowledge statement and its owner.');
if(r.sourceDocumentId&&!records.some(x=>x.id===r.sourceDocumentId&&x.type==='document'&&x.company===r.company))throw Error('Choose a source document from this company.');
}
return r;
}
export function knowledgeUsable(r:R,records:R[],today:string){const source=records.find(x=>x.id===r.sourceDocumentId&&x.company===r.company);return r.status==='Verified'&&!!r.verifiedBy&&!!r.verifiedAt&&(!r.reviewDue||r.reviewDue>=today)&&r.date<=today&&documentUsable(source,today)&&source?.version===r.sourceDocumentVersion;}
export function checkVerification(r:R,records:R[],today:string){
if(!r.owner||!r.reviewDue||r.reviewDue<today||r.date>today)throw Error('Assign an owner, a current date and a future review date before verification.');
if(r.type==='document'){if(!r.sourceRef||!r.revisionLabel||!['Verified Evidence','Authoritative','Restricted'].includes(r.classification))throw Error('Verification needs a source reference, revision and an evidence, authoritative or restricted classification.');}
else{const source=records.find(x=>x.id===r.sourceDocumentId&&x.company===r.company);if(!documentUsable(source,today))throw Error('Choose a current verified source document.');if(r.externalUseAllowed&&source?.classification==='Restricted')throw Error('Restricted source documents cannot support external use.');r.sourceDocumentVersion=source!.version;}
}
export function gateEvidence(project:R,records:R[],ids:string[],today:string){
if(!Array.isArray(ids)||ids.length>30||!ids.length||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw Error('Select between 1 and 30 evidence documents.');
const docs=ids.map(id=>records.find(r=>r.id===id&&r.company===project.company&&r.projectId===project.id));if(docs.some(r=>!documentUsable(r,today)))throw Error('Every gate document must be current, verified and linked to this project.');
const needed=gateRequirements(project.company,project.lifecycleStage);const missing=needed.filter(kind=>!docs.some(d=>d?.documentKind===kind));if(missing.length)throw Error('Gate evidence required: '+missing.join(', ')+'.');
return docs as R[];
}
