import {planPace} from './finance-planning';
import {cashAccounts,consolidation,historicalDocuments,ledgerBalance,outstanding,day} from './erp-primitives';
import type {State,RecordRow as R,JournalRow} from './erp-primitives';
export const financeTabs=['Overview','Customers','Suppliers','Invoices','Bills','Expenses','Payments','Budget','Cash flow','Ageing'];
export function documentStatus(r:R,today=day()){
 if(r.status!=='Posted'||!['invoice','bill'].includes(r.type))return r.status;
 if(!outstanding(r))return 'Paid';
 if(r.due&&r.due<today)return r.paid>0?'Overdue · part paid':'Overdue';
 return r.paid>0?'Part paid':'Open';
}
export function financeSnapshot(state:State,company:string,cutoff=day()){
 const records=state.records.filter(r=>company==='Group'||r.company===company),journal=state.journal.filter(j=>(company==='Group'||j.company===company)&&j.date<=cutoff);
 const historical=historicalDocuments(records,journal,cutoff),docs=historical.filter(r=>['invoice','bill'].includes(r.type)&&outstanding(r)>0),cons=consolidation(historical),balances=ledgerBalance(journal);
 const total=(type:string,late=false)=>docs.filter(r=>r.type===type&&(!late||r.due&&r.due<cutoff)).reduce((s,r)=>s+outstanding(r),0);
 const month=cutoff.slice(0,7)+'-01',flows=cashMovements(journal,month,cutoff);
 return {records,journal,historical,docs,balances,cons,receivables:(balances['Accounts receivable']||0)-(company==='Group'?cons.remaining:0),payables:-(balances['Accounts payable']||0)-(company==='Group'?cons.remaining:0),overdueReceivables:total('invoice',true),overduePayables:total('bill',true),cash:cashAccounts.reduce((s,k)=>s+(balances[k]||0),0),flows,inflow:flows.reduce((s,r)=>s+r.inflow,0),outflow:flows.reduce((s,r)=>s+r.outflow,0)};
}
export function cashMovements(journal:JournalRow[],from:string,to:string){
 const grouped=new Map<string,{id:string;company:string;date:string;description:string;net:number}>();
 for(const j of journal.filter(j=>cashAccounts.includes(j.account)&&j.date>=from&&j.date<=to)){const key=j.company+'|'+j.source;const row=grouped.get(key)||{id:key,company:j.company,date:j.date,description:j.description,net:0};row.net+=j.debit-j.credit;grouped.set(key,row);}
 return [...grouped.values()].filter(r=>r.net!==0).map(r=>({...r,inflow:Math.max(0,r.net),outflow:Math.max(0,-r.net)})).sort((a,b)=>b.date.localeCompare(a.date));
}
export const ageBands=['Not due','1 to 30 days','31 to 60 days','61 to 90 days','Over 90 days','No due date'];
export function ageing(records:R[],type:string,cutoff:string){return records.filter(r=>r.type===type&&outstanding(r)>0).map(r=>{const days=r.due?Math.floor((Date.parse(cutoff+'T00:00:00Z')-Date.parse(r.due+'T00:00:00Z'))/86400000):null;return {...r,balance:outstanding(r),daysLate:days===null?'':Math.max(0,days),ageBand:days===null?'No due date':days<=0?'Not due':days<=30?'1 to 30 days':days<=60?'31 to 60 days':days<=90?'61 to 90 days':'Over 90 days'} as R & {balance:number;daysLate:number|string;ageBand:string};});}
export function partyDocuments(records:R[],party:R,type:string){return records.filter(r=>r.company===party.company&&r.type===type&&r.partyId===party.id);}
export function financeParties(records:R[],role:string){
 const type=role==='Supplier'?'bill':'invoice',linked=new Set(records.filter(r=>r.type===type&&r.partyId).map(r=>r.company+'|'+r.partyId));
 return records.filter(r=>['crm_company','contact'].includes(r.type)&&(r.role===role||linked.has(r.company+'|'+r.id)));
}

