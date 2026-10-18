import {createClient} from '@libsql/client';import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
if(!process.argv.includes('--confirm-copied-database'))throw Error('Run only on the migrated database copy with --confirm-copied-database. It clears old login provider IDs; roles and email permissions are retained.');
if(!process.env.DATABASE_URL||!process.env.ERP_OWNER_EMAIL)throw Error('Configure the copied database and ERP_OWNER_EMAIL.');
const db=createClient({url:process.env.DATABASE_URL,authToken:process.env.DATABASE_AUTH_TOKEN});
try{const owners=await db.execute({sql:"SELECT email FROM access_users WHERE role='Owner'",args:[]});if(owners.rows.length!==1||String(owners.rows[0].email).toLowerCase()!==process.env.ERP_OWNER_EMAIL.trim().toLowerCase())throw Error('The copied owner does not match the configured owner.');await db.execute('UPDATE access_users SET user_id=NULL');console.log('Previous login identities cleared. Existing email, role and company rules retained.');}finally{db.close()}
