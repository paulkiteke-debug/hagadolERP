import {createClient} from '@libsql/client';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL before applying migrations.');
const db=createClient({url:process.env.DATABASE_URL,authToken:process.env.DATABASE_AUTH_TOKEN});
try{
 await db.execute('CREATE TABLE IF NOT EXISTS __erp_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const text=await readFile('drizzle/'+file,'utf8'),checksum=createHash('sha256').update(text).digest('hex'),prior=await db.execute({sql:'SELECT checksum FROM __erp_migrations WHERE name=?',args:[file]});
  if(prior.rows.length){if(prior.rows[0].checksum!==checksum)throw Error('Applied migration changed: '+file);continue;}
  const sql=text.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
  await db.batch([...sql,{sql:'INSERT INTO __erp_migrations (name,checksum,applied_at) VALUES (?,?,?)',args:[file,checksum,new Date().toISOString()]}],'write');console.log('Applied '+file);
 }
}finally{db.close()}
