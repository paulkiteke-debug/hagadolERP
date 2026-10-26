# Finance workbook imports

Finance → More → Imports stores source workbook records in D1 for reconciliation. The original company, source sheet and cell, date basis, amount and review notes are retained. The register is separate from business records and journal entries. Importing alone does not change cash, profit, budgets or EOS actuals.

Only Owner, Administrator and Finance users with access to both WMK and Hagadol can open this combined source register. Sales, office screens and staff with access to one company cannot retrieve it. Company filters separate the reviewed company records. Shared and unassigned source records appear in Group.

Imports use batches of at most 50 validated rows, source cell uniqueness and a SHA256 manifest of normalized row payloads. Identical retries preserve existing rows. Changed rows are rejected. A batch becomes available for reconciliation only after its record count and complete manifest match. Completion creates an audit event and seals the source rows.

For an authorised initial workbook upload, configure temporary server secrets FINANCE_IMPORT_KEY and FINANCE_IMPORT_SOURCE_HASH. The key grants access only to the specified source file and only to staging operations. It cannot access or change the ledger, staff permissions or other company records. The Sites service boundary also remains owner private. Remove these temporary values and redeploy after verifying the completed upload.

The current screen lists and exports saved source records. Direct browser Excel parsing, editing mappings and ledger posting from the register remain future work. Reconcile company allocations, tax and asset classifications, bank accounts, duplicate payment schedules and opening balances before posting historical accounts.

The uploaded source is not part of the Git repository, browser bundles or schema migrations. Database migrations create empty tables only.
