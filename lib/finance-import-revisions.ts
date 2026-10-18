import {AccessError} from './security';
export const supportFiles=['Subtotal_Discrepancies.csv','Unallocated_Review.csv','Validation_Report.json','WMK_Import.csv','All_Cleaned_Records.csv','Category_Map.csv','ERP_Review_Import.json','Exceptions.csv','Excluded_Aggregates.csv','Hagadol_Import.csv','Import_Guide.txt','Source_Reconciliation.csv'];
export type SupportFile={filename:string;sha256:string;bytes:number};
export type RevisionMetadata={originalSource:{filename:string;sha256:string};recordStatusById:Record<string,string>;files:SupportFile[]};
export function supportFile(v:any):SupportFile{
 if(!v||!supportFiles.includes(v.filename)||!/^[a-f0-9]{64}$/.test(v.sha256)||!Number.isInteger(v.bytes)||v.bytes<1||v.bytes>3*1024*1024)throw new AccessError('Check the supporting file name, size and checksum.',400);
 return {filename:v.filename,sha256:v.sha256,bytes:v.bytes};
}
export function revisionMetadata(v:any,ids:string[]):RevisionMetadata{
 if(!v||typeof v.originalSource?.filename!=='string'||v.originalSource.filename.length>200||!v.originalSource.filename||!/^[a-f0-9]{64}$/.test(v.originalSource.sha256)||!v.recordStatusById||typeof v.recordStatusById!=='object'||Array.isArray(v.recordStatusById))throw new AccessError('Provide the original source and review statuses.',400);
 const idSet=new Set(ids),statuses=Object.entries(v.recordStatusById);if(statuses.length!==ids.length||statuses.some(([id,status])=>!idSet.has(id)||!['Prepared for staging','Hold for review'].includes(status as string)))throw new AccessError('Review statuses must match every imported source row.',400);
 if(!Array.isArray(v.files)||v.files.length!==supportFiles.length)throw new AccessError('Provide all supporting file checksums.',400);
 const files=v.files.map(supportFile);if(new Set(files.map((f:SupportFile)=>f.filename)).size!==supportFiles.length)throw new AccessError('Each supporting file must appear once.',400);
 return {originalSource:{filename:v.originalSource.filename,sha256:v.originalSource.sha256},recordStatusById:Object.fromEntries(statuses) as Record<string,string>,files};
}
export async function bytesHash(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>)),n=>n.toString(16).padStart(2,'0')).join('');}
export function displayBatch(b:any){return {...b,status:b.superseded_by?'Superseded':b.status,metadata:undefined};}
