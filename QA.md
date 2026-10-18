# Hagadol ERP QA review

10 October 2026 · WMK, Hagadol and Group

307 workflow and API assertions passed. 1,402 component assertions passed across 387 React server rendering cases and 18 modules. TypeScript passed. The production build is required before publication. Tests use an isolated SQLite D1 adapter and illustrative records; production data was not seeded or changed by QA.

| Section | Subsections | Coverage | Acceptance limits |
| --- | --- | --- | --- |
| Executive | Company overview, executive dashboard | Sample and empty rendering; operations summaries and financial calculations | Historical account completeness depends on migrated data |
| CRM | Contacts, pipeline, follow ups | Company views; contact validation; stages; CSV import and duplicate rejection; task overdue boundaries | Browser drag, selection and keyboard checks pending |
| Finance | Sales, purchases, banking, accounting, reports | VAT; posting; partial payments; credits; reversals; purchase conversions; loans; balanced journals; reconciliation; internal matching; all eight reports | Current outstanding reports are not historical ageing; consolidation is bounded internal matching |
| Media | Content planner, social performance | Post status workflow; all tables and forms; social source isolation and exports | Live publishing and platform reporting await connection |
| EOS | Overview, scorecard, Rocks, To dos, issues, L10 meetings | Weekly dates; owner and due rules; same company links; IDS resolution; completion and immutable review snapshots; detail rendering | Vision organiser and People Analyser remain outside current scope |
| Projects | Project register, technical records, field activity | Company views; project/log forms; evidence bounds; source rules; unknown and zero values; office projections | Engineering review and browser evidence interaction remain required |
| Email | Drafts, Google access | Recipient validation; draft edit workflow; record detail and connection instructions | Gmail inbox sync and ERP sending await authorisation |
| Marketing | Campaigns, website traffic | Campaign stages; metric bounds; zero values; website source isolation and exports; source summary rendering | Analytics connection and event reconciliation pending |
| Bids and proposals | Bids, proposals | Proposal generation checks; company links; readiness validation; deadline and office title projections; all record forms | Remote OS integration and client approval are not validated by these tests |
| Office display | Combined screen, rotating screen | Combined projections; four rotation screens rendered; public data allowlists; period and project summaries | Fullscreen, rotation timing, readability on TV and refresh interactions require browser QA |
| Administration | Company details, team, connections, data | Selected company settings; planned role validation; four setup dialogs; imports; safe CSV; backup controls rendered | Team planning does not grant access; restore is not implemented |

## Corrections and UX changes

Distinct collapsible sections and subsection links, navigation search and skip link; separate social and website views and exports; visible form errors and unsaved edit protection; sticky form actions and reduced motion support; truthful live loading and failed refresh feedback; stale version conflict handling and single save in flight; corrected undated task overdue handling; contextual record creation and exports; Unicode, nested fields and spreadsheet formula protection in CSV; server contact email and office display note validation.

## Required browser acceptance

Browser QA is unavailable under the current Sites authoring workflow. Server rendering does not run effects or verify clicks. Dialog checks use a presentation wrapper, so the actual dialog portal, focus trap, Escape and dismissal are not covered. Before operational acceptance, verify navigation and all primary actions with keyboard and pointer, form error focus and discard handling, company switching, small screen tables and dialogs, actual exports and imports, session expiry and failed network requests, office rotation and fullscreen, printed documents and accessibility contrast on the deployed UI.

## Integration acceptance

Authorise and verify Gmail, Google Analytics and social providers; reconcile migration totals with Zoho Books and Bigin; establish staff permissions, backup restoration and any needed full accounting controls. These checks remain pending. Tests validate the implemented simplified ERP, not feature parity with either vendor or complete production readiness.

## Reproduce

`node tests/erp-workflows.mjs`

`node --loader ./tests/tsx-loader.mjs tests/component-qa.mjs`

`node node_modules/typescript/bin/tsc --noEmit`


## Version 1.1 additions

53 AI and release assertions pass with simulated provider responses. They check fixed API destinations, authentication, context allowlists, response limits, incomplete response rejection, safe provider failures, source versions, company history, identity and origin checks, daily quota enforcement, cached requests and generation without business mutations. ERP API tests also cover saved generation provenance, one proposal per generation, reviewer checks, approval locks, reopening and revision prerequisites. Component checks cover configured and unconfigured providers, paired findings, stale output, human review controls, controlled EOS navigation and release readiness.

The provider HTTP calls are simulated, not live provider checks. API credentials are absent at release, so AI buttons remain inactive in the deployed interface until configured. The application has a 1.1.0 release identity and opens Live workspace by default. Sample rendering cases use explicit sample mode.

## Version 1.1.1

Release verification: 329 ERP workflow and isolated API assertions, 53 simulated AI and release assertions, 283 governance workflow and rendering assertions, and 1,504 component assertions across 417 cases and 20 modules. All pass with zero failures. TypeScript and whitespace checks pass. The Sites production build passes.

New checks cover verified document and knowledge lifecycles, owner identities, source version changes, expiry, restricted evidence, company isolation, distinct CRM stages, fee invoice conversion, all nine project gates for both companies, blocked stage skips, immutable evidence history, preserved legacy project stages, exact evidence versions seen by the reviewer, final completion dates, VAT excluded revenue links, payment and reversal balance links, overlapping or missing marketing snapshots and pending future periods. The migrated database enforces unique company document IDs. ERP API checks verify idempotent gate advancement and closed L10 calculated metric snapshots remaining unchanged after later source edits.

Tests run in memory or isolated SQLite and React server rendering. They do not write live business data. AI HTTP responses remain simulated. Server rendering does not run DOM events, effects, keyboard navigation, focus management, printing, downloads or fullscreen. Browser acceptance remains pending because the supported browser capability is unavailable in this environment. Sample governance records are explicit practice examples and are not persisted to the live workspace.
