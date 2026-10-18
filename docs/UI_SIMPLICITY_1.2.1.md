# Hagadol ERP 1.2.1: simpler daily use

12 October 2026. This updates the existing private ERP. Business records, server permissions, company scopes, accounting controls and the fixed L10 agenda are retained.

## Benchmark choices

Bigin groups daily CRM work around contacts, companies, pipelines and activities. Its emphasis on a visible pipeline and next action informed the cleaner CRM toolbar and the Home work list. Source: https://www.bigin.com/simple-crm.html

Zoho Books keeps a sidebar, company switching, a financial overview and quick creation. The ERP now follows that structure with one finance section menu, a small set of daily actions, and advanced tools under More. Source: https://www.zoho.com/us/books/help/getting-started/navigating-zoho-books.html

Strety moves through one active L10 agenda while providing actions and a meeting summary. This release keeps the existing dynamic meeting and fixed agenda. General EOS explanations are moved into an optional disclosure so the meeting remains prominent. Source: https://help.strety.com/en/articles/8887848-strety-l10-meetings-complete-guide

These are interaction patterns selected for this business. No third party source code or assets were copied, and no new subscription or integration is implied.

## Visible changes

* Home shows cash, customer and supplier balances, pipeline, budget and cash flow status, work due within seven days and current quarterly Rocks.
* Sidebar navigation uses one direct button per module. Settings sits in the footer. A native Menu opens module navigation on smaller screens.
* The company selector remains visible. Office display stays under Live. The sample workspace remains separate and clearly labelled.
* CRM shows search, Filters, view, the main New action and More. Filters, export and import are retained. Pipeline statistics appear on the Pipeline view rather than on every directory list.
* Opportunity names, owners, values, stage and next actions remain visible in forms. Optional industry qualification and company website and location sit under More details. No compulsory opportunity input is placed in a closed disclosure.
* Finance shows Overview, Invoices, Bills, Expenses, Budget and Cash flow. Customer and supplier directories, payments, ageing, banking, accounting and reports remain reachable through More. The duplicated outer finance menu is removed.
* Finance daily actions prioritise New invoice, New bill and New expense. Quotations, banking and reports sit under More actions. Longer explanations use How finance works.
* Optional project coordinates, office titles and industry fields use disclosures. Existing values remain in form state and are saved as before.
* The optional OS assistant stays closed and does not request provider status until opened.
* Live screens omit repeated sample and storage banners. Tahoma, official logos, Slate, Water Blue and White remain.

## Lighter loading

Large CRM, Finance, EOS, project, governance, calendar and administration modules now load through React lazy boundaries when rendered. A loading message and an error boundary keep navigation usable during an incomplete module load.

Live startup no longer creates the illustrative sample dataset. The transaction planning engine and sample dataset load when the sample workspace is requested. Shared types, dates, money calculations and reporting helpers live in a small primitives module. The server retains the same authoritative transaction planner and validation rules.

The sidebar, company selectors and section buttons use semantic HTML controls in place of heavier widget dependencies. No additional runtime dependency was installed.

The 1.2.0 initial browser JavaScript graph measured 918648 raw bytes and 263574 gzip bytes. The final 1.2.1 measurement is recorded by tests/bundle-qa.mjs and its release output. The graph includes the ERP shell, browser runtime and their static imports. It excludes later dynamic modules, fonts, CSS and API data. This is a compiled bundle comparison, not a browser network or speed test. Total code across all optional modules remains available.

## Verification and limits

The existing accounting, CRM, finance planning, governance, EOS, AI and permission tests are retained. Component QA uses asynchronous server rendering so the real deferred components complete before their content is checked; they are not replaced by mock components. Sample fixtures are explicitly supplied to server render tests. The workflow test's weekly snapshot fixture now uses the current week so a change of date does not invalidate its purpose.

New simple UI checks cover Home attention ranking, company filtering, removal of closed and settled work, financial and EOS links, semantic navigation, optional form disclosure and preservation of required fields. A bundle budget test checks that heavy modules remain outside the initial graph.

Changes to modules, company or workspace mode prompt before discarding unsaved form values. Navigation and writes are blocked while the sample workspace is switching or a mutation is in flight. Finance directory edit controls respect the existing CRM write capability.

Real browser acceptance, keyboard and small viewport interaction checks remain pending because browser tooling was unavailable in this environment. The earlier security acceptance and build dependency advisory remain recorded in QA_SECURITY_HOSTING.md.
