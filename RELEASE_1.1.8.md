# Finance release 1.1.8

The Finance module opens at `/finance`. The layout follows the useful daily workflows in Zoho Books while preserving the ERP's existing double entry accounting engine. The existing CRM and EOS modules remain available.

## Daily workflow

1. Choose Hagadol or WMK. Group combines their records and applies matched internal balance eliminations on the overview.
2. Create a customer or supplier in Finance. Billing details share the CRM directory. Company and contact records remain separate identities even when their names match.
3. Create an invoice or bill and select its linked customer or supplier. A blank due date uses that party's payment terms. Hagadol keeps delivery stages and field cost categories; WMK keeps professional fee stages and design cost categories.
4. Save the draft, review it, and post to accounts. Drafts have no ledger effect. Posted documents are locked; corrections use credits or dated reversals.
5. Record partial or full payments against the posted document. The payment reference and linked party are retained. Posting an expense already records its cash payment, so a second payment is rejected.
6. Review balances and ageing using the As at date. Download the currently filtered document, party, payment or ageing view as CSV. Open a document for printable output, credits or reversal.

## Finance sections

Overview shows receivables, payables, cash account balances and monthly cash movements. Receivables and payables come from the ledger, including opening journals. Group subtracts matching internal receivable and payable balances; unmatched documents are flagged. Monthly cash movements include funding and loan repayments and exclude transfers between the cash accounts. Overdue amounts are gross document balances, with internal transactions included.

Customers and Suppliers show billing profiles, payment terms, linked outstanding balances and a statement of posted invoices or bills. Recorded payments and credits have a separate history. Posted document snapshots retain their original customer name after a directory name change. Existing typed names are not silently matched to directory entries.

Invoices, Bills and Expenses provide search, status filters, direct posting and payment actions, and matching CSV exports. Statuses distinguish draft, open, part paid, overdue, paid and voided. Current document lists show saved record balances, including future dated payments. Use the dated overview, statements or ageing reports for historical balances.

Payments includes customer receipts, supplier payments and loan repayments. Paid expenses remain in Expenses. Existing payment records without party fields display the party from their linked document.

Ageing reconstructs posted balances at the chosen date, including payment and credit reversals. Buckets are Not due, 1 to 30 days, 31 to 60 days, 61 to 90 days, Over 90 days, and No due date. These are gross document balances; opening journals have no invented invoice ageing. Group eliminations remain on the overview and Group consolidation report.

Existing Receivables and Payables reports now also reconstruct balances through their To date or today's Kampala date when blank. Their From date does not reduce the balance list. Balance sheet and other dated ledger reports exclude future entries by default.

## Controls and compatibility

No schema migration or rewriting of live records is required. New billing fields and party links live in existing record JSON. References must belong to the same business. Terms must be whole days from 0 through 365. Invoice and bill due dates cannot precede their document date. Credits and receipts inherit the source invoice identity.

API writes retain transactional posting, optimistic version checks, request idempotency, locked posted records, balanced entries and dated reversals. CSV text uses the existing formula injection safeguards. Sample finance documents now have explicit party links and a valid overdue invoice issue date. All examples remain sample records.

Zoho Books is a benchmark, not an active data connection. Zoho migration and reconciliation, automatic bank feeds, tax filing, payment gateways and finance email dispatch have not been activated. VAT is manually entered per document; an accountant must verify treatment and opening balances before operational acceptance.

## Verification

Finance QA covers historical balances, future payments, payment and credit reversals, complete settlement, rejected overpayments, posted expense cash effects, due terms, ageing boundaries, same name identity separation, company isolation, Group eliminations, opening journal balances and server rendering of all finance sections and billing forms.

The isolated SQLite API suite covers persisted linked parties, due dates, payment retries, rejected cross company references, rejected invalid terms, overpayments and reversal readback. The broader component suite covers every module and Finance section. CRM regression QA remains included. Type checking and production build must succeed before publication.

Validated before packaging: 88 Finance checks, 381 workflow and isolated API checks, 95 CRM regression checks, and 1,646 component assertions across 461 renders and 21 views. Type checking passed.

Browser interaction acceptance remains pending: small screens, keyboard focus, draft entry, posting, payments, profile cancellation, CSV downloads and print output need real browser verification. This release preserves the existing owner private audience and does not enable staff access or external integrations.

## Benchmark sources

Official Zoho Books references reviewed:

* https://www.zoho.com/us/books/help/home/
* https://www.zoho.com/us/books/help/reports/receivables.html
* https://www.zoho.com/us/books/help/bills/

These informed the overview, balance lists, payment workflows and document status concepts. No vendor code or exact screen assets are copied.
