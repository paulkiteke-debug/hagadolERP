import CRMImportPreviewPanel from '../../app/crm-import-preview';
// Local browser QA only. Synthetic records; no database or authentication bypass.
import React from 'react';
import {createRoot} from 'react-dom/client';
import ERP from '../../app/erp';
import type {RecordRow, State} from '../../lib/erp-primitives';
import {day} from '../../lib/erp-primitives';
const today=day();
const date=(offset:number)=>new Date(new Date(today+'T12:00:00Z').getTime()+offset*86400000).toISOString().slice(0,10);
const record=(id:string,type:string,name:string,extra:Partial<RecordRow>={}):RecordRow=>({id,type,name,company:'Hagadol',status:type==='deal'?'New':'Open',amount:0,paid:0,credited:0,version:0,date:today,due:'',created:today+'T09:00:00Z',crm:true,owner:'Example sales lead',...extra});
const state:State={journal:[],audit:[],records:[
 record('company-h','crm_company','Example School',{role:'Prospect',email:'school@example.invalid',phone:'+256 700 000 001',location:'Kampala',biginCompanyId:'QA-COMPANY-001'}),
 record('contact-h','contact','Example Customer',{crmCompanyId:'company-h',email:'client@example.invalid',phone:'+256 700 000 002',role:'Prospect',biginContactId:'QA-CONTACT-001'}),
 record('company-w','crm_company','Example Property Company',{company:'WMK',role:'Prospect',email:'property@example.invalid',location:'Entebbe'}),
 record('contact-w','contact','Example Design Client',{company:'WMK',crmCompanyId:'company-w',role:'Prospect',email:'design@example.invalid'}),
 ...[
  ['deal-h1','School water supply','New',28000000,'Confirm customer needs',1],
  ['deal-h2','Solar pumping upgrade','Qualified',16500000,'Arrange a site visit',0],
  ['deal-h3','Borehole rehabilitation','Site assessment',9400000,'Review survey findings',-2],
  ['deal-h4','Filtration system design','Technical design',12200000,'Confirm technical scope',3],
  ['deal-h5','Community water network','Quotation',46000000,'Review the quotation',2],
  ['deal-h6','Farm irrigation enquiry','New',7800000,'Call the project contact',0],
 ].map(([id,name,stage,amount,next,due])=>record(String(id),'deal',String(name),{crmCompanyId:'company-h',contactId:'contact-h',status:String(stage),crmStage:String(stage),amount:Number(amount),nextAction:String(next),due:date(Number(due)),biginSaleId:'QA-BIGIN-'+id})),
 record('deal-w1','deal','Residential concept design',{company:'WMK',crmCompanyId:'company-w',contactId:'contact-w',crmStage:'New',amount:24000000,nextAction:'Discuss the design brief',due:today}),
 record('deal-w2','deal','Office layout proposal',{company:'WMK',crmCompanyId:'company-w',crmStage:'Qualified',status:'Qualified',amount:18000000,nextAction:'Agree project scope',due:date(2)}),
 record('task-h1','task','Confirm school site access',{due:date(-1),dealId:'deal-h1',crmCompanyId:'company-h',activityKind:'Call'}),
 record('task-h2','task','Discuss the pumping requirements',{due:today,dealId:'deal-h2',crmCompanyId:'company-h',activityKind:'Meeting'}),
 record('task-h3','task','Review the technical proposal',{due:date(2),dealId:'deal-h4',activityKind:'Task'}),
 record('task-w1','task','Gather the customer design brief',{company:'WMK',due:today,dealId:'deal-w1',activityKind:'Meeting'}),
]};
createRoot(document.getElementById('root')!).render(location.search.includes('import-test')?<CRMImportPreviewPanel company="Hagadol" records={[]} canImport/>:<ERP initial={{view:'CRM',company:'Hagadol',tab:'Pipeline',sample:true,state}}/>);
