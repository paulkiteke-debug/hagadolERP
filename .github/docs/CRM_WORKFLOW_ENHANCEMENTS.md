# CRM workflow enhancements

Implemented against the repository's installed Next.js version. No framework downgrade or production database operation is included.

## Files

| File | Purpose |
| :--- | :--- |
| `lib/crm.ts` | Company specific validation, typed field errors, canonical stage aliases, immutable stage visit tracking and lazy database helper exports |
| `lib/crm-data.ts` | Drizzle activity writes, unified Customer History, billing verification and velocity metrics |
| `db/schema.ts` | New activity table, references, checks and timeline indexes |
| `drizzle/0009_crm_activity_timeline.sql` | Additive migration generated from the Drizzle schema |
| `app/api/crm/route.ts` | Authenticated history, activity, verification and velocity endpoints |
| `app/api/erp/route.ts` | Structured validation responses on the existing mutation API |
| `lib/erp-engine.ts` | Guardrails on creation, stage actions and edits; trusted stage and activity timestamps |
| `tests/crm-workflow-qa.ts` | Real libSQL and Drizzle integration tests |

## Company requirements

Customer company means a CRM customer account, not the owning Hagadol or WMK business. `companyId` refers to the customer's `crm_company` record. The separate workspace company column remains `Hagadol` or `WMK`.

Hagadol Quotation, Negotiation, Pending deposit and Won require a positive deal amount, a linked customer company with tax PIN or TIN and approved billing details, a technical survey record and an assessment attachment reference. A survey record includes its reference, assessor, date and findings.

WMK Fee proposal, Negotiation and Won require a positive amount, a linked customer company with tax PIN or TIN and approved billing details, and the client design brief. A water site survey is not required for architecture fee proposals.

Won additionally requires the contract or appointment reference, client name, signature date through today and signed document reference. `Proposal` and `Proposal Sent` map to Hagadol Quotation or WMK Fee proposal. `Closed Won` maps to Won. `Closed Lost` maps to Lost.

The tax reference is checked for presence. It is not validated against a tax authority. Attachment validation checks document name and an HTTPS URL without embedded credentials. It does not fetch or verify the contents, grant document access, upload a file, prove a signature or establish legal validity. Use stable document links rather than expiring signed download URLs.

## Billing approval

Only Owner, Administrator or Finance may approve billing details through the dedicated API. The reviewer and timestamp come from the authenticated server context. The approval records the exact address and tax reference reviewed. Ordinary record writes cannot assert an approval. Editing either reviewed value clears it. Stage updates include the customer version in the existing optimistic commit check.

This is a recorded human review, not automated postal address verification.

## TypeScript usage

```ts
import { getDb } from '@/db';
import { getCustomerHistory, logCRMActivity, getPipelineVelocity } from '@/lib/crm';
import { verifyCustomerBilling } from '@/lib/crm-data';

// access must come from the existing server authenticate() function.
const db = getDb();
const history = await getCustomerHistory(db, access, { companyId: customerId });
const contactHistory = await getCustomerHistory(db, access, { contactId });
const dealHistory = await getCustomerHistory(db, access, { dealId });
const nextPage = history.nextCursor
  ? await getCustomerHistory(db, access, { companyId: customerId }, {
      limit: 50,
      before: history.nextCursor,
    })
  : null;

await logCRMActivity(db, access, {
  dealId,
  kind: 'Call',
  description: 'Discussed the quotation with the customer.',
  outcome: 'Customer requested a revised delivery date.',
});

await verifyCustomerBilling(db, access, customerId, reviewedVersion);
const velocity = await getPipelineVelocity(db, access, 'Hagadol', {
  stagnantDays: 14,
});
```

All new database helpers use Drizzle's libSQL adapter. The database is injected, allowing real temporary database testing. Existing general ERP persistence and authentication retain their existing storage adapter.

## Stage validation

```ts
import { validateDealStageTransition } from '@/lib/crm';

const validation = validateDealStageTransition(
  deal,
  'Quotation',
  todayInKampala,
  visibleCustomerRecords,
);
if (!validation.ok) {
  // Render each error beside its field. Do not advance the stage.
  return { code: validation.code, errors: validation.errors };
}
```

The existing `POST /api/erp` now returns HTTP 422 for guardrail failures:

```json
{
  "code": "CRM_STAGE_VALIDATION",
  "error": "An authorised reviewer must verify the current billing and tax details.",
  "errors": [
    {
      "code": "CUSTOMER_BILLING_UNVERIFIED",
      "field": "customer.billingVerification",
      "message": "An authorised reviewer must verify the current billing and tax details."
    }
  ]
}
```