// Plans carry targets only. Actuals always come from dated ledger entries.
export function planningPeriods(records:R[],company:string,type:string){
 const plans=records.filter(r=>r.type===type&&r.status!=='Archived'&&(company==='Group'||r.company===company));
 const keys=[...new Set(plans.map(r=>r.periodStart+'|'+r.periodEnd))];
 return keys.map(id=>{const list=plans.filter(r=>r.periodStart+'|'+r.periodEnd===id),required=company==='Group'?['Hagadol','WMK']:[company];return {id,start:list[0].periodStart as string,end:list[0].periodEnd as string,plans:list,missing:required.filter(c=>!list.some(r=>r.company===c))};}).sort((a,b)=>b.start.localeCompare(a.start));
}
export function planningActuals(state:State,company:string,start:string,end:string,asAt:string){
 const cutoff=asAt<end?asAt:end,records=state.records.filter(r=>company==='Group'||r.company===company),all=state.journal.filter(j=>(company==='Group'||j.company===company)&&j.date<=cutoff),period=all.filter(j=>j.date>=start),balances=ledgerBalance(period);
 const cons=consolidation(historicalDocuments(records,all,cutoff)),sources=new Set(cons.matched.flatMap(p=>[p.invoice.id,p.bill.id,...records.filter(r=>r.type==='credit'&&r.target===p.invoice.id).map(r=>r.id)]));
 const elimination=company==='Group'?period.filter(j=>sources.has(j.source.replace('reversal/',''))&&j.account==='Intercompany revenue').reduce((s,j)=>s+j.credit-j.debit,0):0;
 const revenue=-(balances['Sales revenue']||0)-(balances['Intercompany revenue']||0)-elimination,cost=(balances['Operating expenses']||0)+(balances['Intercompany expenses']||0)+(balances['Interest expenses']||0)-elimination;
 const flows=cashMovements(all,start,cutoff),flowSources=new Map(records.map(r=>[r.id,r]));
 // Both sides of a matched internal settlement leave Group's cash unchanged.
 const internalTargets=new Set(cons.matched.flatMap(p=>[p.invoice.id,p.bill.id])),internal=flows.filter(f=>internalTargets.has(flowSources.get(f.id.slice(f.id.indexOf('|')+1).replace('reversal/',''))?.target));
 const cashElimination=company==='Group'?cons.matched.reduce((total,p)=>{const flows=internal.filter(f=>[p.invoice.id,p.bill.id].includes(flowSources.get(f.id.slice(f.id.indexOf('|')+1).replace('reversal/',''))?.target));return total+Math.min(flows.reduce((s,f)=>s+f.inflow,0),flows.reduce((s,f)=>s+f.outflow,0));},0):0;
 const inflow=flows.reduce((s,f)=>s+f.inflow,0)-cashElimination,outflow=flows.reduce((s,f)=>s+f.outflow,0)-cashElimination;
 const previousDay=new Date(Date.parse(start+'T00:00:00Z')-86400000).toISOString().slice(0,10),openingCutoff=previousDay<cutoff?previousDay:cutoff,openingBalances=ledgerBalance(all.filter(j=>j.date<=openingCutoff)),closingBalances=ledgerBalance(all);
 const opening=cashAccounts.reduce((s,k)=>s+(openingBalances[k]||0),0),closing=cashAccounts.reduce((s,k)=>s+(closingBalances[k]||0),0);
 const snapshot=financeSnapshot(state,company,cutoff),eliminations=new Map<string,number>();
 if(company==='Group')for(const pair of snapshot.cons.matched){const remaining=Math.min(outstanding(pair.invoice),outstanding(pair.bill));eliminations.set(pair.invoice.id,remaining);eliminations.set(pair.bill.id,remaining);}
 const upcoming=snapshot.docs.map(r=>({...r,forecastAmount:outstanding(r)-(eliminations.get(r.id)||0)} as R & {forecastAmount:number})).filter(r=>r.forecastAmount>0&&(!r.due||r.due<=end));
 const scheduled=upcoming.filter(r=>r.due),unscheduled=upcoming.filter(r=>!r.due),forecastActive=asAt<end,receipts=forecastActive?scheduled.filter(r=>r.type==='invoice').reduce((s,r)=>s+r.forecastAmount,0):0,payments=forecastActive?scheduled.filter(r=>r.type==='bill').reduce((s,r)=>s+r.forecastAmount,0):0;
 return {revenue,cost,profit:revenue-cost,inflow,outflow,netCash:inflow-outflow,opening,closing,flows,cutoff,upcoming:scheduled,unscheduled,receipts,payments,projectedCash:closing+receipts-payments,cons};
}

export function planningProgress(state:State,company:string,period:ReturnType<typeof planningPeriods>[number],type:string,asAt:string):PlanningProgress{
 const actual=planningActuals(state,company,period.start,period.end,asAt),pace=planPace(period.start,period.end,asAt);
 const sum=(key:string)=>period.plans.reduce((s,r)=>s+(Number(r[key])||0),0),expected=(n:number)=>Math.round(n*pace.fraction);
 const checks=type==='budget'?[{label:'Revenue',actual:actual.revenue,target:sum('revenueTarget'),expected:expected(sum('revenueTarget')),direction:'At least'}, {label:'Operating costs',actual:actual.cost,target:sum('costLimit'),expected:expected(sum('costLimit')),direction:'At most'}]:[{label:'Cash in',actual:actual.inflow,target:sum('inflowTarget'),expected:expected(sum('inflowTarget')),direction:'At least'}, {label:'Cash out',actual:actual.outflow,target:sum('outflowLimit'),expected:expected(sum('outflowLimit')),direction:'At most'}, {label:'Cash balance',actual:actual.closing,target:sum('minimumCash'),expected:sum('minimumCash'),direction:'At least'}, {label:'Projected cash',actual:actual.projectedCash,target:sum('minimumCash'),expected:sum('minimumCash'),direction:'At least'}];
 const rows=checks.map(r=>({...r,variance:r.direction==='At least'?r.actual-r.expected:r.expected-r.actual,status:!pace.started?'Not started':(r.direction==='At least'?r.actual>=r.expected:r.actual<=r.expected)?'On track':'Off track'}));
 const business=company==='Group'?period.plans.map(p=>({company:p.company,...planningProgress(state,p.company,{...period,plans:[p],missing:[]},type,asAt)})):[];
 const status=period.missing.length?'Incomplete':!pace.started?'Not started':rows.some(r=>r.status==='Off track')||business.some(r=>r.status==='Off track')?'Off track':'On track';
 return {actual,pace,rows,status,business,plannedProfit:sum('revenueTarget')-sum('costLimit'),plannedNetCash:sum('inflowTarget')-sum('outflowLimit'),minimumCash:sum('minimumCash')};
}

export type PlanningProgress={actual:ReturnType<typeof planningActuals>;pace:ReturnType<typeof planPace>;rows:{label:string;actual:number;target:number;expected:number;direction:string;variance:number;status:string}[];status:string;business:({company:string}&PlanningProgress)[];plannedProfit:number;plannedNetCash:number;minimumCash:number};
