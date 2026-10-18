# Hagadol ERP 1.2.0: QA, access and hosting

Prepared 11 October 2026. Scope: the existing private WMK and Hagadol ERP. Group is a reporting view and never owns transactions. Prices are USD and exclude tax unless stated otherwise.

## Delivery status

Managed sign in and sign out, protected pages, ERP membership, nine roles, company scopes, owner user management, protected APIs, isolated office screen data and request security controls are implemented. The hosted Site audience remains private to the current owner. This release does not invite staff, buy hosting or register a domain.

The current hosted login uses ChatGPT identity supplied by Sites. Gmail is an external business inbox, not the ERP identity provider. Google Workspace SSO and enforced MFA for staff are a separate production hosting configuration; they are not enabled by this release.

## QA findings and fixes

| Finding | Result |
| --- | --- |
| Sign in existed without ERP membership enforcement | Every API checks an active database membership; admission to the Site alone does not grant ERP data access. |
| All records available to any admitted signed in visitor | Queries and responses enforce permitted companies and record modules. Group consolidation requires access to both companies. |
| Team planning records could be mistaken for real user rights | Separate User access screen and access_users table; planning records never grant rights. |
| No protected page gate or visible sign out | Dynamic protected server pages, login page, denied access page and top level managed sign out link. |
| Missing Origin accepted by ERP writes | Exact same origin, JSON content type and browser site checks required for every write API. |
| Mutation references were not bound to actor and payload | References now bind the verified user ID and a canonical SHA 256 request hash; other users or changed payloads cannot retrieve prior results. Legacy references lacking that binding are rejected. |
| No request size or mutation rate bound | Streaming JSON capped at 512 KiB, with at most 120 write requests per active user per minute. AI retains its separate company daily quota. |
| Office screens downloaded the whole workspace | Dedicated office endpoint projects approved display fields and omits contacts, financial documents, ledger, audit, private notes and proposal documents. |
| Restricted clients could recalculate linked metrics as zero | Server calculates metrics before applying the role projection; clients retain these authoritative values. |
| Raw database failures exposed implementation details | Generic failure responses, with specific validation and version conflict messages retained. |
| Missing security and cache headers | CSP, nosniff, restricted browser permissions, referrer policy, HTTPS HSTS and no store for private pages, APIs and server component responses. |
| Outdated framework and dependency advisories | Next 16.3.8, React and React DOM 19.2.8, RSC 19.2.8 and Vite 8.0.16; affected transitive packages pinned to published fixes in the pnpm workspace policy. |

No automated test writes production records. D1 adapters use isolated SQLite databases; AI calls are mocked. Production API credentials remain in hosted runtime secrets.

## Verification

| Check | Result |
| --- | --- |
| Security and API denial tests | 261 assertions passed across nine roles |
| Accounting, governance and API workflow suite | 393 assertions passed |
| AI and release suite | 53 assertions passed; providers mocked |
| React components | 1696 assertions, 475 server render cases, 21 views |
| CRM | 95 assertions passed |
| Finance | 88 assertions passed |
| Budget and cash flow | 56 assertions passed |
| EOS L10 | 103 assertions passed |
| Dynamic EOS meeting | 120 assertions passed |
| Governance components | 283 assertions passed |
| TypeScript | Passed |
| Schema migration consistency | No further schema changes generated |
| Production build | Passed |
| Production dependency audit | Zero reported advisories at the time checked |
| Full dependency audit | One high severity advisory remains in the build tool dependency braces; no patched release is published |

Totals: 3148 automated assertions and 475 render cases. These are not browser interaction tests or a security certification. The production audit classification does not include every build tool used to assemble the Worker; the full audit is reported separately.

## Open acceptance items

1. Real browser sign in, sign out, access denial, keyboard focus, phone layout, printing and office fullscreen must be accepted on the hosted release. Browser QA was unavailable in this authoring environment.
2. Review the unpatched braces build dependency before expanding production use. It is introduced by build and lint tools through fast glob and micromatch. Keep build inputs trusted, do not expose a development server publicly, and do not process user supplied glob patterns in the build environment. Review https://github.com/advisories/GHSA-vfj7-8cjw-p6xm through the retained audit evidence and update when a fix is published.
3. The CSP permits inline scripts and styles for framework hydration. Nonce based CSP is a later hardening task; this release does not claim strict protection against all script injection.
4. Independent penetration testing, a timed load test, monitoring alerts, a database restore drill, owner recovery drill and staff MFA enforcement remain operational acceptance items.
5. Role permissions apply to whole records and modules. There is no assignment based restriction within a company. Viewer and Leadership can read the permitted company business data including finance; office accounts only receive the office projection. EOS and office metrics can intentionally show financial totals without exposing the ledger.
6. As the database grows, replace whole workspace state loading with paginated queries and measured limits. The current architecture suits a small internal team.
7. Offboarding denies new requests immediately. It cannot retract already downloaded exports. Refresh clears browser records after a 401 or 403; office screens refresh every minute.
8. Provisioned accounts do not receive emails. Gmail sending and sync, live social publishing, GA4, AI provider activation, historical Zoho reconciliation and file attachments remain separate integration work.

## Login and user access

The platform supplies verified identity. The initial owner email is configured out of band from the verified Site owner record as ERP_OWNER_EMAIL. Only that identity can claim the initial owner; the first arbitrary visitor cannot. Ownership then stays bound to the stable platform user ID. No password database or custom session cookies are created.

For staff onboarding:

