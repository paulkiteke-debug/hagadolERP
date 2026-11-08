import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {pipelineChoices,pipelineKey,pipelineRows,pipelineStageTotals} from '../lib/crm-pipeline.ts';
import PipelineBoard from '../app/crm-pipeline-board.tsx';

let passed=0;
const check=(condition,message)=>{assert.ok(condition,message);passed++;};
const deal=(id,company,amount,extra={})=>({id,type:'deal',name:'Example deal '+id,company,amount,date:'2026-10-24',status:'New',version:1,...extra});
const rows=[
  deal('h1','Hagadol',120000,{biginPipeline:'Hagadol Sales',biginSubPipeline:'Sales Pipeline',due:'2026-10-25'}),
  deal('h2','Hagadol',300000,{biginPipeline:'Hagadol Sales',biginSubPipeline:'Sales Pipeline',status:'Qualified',due:'2026-10-26'}),
  deal('w1','WMK',200000,{biginPipeline:'Hagadol Sales',biginSubPipeline:'Sales Pipeline'}),
  deal('h3','Hagadol',50000,{date:'2026-10-23'}),
  deal('w2','WMK',700000,{date:'2026-10-22'}),
];
const snapshot=JSON.stringify(rows),choices=pipelineChoices(rows);
check(choices.length===4,'Imported and native pipelines stay distinct');
check(choices.reduce((sum,choice)=>sum+choice.count,0)===rows.length,'Every deal belongs to exactly one pipeline');
check(pipelineKey(rows[0])===pipelineKey(rows[1]),'Same company and source pipeline share a group');
check(pipelineKey(rows[0])!==pipelineKey(rows[2]),'Identical source names cannot merge businesses');
check(pipelineChoices([...rows,{...rows[0],id:'contact',type:'contact'}]).reduce((sum,choice)=>sum+choice.count,0)===5,'Directory records do not inflate pipeline totals');
check(pipelineRows(rows,pipelineKey(rows[0]),'Value').map(row=>row.id).join(',')==='h2,h1','Pipeline selection and descending value ordering');
check(pipelineRows(rows,'','Value')[0].id==='w2','All pipelines value ordering');
check(pipelineRows(rows,'','Follow up').map(row=>row.id).join(',')==='h1,h2,h3,w1,w2','Undated follow ups follow dated ones with stable ties');
check(pipelineRows(rows,'','Recent').map(row=>row.id).join(',')==='h1,h2,w1,h3,w2','Newest dates first with stable ties');
check(pipelineRows(rows,'missing','Value').length===0,'An unknown selector never widens a data scope');
check(pipelineStageTotals(rows,'New').total===1070000,'Stage total matches its source deals');
check(pipelineStageTotals(rows,'New').count===4,'Stage count matches its source deals');
check(pipelineStageTotals(rows,'Qualified').total===300000,'Qualified total remains separate');
check(pipelineStageTotals(rows,'Lost').total===0,'Empty stage has zero total');
check(JSON.stringify(rows)===snapshot,'Sorting and grouping do not mutate stored records');
const props={records:rows.filter(row=>row.company==='Hagadol'),stages:['New','Qualified','Won','Lost'],busy:false,customer:()=> 'Example customer',onOpen:()=>{},onActivity:()=>{},onCreate:()=>{},onMove:async()=>false};
const html=renderToStaticMarkup(React.createElement(PipelineBoard,props));
for(const label of ['crmcolumncards','Move Example deal h1 to stage','Add activity','crmcolumnadd']){
  check(html.includes(label),'Board retains '+label);
}
check(html.includes('UGX 170,000'),'Hagadol New header shows only Hagadol total');
check(!html.includes('Example deal w1')&&!html.includes('Example deal w2'),'Board respects supplied company scope');
check(html.includes('role="region"')&&html.includes('tabindex="0"'),'Stage scrolling regions are keyboard reachable');
check(html.includes('draggable="true"'),'Unlocked cards support native dragging');
const locked=renderToStaticMarkup(React.createElement(PipelineBoard,{...props,busy:true}));
check(!locked.includes('draggable="true"'),'Saving locks drag actions');
check(locked.includes('aria-busy="true"'),'Saving state is exposed');
console.log(JSON.stringify({passed,failed:0,fixture:'synthetic',browserInteractionsTested:false,liveProductionTouched:false}));
