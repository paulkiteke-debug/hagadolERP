'use client';
import {useState} from 'react';
import type {RecordRow} from '@/lib/erp-primitives';
import {day} from '@/lib/erp-primitives';
import {dealStages} from '@/lib/company-profiles';
import {crmStage} from '@/lib/crm';
import {pipelineStageTotals} from '@/lib/crm-pipeline';

type Props={records:RecordRow[]; stages:string[]; busy:boolean; customer:(record:RecordRow)=>string; onOpen:(id:string)=>void; onActivity:(record:RecordRow)=>void; onCreate:()=>void; onMove:(record:RecordRow,stage:string)=>Promise<unknown>};
const money=(amount:number)=>new Intl.NumberFormat('en-UG',{maximumFractionDigits:0}).format(amount||0);

export default function PipelineBoard({records,stages,busy,customer,onOpen,onActivity,onCreate,onMove}:Props){
  const [dragged,setDragged]=useState<string|null>(null),[over,setOver]=useState<string|null>(null),[moving,setMoving]=useState<string|null>(null);
  const locked=busy||moving!==null;
  async function move(record:RecordRow,stage:string){
    if(locked||stage===crmStage(record)||!dealStages(record.company).includes(stage))return;
    setMoving(record.id);
    try{await onMove(record,stage);}finally{setMoving(null);setDragged(null);setOver(null);}
  }
  return <div className="kanban crmboard crmboardcompact" role="region" aria-label="Sales pipeline stages. Scroll horizontally to see more stages." tabIndex={0} aria-busy={locked}>
    {stages.map(stage=>{
      const {rows,count,total}=pipelineStageTotals(records,stage);
      const candidate=records.find(record=>record.id===dragged);
      const canDrop=!!candidate&&!locked&&dealStages(candidate.company).includes(stage)&&crmStage(candidate)!==stage;
      return <section className={'kanbancol'+(over===stage&&canDrop?' crmdroptarget':'')} key={stage} aria-label={stage+' stage'} onDragOver={event=>{if(canDrop){event.preventDefault();event.dataTransfer.dropEffect='move';setOver(stage)}}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOver(null)}} onDrop={event=>{event.preventDefault();if(canDrop&&candidate)void move(candidate,stage);setOver(null)}}>
        <header className="crmcolumnhead"><div><h3>{stage}</h3><p className="kanbantotal">UGX {money(total)} <span>· {count} {count===1?'deal':'deals'}</span></p></div></header>
        <div className="crmcolumncards" tabIndex={0} role="region" aria-label={stage+' deals'}>
          {rows.map(record=>{
            const overdue=!!record.due&&record.due<day()&&!['Won','Lost'].includes(crmStage(record));
            return <article className="crmdeal" key={record.id} draggable={!locked} onDragStart={event=>{if(locked){event.preventDefault();return;}event.dataTransfer.setData('text/plain',record.id);event.dataTransfer.effectAllowed='move';setDragged(record.id)}} onDragEnd={()=>{setDragged(null);setOver(null)}}>
              <button type="button" className="dealcard" disabled={locked} onClick={()=>onOpen(record.id)}>
                <h3 title={record.name}>{record.name}</h3>
                <p className="crmcardcustomer" title={customer(record)}>{customer(record)||'Customer not linked'}</p>
                <div className="crmcardnumbers"><strong title={'UGX '+money(record.amount)}>UGX {money(record.amount)}</strong><time className={overdue?'crmoverdue':''} dateTime={record.due||undefined}>{overdue?'Overdue · ':''}{record.due||'No follow up'}</time></div>
                <p className="crmcardnext">{record.nextAction||'Add a next action'}</p><small>{record.company} · {record.owner||'Unassigned'}{record.importReviewFlags?.length?' · Needs review':''}</small>
              </button>
              <details className="crmcardmenu"><summary aria-label={'Actions for '+record.name}>Actions</summary><div>
                <button type="button" disabled={locked} onClick={event=>{onActivity(record);event.currentTarget.closest('details')?.removeAttribute('open')}}>Add activity</button>
                <label>Move to stage<select aria-label={'Move '+record.name+' to stage'} disabled={locked} value={crmStage(record)} onChange={event=>{void move(record,event.target.value);event.currentTarget.closest('details')?.removeAttribute('open')}}>{dealStages(record.company).map(value=><option key={value}>{value}</option>)}</select></label>
              </div></details>
              {moving===record.id&&<span className="crmmovestatus" role="status">Saving stage…</span>}
            </article>;
          })}
          {!rows.length&&<p className="kanbanempty">No deals in this stage</p>}
        </div>
        <button type="button" className="crmcolumnadd" disabled={locked} onClick={onCreate}>+ Deal</button>
      </section>;
    })}
  </div>;
}
