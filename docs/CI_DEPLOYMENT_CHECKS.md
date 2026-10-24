# CRM and Finance deployment checks

The workflow `.github/workflows/qa.yml` checks pull requests, pushes to `main`, and manual runs on Node 24. It needs no database credentials, mailbox passwords or Vercel token. Existing Vercel Git integration continues to handle deployments.

## Checks

Install the locked dependencies, reject new lint errors, verify migrations, run CRM, Finance, imports, permissions and layout checks, build Next.js, check TypeScript, inspect the bundle and test unauthenticated HTTP access. Runtime and migration tests use temporary local databases. They do not test remote Turso connectivity or a real Google sign in.

`npm run test:migrations` runs the actual migration runner against a fresh temporary libSQL database. It verifies first application, repeat application without changes, rejection of altered migration history, transaction rollback on SQL failure, and recovery after the failed fixture is removed. It never runs production migrations during a build.

## Existing lint debt

The original baseline captured 392 errors and 53 warnings. After the CRM and Finance workflow changes, strict `npm run lint` reports 379 existing errors and 53 warnings. The majority concern explicit `any` types. These are outstanding work, not waived security findings.

`npm run lint:ci` compares errors against `tests/lint-baseline.json`, using the file, rule, diagnostic and affected source text. New errors fail CI. Existing errors and warnings are counted explicitly. Removed errors need no baseline expansion. Do not regenerate the baseline to accept new errors; fix the new code. The strict command and ESLint rules remain unchanged.

## Activate the release gate in GitHub

1. Copy the updated source into the existing repository, including the hidden `.github` folder.
2. Push a review branch and open a pull request to `main`.
3. After the workflow appears, configure a GitHub branch rule for `main`: require pull requests and the status `CRM and Finance QA`, and require the branch to be current before merging. Availability depends on repository settings and GitHub plan.
4. Keep the existing Vercel Git integration. Do not add another automatic deployment job alongside it.
5. A workflow file alone does not stop Vercel deployments. Without the branch rule or configured Vercel Deployment Checks, direct pushes can still deploy before CI finishes. Configure the rule in the dashboard before relying on it.
6. Use an isolated test database for Vercel previews. Keep production credentials confined to the production environment.

## Existing production configuration

Keep `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` and `ERP_OWNER_EMAIL` consistent with `.env.example`. Do not rename these to the alternatives in the external assessment.

`db/index.ts` already uses Drizzle's libSQL adapter and `lib/sql-database.ts` already uses `@libsql/client`. `drizzle.config.ts` uses SQLite dialect for SQL generation; the explicit `db:migrate` command applies the SQL through libSQL. No driver rewrite or schema regeneration is required.

`next.config.ts` already applies the shared security headers. Vercel's Next.js integration handles its server output; standalone output is not required here.

## Remaining acceptance

Passing CI is not a penetration test. Real browser interactions, authenticated company and role separation on the deployed environment, remote Turso access, backup restoration, dependency advisory review and production settings still require verification. This update does not claim those checks were completed or change Zoho Mail configuration.

## Local verification on 23 October 2026

All workflow commands passed locally: the lint baseline gate, migration test, core release, CRM, Finance, budget and cash flow, finance imports, CRM imports, permission checks, runtime adapters, UI rendering, layout rendering, production build, TypeScript, bundle inspection and HTTP smoke checks. These suites reported 1,296 passing assertions, including 10 migration assertions. Strict lint still reports the documented existing debt. The GitHub hosted workflow and dashboard release gate have not been run or configured from this workspace. No production database, deployed application or mailbox was changed.

A core release fixture now explicitly dates its invoice to match the historical payment date, removing dependence on the day the suite is run.
