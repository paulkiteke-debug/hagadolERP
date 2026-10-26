import {createSQLDatabase} from './sql-database';
import {objectStore} from './object-store';
import type {SQLDatabase,ObjectStore} from './storage-types';
export type RuntimeConfig={DB:SQLDatabase;BUCKET:ObjectStore;[name:string]:unknown};
const database=createSQLDatabase();
// Providers are lazy: importing a route at build time never opens a database or bucket.
export const env=new Proxy({} as RuntimeConfig,{get(_target,key){if(key==='DB')return database;if(key==='BUCKET')return objectStore;return typeof key==='string'?process.env[key]:undefined}});
