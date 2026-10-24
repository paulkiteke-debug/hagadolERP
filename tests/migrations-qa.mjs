import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createClient} from '@libsql/client';

const temporary=await mkdtemp(join(tmpdir(),'hagadol-migration-qa-'));
const runner=resolve('scripts/migrate.mjs');
const url='file:'+join(temporary,'test.sqlite');
// The child reads configuration only from this empty temporary workspace.
// No source .env files, remote URL, tokens or production records are used.
const childEnv={...process.env,DATABASE_URL:url,DATABASE_AUTH_TOKEN:'',NODE_ENV:'test'};
const run=()=>spawnSync(process.execPath,[runner],{cwd:temporary,env:childEnv,encoding:'utf8',timeout:60000});
let client,checks=0;
try{
 await mkdir(join(temporary,'drizzle'));
 await cp(resolve('drizzle'),join(temporary,'drizzle'),{recursive:true});
 const first=run();assert.equal(first.status,0,first.stderr);checks++;
 client=createClient({url});
 const applied=await client.execute('SELECT name,checksum,applied_at FROM __erp_migrations ORDER BY name');
 assert.ok(applied.rows.length>=9);checks++;
 assert.ok(applied.rows.every(row=>/^[a-f0-9]{64}$/.test(row.checksum)&&row.applied_at));checks++;
 const repeat=run();assert.equal(repeat.status,0,repeat.stderr);assert.equal(repeat.stdout.trim(),'');checks++;
 assert.deepEqual((await client.execute('SELECT name,checksum,applied_at FROM __erp_migrations ORDER BY name')).rows,applied.rows);checks++;
 const source=join(temporary,'drizzle',applied.rows[0].name);
 const original=await readFile(source,'utf8');await writeFile(source,original+'\n-- modified fixture\n');
 const tampered=run();assert.notEqual(tampered.status,0);assert.match(tampered.stderr,/Applied migration changed/);checks++;
 await writeFile(source,original);
 const failing='9999_failure.sql';
 await writeFile(join(temporary,'drizzle',failing),'CREATE TABLE migration_atomic_fixture(id INTEGER);\n--> statement-breakpoint\nINSERT INTO missing_migration_table VALUES (1);');
 assert.notEqual(run().status,0);checks++;
 assert.equal((await client.execute("SELECT name FROM sqlite_master WHERE name='migration_atomic_fixture'")).rows.length,0);checks++;
 assert.equal((await client.execute({sql:'SELECT name FROM __erp_migrations WHERE name=?',args:[failing]})).rows.length,0);checks++;
 await rm(join(temporary,'drizzle',failing));assert.equal(run().status,0);checks++;
 console.log(JSON.stringify({passed:checks,failed:0,database:'temporary local libSQL',remoteConnectivityTested:false,liveProductionTouched:false}));
}finally{client?.close();await rm(temporary,{recursive:true,force:true});}
