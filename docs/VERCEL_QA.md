# Vercel migration validation

Validated on 18 October 2026 with Node.js 24.19.0 and npm 11.9.0.

| Check | Result |
| --- | --- |
| Clean `npm ci` | Passed |
| TypeScript | Passed |
| `npm run build` (Next.js Webpack) | Passed |
| `node scripts/run-framework.mjs build` (direct Next.js Turbopack) | Passed |
| Framework output and dependency graph | 15 assertions passed |
| Node storage adapters | 23 assertions passed |
| Production HTTP smoke test using `next start` | 27 assertions passed |
| Business and component regressions | 3,636 assertions across 15 suites passed |
| Production dependency audit | Zero known vulnerabilities reported by npm |

Business suites cover workflows, components, AI integration with mocked providers, EOS L10, dynamic EOS agenda, governance, CRM, finance, budgets and cash flow, security, layout, simplified UI, finance imports, CRM imports and CRM activity imports. Component tests render 475 cases across 21 modules. Source import tests used synthetic fixtures, not customer exports.

The storage tests use the real libSQL client and all existing schema migrations, check prepared statement values and result shapes, and demonstrate whole batch rollback after a failed write. They also test the repeatable migration command against an isolated local database. S3 tests mock the network transport while checking conditional writes, checksum metadata, missing objects, permission errors and download streams.

The HTTP test starts the actual built Next.js server. Protected pages redirect to login, protected APIs return 401 for forged legacy identity headers and invalid session cookies, private responses have safe cache policies, and Next.js applies the shared browser security headers. Auth.js logs an expected invalid cookie error during that negative test; no identity is accepted. The local test binds to loopback explicitly because the workspace blocks network interface enumeration. This is a sandbox restriction, not an application authentication failure.

## Limits

No browser interaction, real Google OAuth round trip, remote libSQL service, real S3 service, paid AI request or Vercel deployment was tested. Those need configured accounts and credentials. A green build does not replace the deployment checklist in VERCEL_DEPLOYMENT.md. The existing live application and customer data were not modified.

The prior Vite bundle size test was replaced with a Next.js output and dependency check. Its old byte budget is not comparable across frameworks. No claim is made about measured browser network size or performance.

## Repeat

```sh
npm ci
npm run typecheck
npm run test:runtime
npm run test:workflows
npm run test:security
npm run test:components
npm run build
npm run test:bundle
npm run test:http
```

Additional module suites are listed in package.json.
