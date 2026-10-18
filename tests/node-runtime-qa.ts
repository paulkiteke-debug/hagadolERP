import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {readdir,readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3';
import {createSQLDatabase,getSQLClient} from '../lib/sql-database';
import {createObjectStore} from '../lib/object-store';
import {env} from '../lib/runtime';
let checks=0;
function check(value:unknown,label:string){assert.ok(value,label);checks++;}
const client=createClient({url:':memory:'});
const db=createSQLDatabase(()=>client);
try {
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const text=await readFile('drizzle/'+file,'utf8');
  await client.batch(text.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean),'write');
 }
 check((await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.length>=10,'All ERP migrations run with libSQL');
 await db.prepare('CREATE TABLE adapter_test(id INTEGER PRIMARY KEY, value TEXT UNIQUE, enabled INTEGER)').run();
 const inserted=await db.prepare('INSERT INTO adapter_test(value,enabled) VALUES (?,?)').bind('first',true).run();
 check(inserted.success&&inserted.meta.changes===1&&inserted.meta.last_row_id==='1','Write metadata stays JSON serialisable');
 check((await db.prepare('SELECT value,enabled FROM adapter_test').first<{value:string;enabled:number}>())?.enabled===1,'Rows map by SQL column name');
 check(await db.prepare('SELECT count(*) AS n FROM adapter_test').first<number>('n')===1,'Scalar first supports count columns');
 check(await db.prepare('SELECT * FROM adapter_test WHERE id=?').bind(999).first()===null,'Missing row returns null');
 await assert.rejects(db.batch([
  db.prepare('INSERT INTO adapter_test(value,enabled) VALUES (?,?)').bind('must rollback',1),
  db.prepare('INSERT INTO adapter_test(value,enabled) VALUES (?,?)').bind('first',0)
 ]));checks++;
 check(await db.prepare('SELECT count(*) AS n FROM adapter_test').first<number>('n')===1,'Failed batch rolls back every statement');
 const batch=await db.batch([db.prepare('INSERT INTO adapter_test(value,enabled) VALUES (?,?)').bind('second',false),db.prepare('SELECT count(*) AS n FROM adapter_test')]);
 check(batch[1].results[0].n===2,'Atomic batches return reads and committed writes');
 assert.throws(()=>db.prepare('SELECT ?').bind(undefined));checks++;
 await assert.rejects(db.batch([createSQLDatabase(()=>client).prepare('SELECT 1')]));checks++;
 check(await db.prepare("SELECT json_extract(?, '$.company') AS company").bind('{"company":"Hagadol"}').first<string>('company')==='Hagadol','Existing JSON SQL works');
 check(!!env.DB&&!!env.BUCKET,'Provider imports remain lazy');
 const oldURL=process.env.DATABASE_URL,oldVercel=process.env.VERCEL;
 try{
  delete process.env.DATABASE_URL;
  assert.throws(()=>getSQLClient(),/DATABASE_URL/);checks++;
  process.env.DATABASE_URL='file:/tmp/forbidden-erp-test.sqlite';process.env.VERCEL='1';
  assert.throws(()=>getSQLClient(),/persistent remote SQL/);checks++;
 }finally{if(oldURL===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=oldURL;if(oldVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=oldVercel;}
 const calls:unknown[]=[];let failure:number|undefined;
 const fake={send:async(command:unknown)=>{calls.push(command);if(failure)throw {$metadata:{httpStatusCode:failure}};if(command instanceof GetObjectCommand)return {ContentLength:3,Metadata:{sha256:'abc'},Body:{transformToWebStream:()=>new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3]));c.close()}})}};return {ETag:'etag',ContentLength:3,Metadata:{sha256:'abc'}};}};
 const store=createObjectStore(()=>({bucket:'private-test',client:fake as unknown as Pick<S3Client,'send'>}));
 await store.put('file',new Uint8Array([1,2,3]),{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{sha256:'abc'},httpMetadata:{contentType:'text/csv'}});
 const put=calls[0] as PutObjectCommand;
 check(put instanceof PutObjectCommand&&put.input.IfNoneMatch==='*'&&put.input.Metadata?.sha256==='abc','Uploads preserve create if absent and checksum metadata');
 check((await store.head('file'))?.size===3&&calls[1] instanceof HeadObjectCommand,'Head returns immutable object size');
 const object=await store.get('file');check(object?.customMetadata?.sha256==='abc'&&(await new Response(object.body).arrayBuffer()).byteLength===3,'Downloads expose a Web stream');
 failure=412;check(await store.put('file',new Uint8Array())===null,'Precondition conflict is retryable');
 failure=404;check(await store.head('missing')===null&&await store.get('missing')===null,'Missing objects return null');
 failure=403;await assert.rejects(store.head('private'));checks++;
 await assert.rejects(store.put('file',new Uint8Array(),{onlyIf:{etagDoesNotMatch:'other'}}));checks++;
 const temp=await mkdtemp(join(tmpdir(),'erp-migration-'));
 try{
  const run=()=>spawnSync(process.execPath,['scripts/migrate.mjs'],{env:{...process.env,DATABASE_URL:'file:'+join(temp,'test.sqlite'),DATABASE_AUTH_TOKEN:''},encoding:'utf8'});
  const first=run(),second=run();check(first.status===0,first.stderr);check(second.status===0&&second.stdout.trim()==='','Migration runner is idempotent');
 }finally{await rm(temp,{recursive:true,force:true})}
 console.log(JSON.stringify({passed:checks,failed:0,sql:'real libSQL',objectStorage:'mocked S3 transport',liveProductionTouched:false}));
}finally{client.close()}
