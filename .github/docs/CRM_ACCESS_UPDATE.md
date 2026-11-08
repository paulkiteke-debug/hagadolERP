# CRM company access and permission update

25 October 2026 · Hagadol ERP 1.3.1

## Integrated from Gemini

The existing authenticated session, access_users table, records table, finance journal and CRM design are retained. No replacement users, companies, deals or ledger tables were introduced. Customer companies remain separate from the internal Hagadol and WMK operating businesses. Group remains a consolidated view, not a company that owns deals.

The existing Sales role now has a CRM profile. Existing Sales accounts without a profile default to sales_rep. Other existing ERP roles remain available under their existing module rules.

| Profile | CRM access | Quote rights | Imports and Group |
| --- | --- | --- | --- |
| Owner / Administrator | Assigned businesses; manage CRM and assignments | Draft, edit and approve | Commit CRM imports; Group only with both businesses assigned |
| Sales manager | All CRM records within assigned businesses; assign ERP owners | Draft, edit and approve | Bigin file preview; no import commits or Group view |
| Sales rep | Shared company directory; own deals and assigned tasks | Own draft quotes; no approvals or invoice conversion | No CRM import or Group access |
| Field operations | Company deals and directory for reference; complete assigned tasks | Read quotes | No record creation, deal stage changes, imports or Group |

The existing Finance role retains accounting permissions and can approve quotes within its assigned businesses. Only the workspace Owner can provision real user accounts and change access.

## Server and database enforcement

Every request resolves membership from the authenticated Google session and the current database access record. A browser supplied userId is discarded; it never selects the acting account. Account disabling, profile changes and company revocation take effect on the next request.

Company predicates are applied to database reads. Sales rep ownership predicates are applied to ERP record queries and Drizzle CRM lookups. The unified customer history excludes activities attached to another rep's deal. Mutations check the actual stored record, module, profile and company, and commit against company, record ID and expected version. These are application query and API controls over libSQL; this update does not claim database native row level security.

crmOwnerId stores the stable access_users membership ID in existing record metadata. The editable Owner display label never grants access. New rep records are assigned by the server. A manager may assign only an active eligible ERP user who has access to the same business. Loss follow up tasks inherit the deal's ERP owner.

The Group selector uses the same permission predicate as explicit server companyContext requests. A manager assigned both companies can switch between the companies individually. Such a manager naturally has permission to read both assigned datasets; Group is not a separate storage tenant.

Quote approval uses the existing record and audit engine without ledger entries. The server records the authenticated reviewer, timestamp and approved record version. Editing the quote clears approval. Rep approval attempts, forged approver metadata and stale approval requests are rejected. Approval remains metadata on the draft commercial document; financial posting and invoice conversion retain their existing finance workflow.

Mandatory stage checks still apply to managers and administrators. This update does not introduce an undocumented override for surveys, verified billing or contracts, and it does not turn a survey task checkbox into verified technical evidence. Field staff can complete assigned tasks; evidence review remains under the existing workflow.

## Required database migration

The versioned migration is `0011_crm_access_profiles.sql`. It adds the nullable CRM profile and a database constraint that permits the three profiles only on the Sales role. Existing user IDs, Google identity links, role assignments, companies, enabled flags and timestamps are preserved.

The migration was generated with the repository's Drizzle Kit version. Its data copy explicitly backfills the newly introduced profile with NULL, rather than reading a column that does not exist in the old table. The generated schema snapshot is consistent; a subsequent drizzle-kit generate reports no schema changes. Existing applied migration files were not edited.

## Apply to the CRM Preview first

1. Keep the current working preview and its source as a rollback point.
2. Copy this updated source into your local crm-review repository, replacing matching files. Preserve .git and private environment files.
3. Open Command Prompt at the project root. Your existing private .env.crm-preview.local must contain the CRM test database configuration. Run:

```bat
node --env-file=.env.crm-preview.local scripts/migrate-crm-preview.mjs
```

This helper rejects a database URL that does not start with the known hagadolerpcrmtest prefix, before importing the migration runner. Do not use it for Production.

4. Validate the source:

```bat
npm run test:crm-rbac
npm run test:crm-workflow
npm run test:crm-permissions-ui
npm run typecheck
npm run build
```

5. Commit and push crm-review, then review the resulting Vercel Preview.
6. As Owner, open Settings > User access. Select Sales as the role and choose Sales manager, Sales rep or Field operations as the CRM profile. A newly configured sales rep must have one assigned company. Provisioning does not send an invitation.
7. Assign an ERP user to existing deals and tasks through their edit drawer. Existing Bigin owner names are retained, but they do not automatically map to a login. Historical records remain visible to managers while unassigned. Test each profile with its own approved Google account.

Production migration and deployment have not been performed. Review the actual staff assignments and Preview login flows before a later production release. Existing MFA and Google configuration are retained.

## Scope of QA

The new role tests exercise real API routes against temporary SQLite, including migration preservation, foreign company IDs, forged identities, reassignment, owned records, stage gates, quote approvals, request versions, profile demotion and company revocation. CRM activity tests use temporary libSQL with Drizzle. Browser regression uses the real UI components with synthetic data. Live Google round trips and live staff provisioning were not exercised or changed.

This archive contains no private environment values, account tokens, customer exports, dependencies or build output. CRM_ACCESS_QA.json records the executed checks and remaining acceptance scope.

Executed checks pass 1131 assertions, including 70 API permission checks and 38 browser regression checks. The production build and TypeScript pass. Lint reports zero new errors; inherited debt remains at 343 errors and 54 warnings under strict lint.
