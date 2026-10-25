# Hagadol ERP · CRM design rebuild

Date: 25 October 2026
Application version: 1.3.1; CRM design review update
Reference: supplied Gemini `hagadol_wmk_crm_handover.html` and `HANDOVER_SPECIFICATION.md`.

## What changed

CRM uses the full width screen with a Slate header, official Hagadol logo, authorised Hagadol / WMK / Group switch and four navigation items: Pipeline, Contacts, Companies, Activities & Tasks. The existing Menu gives access to the retained ERP modules and Settings.

Today priorities have three aligned groups on desktop. Mobile shows the counts with a View activities control. The board has consistent stage headers, deal counts and values, wider cards, owner initials, next actions and follow up dates. Stage changes work through both drag and drop and an accessible stage menu. Search supports names, customer details and original Bigin identifiers across CRM record types.

Contacts, companies and activities use aligned directories. Creating and editing records opens a focused drawer; it does not replace the entire workspace. Customer details, source metadata and reverse chronological recorded activity history remain available in the drawer. The same existing ERP mutation engine saves changes, enforces record versions and updates the shared state.

Missing stage requirements appear in a dialog before a stage move. Recording a loss requires a reason and can create a linked follow up task using the existing atomic workflow. A rejected stage move does not change the card prematurely.

Actions contains a read only Bigin file review. It keeps name, company, email and telephone values on each original source row, uses Job Title only when supplied, recognises original source IDs, flags conflicting business assignments and identifies duplicate candidates. It never merges, posts or repairs records. Counts describe file checks; they are not a statement that every operational requirement has passed. The existing template contact importer remains a separate utility.

## Retained architecture and limits

Finance, EOS, projects, marketing, email, office display, authentication, permissions, API routes, schema and versioned migrations are retained. This UI update creates no new database tables or migrations. The application continues to default to the existing CRM and Finance module profile.

Group is a view of records already authorised by the server. It is not a third operating company. Existing company specific stage names and imported Bigin metadata are preserved instead of silently rewriting historical records. The supplier filter selects recorded supplier relationships; it does not introduce new sharing permissions.

The drawer displays the existing task, audit and imported stage history. No new external email synchronisation, AI summary, automatic tax invoice, quote approval service or billing verification workflow is activated by this design update. Existing server guardrails remain in force. No live records were read, imported, changed or reconciled while developing this update.

Strict lint still reports inherited code debt; the baseline gate rejects new lint errors. Browser QA uses the actual client components, shared sample mutation engine and the compiled application styles in a local static fixture. It does not establish a live Google OAuth round trip or live database acceptance.

## Open the clickable preview

Extract the archive and open `review/Hagadol_CRM_Design_Preview.html` in Chrome or Edge. It is self contained and uses synthetic example records. No installation, account or database connection is needed. Sample changes reset on reload. The preview is for CRM design review and does not replace the secured deployed ERP.

## Apply to Vercel Preview

1. In GitHub Desktop, open your existing repository and switch to `crm-review`.
2. Preserve your private `.env` files and Git repository. Compare changes against any work added after the previous review package.
3. Copy the updated source from this archive into that repository, keeping `package.json` at the root. Do not copy dependencies or build output; neither is included here.
4. In Command Prompt at the repository folder, run:

```bat
npm ci
npm run test:crm-handover
npm run test:crm-preview
npm run typecheck
npm run build
```

5. Commit and push the review branch. Vercel will build its Preview deployment.
6. Keep that branch pointed at `hagadolerpcrmtest` using its Preview environment variables. This UI update requires no additional database migration. Do not change Production variables or reimport data as part of this update.
7. Open the Preview and check your actual record names, contact associations, long text, company access, saving and the Google login round trip. Promote after reviewing those results.

`CRM_REVIEW_QA.json` records executed checks. The source package contains no private environment configuration, database tokens, production exports, dependencies or build output.

## Executed validation

The production build and TypeScript check pass. The lint baseline check reports zero new errors, with 367 inherited errors and 53 warnings still visible under strict lint. The executed suites pass 972 assertions, including 38 browser assertions and 31 authentication rejection checks against a local production server. All data used by the tests was synthetic or temporary.
