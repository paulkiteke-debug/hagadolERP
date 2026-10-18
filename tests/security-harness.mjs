import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
// Real route and policy code; only the hosted identity and D1 transport are fixtures.
export function securityHarness(temp,envKey='__erpDB',userKey='__erpUser'){
 const built=new Map();
 function compile(file){
  const absolute=path.resolve(file);if(built.has(absolute))return built.get(absolute);
  const output=path.join(temp,'security-'+built.size+'.mjs');built.set(absolute,output);
  let src=absolute.endsWith('/app/chatgpt-auth.ts')?`export async function getChatGPTUser(){return globalThis.${userKey};}`:fs.readFileSync(absolute,'utf8');
  src=src.replace(/import\s*\{\s*env\s*\}\s*from\s*['"]@\/lib\/runtime['"];?/g,`const env=globalThis.${envKey};`);
  let js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  js=js.replace(/from (['"])([^'"]+)\1/g,(whole,q,spec)=>{
   if(!spec.startsWith('.')&&!spec.startsWith('@/'))return whole;
   let target=spec.startsWith('@/')?path.resolve(spec.slice(2)):path.resolve(path.dirname(absolute),spec);
   if(!fs.existsSync(target))target+='.ts';
   return 'from '+JSON.stringify(compile(target));
  });fs.writeFileSync(output,js);return output;
 }
 return {compile};
}
