# Budget and cash flow release 1.1.9

Finance now includes Budget and Cash flow sections. Their current period statuses also appear on the Finance overview. Hagadol and WMK maintain separate targets. Group combines plans only when their start and end dates match.

## Budget

Set a revenue target, operating cost ceiling, owner and period. Periods may cover a month, quarter or a custom range up to 366 days. Actual revenue and costs are calculated from ledger entries within that period through the selected As at date, capped at the period end. Drafts, later postings and later reversals do not change historical results. Revenue excludes recorded VAT. Costs include operating expenses and interest, while equipment and inventory asset purchases are excluded.

Expected figures use the elapsed share of calendar days, including both the first and last day. Revenue is On track when it reaches that share of the target. Costs are On track when they remain within that share of the ceiling. Both must pass for the budget to be On track. The table shows full period targets, expected figures to date, actuals, favourable variances and status. Planned and actual operating results appear below it.

## Cash flow

Set an inflow target, outflow ceiling, minimum cash balance, owner and period. Actual inflows and outflows come from the cash accounts, including funding and loan payments. Transfers between Bank, Cash and Mobile money have no net cash flow and are excluded. Opening cash plus net recorded movement reconciles to closing cash.

The minimum cash target applies to both recorded cash and a projection from dated unpaid invoices and bills. A projected shortfall therefore flags Off track even when current cash remains above the minimum. Future dated payments are excluded from actuals at an earlier date, and unpaid balances are reconstructed at that date.

The outlook assumes that outstanding dated invoices and bills due by the period end settle fully during the remaining period, including overdue balances. Documents with no due date are counted and excluded. Unrecorded payroll, future loan repayments and other unbooked costs are excluded from this document projection; account for them in the cash outflow target. The plan closing balance and the document projection remain separately labelled. Once the period ends, projected cash equals recorded closing cash at that period end.

Cash movements and document outlook are shown even before a target is set. Without targets the module shows no On track result.

## Group and status rules

A Group plan is Incomplete when either business lacks a plan for the selected exact dates. Group remains Off track if its combined figures fail or either business is Off track, preventing one business from hiding the other's shortfall. Future periods show Not started.

Matched internal income and costs are removed from Group budget actuals. Matched cash settlements are removed equally from Group inflow and outflow. Partial settlement timing differences remain visible. In the document projection, the common unpaid balance is eliminated while unmatched residual payment differences remain. Unmatched internal documents are flagged for review.

## Saved plans and controls

Plans are saved in existing record JSON through the transactional ERP API. No database migration is needed. Saving, editing or archiving targets does not create ledger entries. Owner and valid dates are required. Monetary targets must be whole nonnegative UGX up to one trillion, with at least one positive target. Only one active plan of each type may overlap a business on a given date. Plans are editable with version checks and may be archived with confirmation. Archived history remains visible.

Both comparison and cash outlook export to CSV using the existing formula injection safeguards. Sample targets illustrate the indicators; no live plans are invented or populated from examples. Existing EOS, CRM and accounting records remain separate.

## Verification

Planning QA covers target validation, overlaps, inclusive pacing, future and ended periods, historical credits and reversals, VAT and asset treatment, internal cash transfers, projected shortages, future payments, missing due dates, company and Group rules, target edits, archive history, opening and closing cash reconciliation and component rendering. Isolated SQLite API QA checks persisted plans, retries, invalid overlaps, owner requirements, version conflicts, replacement plans and unchanged journal row counts.

Type checking, Finance regression, the full workflow suite and all component renders must pass before packaging. Production build is required before private publication. Browser interaction checks remain pending for forms, focus, narrow screens and CSV downloads because browser QA is unavailable in this environment. The existing private audience is preserved.
