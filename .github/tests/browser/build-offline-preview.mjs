// Builds a self contained review file using the real components and synthetic fixture.
// No preview code or authentication bypass is added to the Next.js app routes.
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const out=resolve(process.env.CRM_OFFLINE_PREVIEW_OUTPUT||'/tmp/Hagadol_CRM_Design_Preview.html');
const bundle=await build({entryPoints:['tests/browser/crm-fixture.tsx'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',tsconfig:'tsconfig.json',minify:true,define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},logLevel:'warning'});
let js=bundle.outputFiles[0].text;
const global=await postcss([tailwindcss()]).process(await readFile('app/globals.css','utf8'),{from:resolve('app/globals.css')});
let css=global.css+'\n'+await readFile('app/workspace-layout.css','utf8')+'\n'+await readFile('app/crm-design.css','utf8');
for(const [name,mime] of [['hagadol-logo.png','image/png'],['hagadol-logo-white.png','image/png'],['tahoma.ttf','font/ttf']]){
 const data='data:'+mime+';base64,'+(await readFile('public/brand/'+name)).toString('base64');
 js=js.replaceAll('/brand/'+name,data);css=css.replaceAll('/brand/'+name,data);
}
// Offline review stays in Sample mode. Hiding live/login actions applies only
// to this generated review file, never to the deployed ERP.
css+='\n.workspacebanner>button,.livemenu .liveoptions,.sidebaridentity+.profile a,.mobilemenu a[href="/logout"]{display:none!important;}';
js=js.replace(/<\/script/gi,'<\\/script');
await mkdir(dirname(out),{recursive:true});
await writeFile(out,'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hagadol CRM design preview · example records only</title><style>'+css+'</style></head><body><div id="root"></div><script>'+js+'</script></body></html>');
console.log('Offline CRM design preview built: '+out);
