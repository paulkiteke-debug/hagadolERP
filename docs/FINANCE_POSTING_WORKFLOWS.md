# Reviewed imports and milestone revenue

This update extends the existing journal. It adds no journal header table, journal line table, second ledger, balance cache or parallel posting engine.

## Implementation

| File | Responsibility |
| :--- | :--- |
| `lib/finance-import.ts` | Existing source validation plus lazy approval helper exports |
| `lib/finance-import-posting.ts` | Source integrity checks, row decisions, preflight simulation, approval and posting |
| `lib/finance-persistence.ts` | Drizzle reads and transactional persistence of the existing buildPlan output |
| `lib/finance.ts` | Existing reporting plus lazy milestone service exports |
| `lib/finance-revenue.ts` | Finance approved schedules and the explicit recognition helper |
| `lib/revenue-recognition.ts` | Pure contract milestone and project liability validation |
| `lib/erp-engine.ts` | Shared journal validation and posting, deferred invoices, atomic gate recognition |
| `db/schema.ts` | Approval snapshots and source posting keys, referencing existing records |
| `app/api/finance-workflows/route.ts` | Authenticated workflow API |
| `drizzle/0010_finance_approval_metadata.sql` | Migration emitted by Drizzle Kit, with its snapshot and journal metadata |

The repository uses its installed Next.js version. No framework version change is included. New server helpers use Drizzle and the existing libSQL client, injected for testing. The existing generic ERP API and source upload adapter retain their storage interface.

## Import lifecycle

Uploading a source file still saves review only rows. It does not change cash, profit, budgets or ledger balances. The approval workflow is separate from upload completion and cleaned source revision activation.

1. Complete the source upload and verify row count and manifest.
2. Prepare one decision for every row. Choose a supported posting mapping, or exclude the row with a reason.
3. Resolve anomalies and review the preflight result. Preparation creates only approval metadata.
4. Display the exact prepared review hash and mappings to the finance user.
5. The user confirms the review and provides an approval note.
6. Approval revalidates source integrity, duplicates, permissions, live target versions and the complete batch. It persists engine generated records and journal entries in one Drizzle transaction, together with posting keys, audit records and the approval.

A failed write rolls everything back. A retry of an already posted review returns the original result. A posted source batch cannot be superseded through the old revision endpoint; use a controlled accounting correction.

## Source checks

The service checks source row hashes and manifest, exact row coverage, posting permissions for each business, duplicate source flags, repeated economic keys inside the batch, earlier approved imports and matching native ledger documents. The duplicate key uses business, date, mapped transaction type, normalised description and amount. It is a conservative duplicate candidate check, not proof that differently described transactions are distinct. Reconciliation remains necessary.

Shared or unassigned entries, missing or future dates, nonpositive amounts, unknown currency basis, totals and subtotals, held rows, paid amounts exceeding stated fees and unresolved anomalies cannot post. Inferred dates or assumed currency require a recorded resolution. General anomaly notes require a resolution; duplicate flags and hard missing fields must be corrected in a new source revision or excluded.

Forecasts, salary schedules, unpriced items and unresolved pending balances remain outside the ledger. Posting requires explicit accounts and existing same business party or settlement references. Multiple receipts against the same invoice are simulated and applied sequentially inside the approval transaction. Loan settlements require an explicit interest split, including zero for principal only.

## Supported mappings

| Source kind | Mapping |
| :--- | :--- |
| Invoice | Existing invoice creation and posting, with explicit VAT rate |
| Supplier bill | Existing bill creation and posting, with explicit VAT rate and expense or asset account |
| Cash out | Expense or settlement of an existing posted bill or loan |
| Cash in | Cash sale, customer advance or settlement of an existing posted invoice |
| Client receipt | Existing invoice receipt or a project customer advance |
| Company account funding, Personal funding | Capital or opening equity funding, or loan proceeds |
| Loan proceeds | Existing loan creation and posting |
| Debt payment | Settlement of an existing bill or loan |
| Debt balance | Reviewed receivable or payable opening journal with a linked party |

Invoices and bills treat the source amount as gross. They derive a net amount only when the explicit VAT rate reconciles exactly through the existing whole UGX rounding rules. A one UGX discrepancy blocks the simple mapping. Cash sale, customer advance and expense mappings use the gross amount and do not infer VAT; use a detailed invoice or bill when VAT treatment is required. Opening journals do not create invoice ageing documents. Existing subledger reconciliation remains necessary.

There is a maximum of 100 posted transactions per source batch. Larger workbooks must be split into independently reconciled batches. All rows in the selected batch still require a decision. The original source rows are preserved.

## TypeScript usage

```ts
import { getDb } from '@/db';
import {
  prepareImportPosting,
  approveAndPostImport,
} from '@/lib/finance-import';

// access must come from the server authenticate() function.
const db = getDb();
const review = await prepareImportPosting(db, access, importId, [
  {
    rowId: '1:2:G',
    action: 'post',
    posting: {
      type: 'expense',
      account: 'Bank',
      expenseAccount: 'Operating expenses',
    },
    resolution: 'Payment account and source date matched to the bank statement.',
  },
  {
    rowId: '1:3:G',
    action: 'exclude',
    reason: 'Subtotal, not a separate transaction.',
  },
]);

// Separate request, after the user reviews the exact plan and confirms.
const result = await approveAndPostImport(db, access, importId, {
  confirmed: true,
  reviewHash: review.reviewHash,
  note: 'Source rows, exclusions, accounts and amounts reviewed.',
});
```

`Owner`, `Administrator` and `Finance` can approve within their company access. Mixed business or unallocated batches require access to both businesses. Upload keys do not authorise approval. The reviewer identity comes from the authenticated context, not the request body. This is an explicit sign off, not an enforced two person approval policy.

