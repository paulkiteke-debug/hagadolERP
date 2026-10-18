# Hagadol ERP version 1.1.0

10 October 2026

## Release scope

Private owner workspace for WMK, Hagadol and Group reporting. CRM, Finance, Media, EOS, Projects, Email, Marketing, Office display, Bids and proposals, Executive and Administration retain their distinct sections. Staff authorisation is outside this release; preserve owner private Site access.

## Deployment

Use the configured Sites source repository and hosting manifest. The runtime is React with Vinext on Cloudflare Workers, backed by D1. Dependency inputs are locked in pnpm lock data. Use the Sites build and packaging workflow, push the exact source commit, then deploy its saved version and archive with the existing owner audience.

The new additive D1 migration is drizzle/0002_tricky_rawhide_kid.sql. It adds ai_runs and its daily quota index; do not alter 0000 or 0001. Confirm the live database contains ai_runs after deployment and open Settings, Release readiness. The generation and readiness routes require authenticated Site access.

Tests:

    node tests/erp-workflows.mjs
    node tests/ai-release-qa.mjs
    node --loader ./tests/tsx-loader.mjs tests/component-qa.mjs
    node node_modules/typescript/bin/tsc --noEmit

The first two suites use isolated SQLite; AI calls are simulated. The last component suite uses React server rendering with a dialog presentation wrapper. It does not verify browser events, effects, portals, mobile layouts or fullscreen.

## AI activation

OpenAI: configure OPENAI_API_KEY as a runtime secret and OPENAI_MODEL as the exact model available to your API account. The supported OpenAI Developers plugin provides its API key setup flow. Do not place keys in source or browser code.

Claude: configure ANTHROPIC_API_KEY as a runtime secret and ANTHROPIC_MODEL as the exact model available to your Anthropic API account. Use the organisation API credential authorised for this workspace.

AI_DAILY_LIMIT is optional, defaults to 10, and accepts 1 through 50 provider calls per company per Kampala day. Combined mode uses two units. Failed or pending runs count too. Quotas limit requests and output tokens; they do not enforce a currency spend cap. Set provider account budgets independently. Provider calls have a 25 second deadline and a 4,096 output token cap, so select an appropriate text model and verify its latency.

Configure runtime values through Sites and redeploy the saved version to apply the environment revision. GET /api/os-ai returns readiness and selected company history without credentials. Bids and proposals shows each provider state. Run a controlled saved bid through each configured provider, check output against the source and confirm usage in the provider account before adopting AI results. The website receives no API credentials from ChatGPT sign in or from this conversation.

## Proposal workflow

Create and save a bid with buyer requirements, scope, evidence and checked commercial terms. Use the template builder, one AI provider, or OpenAI draft plus Claude review. Review the result and save a working draft. AI generation itself does not post accounts or send submissions.

Move the proposal to Review. Edit the draft, add reviewer and review date, and complete buyer, technical evidence, commercial and signatory checks. Save and approve. Record Submitted only after actual submission. Approved records lock document editing. Return to Review to reopen with cleared checks, or create a revision. A changed source bid invalidates a captured source version and requires a new draft or revision.

## Acceptance and operational setup

Pending browser acceptance: keyboard paths, focus trapping and Escape, unsaved edits, company switching, failed requests and expired sessions, small screens, exports/imports, printing, office rotation and fullscreen. Browser automation is unavailable in the current authoring environment.

Pending live services: API account authorisation and provider checks, Gmail inbox sync and sending, GA4 and social analytics/publishing. Google access currently opens Gmail. Marketing performance remains recorded snapshots until connected. No external provider calls were made by automated QA.

Pending business acceptance: reconcile Zoho Books and Bigin migration, opening balances and current documents; establish staff permissions; export a complete backup and test recovery separately. JSON backup export is available. Automated restore, attachments, full inventory and multi currency are outside this release. Deployability is verified separately from these operational acceptance tasks.

## Recovery

Preserve backups before opening balance changes. If this application release fails, deploy the prior saved version while retaining the additive AI table and current business data. Do not reverse migrations or erase records to roll back the UI. Failed or interrupted AI runs remain history; do not automatically rerun them under a new request reference without checking the recorded outcome and budget.

## API references

OpenAI Responses: https://developers.openai.com/api/docs/guides/migrate-to-responses

Claude Messages: https://platform.claude.com/docs/en/api/messages/create
