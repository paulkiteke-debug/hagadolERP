import {authenticate,AccessError,verifyWrite,rateLimit,fingerprint,type SecurityConfig} from './security';
import {importAccess} from './finance-import';
type Config=SecurityConfig&{FINANCE_IMPORT_KEY?:string;FINANCE_IMPORT_SOURCE_HASH?:string};
export async function financeImportReader(c:Config,req:Request){const {access}=await authenticate(c,req);if(!importAccess(access))throw new AccessError('Workbook imports require finance access to both companies.');return access;}
export async function financeImportWriter(c:Config,req:Request){
 const supplied=req.headers.get('x-finance-import-key');
 if(supplied){
  if(!c.FINANCE_IMPORT_KEY||supplied.length>200||await fingerprint(supplied)!==await fingerprint(c.FINANCE_IMPORT_KEY))throw new AccessError('Import access could not be verified.');
  verifyWrite(req);await rateLimit(c.DB,'finance-workbook-import');return {actor:'Authorised workbook upload',sourceHash:c.FINANCE_IMPORT_SOURCE_HASH||''};
 }
 const a=await financeImportReader(c,req);return {actor:a.email,sourceHash:''};
}
export function authorisedImportSource(auth:{sourceHash:string},req:Request,sourceHash:string){if(auth.sourceHash&&auth.sourceHash!==sourceHash||req.headers.has('x-finance-import-key')&&!auth.sourceHash)throw new AccessError('This upload access is restricted to its authorised workbook.');}
