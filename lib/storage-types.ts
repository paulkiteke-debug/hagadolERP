/** Portable storage contracts used by ERP routes. No Workers types or runtime. */
export interface SQLResult<T=Record<string,unknown>> {results:T[];success:boolean;meta:{changes:number;last_row_id:number|string|null};}
export interface SQLStatement {
 readonly sql:string;readonly args:unknown[];
 bind(...values:unknown[]):SQLStatement;
 first<T=Record<string,unknown>>(column?:string):Promise<T|null>;
 all<T=Record<string,unknown>>():Promise<SQLResult<T>>;
 run():Promise<SQLResult>;
}
export interface SQLDatabase {prepare(sql:string):SQLStatement;batch(statements:SQLStatement[]):Promise<SQLResult[]>;}
export type StoredObject={size:number;etag?:string;customMetadata?:Record<string,string>};
export interface ObjectStore {
 put(key:string,data:Uint8Array,options?:{onlyIf?:{etagDoesNotMatch:string};httpMetadata?:{contentType?:string};customMetadata?:Record<string,string>}):Promise<StoredObject|null>;
 head(key:string):Promise<StoredObject|null>;
 get(key:string):Promise<(StoredObject&{body:ReadableStream<Uint8Array>})|null>;
}
