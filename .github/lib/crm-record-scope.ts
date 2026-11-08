import {and,eq,inArray,or,sql} from 'drizzle-orm';
import {records} from '@/db/schema';
import type {Access} from './access-policy';
import {crmProfile} from './access-policy';
// Use with every Drizzle CRM record lookup. Never use a browser supplied user ID.
export function crmRecordScope(access:Access){
 const company=inArray(records.company,access.companies);
 if(crmProfile(access)==='sales_rep')return and(company,or(sql`${records.type} NOT IN ('deal','task','quote')`,eq(sql<string>`json_extract(${records.payload}, '$.crmOwnerId')`,access.id)));
 if(crmProfile(access)==='field_ops')return and(company,or(sql`${records.type} <> 'task'`,eq(sql<string>`json_extract(${records.payload}, '$.crmOwnerId')`,access.id)));
 return company;
}