## Milestone recognition

Finance configures future contract performance milestones, with positive whole UGX amounts excluding VAT. Their total must equal the approved contract value. Already completed milestone stages cannot be configured retroactively; schedules are locked once recognition exists. Early gates not included in the schedule may already have been approved.

The project stores this approved schedule in its existing payload. Ordinary project edits cannot replace the finance approval. The existing operational gate UI still calls `advance_gate`; the shared engine now generates the configured recognition as part of that same plan.

For a 1,000,000 UGX net deferred invoice with 18% VAT, the existing journal receives:

| Account | Debit UGX | Credit UGX |
| :--- | ---: | ---: |
| Accounts receivable | 1,180,000 | 0 |
| Deferred revenue | 0 | 1,000,000 |
| VAT payable | 0 | 180,000 |

A configured 300,000 UGX gate milestone generates:

| Account | Debit UGX | Credit UGX |
| :--- | ---: | ---: |
| Deferred revenue | 300,000 | 0 |
| Sales revenue | 0 | 300,000 |

Sales revenue is the existing earned revenue account. Only the Deferred revenue liability account is added to the account list. The existing profit report and budget actuals pick up earned revenue; the balance sheet now includes the deferred liability.

Recognition checks the approved gate, project history, company, finance schedule and available project deferred balance. Repeated calls return the same journal record. Repeated stage claims are blocked. Source records and reversals determine the available balance; totals are not read from a separate balance table. Project version locks serialize deferred funding, adjustments and recognition with gate approval.

A scheduled gate with insufficient deferred revenue fails before the gate and journal can commit. Configure and post the deferred invoice or advance before the scheduled earned milestone. A project gate alone does not determine an accounting recognition policy: the schedule must first be approved by finance against the contract.

```ts
import {
  configureRevenueSchedule,
  recognizeMilestoneRevenue,
} from '@/lib/finance';

await configureRevenueSchedule(db, access, projectId, {
  expectedVersion: projectVersionReviewed,
  contractValue: 1_000_000,
  milestones: [
    { stage: 'Execution', amount: 300_000 },
    { stage: 'Handover', amount: 700_000 },
  ],
  confirmed: true,
  approvalNote: 'Performance obligations and amounts checked against the signed contract.',
});

// Existing invoice create request, followed by the normal post action:
const invoiceFields = {
  type: 'invoice',
  projectId,
  revenueRecognition: 'Deferred',
  lines: [{ description: 'Contract', qty: 1, rate: 1_000_000 }],
  taxRate: 18,
};

// Normally recognition already occurred atomically during gate approval.
// Use the actual project_gate record ID, not the parent project ID.
const recognised = await recognizeMilestoneRevenue(
  db,
  access,
  projectId,
  gateId,
);
```

Operational approvers may trigger only the exact automatic journals from a previously finance approved schedule. Explicit recognition calls remain finance restricted. Generic API requests cannot supply automatic posting permissions or alter recognition metadata.

Deferred intercompany invoices are intentionally unsupported. Existing immediate revenue invoices are unchanged. Legacy earned revenue is not silently reclassified. Credits and reversals that would disturb earned contract revenue require controlled finance adjustment; recognition records themselves cannot be voided through the ordinary reversal action.

## API

Use the existing authenticated session and same origin JSON POST requirements.

| Request | Action |
| :--- | :--- |
| `POST /api/finance-workflows` with `action: "prepareImport"` | `importId`, all row decisions |
| `POST /api/finance-workflows` with `action: "approveImport"` | `importId`, `confirmed`, `reviewHash`, `note` |
| `GET /api/finance-workflows?importId=ID` | Reload the current prepared or posted review |
| `POST /api/finance-workflows` with `action: "configureRevenue"` | Approved future project schedule |
| `POST /api/finance-workflows` with `action: "recognizeMilestone"` | `projectId`, actual `gateId` |

Validation failures return structured workflow codes and row issues. A stale record returns HTTP 409. No browser submitted reviewer or approval timestamp is trusted.

## Deployment

Run the finance posting tests, existing regressions, type checking and production build. Back up and verify restore access before applying `npm run db:migrate` in the intended database environment. Migration 0010 and its metadata were generated using `drizzle-kit generate`, not handwritten DDL. Do not apply `drizzle-kit push` to the production database.

The approval and schedule APIs are implemented. Dedicated browser forms for row mapping, user sign off and schedule setup remain a frontend integration step. The existing import view now reports posted approval status accurately. Projects remain disabled in the default CRM and Finance profile; the revenue setup and explicit recognition services reject calls there. Automatic recognition is ready for the retained full operational profile when Projects are enabled deliberately.

No production records, live database or deployment were changed by this implementation.

## Verification and remaining acceptance

Local verification uses a real temporary libSQL database with Drizzle, plus the existing application regression suites. The new suite covers signed approval, repeat requests, source and ledger duplicate candidates, unresolved rows, multiple receipts, deferred invoice VAT, gate recognition, insufficient deferred balances, company and role restrictions, disabled Projects in the core profile, and rollback of business records, journal entries, audit and operation rows after an injected write failure.

Source integrity here means the saved extract matches its supplied row hashes and manifest. It does not independently verify the original binary workbook or bank statements. No remote Turso throughput, authenticated browser workflow, production backup restore or real user sign in is established by local tests. Test a representative batch in an isolated preview database before business rollout.

Local QA on 23 October 2026: all 40 new finance workflow assertions passed against temporary libSQL. Existing Finance, planning, import, core release, security, operational workflows, CRM workflow, migration, runtime, component, layout and UI suites passed. Production build, TypeScript, bundle and HTTP checks passed. The lint baseline gate found no new errors; 379 existing strict lint errors and 53 warnings remain. The generated migration and new suite are included in GitHub CI.
