import {ESLint} from 'eslint';
import {readFile} from 'node:fs/promises';
import {relative} from 'node:path';
import {createHash} from 'node:crypto';

// Existing debt remains visible through npm run lint. This gate rejects every
// new error, including a new occurrence of an existing rule on a different line.
const baseline=JSON.parse(await readFile(new URL('../tests/lint-baseline.json',import.meta.url),'utf8'));
const allowed=new Map(Object.entries(baseline.errors));
const results=await new ESLint().lintFiles(['.']);
const failures=[];
let existing=0,warnings=0;
for(const result of results){
 const lines=(result.source??await readFile(result.filePath,'utf8')).split(/\r?\n/);
 for(const message of result.messages){
  if(message.severity!==2){warnings++;continue;}
  const excerpt=lines.slice(message.line-1,(message.endLine??message.line)).join('\n');
  const key=[relative(process.cwd(),result.filePath).replaceAll('\\','/'),message.ruleId??'parse',message.message,createHash('sha256').update(excerpt).digest('hex')].join('|');
  const remaining=allowed.get(key)??0;
  if(remaining>0){allowed.set(key,remaining-1);existing++;}
  else failures.push({...message,filePath:result.filePath});
 }
}
for(const failure of failures)console.error(`${failure.filePath}:${failure.line}:${failure.column} ${failure.message} (${failure.ruleId??'parse'})`);
console.log(`Lint: ${failures.length} new errors; ${existing} existing errors; ${warnings} warnings. Strict lint: npm run lint.`);
if(failures.length)process.exitCode=1;
