# CRM commercial workflow update

## Existing architecture

This change extends records, operations and the existing audit engine. There are
no replacement deals, users, document registers, projects, or ledger tables.
Sales targets use record type crm_target. Deal evidence uses existing document
records marked crmEvidence and linked to an operating company and deal. Projects
remain in the retained project module, which is disabled in the default core
release. Group remains a consolidated view; writes belong to Hagadol or WMK.

New additive Drizzle Kit migrations are 0013_crm_commercial_handover.sql and
0014_request_execution_guard.sql. They add records.source_deal_id with a unique
company/deal index and operations.execution_key for transaction ownership.
All previously released migrations remain unchanged.

## Commercial fields and stage checks

The authenticated ERP API treats new deals as CRM records. New deals require a
positive whole UGX value and strict calendar closing date. Historical imports
retain their values and stages with review flags. They do not acquire a fabricated
close timestamp or retrospective project. Existing notes can be updated without
inventing missing historical fields.

The customer company detail screen exposes the existing billing verification API to Owner, Administrator and Finance, with version checks. Sales manager quote approval does not replace billing verification.

Existing industry stages, billing and tax review, technical assessment, design
brief, loss reason, signed contract and appointment checks remain. Hagadol deals
identified as drilling or business line Boreholes additionally require a usable
Hydrogeological survey document before Technical design and later commercial
stages. Other Hagadol services retain their existing assessment requirements.

Won requires an explicitly linked approved quote for the same company and deal.
Its approval must match the current quote version and total contract value. The
separate operational target handover date must be a valid date from today onward.
No invoice, receipt or earned revenue entry is produced by a CRM win.

## Evidence and permissions

Verification is created by the server on an existing document record. It binds
approval to document version, deal ID, company, actor and timestamp. The document
must currently be Verified, within its review period, of the expected kind and
linked to the deal. Returning it to Draft removes current approval. Old approvals
cannot validate a new version. Existing audit records record the document code,
version and deal along with the reviewer and decision event.

Only Owner, Administrator and Sales manager profiles can verify CRM deal evidence.
Sales reps may register and submit evidence for their own deals. Field operations
retain read access and assigned task completion rights, without sales stage or
verification rights. Document access follows current deal ownership, including
after reassignment. A source URL is a reference to an external document, not an
immutable content archive. Out of band file changes must be registered as a new
revision and reviewed. Verification does not establish consent to publish a
customer testimonial or assign a verified advocate label.

## Atomic handover and safe retries

The existing libSQL batch is a write transaction. Its first statement claims an
operation only if all expected record versions still match. The dependencies
include the deal, billing customer, approved quote and survey document when
applicable. Every subsequent record, audit and journal write requires this
execution's randomly generated execution_key. An existing operation belonging
to another execution cannot enable writes, even when a race reuses its ID.

A retry with the same authenticated actor, request ID and canonical request hash
returns the stored result. A different payload with the same ID is rejected.
Version conflicts and concurrent survey revocations create no partial handover.
The record primary key and unique company/source deal index prevent duplicate
projects. A deal with an existing handover cannot be reopened and won into another
project; the linked handover needs a separate operational decision.

Projects begin in Planning with the original evidence gate sequence. Assignment,
scheduling and project gate approval remain in the project module. Final verified
gate completion creates a stable, single CRM service review reminder due 30 days
later. It does not invent a customer request or send communications.

## Dashboard and targets

Sales overview is available in CRM and the Executive view. Native buttons open
Overdue, Due today, Upcoming or Completed in period activity filters. Activity
URLs preserve the filter and dates. Company and individual targets have explicit
start/end dates, contract value and/or won deal counts. Targets are not summed
across overlapping company and individual scopes.

Won Contract Value is a commercial measure, separate from earned revenue and
cash. Wins without recorded close timestamps are excluded from period results
and counted as missing history. Reporting dates use Africa/Kampala. Sales cycle
figures use recorded creation dates only; imported records with an import date
basis do not acquire guessed cycle durations. Missing or zero value targets show
No value target rather than dividing by zero. Bars cap visually at 100 percent;
the numerical achievement may exceed 100 percent.

## Validation and rollout

Automated tests exercise real authenticated route logic against temporary SQL
storage, including transaction rollback, request replay races, company and role
restrictions, document version binding, revocation before commit, ownership
reassignment, WMK handover and service follow up. Browser tests exercise the actual
components with synthetic data at desktop, tablet and mobile widths. The browser
import transport is intercepted; separate API tests perform full 10,000 contact
and 10,000 company imports. These tests do not verify a real Google login round
trip or acceptance against the remote Preview database.

The production build and baseline lint gate must pass before packaging. Strict
lint still has inherited debt; see CRM_COMMERCIAL_QA.json. Lint fingerprints are
normalized for checkout paths so the baseline works in CI. Existing debt was not
expanded. No remote database or deployment was modified while preparing this
package. Apply migrations to the separate CRM test database before Preview, then
complete owner, sales manager, sales rep and field profile browser acceptance.
