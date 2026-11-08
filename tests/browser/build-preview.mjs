// A local test harness for the real ERP components. Never copied into app/ routes.
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(process.env.CRM_PREVIEW_OUTPUT||'/tmp/hagadol-crm-browser-preview');
await mkdir(out,{recursive:true});
await build({entryPoints:['tests/browser/crm-fixture.tsx'],bundle:true,splitting:true,format:'esm',outdir:out,platform:'browser',target:'es2022',jsx:'automatic',tsconfig:'tsconfig.json',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'warning'});
const global=await postcss([tailwindcss()]).process(await readFile('app/globals.css','utf8'),{from:resolve('app/globals.css')});
await writeFile(out+'/style.css',global.css+'\n'+await readFile('app/workspace-layout.css','utf8')+'\n'+await readFile('app/crm-design.css','utf8'));
await cp('public/brand',out+'/brand',{recursive:true});
await writeFile(out+'/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hagadol CRM · Local synthetic QA</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/crm-fixture.js"></script></body></html>');
console.log('Synthetic browser fixture built: '+out);
