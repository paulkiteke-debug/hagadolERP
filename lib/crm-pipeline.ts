import type {RecordRow} from './erp-primitives';
import {crmStage} from './crm';

export type PipelineChoice = {id:string; company:string; name:string; count:number};
export type PipelineSort = 'Recent'|'Value'|'Follow up';

export function pipelineKey(record:RecordRow):string {
  return JSON.stringify([record.company, String(record.biginPipeline||''), String(record.biginSubPipeline||'')]);
}

export function pipelineChoices(records:RecordRow[]):PipelineChoice[] {
  const choices=new Map<string,PipelineChoice>();
  for(const record of records){
    if(record.type!=='deal')continue;
    const id=pipelineKey(record), prior=choices.get(id);
    if(prior){prior.count++;continue;}
    const source=[record.biginPipeline,record.biginSubPipeline].filter(Boolean).map(String);
    choices.set(id,{id,company:record.company,name:source.join(' / ')||(record.company==='WMK'?'WMK projects':'Hagadol sales'),count:1});
  }
  return [...choices.values()].sort((a,b)=>a.company.localeCompare(b.company)||a.name.localeCompare(b.name));
}

export function pipelineRows(records:RecordRow[],choice:string,sort:PipelineSort):RecordRow[]{
  return records.filter(record=>!choice||pipelineKey(record)===choice).slice().sort((a,b)=>{
    if(sort==='Value')return b.amount-a.amount||a.id.localeCompare(b.id);
    if(sort==='Follow up')return String(a.due||'9999-12-31').localeCompare(String(b.due||'9999-12-31'))||a.id.localeCompare(b.id);
    return String(b.biginCreatedTime||b.date||'').localeCompare(String(a.biginCreatedTime||a.date||''))||a.id.localeCompare(b.id);
  });
}

export function pipelineStageTotals(records:RecordRow[],stage:string){
  const rows=records.filter(record=>crmStage(record)===stage);
  return {rows,count:rows.length,total:rows.reduce((sum,record)=>sum+record.amount,0)};
}
