# Vercel deployment: Hagadol ERP 1.3.0

## Architecture

The application now runs directly on Next.js 16, React 19 and Node.js 24. Vinext and its Vite and Workers build pipeline have been removed, rather than bypassing validation with a fake Cloudflare plugin. All server routes use the Node runtime. Vercel supplies the Next.js serverless adapter.

| Concern | Previous implementation | Current implementation |
| --- | --- | --- |
| Build | Vinext, Vite, Workers plugins | Next.js build |
| Database | D1 runtime binding | Remote libSQL using `@libsql/client` |
| Files | R2 runtime binding | Private S3 compatible object store |
| Login | Sites identity headers | Auth.js with verified Google identity |
| Permissions | ERP membership and roles | Same membership and company policies |
| Configuration | Hosting bindings and preview workers | Server environment variables |

The existing SQLite schema and immutable SQL migrations are retained. A lazy runtime adapter preserves the prepared statement API used by the business code. SQL batches execute as atomic write transactions: an error rolls back the whole batch. Import file writes use S3 `If-None-Match: *` and preserve checksum metadata.

`vite.config.ts` exports an empty object and loads no plugins. `next.config.ts` owns the production configuration. `scripts/run-framework.mjs` is a compatibility wrapper around the Next CLI; the main npm scripts invoke Next directly. No build step imports `hosting.json`, `sites-worker.ts`, connector preview workers, Miniflare or Wrangler.

## Vercel project settings

1. Import this branch or source package into your own Git repository and create a Vercel project.
2. Choose **Next.js** as the framework, **24.x** as the Node.js version and the repository root as the root directory.
3. Use `npm ci` to install and `npm run build` to build. Leave the output directory at the default. Do not set it to `dist`, `out` or `.vercel/output`.
4. Configure the server variables below for the production environment. Use separate resources and OAuth credentials for preview deployments.
5. Provision and migrate the database before signing in. Publish only after the integration checks below pass.

`vercel.json` includes the framework, install and build commands. The npm build uses `next build --webpack`; this is a supported standard Next.js build, not a custom Vite build. `next build` can also be invoked directly. `next start` serves the built application on a conventional Node server; Vercel runs the server functions itself.

## Server variables

Never prefix secrets with `NEXT_PUBLIC_`.

| Variable | Required for | Value |
| --- | --- | --- |
| `DATABASE_URL` | ERP records | Persistent remote `libsql://` or `https://` database URL |
| `DATABASE_AUTH_TOKEN` | Database on Vercel | Scoped database token |
| `AUTH_SECRET` | Login | Strong random secret, for example generated with `openssl rand -base64 32` |
| `AUTH_URL` | Login | Canonical HTTPS ERP origin, with no trailing path |
| `AUTH_GOOGLE_ID` | Login | Google OAuth web application client ID |
| `AUTH_GOOGLE_SECRET` | Login | Matching OAuth secret |
| `ERP_OWNER_EMAIL` | Initial ownership | Exact verified Google email of the intended ERP owner |
| `S3_BUCKET` | Import supporting files | Private bucket name |
| `S3_REGION` | Files | Bucket region, for example `us-east-1` |
| `S3_ACCESS_KEY_ID` | Files | Scoped object storage credential |
| `S3_SECRET_ACCESS_KEY` | Files | Matching object storage secret |
| `S3_ENDPOINT` | Non AWS object stores | Optional HTTPS endpoint |
| `S3_FORCE_PATH_STYLE` | Compatible object stores | `true` only if your provider requires it; otherwise `false` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional OS assistant | Server key and chosen supported model |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Optional OS assistant | Server key and chosen supported model |
| `AI_DAILY_LIMIT` | Optional assistant limit | Default `10` |

The build succeeds with no service variables. Missing services fail closed at runtime; a successful build does not mean a configured working ERP. Local SQLite files are expressly rejected on Vercel, whose function filesystem is not durable database storage.

