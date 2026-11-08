'use client';
import React,{useState} from 'react';
import {RecordRow,day} from '@/lib/erp-primitives';
export default function ContentCalendar({records,onOpen}:{records:RecordRow[];onOpen:(r:RecordRow)=>void}){
 const [month,setMonth]=useState(day().slice(0,7));
 const first=new Date(month+'-01T00:00:00Z');const count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();const offset=(first.getUTCDay()+6)%7;
 return <section className="contentcalendar"><div className="sectiontoolbar"><label>Planning month<input aria-label="Content planning month" type="month" value={month} onChange={e=>e.target.value&&setMonth(e.target.value)}/></label><p className="footnote">Plan posts by date. Publishing to social accounts awaits connection.</p></div><div className="calendargrid">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><strong className="calendarweekday" key={d}>{d}</strong>)}{Array.from({length:offset},(_,i)=><div className="calendarblank" aria-hidden="true" key={'blank'+i}/>)}{Array.from({length:count},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0');return <section className="calendarday" key={date} aria-label={date}><time dateTime={date}>{i+1}</time>{records.filter(r=>r.date===date).map(r=><button key={r.id} onClick={()=>onOpen(r)}><small>{r.company} · {r.source} · {r.status}</small><strong>{r.name}</strong></button>)}</section>})}</div></section>;
}
