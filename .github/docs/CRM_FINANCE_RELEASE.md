# Hagadol ERP 1.3.1

CRM and Finance release, 18 October 2026.

## Available now

Home, CRM, Finance and Settings. The Hagadol, WMK and Group selector is unchanged. Company specific CRM stages, qualification fields, service lines, billing stages and cost categories are retained.

CRM includes contacts, customer companies, opportunities, pipeline stages, activities and the existing Bigin import services. Finance includes customers, suppliers, products, quotations, invoices, credits, bills, purchase orders, expenses, payments, cash accounts, transfers, loans, statement checks, journals, budgets, cash flow and financial reports.

Home shows cash, amounts owed by customers, supplier balances, the open pipeline, current budget and cash flow status, due work and sales follow ups. Settings retains company setup, staff access, data tools, industry profiles and release readiness. Google login is separate from the deferred Gmail inbox module.

## Retained for later

EOS, Projects, Marketing and Media, Email, bids and proposals, the OS assistant, documents and verified knowledge, project gates, linked EOS metrics and Office Display remain in the source and database schema. This release performs no database migration, record deletion or balance adjustment.

The default `core` profile hides deferred navigation, dashboard actions and setup prompts. Server policies reject deferred record reads and writes, including requests by the Owner. Dedicated office and AI endpoints reject authenticated requests when their modules are disabled. Deferred page URLs redirect authenticated users to Home. Unknown profile values remain restricted to core.

Administrator, Leadership, Finance, Sales and Viewer roles remain available alongside the protected Owner. Operations, Marketing and Office display roles are retained but cannot sign in to the core workspace. The Owner can reassign those users to an appropriate current role or disable them without deleting their records. Existing company and ledger restrictions continue to apply.

## Update the existing installation

1. Download a complete database backup from Turso. Keep your current GitHub revision for rollback.
2. Extract the source ZIP into a separate folder. Copy its contents into `C:\Users\HP\Documents\GitHub\hagadolERP`, replacing matching source files. Do not replace your private `.env.local` file; the archive does not include one.
3. In GitHub Desktop, review the changes, commit with `Simplify ERP to CRM and Finance`, then Push origin. The existing Vercel Git integration should build the new commit.
4. Keep your current Google, database and storage environment variables. No Google client replacement or database migration is required for this update.
5. Leave `NEXT_PUBLIC_ERP_MODULE_PROFILE` unset, or set it to `core`, in Vercel Production before building. A preexisting value of `full` must be changed to `core` and followed by a new deployment.
6. Confirm Vercel reports Ready and the application displays Version 1.3.1. Verify only Home, CRM, Finance and Settings are available. Test saving a contact, refreshing, switching companies, posting an invoice and recording a payment in an isolated test workspace before entering business records.

The source ZIP contains application code, tests and deployment instructions. It contains no live business data, credentials, installed packages or generated build output. Do not delete the existing Vercel project, Turso database or Google client.

## Later activation

`NEXT_PUBLIC_ERP_MODULE_PROFILE=full` followed by a new build restores the retained module set. This is a build setting shared by the browser and server, not a user preference or API parameter. Use staging for activation and validate the selected external services first. Per module activation can be added to `lib/module-profile.ts` in a later release.

## Backups and imports

The Settings JSON download is labelled Workspace backup because it contains only records available to the signed in role in active modules. A complete Turso database backup also contains retained module records, import history and security records. Supporting objects need their own storage backup.

Historical Bigin and Books data has not been transferred by this update. Existing duplicate checks, staging and ledger controls remain in place. File attachments still require private S3 compatible storage. The readiness page distinguishes configuration from a completed upload test.

## Verification

Run `npm run test:core` for the shipped core profile. The legacy business and component test commands use `scripts/run-qa.mjs` to exercise the full retained architecture in isolated processes. This does not enable modules in the deployed application.

Run `npm run typecheck`, `npm run build`, `npm run test:http` and `npm run test:bundle` for the production build. See `CRM_FINANCE_QA.md` for this release's results and limitations.
