import {S3Client,HeadObjectCommand,GetObjectCommand,PutObjectCommand,type S3ClientConfig} from '@aws-sdk/client-s3';
import type {ObjectStore,StoredObject} from './storage-types';
let client:S3Client|undefined;
function config(){const bucket=process.env.S3_BUCKET?.trim();if(!bucket)throw new Error('S3_BUCKET is required for file storage.');if(!client){const endpoint=process.env.S3_ENDPOINT; if(endpoint&&process.env.VERCEL&&new URL(endpoint).protocol!=='https:')throw new Error('Storage endpoint must use HTTPS.');const c:S3ClientConfig={region:process.env.S3_REGION||'us-east-1',...(endpoint?{endpoint}:{}),forcePathStyle:process.env.S3_FORCE_PATH_STYLE==='true'};if(process.env.S3_ACCESS_KEY_ID&&process.env.S3_SECRET_ACCESS_KEY)c.credentials={accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY};client=new S3Client(c);}return {client,bucket};}
function status(e:unknown){return (e as {$metadata?:{httpStatusCode?:number}})?.$metadata?.httpStatusCode;}
function metadata(r:{ContentLength?:number;ETag?:string;Metadata?:Record<string,string>}):StoredObject{return {size:r.ContentLength||0,etag:r.ETag,customMetadata:r.Metadata||{}}}
export function createObjectStore(resolve:()=>{client:Pick<S3Client,'send'>;bucket:string}=config):ObjectStore{return {
 async put(key,data,options={}){const {client,bucket}=resolve();if(options.onlyIf&&options.onlyIf.etagDoesNotMatch!=='*')throw new Error('Only create if absent writes are supported.');try{const r=await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:data,ContentLength:data.length,ContentType:options.httpMetadata?.contentType,Metadata:options.customMetadata,...(options.onlyIf?{IfNoneMatch:'*'}:{})}));return {size:data.length,etag:r.ETag,customMetadata:options.customMetadata||{}}}catch(e){if(status(e)===412)return null;throw e}},
 async head(key){const {client,bucket}=resolve();try{return metadata(await client.send(new HeadObjectCommand({Bucket:bucket,Key:key})))}catch(e){if(status(e)===404)return null;throw e}},
 async get(key){const {client,bucket}=resolve();try{const r=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));if(!r.Body)return null;return {...metadata(r),body:r.Body.transformToWebStream() as ReadableStream<Uint8Array>}}catch(e){if(status(e)===404)return null;throw e}},
};}
export const objectStore=createObjectStore();
