import type {Access} from './access-policy';
import {canAssignCRM,canReadModule,canUseGroupView,crmProfile} from './access-policy';
import type {SQLDatabase} from './storage-types';
import type {RecordRow} from './erp-primitives';
import {AccessError} from './security';

export type CRMAssignee={id:string;email:string;companies:string[]};
export function authorizedCompanyContext(access:Access,target:string):string[]{
 if(target==='Group'){
  if(!canUseGroupView(access))throw new AccessError('Group view requires owner or administrator access to both companies.');
  return ['Hagadol','WMK'];
 }
 if(!['Hagadol','WMK'].includes(target)||!access.companies.includes(target))throw new AccessError('You cannot access this company.');
 return [target];
}
export async function crmAssignees(db:SQLDatabase,access:Access):Promise<CRMAssignee[]>{
 if(!canReadModule(access,'CRM'))return [];
 if(!canAssignCRM(access))return [{id:access.id,email:access.email,companies:access.companies}];
 const rows=await db.prepare("SELECT id,email,companies FROM access_users WHERE enabled=1 AND role IN ('Owner','Administrator','Sales') ORDER BY email").all<{id:string;email:string;companies:string}>();
 return rows.results.map(r=>({...r,companies:JSON.parse(r.companies) as string[]})).filter(r=>r.companies.some(c=>access.companies.includes(c))).map(r=>({...r,companies:r.companies.filter(c=>access.companies.includes(c))}));
}
export async function authorizeCRMRequest(db:SQLDatabase,access:Access,input:Record<string,unknown>,target?:RecordRow){
 const fields=input.fields as Record<string,unknown>|undefined;
 const type=target?.type||String(input.type||'');
 const crm=type==='crm_target'||type==='document'&&(target?.crmEvidence===true||input.crmEvidence===true)||type==='deal'||type==='quote'||type==='task'&&(target?.crm===true||fields?.crm===true||input.crm===true||!!target?.dealId||!!input.dealId);
 if(!crm){if(type==='document'&&fields?.crmEvidence!==undefined)throw new AccessError('Document workspace cannot be changed.');return;}
 if(type==='document'&&target&&fields&&['crmEvidence','dealId','crmOwnerId'].some(k=>fields[k]!==undefined&&fields[k]!==target[k]))throw new AccessError('Create a new document to change its deal binding.');
 const company=target?.company||String(input.company||'');
 authorizedCompanyContext(access,company);
 if(input.companyContext!==undefined){const scope=authorizedCompanyContext(access,String(input.companyContext));if(!scope.includes(company))throw new AccessError('The record does not belong to the selected company.');}
 const values=fields||input;
 if(type==='document'&&!target){const row=await db.prepare("SELECT payload FROM records WHERE id=? AND company=? AND type='deal'").bind(input.dealId,company).first<{payload:string}>();if(!row)throw new AccessError('Choose a deal from this company.');const deal=JSON.parse(row.payload) as RecordRow;if(crmProfile(access)==='sales_rep'&&deal.crmOwnerId!==access.id)throw new AccessError('Choose a deal assigned to you.');values.crmOwnerId=deal.crmOwnerId||'';}
 const requested=values.crmOwnerId;
 if(type==='crm_target'&&!canAssignCRM(access))throw new AccessError('Only CRM managers can set sales targets.');
 if(!canAssignCRM(access)&&!(type==='document'&&!target)){
  if(target&&requested!==undefined&&requested!==target.crmOwnerId)throw new AccessError('Only a CRM manager can reassign this record.');
  if(!target){if(requested!==undefined&&requested!==''&&requested!==access.id)throw new AccessError('Create records under your own account.');values.crmOwnerId=access.id;values.owner=access.name||access.email;}
 }else if(requested!==undefined&&requested!==''){
  if(typeof requested!=='string'||requested.length>120)throw new AccessError('Choose a valid ERP owner.',400);
  const member=await db.prepare("SELECT id,companies FROM access_users WHERE id=? AND enabled=1 AND role IN ('Owner','Administrator','Sales')").bind(requested).first<{id:string;companies:string}>();
  if(!member||!(JSON.parse(member.companies) as string[]).includes(company))throw new AccessError('The assigned user must have active access to this company.');
 }
 // A quote or task cannot be attached to an inaccessible or foreign deal.
 const dealId=values.dealId??target?.dealId;
 if(dealId){
  if(typeof dealId!=='string')throw new AccessError('Choose a valid deal.',400);
  const row=await db.prepare("SELECT id,company,payload FROM records WHERE id=? AND company=? AND type='deal'").bind(dealId,company).first<{id:string;company:string;payload:string}>();
  if(!row)throw new AccessError('The linked deal is unavailable.');
  const deal=JSON.parse(row.payload) as RecordRow;
  if(crmProfile(access)==='sales_rep'&&deal.crmOwnerId!==access.id)throw new AccessError('Link this record to a deal assigned to you.');
 }
}
