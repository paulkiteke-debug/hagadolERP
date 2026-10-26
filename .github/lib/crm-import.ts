import {AccessError,fingerprint} from './security';
import {dealStages} from './company-profiles';
export type BiginRow={source:Record<string,string>;duplicateSourceIds:string[]};
const sid=(v:string)=>/^zcrm_\d{10,30}$/.test(v);
export function biginSourceKey(kind:string){return ({Companies:'Company Id',Pipelines:'Sale Id',Tasks:'Task Id',StageHistory:'Stage History Id'} as Record<string,string>)[kind]||'Contact Id';}
export function biginRecordType(kind:string){return ({Companies:'crm_company',Pipelines:'deal',Tasks:'task',StageHistory:'deal'} as Record<string,string>)[kind]||'contact';}
export function biginRow(v:any,kind='Contacts'):BiginRow{
 const key=biginSourceKey(kind);
 if(!v||!v.source||typeof v.source!=='object'||Array.isArray(v.source)||Object.keys(v.source).length>100||Object.entries(v.source).some(([k,x])=>k.length>100||typeof x!=='string'||x.length>10000)||!sid(v.source[key]||''))throw new AccessError('Check the Bigin contact source fields.',400);
 if(!Array.isArray(v.duplicateSourceIds)||v.duplicateSourceIds.length>100||v.duplicateSourceIds.some((x:any)=>typeof x!=='string'||!sid(x)||x===v.source[key]))throw new AccessError('Check possible duplicate source IDs.',400);
 return {source:{...v.source},duplicateSourceIds:[...new Set(v.duplicateSourceIds)] as string[]};
}
export function crmImportSpec(v:any){
 if(!v||!['Hagadol','WMK'].includes(v.company)||!/^[a-f0-9]{64}$/.test(v.sourceHash)||!/^[a-f0-9]{64}$/.test(v.manifestHash)||typeof v.filename!=='string'||!/^[A-Za-z0-9_ ()]+\.zip$/.test(v.filename)||v.filename.length>200||!Number.isInteger(v.expectedRows)||v.expectedRows<1||v.expectedRows>10000)throw new AccessError('Check the Bigin import details.',400);
 if(v.kind!==undefined&&!['Contacts','Companies','Pipelines','Tasks','StageHistory'].includes(v.kind))throw new AccessError('Choose contacts, companies or pipelines.',400);
 return {kind:v.kind||'Contacts',recordType:biginRecordType(v.kind),sourceKey:biginSourceKey(v.kind),id:'ci_'+v.company+'_'+v.sourceHash,company:v.company,sourceHash:v.sourceHash,manifestHash:v.manifestHash,filename:v.filename,expectedRows:v.expectedRows};
}
export function biginContactId(company:string,id:string){return 'bigin_'+company+'_'+id.slice(5);}
export function phoneKey(v:string){let d=String(v||'').replace(/\D/g,'');if(d.startsWith('00256'))d=d.slice(2);if(d.length===10&&/^(07|03)/.test(d))d='256'+d.slice(1);if(d.length===9&&/^[73]/.test(d))d='256'+d;return d;}
export function matchesContact(r:any,s:Record<string,string>){
 if(s.Email?.trim()&&String(r.email||'').trim().toLowerCase()===s.Email.trim().toLowerCase())return true;
 const phones=[s.Mobile,s.Phone,s['Home Phone']].map(phoneKey).filter(x=>x.length>=7);
 return [r.phone,r.mobile,r.officePhone,r.homePhone].map(phoneKey).some(x=>x.length>=7&&phones.includes(x));
}
export function mapBiginContact(row:BiginRow,company:string,existing:any[]){
 const s=row.source,t=(key:string)=>String(s[key]||'').trim(),unit=t('Business Unit');
 if(unit&&unit.toLowerCase()!==company.toLowerCase())throw new AccessError('The source Business Unit conflicts with this import company.',400);
 const id=biginContactId(company,t('Contact Id')),name=t('Contact Name')||[t('First Name'),t('Last Name')].filter(Boolean).join(' ');
 if(!name||name.length>500)throw new AccessError('A Bigin contact needs a valid name.',400);
 const email=t('Email');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AccessError('Review the source email before importing this contact.',400);
 for(const k of ['Email Opt Out','Do Not WhatsApp'])if(!['true','false',''].includes(t(k).toLowerCase()))throw new AccessError('Review the contact preference flags.',400);
 const date=t('Created Time').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new AccessError('Review the Bigin creation date.',400);
 const lead=t('Lead Source'),source=/whatsapp/i.test(lead)?'WhatsApp':/referral/i.test(lead)?'Referral':lead||'Not recorded';
 const peers=existing.filter(r=>r.id!==id&&r.type==='contact'&&r.company===company&&!r.biginContactId&&matchesContact(r,s)).map(r=>r.id);
 const flags=[];if(row.duplicateSourceIds.length||peers.length)flags.push('Possible duplicate. Contacts retained separately.');if(![email,t('Mobile'),t('Phone'),t('Home Phone')].some(Boolean))flags.push('No email or telephone recorded.');
 const account=existing.find(r=>r.type==='crm_company'&&r.company===company&&r.biginCompanyId&&r.biginCompanyId===t('Company Name.id'));
 return {action:'create',type:'contact',requestId:id,company,crm:true,name,owner:t('Contact Owner'),email,phone:t('Mobile')||t('Phone')||t('Home Phone'),mobile:t('Mobile'),officePhone:t('Phone'),homePhone:t('Home Phone'),customer:t('Company Name')||t('Organization'),crmCompanyId:account?.id||'',source,role:'Unclassified',notes:t('Description'),date,
  jobTitle:t('Job Title'),contactTitle:t('Title'),firstName:t('First Name'),lastName:t('Last Name'),organization:t('Organization'),billingAddress:['Mailing Street','Mailing City','Mailing State','Mailing Country','Mailing Zip'].map(t).filter(Boolean).join(', '),preferredChannel:t('Preferred Channel'),district:t('District / Town'),customerType:t('Customer Type'),persona:t('Persona'),emailOptOut:t('Email Opt Out').toLowerCase()==='true',doNotWhatsApp:t('Do Not WhatsApp').toLowerCase()==='true',
  biginContactId:t('Contact Id'),biginCompanyId:t('Company Name.id'),biginCompanyName:t('Company Name'),biginOwnerId:t('Contact Owner.id'),biginLeadSource:lead,biginTags:t('Tag'),biginCreatedTime:t('Created Time'),biginModifiedTime:t('Modified Time'),biginLastActivityTime:t('Last Activity Time'),biginBusinessUnit:unit,biginDuplicateSourceIds:row.duplicateSourceIds,existingDuplicateContactIds:peers,importReviewFlags:flags};
}
export async function crmRowManifest(rows:{source_id:string;row_hash:string}[]){return fingerprint(rows.map(r=>[r.source_id,r.row_hash]).sort((a,b)=>a[0].localeCompare(b[0])));}

