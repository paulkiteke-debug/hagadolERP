// Run with: node --env-file=.env.crm-preview.local scripts/migrate-crm-preview.mjs
// A production URL is rejected before the migration runner is imported.
if(process.env.DATABASE_URL?.startsWith('libsql://hagadolerpcrmtest-')!==true){
 throw Error('Stopped: this command only accepts the Hagadol CRM test database.');
}
await import('./migrate.mjs');
