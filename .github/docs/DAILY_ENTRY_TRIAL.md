# CRM and Finance daily entry trial

Start with one business and a small set of source documents. Reconcile the result before entering the next batch.

## Choose the workspace

For practice, open the Live menu at the top of the ERP and choose Try sample workspace. Confirm the Sample banner is visible. Choose Hagadol or WMK in the business selector. Entries made through the CRM and Finance record forms run in browser memory and reset when you reload. Sample balances already include illustrative records, so compare changes from the starting balance. Sample mode is not a durable test database.

For real business records that must be retained, use Live after checking the company, source document and whether the record already exists. Create drafts first. Posting changes accounts. Never post an invented invoice or payment in Live for practice.

Workbook upload, external connections, approval APIs and signed document checks are outside this first manual entry trial. Do not call those endpoints with production credentials for testing. Use a separate Turso test database and a preview deployment for durable tests of the complete import workflow.

## Trial sequence

Use the actual values and dates from the source documents for real records. The amounts below are illustrative software test inputs only. A zero tax rate is a test fixture, not a determination of your tax treatment.

| Step | Enter or do | Expected result |
| :--- | :--- | :--- |
| 1 | CRM, Companies: create one customer company | Correct business is shown and the company is searchable |
| 2 | CRM, Contacts: create one contact linked to that company | The contact opens with the correct company, email and phone |
| 3 | Pipeline: create an opportunity at New with an owner and next action | It appears once in the New stage with the entered value |
| 4 | Add a follow up activity with an owner and due date | It appears in Activities and the linked record history |
| 5 | Finance: create a draft invoice for UGX 100,000 with zero test tax | Draft invoice total is UGX 100,000; ledger balances do not change |
| 6 | Post that invoice in Sample | Receivables increase by UGX 100,000; cash does not change |
| 7 | Record UGX 60,000 received against that invoice into Bank | Invoice balance becomes UGX 40,000; Bank increases by UGX 60,000 |
| 8 | Create and post an operating expense of UGX 20,000 paid from Bank | Bank decreases by UGX 20,000; operating costs increase by UGX 20,000 |
| 9 | Check Finance overview and reports | Net Bank change is plus UGX 40,000; invoice balance is UGX 40,000 |
| 10 | Select the other business | The first business records are excluded; Group includes both businesses |

Advanced deal stages enforce company requirements. Quotation and Won may require verified billing information, assessment evidence, design briefs or signed contract metadata. The backend checks are implemented; some dedicated verification and evidence controls still need browser form integration. Do not disable a guardrail to pass the trial. Record the missing control and leave the opportunity at its current stage.

## What to record

For each step capture the business, record reference, expected result, actual result and any screenshot. Hide personal contact details when sharing screenshots. Record whether you were using Sample or Live. Check keyboard navigation, a narrow screen, long customer names and large amounts.

After the trial, send five to ten CRM records and a small set of invoice, payment and expense source records for mapping and reconciliation. Do not share database tokens or environment files. Uploading source files into this conversation does not import them into the ERP.

## UI changes in this package

The first pass adds visible result counts and clear filter actions, resets CRM pagination when filters change, aligns amount columns, keeps table headings visible while scrolling, wraps long finance descriptions and makes save state text visible in CRM and billing forms. Existing accounting calculations, permissions and database schema remain unchanged.

The package extends version 1.3.1 and requires no additional migration. Copy the updated source into the existing repository, run the checks and production build, review the changed files, then commit and push using the same deployment process. Keep private environment files and database backups outside the commit.

Local verification on 24 October 2026: 95 CRM checks, 92 Finance checks, 108 layout checks and 78 UI checks passed. The production build passed. Browser interaction and the new layout at mobile sizes still require acceptance on a test deployment. The existing lint debt remains documented in CI_DEPLOYMENT_CHECKS.md.