1. Open Live → Settings → User access as the owner.
2. Enter the staff email, job role, and WMK, Hagadol or both company scopes. New users default to Viewer and Hagadol.
3. Separately admit that account through the Site sharing and access policy. This release preserves the existing private audience.
4. On the first verified sign in, the ERP binds the preapproved email to the stable account ID. Another account using the same email cannot take over a claimed record.
5. Edit the user to change the role or companies, or clear Active account to disable access. Permissions are reloaded for every API request. Access changes create a durable security event.

Owner rights cannot be disabled, demoted or reassigned through the screen. Administrator is a business administration role; only Owner can manage ERP user access. Planned Team entries remain a contact planning feature.

| Role | Read access | Write access |
| --- | --- | --- |
| Owner | All business data in both companies and access history | All business actions and user access administration |
| Administrator | All data in assigned companies and business audit | All business modules; no user access administration |
| Leadership | All business modules in assigned companies, excluding Settings and mutation audit | EOS, bids and proposals, documents, projects and approvals |
| Finance | Finance, customer and supplier directory, project and document references | Accounting, sales documents, payments, budgets and cash plans |
| Sales | CRM, customer quotes, products, invoices, bids, proposals, email and documents | CRM, proposal drafts, email drafts, products, quotes and draft invoices; no posting, payment or reversal |
| Operations | Projects, documents, EOS and office metrics | Delivery and source documents; no verification or gate approval |
| Marketing | Campaigns, media, email, contact directory and office metrics | Marketing, media and email drafts; no CRM writes |
| Viewer | Business modules in assigned companies | None |
| Office display | Curated screen content in assigned companies | None |

The office URL is /office-display with company and layout parameters. Use a dedicated Office display account, rather than an administrator, on office televisions. The URL is not a public access token.

## Hosting recommendation

Use managed Cloudflare hosting for the least migration effort: Workers for the application, D1 for records, R2 for future file storage and longer retention backup exports, DNS and TLS for the company ERP domain, and Cloudflare Access linked to Google Workspace for a future standalone deployment. Have a managed service provider own deployment, updates, monitoring, backup exports and restore drills. Hagadol should retain ownership of the domain, cloud account, database and source repository.

The current privately hosted Sites release is already managed on Cloudflare infrastructure and uses Sites authentication. It can remain there for acceptance. A direct Cloudflare account deployment requires replacing the Sites identity adapter with verified Cloudflare Access JWT authentication, Google identity configuration, an audience and issuer check, and removal or isolation of any alternative unprotected origin. Never deploy the current header based identity helper to an untrusted internet origin or accept an email header as proof of identity. These standalone identity changes and cloud account setup have not been performed in this release.

This is a custom application, so there is no verified vendor subscription that automatically includes application maintenance. A managed package can make daily use plug and play after a one time implementation and acceptance process. Ask for one accountable provider and one support contract.

| Cost item | Current public price or planning allowance |
| --- | --- |
| Workers paid plan | Minimum $5 per month; includes 10 million requests and 30 million CPU milliseconds, with metered excess |
| D1 on Workers paid | First 5 GB, 25 billion monthly row reads and 50 million monthly row writes included; excess billed by usage |
| R2 standard storage | First 10 GB months, 1 million Class A requests and 10 million Class B requests free; excess metered |
| Cloudflare Access | Free plan up to 50 users; published paid plan $7 per user per month |
| Database point in time recovery | D1 paid supports up to 30 days; longer retention exports and a restore drill need setup |
| Google Workspace Starter | Standard advertised annual commitment price $7 per user per month; existing licensed users do not need another licence solely for the ERP |
| Core cloud infrastructure budget | $5 to $25 per month for a small internal deployment within stated allowances; estimate, not a measured bill or flat price guarantee |
| Managed application operations | Reserve $100 to $300 per month as an initial planning allowance, subject to a provider quote and service scope; not a verified vendor tariff |
| Domain | Existing company subdomain can avoid a new registration; new domain price depends on the name and renewal rate |
| AI, integrations and tax | Additional, usage based or separately quoted |

For ten users already licensed for Google Workspace, reserve about $105 to $325 monthly for the above infrastructure and management allowance. If ten new Starter licences are needed at $7 each, the example becomes $175 to $395 monthly. Domain, setup, tax, AI usage and integrations are additional. The user count and workload are planning assumptions, not observed business data.

A one time setup, migration and acceptance fee must be quoted separately after agreeing staff count, domain, historical data volume, document storage, backup retention and response time. Do not compare the $5 cloud resource price with an all inclusive managed ERP contract.

The managed contract should name: domain and TLS setup; production and staging; Google login and MFA policy; staff onboarding and offboarding; daily independent exports and D1 recovery; restore tests; uptime and error alerts; patching and deployment rollback; support hours and response times; ownership and data export; monthly usage caps; and an incident contact. No paid hosting purchase is authorised by this report.

## Primary pricing sources

Checked 11 October 2026:

* Workers: https://developers.cloudflare.com/workers/platform/pricing/
* D1: https://developers.cloudflare.com/d1/platform/pricing/
* R2: https://developers.cloudflare.com/r2/pricing/
* Access plans: https://www.cloudflare.com/plans/
* D1 recovery: https://developers.cloudflare.com/d1/reference/time-travel/
* Google Workspace: https://workspace.google.com/pricing.html
* Next advisory: https://github.com/advisories/GHSA-vcvr-r3jv-pc5j

## Developer release checklist

Run the package test scripts, TypeScript, frozen lockfile installation, schema generation consistency and the Sites build. Append database migrations rather than changing previously applied SQL. Store runtime secrets through the host configuration, never in the repository or browser bundles. Build a versioned archive and publish to the existing private Site. Configure a verified owner before deploying membership enforcement. Test restore into a separate database before changing live records. Staff access must be explicitly admitted and provisioned before widening the Site audience.
