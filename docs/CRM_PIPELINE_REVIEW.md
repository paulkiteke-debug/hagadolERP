# Compact pipeline and independent CRM review

Prepared on 24 October 2026. This source package extends the existing 1.3.1 release. It has not been deployed from this workspace and needs no new database migration.

## Pipeline layout

The board follows the supplied Bigin screenshot: a left pipeline list, a compact toolbar, stage headings with count and UGX total, compact deal cards, a vertically scrolling list for each stage and horizontal scrolling across stages. Pipeline summary figures are available in a collapsed overview rather than taking space above every board.

Cards show the deal name, customer, value, follow up date, business and owner. Details open from the card. The Actions menu offers an activity and a stage selector. Native desktop dragging uses the existing stage API with the current record version. Keyboard and touch users can use the selector. The server remains responsible for stage requirements, company rights and stale versions. Failed changes do not optimistically change the card stage.

The left list comes from actual imported pipeline and subpipeline metadata, scoped to the selected business. Native deals have a separate Hagadol sales or WMK projects group. Identical source pipeline names in different businesses stay separate. Creating a native deal returns to All pipelines; it does not pretend the new deal originated in Bigin. Existing stage names and imported stage history remain unchanged.

## Give Gemini the review package

Upload this complete source ZIP, the supplied Bigin layout screenshot and the text in GEMINI_CRM_QA_REQUEST.txt. The screenshot is not included in the source archive because it contains customer details. Use a redacted copy when appropriate.

For actual data reconciliation, export deals from Bigin and the ERP for the same business and scope. The prepared ERP export adds IDs, versions, source pipeline names, source subpipeline names, created time and stored status. It retains canonical stage, values and Bigin IDs. Select All pipelines, Show All and clear filters before exporting a business. Repeat for the other business. An export with filters applied cannot establish the completeness of the whole CRM.

Anonymise names consistently and remove personal emails and telephone numbers. Preserve numeric values, dates, company assignments and stable identifiers for reconciliation. Never include .env.local, tokens or production database backups. The full source ZIP contains no real CRM data export.

Gemini needs a Node runtime and a local or isolated test database to execute the suites. If its chat interface cannot run them, it can review the source and propose corrections, but must mark execution checks NOT RUN. Ask for reproducible findings, test output and a patch rather than a general quality score.

## Synthetic data reference

The fixtures below use invented deals and values. They provide deterministic expected results and do not validate the imported customer records.

| Business | New count | New UGX | Qualified count | Qualified UGX | Total UGX |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Hagadol | 2 | 170,000 | 1 | 300,000 | 470,000 |
| WMK | 2 | 900,000 | 0 | 0 | 900,000 |
| Group | 4 | 1,070,000 | 1 | 300,000 | 1,370,000 |

For pipeline groups, Hagadol imported Sales Pipeline has two deals totalling UGX 420,000. Hagadol native sales has one deal totalling UGX 50,000. WMK imported Sales Pipeline has one deal totalling UGX 200,000. WMK native projects has one deal totalling UGX 700,000. The shared source pipeline name is intentional and tests business isolation.

## Verification

The 25 new checks cover grouping, company separation, filtering, sort order, stage totals, source immutability and server rendered board structure. CRM, layout and UI regressions and the production build passed. Native drag and drop, keyboard interaction, touch interaction, viewport rendering and authenticated remote workflows remain browser acceptance tasks. No independent Gemini QA has been performed by this assistant.

Existing limitations remain: some advanced billing verification, technical survey and signed contract controls need form integration. The backend guardrails still apply. These gaps should be findings in the independent review rather than bypassed in tests. Existing strict lint debt is documented separately; the baseline gate rejects new errors.
