'use client';
import type {RecordRow} from '@/lib/erp-primitives';
import {day} from '@/lib/erp-primitives';
import {crmPriorities} from '@/lib/crm-priorities';

type Props={records:RecordRow[];busy:boolean;onOpen:(id:string)=>void;onComplete:(record:RecordRow)=>Promise<unknown>};
export default function CRMPriorities({records,busy,onOpen,onComplete}:Props){
  const groups=crmPriorities(records,day());
  return <section className="crmpriorities" aria-label="Today priorities">
    <header><div><h2>Today’s priorities</h2><p>Recorded CRM activities for this business view.</p></div></header>
    <div className="crmprioritygrid">{([['Overdue',groups.overdue],['Due today',groups.today],['Upcoming',groups.upcoming]] as const).map(([title,rows])=><section key={title} aria-label={title}>
      <h3>{title}<span>{rows.length}</span></h3>
      <ul>{rows.slice(0,3).map(row=><li key={row.id}>
        <button type="button" className="crmprioritydone" disabled={busy} aria-label={'Complete '+row.name} onClick={()=>void onComplete(row)}>✓</button>
        <div><button type="button" className="rowlink" onClick={()=>onOpen(row.id)}>{row.name}</button><small>{row.company} · {row.owner||'Unassigned'} · {row.due}</small></div>
      </li>)}</ul>
      {!rows.length&&<p>No {title.toLowerCase()} activities.</p>}
      {rows.length>3&&<details><summary>{rows.length-3} more activities</summary><ul>{rows.slice(3).map(row=><li key={row.id}><button type="button" className="rowlink" onClick={()=>onOpen(row.id)}>{row.name}</button><small>{row.due} · {row.owner||'Unassigned'}</small></li>)}</ul></details>}
    </section>)}</div>
    {groups.undated.length>0&&<p role="status">{groups.undated.length} activities have no due date. Open Activities to review them.</p>}
  </section>;
}
