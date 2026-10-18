import React from 'react';
import {renderToReadableStream} from 'react-dom/server';
import fs from 'node:fs';
import ERP from '../app/erp.tsx';
import {sampleState} from '../lib/erp-sample.ts';
let passed=0;const check=(v,label)=>{if(!v)throw Error(label);passed++};
const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function shellChildren(html){
 const stack=[],children=[];
 for(const token of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)){
  const tag=token[1].toLowerCase(),closing=token[0].startsWith('</');
  if(closing){if(!voids.has(tag))stack.pop();continue;}
  const cls=(token[0].match(/\bclass="([^"]*)"/)||[])[1]||'';
  if(stack.at(-1)?.cls.split(' ').includes('erpShell'))children.push({tag,cls});
  if(!voids.has(tag)&&!token[0].endsWith('/>'))stack.push({tag,cls});
 }
 return children;
}
const sample=sampleState();
for(const company of ['Group','Hagadol','WMK'])for(const view of ['Executive','CRM','Finance','EOS','Projects','Marketing','Settings']){
 const stream=await renderToReadableStream(React.createElement(ERP,{initial:{sample:true,state:sample,company,view}}));await stream.allReady;
 const html=await new Response(stream).text(),children=shellChildren(html);
 check(children.length===3,'Only skip link, sidebar and workspace are shell children: '+view+' '+JSON.stringify(children));
 check(children[0].tag==='a'&&children[0].cls==='skiplink','Skip link remains accessible');
 check(children[1].tag==='aside'&&children[1].cls==='erpSidebar','Navigation is first in flow');
 check(children[2].tag==='div'&&children[2].cls==='workspace','Workspace is second in flow');
 check(html.indexOf('aria-label="Notifications')>html.indexOf('<div class="workspace">'),'Notification live region is contained within workspace');
}
const css=fs.readFileSync('app/globals.css','utf8');
check(css.includes('grid-template-areas:"navigation workspace"'),'Desktop grid explicitly names its two columns');
check(css.includes('grid-area:navigation')&&css.includes('grid-area:workspace'),'Sidebar and workspace are explicitly positioned');
check(css.includes('grid-template-areas:"workspace"'),'Small screens use a single workspace column');
console.log(JSON.stringify({passed,failed:0,renderedCases:21,browserTested:false}));