Give the storage principal only the needed get and put permissions for the ERP bucket, ideally restricted to the `finance-imports/` and `crm-imports/` prefixes. Public bucket access is unnecessary. Server to server uploads do not require browser CORS configuration. Retain bucket backups and database backups independently of application deployments.

## Google login

Create a Google OAuth **web application** and register this exact production callback:

```text
https://YOUR-ERP-DOMAIN/api/auth/callback/google
```

For development, register `http://localhost:3000/api/auth/callback/google` on a development client. Configure the Google consent screen and test or organisation users as applicable. Changing the production domain requires updating both `AUTH_URL` and the Google callback.

Only Google profiles with a verified email are accepted. Sessions use signed and encrypted Auth.js cookies with an eight hour lifetime. Old incoming Sites identity headers are ignored. A successful Google login grants no business access by itself: the configured owner bootstraps ownership, and other accounts need an enabled invitation in the ERP membership table. Company and role checks still run on server requests. Add staff from Settings after the owner signs in.

Auth.js is pinned to `next-auth@5.0.0-beta.32`, the v5 installation channel used for this integration. Evaluate future upgrades in staging. Google OAuth needs an actual configured round trip before release; local automated tests cannot replace it.

## Database setup

For a new empty database, set `.env.local` using the target database and run:

```sh
npm ci
npm run db:migrate
```

The migration command loads `.env.local` through Next's environment loader. It records immutable SHA256 migration checksums in `__erp_migrations` and applies each pending file as an atomic transaction. Repeating the command does not replay applied migrations. Migrations are deliberately excluded from install, build and server startup.

For local development only:

```text
DATABASE_URL=file:./local.sqlite
DATABASE_AUTH_TOKEN=
```

Do not use local file storage on Vercel.

## Moving existing ERP data

This refactor does not copy or modify the existing live ERP. Before switching traffic:

1. Back up the source D1 database and file objects. Record table counts, company totals, ledger balances and import file hashes.
2. Create an empty destination and run the migrations above. Import the source **data rows only**, preserving record IDs, versions, audit history, ledger entries and import references. Do not run the initial schema migration on a database that already has the source schema, and do not copy a source migration history over `__erp_migrations`.
3. Copy file bodies to the private S3 bucket using the same object keys. Preserve each object's `sha256` custom metadata and check sizes and hashes. No source object needs deletion.
4. Because Sites identities differ from Google IDs, verify the copied owner email matches `ERP_OWNER_EMAIL`, then reset provider IDs **on the destination copy only**:

```sh
npm run db:prepare-identities -- --confirm-copied-database
```

This retains email invitations, enabled flags, roles and company scopes. It clears old provider IDs so the next verified Google login can claim its matching invitation. Do not run it on the source database or routinely after deployment.

5. Compare counts, company totals, ledger balances and object checksums with the source, then test each role. Schedule a final read only cutover window so writes cannot be lost between the copy and the switch.

Database export and import depend on the chosen provider. This package supplies schema migrations and identity preparation; it does not include an automatic D1 export or a production data transfer utility.

## Upload and function limits

Supporting file uploads are limited to **3 MiB per file** so base64 JSON requests remain below Vercel's function body limit. Split larger supporting files or implement authorised direct to storage uploads before increasing this limit. Import rows already travel in bounded JSON batches. Large data transfers should use provider database tooling, not application API requests.

## Validation before switching traffic

```sh
npm run typecheck
npm run test:runtime
npm run test:security
npm run test:workflows
npm run build
npm run test:bundle
```

Then verify the real deployment: owner Google login and logout, invited staff login, disabled and uninvited users denied, company isolation, CRM edits, a balanced finance transaction, duplicate import handling, supporting file upload and download, and office display permissions. Test the configured AI provider separately if enabled.

No live Vercel deployment, Google OAuth round trip, remote database test or real S3 upload has been performed by the source build checks. Those require your service configuration. No existing live ERP data was changed.
