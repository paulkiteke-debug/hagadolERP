# Hagadol ERP 1.3.1

Standard Next.js application for WMK and Hagadol, ready for Vercel or a Node.js server. This branch replaces Vinext and the Cloudflare Workers runtime. Home, CRM, Finance and Settings are active. Other modules and their records are retained for later activation. See [release and update instructions](docs/CRM_FINANCE_RELEASE.md).

## Local setup

Use Node.js 24 and npm.

```sh
npm ci
cp .env.example .env.local
# Fill in the database, Google authentication and storage settings.
npm run db:migrate
npm run dev
```

For a local database, use `DATABASE_URL=file:./local.sqlite`; leave the token empty. Vercel requires a persistent remote libSQL database, such as Turso. Files use a private S3 compatible bucket, such as Amazon S3. Neither provider is needed merely to compile the application.

```sh
npm run typecheck
npm run test:runtime
npm run build
npm start
```

`npm run build` uses the standard Next.js Webpack builder. Direct `next build` is also supported. `vite.config.ts` is a compatibility marker only; it loads no Vite plugins. No Worker adapter, Wrangler, Miniflare, D1 binding or R2 binding is required.

## Deploy

See [the Vercel deployment guide](docs/VERCEL_DEPLOYMENT.md) for environment variables, Google login, database migration and validation. Set the Vercel framework to **Next.js**, Node.js to **24.x**, install command to `npm ci`, build command to `npm run build`, and leave the output directory at the framework default.

This source package does not contain credentials, a production database or customer exports. Building does not migrate or seed a database. Deployment requires configuring the services described in the guide.

## QA

Business tests use isolated SQLite fixtures and simulated identities. `test:runtime` also checks the real libSQL driver, atomic rollback, migration repeatability and the S3 adapter with a mocked transport. It does not contact the live ERP. See [validation results](docs/VERCEL_QA.md) for tested scope and remaining integration checks.

Run `npm run test:core` to verify the current module restrictions. Legacy business and component tests explicitly exercise the retained full profile in isolated processes.

Older release notes describe the previous hosting architecture and are historical.
