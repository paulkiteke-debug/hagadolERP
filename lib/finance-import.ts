import {AccessError,fingerprint} from './security';
import type {Access} from './access-policy';

export const importKinds=['Cash in','Cash out','Client receipt','Company account funding','Debt balance','Debt payment','Expected receipt','Loan proceeds','Pending balance','Personal funding','Salary schedule','Unpriced item'];
export const importCompanies=['Hagadol','WMK','Shared','Unassigned'];
export type ImportRow={id:string;source_sheet:string;source_row:number;source_cell:string;date:string;period:string;date_basis:string;company:string;company_original:string;kind:string;description:string;category:string;amount_UGX:number|null;currency_basis:string;review:string;posting_status:string;possible_duplicates:string;project?:string;total_fees_UGX?:number|null;paid_UGX?:number|null;due_original?:string;cash_type_original?:string;record_status?:string};
export function importAccess(a:Access){return ['Owner','Administrator','Finance'].includes(a.role)&&['Hagadol','WMK'].every(c=>a.companies.includes(c));}
const strings=['id','source_sheet','source_cell','date','period','date_basis','company','company_original','kind','description','category','currency_basis','review','posting_status','possible_duplicates','project','due_original','cash_type_original'];
function money(v:any){if(v!==null&&(!Number.isSafeInteger(v)||Math.abs(v)>1e12))throw new AccessError('Use a valid whole UGX amount or leave it missing.',400);return v;}
export function importRow(v:any):ImportRow{
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AccessError('Provide a valid source row.',400);
 const r:any={};for(const k of strings){if(v[k]!==undefined&&typeof v[k]!=='string')throw new AccessError('Check text fields in the source row.',400);r[k]=v[k]??'';if(r[k].length>(['review','description','possible_duplicates'].includes(k)?4000:300))throw new AccessError('A source field is too long.',400);}
 if(!/^\d+:\d+:[A-Z]{1,3}$/.test(r.id)||!r.source_sheet||!Number.isInteger(v.source_row)||v.source_row<1||v.source_row>1000000||!new RegExp('^[A-Z]{1,3}'+v.source_row+'$').test(r.source_cell)||r.id.split(':')[1]!==String(v.source_row)||r.id.split(':')[2]!==r.source_cell.replace(/\d/g,''))throw new AccessError('Check the source row reference.',400);
 r.source_row=v.source_row;r.amount_UGX=money(v.amount_UGX);r.company=r.company||'Unassigned';
 if(!importCompanies.includes(r.company)||!importKinds.includes(r.kind)||r.posting_status!=='Review only')throw new AccessError('This import accepts records for review only.',400);
 if(r.date){const parsed=new Date(r.date.replaceAll('/','-')+'T00:00:00Z');if(!/^\d{4}\/\d{2}\/\d{2}$/.test(r.date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10).replaceAll('-','/')!==r.date)throw new AccessError('Check the source date.',400);}
 if(r.period&&!/^\d{4}\/(0[1-9]|1[0-2])$/.test(r.period))throw new AccessError('Check the source period.',400);
 for(const k of ['total_fees_UGX','paid_UGX'])if(v[k]!==undefined)r[k]=money(v[k]);
 return r;
}
export function batchSpec(v:any){
 if(!v||typeof v!=='object'||! /^[a-f0-9]{64}$/.test(v.sourceHash)||!/^[a-f0-9]{64}$/.test(v.manifestHash)||typeof v.filename!=='string'||!v.filename||v.filename.length>200||!Number.isInteger(v.expectedRows)||v.expectedRows<1||v.expectedRows>10000)throw new AccessError('Check the workbook import details.',400);
 return {id:'fi_'+v.sourceHash,sourceHash:v.sourceHash,manifestHash:v.manifestHash,filename:v.filename,expectedRows:v.expectedRows};
}
export async function rowManifest(rows:{row_key:string;row_hash:string}[]){return fingerprint(rows.map(r=>[r.row_key,r.row_hash]).sort((a,b)=>a[0].localeCompare(b[0])));}
