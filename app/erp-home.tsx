'use client';
import React from 'react';
import type {State,RecordRow as R} from '@/lib/erp-primitives';
import {day,outstanding} from '@/lib/erp-primitives';
import {financeSnapshot,planningPeriods,planningProgress} from '@/lib/finance';
import {periodBounds} from '@/lib/hagadol-os';
const fmt=(n:number)=>new Intl.NumberFormat('en-UG',{maximumFractionDigits:0}).format(n||0);
export function homeAttention(records:R[],company:string,today:string){
 const end=new Date(Date.parse(today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 return records.filter(r=>(company==='Group'||r.company===company)&&r.date<=today&&r.due&&r.due<=end).filter(r=>
  r.type==='task'&&!['Done','Completed'].includes(r.status)||
  ['invoice','bill'].includes(r.type)&&outstanding(r)>0||
  r.type==='bid'&&!['Submitted','Won','Lost'].includes(r.status)||
  r.type==='project'&&!['Completed','On hold'].includes(r.status)
 ).sort((a,b)=>a.due.localeCompare(b.due)||a.name.localeCompare(b.name));
}
export default function Home({state,company,go,onDetail}:{state:State;company:string;go:(view:string,tab?:string)=>void;onDetail:(r:R)=>void}){
 const today=day(),snapshot=financeSnapshot(state,company,today),rs=snapshot.records,quarter=periodBounds('Quarter',today),attention=homeAttention(rs,company,today),pipeline=rs.filter(r=>r.type==='deal'&&!['Won','Lost'].includes(r.status)),rocks=rs.filter(r=>r.type==='rock'&&r.periodStart<=quarter.end&&r.date>=quarter.start),meeting=rs.find(r=>r.type==='eos_meeting'&&r.status==='In progress');
 const plans=['budget','cash_plan'].map(type=>{const period=planningPeriods(rs,company,type).find(p=>p.start<=today&&p.end>=today);return {type,label:type==='budget'?'Budget':'Cash flow',status:period?planningProgress(state,company,period,type,today).status:'No current plan'};});
 return <div className="homeworkspace"><div className="homeheadline"><p>{new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Kampala',weekday:'long',day:'numeric',month:'long'}).format(new Date())}</p><div><button className="primary" onClick={()=>go('CRM','Pipeline')}>Open CRM</button><button className="secondary" onClick={()=>go('EOS','L10 meetings')}>{meeting?'Resume L10 meeting':'Open L10 meetings'}</button></div></div>
 <section className="homestats" aria-label="Business at a glance">{[
  ['Cash available',snapshot.cash,'Finance','Overview'],['Customers owe',snapshot.receivables,'Finance','Invoices'],['Suppliers owed',snapshot.payables,'Finance','Bills'],['Open pipeline',pipeline.reduce((s,r)=>s+r.amount,0),'CRM','Pipeline']
 ].map(([label,value,view,tab])=><button key={String(label)} onClick={()=>go(String(view),String(tab))}><span>{label}</span><strong>{fmt(Number(value))}</strong><small>UGX</small></button>)}</section>
 <div className="homeplans">{plans.map(p=><button key={p.type} onClick={()=>go('Finance',p.label)}><strong>{p.label}</strong><span>{p.status}</span><span aria-hidden="true">→</span></button>)}</div>
 <div className="homecolumns"><section className="homesection"><header><div><h2>Needs attention</h2><p>Overdue and due within seven days</p></div><span className="homecount">{attention.length}</span></header><div className="homeworklist">{attention.slice(0,8).map(r=><button key={r.id} onClick={()=>onDetail(r)}><div><strong>{r.name}</strong><span>{r.company} · {r.type==='task'?(r.eos?'EOS To do':'Follow up'):r.type==='invoice'?'Customer invoice':r.type==='bill'?'Supplier bill':r.type==='bid'?'Bid deadline':'Project delivery'}{r.owner?' · '+r.owner:''}</span></div><time dateTime={r.due}>{r.due<today?'Overdue':r.due===today?'Today':r.due}</time></button>)}{!attention.length&&<p className="homeempty">Nothing overdue or due this week.</p>}</div>{attention.length>8&&<p className="homehint">Showing the first eight. Open the relevant module for the full list.</p>}</section>
 <section className="homesection"><header><div><h2>Quarterly Rocks</h2><p>{quarter.label}</p></div><button className="textbutton" onClick={()=>go('EOS','Rocks')}>View all</button></header><div className="homerocks">{rocks.slice(0,5).map(r=><button key={r.id} onClick={()=>onDetail(r)}><strong>{r.name}</strong><span>{r.owner||'Owner required'} · {r.company}</span><div><span>{r.status}</span><small>Due {r.due||r.date}</small></div></button>)}{!rocks.length&&<p className="homeempty">No Rocks recorded for this quarter.</p>}</div></section></div>
 <details className="quiethelp"><summary>About these figures</summary><p>Cash and customer and supplier balances come from posted accounts through today. Group balances remove matched internal transactions. Pipeline values are current open opportunities. Budget and cash flow status follow the recorded plans.</p><button className="textbutton" onClick={()=>go('Reports')}>Open financial reports</button></details></div>;
}
