import {createClient,type Client,type InStatement,type ResultSet,type InValue} from '@libsql/client';
import type {SQLDatabase,SQLStatement,SQLResult} from './storage-types';
let client:Client|undefined;
export function getSQLClient(){
 if(client)return client;
 const url=process.env.DATABASE_URL?.trim();
 if(!url)throw new Error('DATABASE_URL is required for database access.');
 if(process.env.VERCEL&&(!/^(libsql|https):\/\//.test(url)||!process.env.DATABASE_AUTH_TOKEN))throw new Error('Vercel requires a persistent remote SQL URL and DATABASE_AUTH_TOKEN.');
 if(!/^(file:|libsql:\/\/|https:\/\/|http:\/\/)/.test(url))throw new Error('Unsupported database URL.');
 client=createClient({url,authToken:process.env.DATABASE_AUTH_TOKEN,intMode:'number'});return client;
}
function args(values:unknown[]):InValue[]{return values.map(v=>{if(v===undefined)throw new TypeError('SQL values cannot be undefined.');if(v===null||typeof v==='string'||typeof v==='number'||typeof v==='bigint'||v instanceof Uint8Array||v instanceof ArrayBuffer)return v as InValue;if(typeof v==='boolean')return v?1:0;throw new TypeError('Unsupported SQL value.');});}
function result<T>(r:ResultSet):SQLResult<T>{return {results:r.rows.map(row=>Object.fromEntries(r.columns.map((key,i)=>[key,row[i]]))) as T[],success:true,meta:{changes:r.rowsAffected,last_row_id:r.lastInsertRowid===undefined?null:String(r.lastInsertRowid)}};}
export function createSQLDatabase(resolve:()=>Client=getSQLClient):SQLDatabase{
 class Statement implements SQLStatement {
  constructor(readonly sql:string,readonly args:unknown[]=[]){if(!sql.trim())throw new Error('SQL is required.');}
  bind(...values:unknown[]){args(values);return new Statement(this.sql,values)}
  async all<T=Record<string,unknown>>(){return result<T>(await resolve().execute({sql:this.sql,args:args(this.args)}))}
  async first<T=Record<string,unknown>>(column?:string):Promise<T|null>{const row=(await this.all<Record<string,unknown>>()).results[0];return row?(column?row[column] as T:row as T):null}
  async run(){return this.all()}
 }
 return {prepare:sql=>new Statement(sql),async batch(statements){
  if(!statements.length)return [];
  const input:InStatement[]=statements.map(s=>{if(!(s instanceof Statement))throw new TypeError('A batch must use statements from this database.');return {sql:s.sql,args:args(s.args)}});
  // libSQL executes the whole batch as one write transaction and rolls it back on error.
  return (await resolve().batch(input,'write')).map(r=>result(r));
 }};
}
