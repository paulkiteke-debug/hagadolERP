import type {RecordRow} from './erp-primitives';

export const BIGIN_MAX_RECORDS = 10_000;
export const BIGIN_MAX_FILE_BYTES = 20 * 1024 * 1024;
export type CRMPreviewRow = {row: number; sourceId: string; name: string; customerCompany: string; jobTitle: string; email: string; phone: string; mobile: string; source: Record<string,string>; errors: string[]; warnings: string[]};
export type CRMImportPreview = {kind: string; rows: CRMPreviewRow[]; valid: number; needsReview: number; duplicates: number};
const normalizePhone = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00256')) digits = digits.slice(2);
  if (/^0[37]\d{8}$/.test(digits)) digits = '256' + digits.slice(1);
  if (/^[37]\d{8}$/.test(digits)) digits = '256' + digits;
  return digits.length >= 7 ? digits : '';
};

// Parse by row, including quoted commas and newlines. Never split columns into
// independent arrays or insert a sample row: both would shift customer details.
export function parseBiginPreviewCSV(text: string): Record<string,string>[] {
  if (new TextEncoder().encode(text).byteLength > BIGIN_MAX_FILE_BYTES) throw Error('Choose a CSV no larger than 20 MB.');
  const input = text.replace(/^\uFEFF/, '');
  const parsed: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {cell += '"'; i++;}
      else if (!quoted && cell.length) throw Error('Review the quotation marks in CSV row ' + (parsed.length + 1) + '.');
      else quoted = !quoted;
    } else if (c === ',' && !quoted) {row.push(cell); cell = '';}
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); if (row.some(v => v.trim())) parsed.push(row); row = []; cell = '';
    } else cell += c;
    if (parsed.length > BIGIN_MAX_RECORDS + 1) throw Error('Review at most 10,000 records per CSV.');
  }
  if (quoted) throw Error('The CSV contains an unclosed quotation mark.');
  row.push(cell); if (row.some(v => v.trim())) parsed.push(row);
  if (parsed.length < 2) throw Error('The CSV needs a header and at least one record.');
  if (parsed.length - 1 > BIGIN_MAX_RECORDS) throw Error('Review at most 10,000 records per CSV.');
  const headers = parsed.shift()!.map(v => v.trim());
  if (new Set(headers).size !== headers.length || headers.some(h => !h)) throw Error('The CSV has duplicate or blank column headings.');
  if (headers.length > 100) throw Error('Review at most 100 columns per CSV.');
  return parsed.map((values, index) => {
    if (values.length !== headers.length) throw Error('CSV row ' + (index + 2) + ' has a different number of columns. Nothing has been imported.');
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

export function reviewBiginCSV(text: string, company: string, records: RecordRow[]): CRMImportPreview {
  if (!['Hagadol','WMK'].includes(company)) throw Error('Choose Hagadol or WMK before reviewing an import.');
  const sources = parseBiginPreviewCSV(text);
  const identifiers = [['Contact Id','Contacts','contact','biginContactId'],['Company Id','Companies','crm_company','biginCompanyId'],['Sale Id','Deals','deal','biginSaleId'],['Task Id','Activities','task','biginTaskId']];
  const matched = identifiers.filter(([key]) => Object.hasOwn(sources[0], key));
  if (matched.length !== 1) throw Error('Use an original Bigin Contacts, Companies, Pipelines or Tasks CSV with its source ID column.');
  const [key, kind, recordType, storedKey] = matched[0];
  const existing = records.filter(r => r.company === company && r.type === recordType);
  const ids = new Map<string,number>(), emails = new Map<string,number>(), phones = new Map<string,number>();
  const rows: CRMPreviewRow[] = sources.map((original,index) => {
    const source = Object.fromEntries(Object.entries(original).map(([k,v])=>[k,v.trim()]));
    const sourceId = source[key] || '';
    const name = kind === 'Contacts' ? source['Contact Name'] || [source['First Name'],source['Last Name']].filter(Boolean).join(' ') : kind === 'Companies' ? source['Company Name'] : kind === 'Deals' ? source['Deal Name'] || source['Sale Name'] : source.Subject;
    const email = source.Email || '', phone = source.Phone || '', mobile = source.Mobile || '';
    const errors: string[] = [], warnings: string[] = [];
    if (!/^zcrm_\d{10,30}$/.test(sourceId)) errors.push('Missing or invalid Bigin source ID.');
    if (!name?.trim()) errors.push('Record name is missing.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Review the email address.');
    if (source['Business Unit'] && source['Business Unit'].toLowerCase() !== company.toLowerCase()) errors.push('Source Business Unit differs from ' + company + '.');
    if (!source['Business Unit']) warnings.push('Business Unit is blank in the export. Confirm assignment to ' + company + '.');
    if (existing.some(r => r[storedKey] === sourceId)) warnings.push('This source ID already exists in the ERP. Review it as an update.');
    if (kind === 'Contacts' && ![email,phone,mobile].some(Boolean)) warnings.push('No email or phone is recorded.');
    if (sourceId) ids.set(sourceId,(ids.get(sourceId)||0)+1);
    if (email) emails.set(email.toLowerCase(),(emails.get(email.toLowerCase())||0)+1);
    for (const p of new Set([phone,mobile].map(normalizePhone).filter(Boolean))) phones.set(p,(phones.get(p)||0)+1);
    return {row:index+2,sourceId,name:name||'',customerCompany:source['Company Name']||'',jobTitle:source['Job Title']||'',email,phone,mobile,source:original,errors,warnings};
  });
  let duplicates = 0;
  for (const row of rows) {
    const phoneKeys = [row.phone,row.mobile].map(normalizePhone).filter(Boolean);
    const duplicate = (ids.get(row.sourceId)||0)>1 || !!row.email && (emails.get(row.email.toLowerCase())||0)>1 || phoneKeys.some(p => (phones.get(p)||0)>1) || existing.some(r => r[storedKey] !== row.sourceId && (row.email && String(r.email||'').toLowerCase()===row.email.toLowerCase() || [r.phone,r.mobile,r.officePhone].some(p => phoneKeys.includes(normalizePhone(String(p||''))))));
    if ((ids.get(row.sourceId)||0)>1) row.errors.push('Repeated Bigin source ID in this file.');
    if (duplicate) {duplicates++; row.warnings.push('Possible duplicate. Keep records separate until reviewed.');}
  }
  return {kind,rows,valid:rows.filter(r=>!r.errors.length).length,needsReview:rows.filter(r=>r.errors.length||r.warnings.length).length,duplicates};
}