export function biginCompanyId(company:string,id:string){return 'bigin_company_'+company+'_'+id.slice(5);}
export function mapBiginCompany(row:BiginRow,company:string){
 const s=row.source,t=(k:string)=>String(s[k]||'').trim(),name=t('Company Name'),unit=t('Business Unit');
 if(unit&&unit.toLowerCase()!==company.toLowerCase())throw new AccessError('The source Business Unit conflicts with this import company.',400);
 if(!name||name.length>500)throw new AccessError('A Bigin company needs a valid name.',400);
 const date=t('Created Time').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new AccessError('Review the Bigin creation date.',400);
 const flags:string[]=[];let email=t('Email'),website=t('Website');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){email='';flags.push('Email needs review. Original retained in source export.');}
 if(website){if(!/^https?:\/\//i.test(website))website='https://'+website;try{const u=new URL(website);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname.includes('.'))throw Error();}catch{website='';flags.push('Website needs review. Original retained in source export.');}}
 if(row.duplicateSourceIds.length)flags.push('Possible duplicate. Companies retained separately.');
 if(/^(name of school|school|unknown|none|n\/a)$/i.test(name))flags.push('Company name needs confirmation.');
 return {action:'create',type:'crm_company',requestId:biginCompanyId(company,t('Company Id')),company,crm:true,name,owner:t('Company Owner'),role:'Unclassified',email,phone:t('Phone'),website,source:t('Lead Source')||'Not recorded',notes:t('Description'),date,location:t('District')||t('Address')||t('Billing City'),billingAddress:['Billing Street','Billing City','Billing State','Billing Country','Billing Code'].map(t).filter(Boolean).join(', ')||t('Address'),customerType:t('Company Type'),biginCompanyId:t('Company Id'),biginOwnerId:t('Company Owner.id'),biginTags:t('Tag'),biginCreatedTime:t('Created Time'),biginModifiedTime:t('Modified Time'),biginLastActivityTime:t('Last Activity Time'),biginBusinessUnit:unit,biginDuplicateSourceIds:row.duplicateSourceIds,importReviewFlags:flags};
}

export function biginSaleId(company:string,id:string){return 'bigin_sale_'+company+'_'+id.slice(5);}
export function mapBiginSale(row:BiginRow,company:string,existing:any[]){
 const t=(k:string)=>String(row.source[k]||'').trim();
 if(t('Pipeline')!==company+' Sales'||t('Business Unit')&&t('Business Unit').toLowerCase()!==company.toLowerCase())throw new AccessError('Review the source pipeline company.',400);
 const validDate=(value:string,optional=false)=>{const s=value.slice(0,10);if(optional&&!s)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new AccessError('Review the Bigin opportunity date.',400);return s;};
 const money=(k:string)=>{const value=t(k);if(!value)return undefined;const n=Number(value);if(!/^\d+$/.test(value)||!Number.isSafeInteger(n)||n<0||n>1e12)throw new AccessError('Review the source '+k+'.',400);return n;};
 const stage=t('Stage'),crmStage=stage==='PENDING DEPOSIT'?'Pending deposit':stage;
 if(!dealStages(company).includes(crmStage))throw new AccessError('Review the source opportunity stage.',400);
 const account=existing.find(r=>r.type==='crm_company'&&r.company===company&&r.biginCompanyId===t('Company Name.id')),contact=existing.find(r=>r.type==='contact'&&r.company===company&&r.biginContactId===t('Contact Name.id'));
 if(t('Company Name.id')&&!account||t('Contact Name.id')&&!contact)throw new AccessError('Import the source company and contact before this opportunity.',409);
 if(account&&contact?.crmCompanyId&&contact.crmCompanyId!==account.id)throw new AccessError('Review the source contact and company links.',409);
 if(!t('Sale Name')||t('Sale Name').length>500||!t('Sale Owner'))throw new AccessError('An opportunity needs its source name and owner.',400);
 if(!['true','false',''].includes(t('Site Visit Required').toLowerCase()))throw new AccessError('Review the source site visit flag.',400);
 const amount=money('Amount'),quoteValue=money('Quote Value'),flags:string[]=[];
 if(amount===undefined)flags.push('Opportunity amount not recorded.');if(quoteValue!==undefined&&quoteValue!==amount)flags.push('Quote value differs from opportunity amount. Both source values retained.');if(row.duplicateSourceIds.length)flags.push('Possible duplicate. Opportunities retained separately.');
 return {action:'create',type:'deal',requestId:biginSaleId(company,t('Sale Id')),company,crm:true,name:t('Sale Name'),owner:t('Sale Owner'),customer:account?.name||t('Company Name')||contact?.name||t('Contact Name'),contactId:contact?.id||'',crmCompanyId:account?.id||'',amount:amount??0,crmStage,date:validDate(t('Created Time')),closingDate:validDate(t('Closing Date'),true),due:validDate(t('Next Action Date'),true),nextAction:t('Recommended Solution'),notes:t('Need Summary'),lostReason:t('Lost Reason'),source:'Bigin',
 servicesNeeded:t('Services Needed'),customerType:t('Customer Type'),siteLocation:t('District / Town'),firstContactDate:validDate(t('First Contact Date'),true),contactOutcome:t('Contact Outcome'),nextActionTime:t('Next Action Date'),siteVisitRequired:t('Site Visit Required').toLowerCase()==='true',siteVisitDate:t('Site Visit Date'),recommendedSolution:t('Recommended Solution'),quoteValue,quoteSentDate:validDate(t('Quote Sent Date'),true),sourceInvoiceNumber:t('Invoice Number'),sourceDepositAmount:money('Deposit Amount'),sourceDepositDate:validDate(t('Deposit Date'),true),sourceReceiptNumber:t('Receipt Number'),
 biginSaleId:t('Sale Id'),biginPipelineId:t('Pipeline.id'),biginPipeline:t('Pipeline'),biginSubPipeline:t('Sub-Pipeline'),biginStage:stage,biginContactId:t('Contact Name.id'),biginCompanyId:t('Company Name.id'),biginOwnerId:t('Sale Owner.id'),biginTags:t('Tag'),biginCreatedTime:t('Created Time'),biginModifiedTime:t('Modified Time'),biginLastActivityTime:t('Last Activity Time'),biginDuplicateSourceIds:row.duplicateSourceIds,importReviewFlags:flags};
}

export function biginDate(value:string,optional=false){const s=value.slice(0,10);if(optional&&!s)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new AccessError('Review the Bigin date.',400);return s;}
export function mapBiginTask(row:BiginRow,company:string,records:any[]){
 const t=(k:string)=>String(row.source[k]||'').trim(),contact=records.find(r=>r.type==='contact'&&r.company===company&&r.biginContactId===t('Contact Name.id'));
 if(t('Contact Name.id')&&!contact)throw new AccessError('Import this task contact first.',409);
 const related=t('Related To.id'),deal=records.find(r=>r.type==='deal'&&r.company===company&&r.biginSaleId===related),account=records.find(r=>r.type==='crm_company'&&r.company===company&&r.biginCompanyId===related),crmStatus=({'Not Started':'Open','In Progress':'In progress','Completed':'Done'} as Record<string,string>)[t('Status')];
 if(!crmStatus||!t('Subject')||t('Subject').length>500||!t('Task Owner'))throw new AccessError('Review the task subject, owner and status.',400);
 if(!['Normal','High','Low',''].includes(t('Priority')))throw new AccessError('Review the task priority.',400);
 const flags:string[]=[];if(related&&!deal&&!account)flags.push('Related Bigin record not present in supplied exports. Original reference retained.');if(row.duplicateSourceIds.length)flags.push('Possible duplicate. Tasks retained separately.');
 if(deal&&contact&&deal.contactId&&deal.contactId!==contact.id||account&&contact?.crmCompanyId&&contact.crmCompanyId!==account.id)throw new AccessError('Review the task contact and related record.',409);
 const closedDate=biginDate(t('Closed Time'),true);if(crmStatus==='Done'&&!closedDate)throw new AccessError('Review the original task completion date.',400);
 return {action:'create',type:'task',requestId:'bigin_task_'+company+'_'+t('Task Id').slice(5),company,crm:true,eos:false,name:t('Subject'),owner:t('Task Owner'),activityKind:'Task',crmStatus,date:biginDate(t('Created Time')),due:biginDate(t('Due Date')),notes:t('Description'),contactId:contact?.id||'',dealId:deal?.id||'',crmCompanyId:account?.id||deal?.crmCompanyId||contact?.crmCompanyId||'',customer:account?.name||deal?.customer||t('Related To')||t('Contact Name'),priority:t('Priority')||'Normal',biginTaskId:t('Task Id'),biginStatus:t('Status'),biginRelatedId:related,biginRelatedName:t('Related To'),biginContactId:t('Contact Name.id'),biginOwnerId:t('Task Owner.id'),biginTags:t('Tag'),biginRepeat:t('Repeat'),biginReminder:t('Reminder'),biginClosedTime:t('Closed Time'),biginCreatedTime:t('Created Time'),biginModifiedTime:t('Modified Time'),biginDuplicateSourceIds:row.duplicateSourceIds,importReviewFlags:flags};
}
export function mapBiginStageHistory(row:BiginRow,company:string,records:any[]){
 const t=(k:string)=>String(row.source[k]||'').trim(),deal=records.find(r=>r.type==='deal'&&r.company===company&&r.biginSaleId===t('Sale Name.id'));
 if(!deal)throw new AccessError('Import this history opportunity first.',409);if(!t('Stage'))throw new AccessError('A stage history entry needs its source stage.',400);
 const amount=t('Amount');if(amount&&(!/^\d+$/.test(amount)||!Number.isSafeInteger(Number(amount))||Number(amount)>1e12))throw new AccessError('Review the historical opportunity value.',400);
 const duration=t('Stage Duration (Calendar Days)');if(duration&&(!/^\d+$/.test(duration)||!Number.isSafeInteger(Number(duration))))throw new AccessError('Review the historical stage duration.',400);
 biginDate(t('Modified Time'));biginDate(t('Closing Date'),true);biginDate(t('Last Activity Time'),true);
 return {id:t('Stage History Id'),dealId:deal.id,stage:t('Stage'),movedTo:t('Moved To'),modifiedTime:t('Modified Time'),lastActivityTime:t('Last Activity Time'),modifiedBy:t('Modified By'),amount:amount?Number(amount):undefined,closingDate:t('Closing Date'),durationDays:duration?Number(duration):undefined};
}
export function attachBiginStageHistory(records:any[],rows:{record_id:string;source_payload:string}[]){
 const byId=new Map(records.map(r=>[r.id,r]));for(const row of rows){const record=byId.get(row.record_id);if(!record||record.type!=='deal')continue;const source=JSON.parse(row.source_payload),entry=mapBiginStageHistory(biginRow(source,'StageHistory'),record.company,[record]);if(!record.biginStageHistory)record.biginStageHistory=[];record.biginStageHistory.push(entry);}
 return records;
}
