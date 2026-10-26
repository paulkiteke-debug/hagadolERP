import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import ts from 'typescript';
// React server rendering only. No DOM, browser or network is simulated.
export async function resolve(specifier,context,nextResolve){
  if(specifier==='@/components/ui/dialog')return {url:pathToFileURL(path.resolve('tests/dialog-qa.tsx')).href,shortCircuit:true};
  let file=specifier.startsWith('@/')?path.resolve(specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier):null;
  if(file){for(const ext of ['', '.ts','.tsx','.mjs','.js'])if(fs.existsSync(file+ext)&&fs.statSync(file+ext).isFile())return {url:pathToFileURL(file+ext).href,shortCircuit:true};}
  return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
  if(/\.(ts|tsx)$/.test(url)){return {format:'module',source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};}
  return nextLoad(url,context);
}
