import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,index,uniqueIndex,check} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),company:text('company').notNull(),type:text('type').notNull(),name:text('name').notNull(),status:text('status').notNull(),amount:integer('amount').notNull().default(0),paid:integer('paid').notNull().default(0),credited:integer('credited').notNull().default(0),version:integer('version').notNull().default(0),date:text('date').notNull(),due:text('due').notNull().default(''),payload:text('payload').notNull(),documentCode:text('document_code'),created:text('created').notNull() },t=>[index('records_company_type').on(t.company,t.type),uniqueIndex('records_document_code').on(t.company,t.documentCode)]);
export const journal=sqliteTable('journal',{id:text('id').primaryKey(),company:text('company').notNull(),source:text('source').notNull(),account:text('account').notNull(),debit:integer('debit').notNull().default(0),credit:integer('credit').notNull().default(0),date:text('date').notNull(),description:text('description').notNull()},t=>[uniqueIndex('journal_source_account').on(t.source,t.account),index('journal_company_date').on(t.company,t.date)]);
export const audit=sqliteTable('audit',{id:text('id').primaryKey(),company:text('company').notNull(),actor:text('actor').notNull(),action:text('action').notNull(),record:text('record').notNull(),date:text('date').notNull()});

export const operations=sqliteTable('operations',{id:text('id').primaryKey(),company:text('company').notNull(),result:text('result').notNull(),created:text('created').notNull(),actor:text('actor'),requestHash:text('request_hash')});

export const aiRuns=sqliteTable('ai_runs',{id:text('id').primaryKey(),company:text('company').notNull(),recordId:text('record_id').notNull(),actor:text('actor').notNull(),provider:text('provider').notNull(),intent:text('intent').notNull(),status:text('status').notNull(),units:integer('units').notNull(),dayKey:text('day_key').notNull(),requestSpec:text('request_spec').notNull(),result:text('result').notNull().default(''),failure:text('failure').notNull().default(''),created:text('created').notNull()},t=>[index('ai_runs_company_day').on(t.company,t.dayKey)]);

export const accessUsers=sqliteTable('access_users',{id:text('id').primaryKey(),userId:text('user_id').unique(),email:text('email').notNull().unique(),role:text('role').notNull(),crmProfile:text('crm_profile',{enum:['sales_rep','sales_manager','field_ops']}),companies:text('companies').notNull(),enabled:integer('enabled').notNull().default(1),created:text('created').notNull(),updated:text('updated').notNull()},t=>[uniqueIndex('access_single_owner').on(t.role).where(sql`${t.role}='Owner'`),check('access_role',sql`${t.role} IN ('Owner','Administrator','Leadership','Finance','Sales','Operations','Marketing','Viewer','Office display')`),check('access_enabled',sql`${t.enabled} IN (0,1)`),check('access_crm_profile',sql`${t.crmProfile} IS NULL OR (${t.role}='Sales' AND ${t.crmProfile} IN ('sales_rep','sales_manager','field_ops'))`)]);
export const securityEvents=sqliteTable('security_events',{id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),target:text('target').notNull(),date:text('date').notNull()});
export const requestLimits=sqliteTable('request_limits',{id:text('id').primaryKey(),window:integer('window').notNull(),count:integer('count').notNull()});