Deal metadata is saved using the existing edit endpoint. Example fields:

```ts
const fields = {
  crmStage: 'Quotation',
  siteAssessmentAttachment: {
    name: 'School site assessment.pdf',
    url: 'https://documents.example.com/assessments/school',
  },
  technicalSiteSurvey: {
    reference: 'SURVEY/2026/001',
    assessedBy: 'Responsible engineer',
    assessedOn: '2026-10-23',
    findings: 'Recorded site observations and technical requirements.',
  },
  contractMetadata: {
    reference: 'CONTRACT/2026/001',
    signedOn: '2026-10-23',
    clientName: 'Customer legal name',
  },
  contractAttachment: {
    name: 'Signed agreement.pdf',
    url: 'https://documents.example.com/contracts/school',
  },
};
```

## API

| Request | Purpose |
| :--- | :--- |
| `GET /api/crm?companyId=ID` | Customer company history |
| `GET /api/crm?contactId=ID` | Contact history |
| `GET /api/crm?dealId=ID` | Opportunity history |
| `GET /api/crm?view=velocity&company=Hagadol&stagnantDays=14` | Pipeline metrics |
| `POST /api/crm` with `action: "log"` | Log a Call, Email, Meeting, Note or Task Reminder |
| `POST /api/crm` with `action: "verifyBilling"`, `companyId`, `expectedVersion` | Approve current billing details |

History accepts `limit` from 1 to 100. For the next page send both `beforeTimestamp` and `beforeId` from `nextCursor`. Writes require the current authenticated session, JSON content type and the existing same origin check. Activity authors cannot be supplied by clients. Roles and owning business permissions are checked again by the helpers. They inherit validated contact and customer links from deals and reject conflicting links.

## History and metrics behaviour

The feed merges new CRM activity rows, existing CRM calls, meetings and tasks from `records`, and newly recorded stage visits. Existing tasks remain in their original table, so there is no duplicate migration or copy. EOS activities are excluded. Entries contain author, timestamp, outcome and source. Unknown historical authors are null. For legacy date only completions the timestamp is normalised to midnight UTC; this is day precision, not a measured completion time. Notes remain in the description when the old record has no separate outcome.

Stage timing begins with new recorded visits. Historical imports preserve their source stage and receive `crmStageReviewRequired`; previous visit timestamps are not invented. Their next movement must pass validation. Ordinary API requests cannot turn on the internal historical import option. Repeated visits remain separate; reports sum elapsed hours and show completed visit averages separately from open visits.

Stagnation means an open deal has no completed legacy task or logged deal interaction for at least 14 days, or has reached that age without any interaction. Scheduled reminders and stage movements do not count as customer interactions. Won and Lost deals are excluded. Contact only interactions appear in customer history but do not automatically reset every linked opportunity's inactivity clock.

## Deployment and scope

1. Run `npm run test:crm-workflow`, the normal regression checks and the production build.
2. Back up the production database and test restore access.
3. Apply `npm run db:migrate` in the intended environment before deploying the code. The migration is additive; it creates no sample or business records. Do not use `drizzle-kit push` on the live database.
4. Connect the form controls to these metadata fields, the billing review action and the timeline endpoint before a business rollout of strict stage validation.

This change provides the backend and API integration. The current React CRM forms do not yet expose all new survey, contract and billing review controls, and the new unified timeline is not yet wired into the customer panel. Existing sample fixtures were updated to remain usable. The live Vercel application and database have not been changed. Email activities are manual logs; Zoho Mail synchronisation is separate work.

## Verification on 23 October 2026

The new Drizzle and libSQL integration suite passed 44 assertions. Existing workflow regression passed 395 assertions, including a structured HTTP 422 response check. Core release, CRM, Bigin contact and pipeline import, activity import, security, migration, runtime, Finance, planning, finance import, component rendering, UI rendering and layout suites passed. Production build, TypeScript, bundle checks and HTTP smoke checks passed. The lint baseline gate reports no new errors; 390 existing strict lint errors and 53 warnings remain. No real browser, remote Turso connection, Google sign in or production mailbox was tested by this change.

A local HTTP rerun detected an empty generated Next.js pages manifest. The generated build directory was moved aside and the application was rebuilt from a clean output directory. The clean build, TypeScript, bundle checks and all 29 HTTP smoke assertions passed. No source configuration workaround or production change was needed.
