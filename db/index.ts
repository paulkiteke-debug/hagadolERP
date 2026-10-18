import {drizzle} from 'drizzle-orm/libsql';
import {getSQLClient} from '@/lib/sql-database';
import * as schema from './schema';
export function getDb(){return drizzle(getSQLClient(),{schema})}
