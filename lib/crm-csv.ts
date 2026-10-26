import {biginRow,mapBiginContact,mapBiginCompany} from './crm-import';
import type {RecordRow} from './erp-primitives';
import {AccessError} from './security';

export function sourceDate(value:string):string {
 const v=value.trim();if(!v)return '';
 const iso=/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(v);
 const us=/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/.exec(v);
 const date=iso?`${iso[1]}-${iso[2]}-${iso[3]}`:us?`${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`:'';
 if(!date||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new AccessError('Review Created Time. Use the original Bigin month/day/year or ISO date.',400);
 return date;
}
// Map an adapter copy only. Every original field remains in biginSource and
// the staging row, including timestamps, blanks, phone formatting and custom fields.
export function mapCSVSource(source:Record<string,string>,kind:string,company:string,existing:RecordRow[],importedAt:string,duplicates:string[]=[]){
 const original=biginRow({source,duplicateSourceIds:duplicates},kind);
 const date=sourceDate(source['Created Time']||'');
 const adapted={...original,source:{...source,'Created Time':date||importedAt.slice(0,10)}};
 const input=kind==='Contacts'?mapBiginContact(adapted,company,existing):mapBiginCompany(adapted,company);
 return {...input,biginCreatedTime:source['Created Time']||'',biginSource:{...source},dateBasis:date?'source':'imported',importReviewFlags:[...input.importReviewFlags,...(!date?['Source creation date is blank. ERP date is the import date.']:[])]};
}