export const financeImportBatches=sqliteTable('finance_import_batches',{id:text('id').primaryKey(),sourceHash:text('source_hash').notNull().unique(),filename:text('filename').notNull(),expectedRows:integer('expected_rows').notNull(),manifestHash:text('manifest_hash').notNull(),status:text('status').notNull().default('Uploading'),created:text('created').notNull(),completed:text('completed'),actor:text('actor').notNull()},t=>[check('finance_import_status',sql`${t.status} IN ('Uploading','Review')`)]);
export const financeImportRows=sqliteTable('finance_import_rows',{batchId:text('batch_id').notNull().references(()=>financeImportBatches.id),rowKey:text('row_key').notNull(),company:text('company').notNull(),sourceSheet:text('source_sheet').notNull(),sourceCell:text('source_cell').notNull(),payload:text('payload').notNull(),rowHash:text('row_hash').notNull()},t=>[uniqueIndex('finance_import_row_key').on(t.batchId,t.rowKey),uniqueIndex('finance_import_source_cell').on(t.batchId,t.sourceSheet,t.sourceCell),index('finance_import_company').on(t.batchId,t.company)]);
export const financeImportRevisions=sqliteTable('finance_import_revisions',{batchId:text('batch_id').primaryKey().references(()=>financeImportBatches.id),replacesBatchId:text('replaces_batch_id').references(()=>financeImportBatches.id),metadata:text('metadata').notNull(),created:text('created').notNull(),actor:text('actor').notNull()},t=>[uniqueIndex('finance_import_one_revision').on(t.replacesBatchId)]);
export const financeImportFiles=sqliteTable('finance_import_files',{batchId:text('batch_id').notNull().references(()=>financeImportBatches.id),filename:text('filename').notNull(),sha256:text('sha256').notNull(),bytes:integer('bytes').notNull(),objectKey:text('object_key').notNull(),created:text('created').notNull()},t=>[uniqueIndex('finance_import_file_key').on(t.batchId,t.filename)]);
export const crmImportBatches=sqliteTable('crm_import_batches',{id:text('id').primaryKey(),kind:text('kind').notNull().default('Contacts'),company:text('company').notNull(),sourceHash:text('source_hash').notNull(),filename:text('filename').notNull(),expectedRows:integer('expected_rows').notNull(),manifestHash:text('manifest_hash').notNull(),status:text('status').notNull(),archiveKey:text('archive_key').notNull().default(''),created:text('created').notNull(),completed:text('completed'),actor:text('actor').notNull()},t=>[uniqueIndex('crm_import_source_company').on(t.company,t.sourceHash),check('crm_import_status',sql`${t.status} IN ('Uploading','Complete')`)]);
export const crmImportRows=sqliteTable('crm_import_rows',{batchId:text('batch_id').notNull().references(()=>crmImportBatches.id),sourceId:text('source_id').notNull(),recordId:text('record_id').notNull().references(()=>records.id),rowHash:text('row_hash').notNull(),sourcePayload:text('source_payload').notNull()},t=>[uniqueIndex('crm_import_source_key').on(t.batchId,t.sourceId)]);

// IDs refer to customer companies, contacts and deals in the existing records
// table. The company column identifies the owning WMK or Hagadol workspace.
export const crmTimelineKinds=['Call','Email','Meeting','Note','Task Reminder'] as const;
export const crmActivities=sqliteTable('crm_activities',{
 id:text('id').primaryKey(),company:text('company').notNull(),
 crmCompanyId:text('crm_company_id').references(()=>records.id),
 contactId:text('contact_id').references(()=>records.id),
 dealId:text('deal_id').references(()=>records.id),
 kind:text('kind',{enum:crmTimelineKinds}).notNull(),
 description:text('description').notNull(),outcome:text('outcome').notNull().default(''),
 occurredAt:text('occurred_at').notNull(),createdAt:text('created_at').notNull(),
 dueAt:text('due_at'),actor:text('actor').notNull(),
},t=>[
 index('crm_activities_deal_time').on(t.company,t.dealId,t.occurredAt,t.id),
 index('crm_activities_contact_time').on(t.company,t.contactId,t.occurredAt,t.id),
 index('crm_activities_customer_time').on(t.company,t.crmCompanyId,t.occurredAt,t.id),
 check('crm_activity_company',sql`${t.company} IN ('WMK','Hagadol')`),
 check('crm_activity_kind',sql`${t.kind} IN ('Call','Email','Meeting','Note','Task Reminder')`),
 check('crm_activity_link',sql`${t.crmCompanyId} IS NOT NULL OR ${t.contactId} IS NOT NULL OR ${t.dealId} IS NOT NULL`),
 check('crm_activity_description',sql`length(trim(${t.description})) BETWEEN 1 AND 10000`),
]);

// Approval and deduplication metadata only: all balances remain in journal.
export const financeImportReviews=sqliteTable('finance_import_reviews',{
 importId:text('import_id').primaryKey().references(()=>financeImportBatches.id),
 version:integer('version').notNull().default(1),status:text('status',{enum:['Prepared','Posted']}).notNull(),
 decisions:text('decisions').notNull(),reviewHash:text('review_hash').notNull(),
 preparedBy:text('prepared_by').notNull(),preparedAt:text('prepared_at').notNull(),
 approvedBy:text('approved_by'),approvedAt:text('approved_at'),approvalNote:text('approval_note'),
 result:text('result'),
},t=>[check('finance_review_status',sql`${t.status} IN ('Prepared','Posted')`)]);
export const financeImportPostings=sqliteTable('finance_import_postings',{
 id:text('id').primaryKey(),importId:text('import_id').notNull().references(()=>financeImportBatches.id),
 rowKey:text('row_key').notNull(),company:text('company').notNull(),economicKey:text('economic_key').notNull(),
 recordId:text('record_id').notNull().references(()=>records.id),postedAt:text('posted_at').notNull(),
},t=>[uniqueIndex('finance_posting_source_row').on(t.importId,t.rowKey),uniqueIndex('finance_posting_economic_key').on(t.company,t.economicKey)]);
