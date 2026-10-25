'use client';
import {useState} from 'react';
import {CalendarDays, ChevronRight} from 'lucide-react';
import type {RecordRow} from '@/lib/erp-primitives';
import {day} from '@/lib/erp-primitives';
import {crmPriorities} from '@/lib/crm-priorities';

type Props = {records: RecordRow[]; busy: boolean; onOpen: (id: string) => void; onComplete: (record: RecordRow) => Promise<unknown>};
export default function CRMPriorities({records, busy, onOpen, onComplete}: Props) {
  const groups = crmPriorities(records, day());
  const [expanded,setExpanded]=useState(false);
  const rowView = (row: RecordRow) => <li key={row.id}><button type="button" className="crmprioritydone" disabled={busy} aria-label={'Complete ' + row.name} onClick={() => void onComplete(row)}/><div><button type="button" className="rowlink" onClick={() => onOpen(row.id)}><span>{row.name}</span><small>{row.owner || 'Unassigned'} · {row.due}{row.company ? ' · ' + row.company : ''}</small></button></div><ChevronRight size={14} aria-hidden="true"/></li>;
  return <section className="crmpriorities crm-priorities-v2" data-expanded={expanded} aria-label="Today priorities"><header><div><h2><CalendarDays size={18} aria-hidden="true"/>Today’s priorities</h2><p>Your recorded calls, meetings and follow ups.</p></div><span className="crm-priority-date">{new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Kampala'}).format(new Date(day() + 'T12:00:00Z'))}</span></header><div className="crm-priorities-mobile-summary"><span>{groups.overdue.length} overdue · {groups.today.length} today · {groups.upcoming.length} upcoming</span><button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Hide activities':'View activities'}</button></div>
    <div className="crmprioritygrid">{([['Overdue', groups.overdue], ['Due today', groups.today], ['Upcoming', groups.upcoming]] as const).map(([title, rows]) => <section key={title} aria-label={title}>
      <h3>{title}<span>{rows.length}</span></h3><ul>{rows.slice(0, 2).map(rowView)}</ul>{!rows.length && <p className="crm-priority-empty">{title === 'Overdue' ? 'You’re all caught up.' : title === 'Due today' ? 'Nothing due today.' : 'No upcoming activities.'}</p>}{rows.length > 2 && <details><summary>{rows.length - 2} more activities</summary><ul>{rows.slice(2).map(rowView)}</ul></details>}
    </section>)}</div>{groups.undated.length > 0 && <p className="crm-undated" role="status">{groups.undated.length} activities have no due date. Open Activities & Tasks to review them.</p>}
  </section>;
}
