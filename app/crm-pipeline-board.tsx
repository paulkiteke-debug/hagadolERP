'use client';
import {useState} from 'react';
import {CalendarDays, Plus, ArrowUpRight} from 'lucide-react';
import type {RecordRow} from '@/lib/erp-primitives';
import {day} from '@/lib/erp-primitives';
import {dealStages} from '@/lib/company-profiles';
import {crmStage} from '@/lib/crm';
import {pipelineStageTotals} from '@/lib/crm-pipeline';

type Props = {records: RecordRow[]; stages: string[]; busy: boolean; customer: (record: RecordRow) => string; onOpen: (id: string) => void; onActivity: (record: RecordRow) => void; onCreate: () => void; onMove: (record: RecordRow, stage: string) => Promise<unknown>};
const money = (amount: number) => new Intl.NumberFormat('en-UG', {maximumFractionDigits: 0}).format(amount || 0);
const shortDate = (date: string) => {const value=new Date(date+'T12:00:00Z');return date&&Number.isFinite(value.getTime())?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(value):'No follow up';};

export default function PipelineBoard({records, stages, busy, customer, onOpen, onActivity, onCreate, onMove}: Props) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const locked = busy || moving !== null;
  async function move(record: RecordRow, stage: string) {
    if (locked || stage === crmStage(record) || !dealStages(record.company).includes(stage)) return;
    setMoving(record.id);
    try {await onMove(record, stage);} finally {setMoving(null); setDragged(null); setOver(null);}
  }
  return <div className="kanban crmboard crm-board-v2" role="region" aria-label="Sales pipeline stages. Scroll horizontally to see more stages." tabIndex={0} aria-busy={locked}>
    {stages.map((stage, index) => {
      const {rows, count, total} = pipelineStageTotals(records, stage);
      const candidate = records.find(record => record.id === dragged);
      const canDrop = !!candidate && !locked && dealStages(candidate.company).includes(stage) && crmStage(candidate) !== stage;
      return <section className={'kanbancol' + (over === stage && canDrop ? ' crmdroptarget' : '')} key={stage} aria-label={stage + ' stage'} onDragOver={e => {if (canDrop) {e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(stage);}}} onDragLeave={e => {if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);}} onDrop={e => {e.preventDefault(); if (canDrop && candidate) void move(candidate, stage); setOver(null);}}>
        <header className="crmcolumnhead"><div className="crm-stage-title"><span className="crm-stage-step" aria-hidden="true">{index + 1}</span><h2>{stage}</h2><span className="crm-stage-count" aria-label={count + ' deals'}>{count}</span></div><p className="kanbantotal">UGX {money(total)}</p></header>
        <div className="crmcolumncards" tabIndex={0} role="region" aria-label={stage + ' deals'}>
          {rows.map(record => {
            const overdue = !!record.due && record.due < day() && !['Won', 'Lost'].includes(crmStage(record));
            return <article className="crmdeal" key={record.id} draggable={!locked} onDragStart={e => {if (locked) {e.preventDefault(); return;} e.dataTransfer.setData('text/plain', record.id); e.dataTransfer.effectAllowed = 'move'; setDragged(record.id);}} onDragEnd={() => {setDragged(null); setOver(null);}}>
              <button type="button" className="dealcard" onClick={() => onOpen(record.id)}>
                <span className="crm-card-meta"><span title={record.biginSaleId || ''}>{record.biginSaleId ? 'Bigin · ' + record.biginSaleId.slice(-8) : record.company}</span><ArrowUpRight size={14} aria-hidden="true"/></span>
                <h3>{record.name}</h3><p className="crmcardcustomer">{customer(record) || 'Customer not linked'}</p>
                <div className="crm-card-value"><strong>UGX {money(record.amount)}</strong><span className="crm-card-owner" title={record.owner || 'Unassigned'} aria-label={'Owner: ' + (record.owner || 'Unassigned')}>{(record.owner || '?').split(/\s+/).slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}</span></div>
                <p className="crmcardnext">{record.nextAction || 'Add a next action'}</p>
                <span className={'crm-card-date' + (overdue ? ' crmoverdue' : '')}><CalendarDays size={13} aria-hidden="true"/><time dateTime={record.due || undefined}>{overdue ? 'Overdue · ' : ''}{shortDate(record.due)}</time></span>
                {record.importReviewFlags?.length > 0 && <span className="crm-card-review">Needs import review</span>}
              </button>
              <div className="crm-card-bottom"><label><span className="sr-only">Move {record.name} to stage</span><select aria-label={'Move ' + record.name + ' to stage'} disabled={locked} value={crmStage(record)} onChange={e => void move(record, e.target.value)}>{dealStages(record.company).map(value => <option key={value}>{value}</option>)}</select></label><button type="button" disabled={locked} aria-label={'Add activity for ' + record.name} onClick={() => onActivity(record)}><Plus size={14} aria-hidden="true"/>Activity</button></div>
              {moving === record.id && <span className="crmmovestatus" role="status">Saving stage…</span>}
            </article>;
          })}
          {!rows.length && <p className="kanbanempty">No deals yet</p>}
        </div>
        <button type="button" className="crmcolumnadd" disabled={locked} onClick={onCreate}><Plus size={14} aria-hidden="true"/>Deal</button>
      </section>;
    })}
  </div>;
}
