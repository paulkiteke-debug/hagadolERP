# CRM design handover implementation

Prepared 24 October 2026. Review build based on the complete retained ERP 1.3.1 source. Not deployed. Existing production records have not been changed.

## Implemented

The CRM keeps Pipeline, Contacts, Companies and Activities. The existing ERP business selector and authenticated server scope remain authoritative. Group combines authorised records; it is not a new operating business. Finance, EOS and the other retained modules stay in the source.

The Bigin inspired pipeline keeps source pipeline names, stages and identifiers. Cards show the customer, amount, owner, next action and follow up date. Desktop dragging and the stage selector use the existing version checked operation.

Today priorities appear above the board. Overdue, due today and upcoming categories use pending CRM activities and Kampala dates. Completed and EOS tasks are excluded. Undated activities are flagged. The panel follows the business view; pipeline and owner filters apply to the board below.

Contacts, companies, deals and activities now open in a native modal side drawer, leaving the list behind it. The selected record is resolved from the current state on every refresh. Escape closes the drawer when not saving; native dialog focus containment and restoration are implemented but require browser acceptance.

Moving a deal to Lost opens a reason form with an optional exact follow up date. Server validation requires a reason and rejects past follow up dates. The linked task and deal change are written through the existing atomic operation plan. Follow ups retain the business, deal links and owner. An existing open loss follow up is reused for the same date; a different date asks the user to edit the activity. Loss does not require technical evidence or write any journal entries.

Company forms expose billing address and tax reference. Deal forms expose existing survey, assessment link and signed contract metadata inside More opportunity details. Existing server billing verification and stage guardrails remain in force. Client validation explains missing fields; server validation remains authoritative. Imported source details are collapsed in the drawer. The contact CSV template contains headers only and no example record.

## Deliberate limits

This is an initial integration of the handover design. It retains existing company specific stages instead of silently translating historical deals to Gemini's proposed stage names. No replacement tables or new migrations were introduced. Existing 0009 and 0010 migrations are retained.

The supplied prototype's synthetic records, invented Bigin IDs, fixed import counts, simulated AI and automatic invoices are not copied into live functionality. No new AI or email notification service is enabled.

The generic contact importer remains an existing utility limited to 200 rows. It is not a safe repair path for the previously corrupted contact template. A dedicated source ID reconciliation and approval workflow is still needed before repairing live contacts. The corrected contact review package is separate from this code archive.

The drawer continues to show the existing task, audit and imported stage history. Full integration of the separate unified activity API, verified billing controls and service specific evidence review remains follow up work. There is no newly implemented shared supplier permission model or investor pipeline.

## Verification

Executed with synthetic records or temporary databases only:

1. CRM handover checks: 21 passed.
2. CRM checks: 95 passed.
3. Pipeline checks: 25 passed.
4. UI checks: 78 passed.
5. Layout checks: 108 passed.
6. CRM workflow checks using temporary libSQL and Drizzle: 44 passed.
7. CRM import checks: 118 passed.
8. CRM activity import checks: 29 passed.
9. Finance checks: 92 passed.
10. Security checks: 261 passed.

Production HTTP authentication checks: 31 passed. Total: 902 assertions passed. Source import suites used synthetic fixtures, not a production export. TypeScript passed. Lint baseline check reports no new errors; strict lint still has 373 existing errors and 53 warnings.

Browser interaction, visual alignment, small screen, drag, keyboard and Google sign in acceptance are pending. Unit and server rendering checks do not establish browser acceptance. The production build passed. The HTTP checks rejected unauthenticated and forged identity access. Google sign in round trip was not tested. Machine readable results are in CRM_REVIEW_QA.json.

## Review locally or on Vercel Preview

Keep your existing private environment configuration. Never upload environment files, database tokens or backups into GitHub or share them for QA.

1. Back up your current repository and database.
2. Compare this archive with your latest GitHub source before replacing files. This workspace cannot verify changes made elsewhere after the known source package.
3. Extract the archive so package.json is at the repository root. Exclude node_modules and build output from any upload.
4. Run npm ci, npm run test:crm-handover, npm run typecheck and npm run build.
5. Deploy a Vercel Preview branch for browser review. Keep its database isolated from production.
6. Verify both company views and Group permissions; create a deal; edit a contact; complete a task; record a loss with a follow up; try blocked stages; test mobile and keyboard paths.
7. Promote only after those browser checks pass. Do not reimport contact data as part of deploying this code.
