# Hagadol ERP 1.3.1 verification

Date: 18 October 2026.

## Results

Production Next.js Webpack build and TypeScript checks passed. Nineteen automated suites passed 3,963 assertions with zero failures. Counts below are unique suite runs; repeated checks are not added to the total.

| Suite | Assertions | Profile or scope |
| :--- | ---: | :--- |
| Core release | 262 | Shipped core profile |
| Business workflows | 393 | Retained full architecture |
| Component rendering | 1696 | Retained full architecture, 475 render cases |
| AI release | 53 | Retained full architecture, mocked providers |
| EOS L10 | 103 | Retained full architecture |
| Governance | 283 | Retained full architecture |
| Dynamic EOS | 120 | Retained full architecture |
| CRM | 95 | Retained business rules |
| Finance | 92 | Retained business rules |
| Finance planning | 56 | Retained business rules |
| Shell layout | 108 | Server rendered structure, 21 cases |
| Simple UI | 78 | Retained full architecture |
| Finance imports | 151 | Isolated import fixtures |
| CRM imports | 118 | Isolated import fixtures |
| CRM activity imports | 29 | Isolated import fixtures |
| Security | 261 | Retained nine role policy and server routes |
| Node runtime | 23 | Real local libSQL, mocked S3 |
| Production HTTP | 27 | Real next start, unauthenticated and forged identity rejection |
| Build output | 15 | Next route manifests and dependency exclusions |
| Total | 3963 | Zero failures |

## Core coverage

The new suite checks navigation and Home for Hagadol, WMK and Group; disabled initial views; removal of EOS and office setup actions; readiness scope; company separation; persisted CRM edits; invoice posting and partial payment; balanced ledger entries; rejection of deferred record creation and editing; direct office and AI requests; prevention of CRM activity conversion into an EOS action; and role provisioning restrictions.

Sixteen existing deferred records were inserted into an isolated fixture database. The suite verified that API responses did not reveal them and that rejected requests left every stored row unchanged. Supplying a request profile parameter did not activate deferred modules.

Tahoma remains the supplied asset with SHA256 `b91435bd18a3104a2d4f2ca30159592ac577759d9170cee398b6526ab9a47883`. No dependency versions, database schema or migration files changed.

## Limits and deployment status

No live CRM or finance data was accessed or changed. No browser interaction, narrow viewport, printing or authenticated production acceptance test was performed during this update. Component rendering checks do not prove browser behaviour. Google and S3 round trips were not retested.

The Vercel connection returned HTTP 403 when reading the Hagadol project because its credentials lack the Hagadol scope. No authenticated Vercel CLI was available. This release is packaged for the existing GitHub Desktop deployment workflow and has not been published to the production URL.

The existing installation had Google Owner sign in and database access confirmed through user screenshots before this update. Historical data reconciliation and supporting file storage setup remain separate installation tasks.
