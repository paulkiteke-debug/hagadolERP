# Original Bigin CSV import

This update connects the CRM import review screen to a server validated, approved
Contacts and Companies import. Other ERP modules and the existing ZIP import API
remain in place. The current Owner and Administrator profiles may approve imports;
Sales managers retain local preview rights and cannot approve or post.

## Storage and approval

Migration `0012_crm_csv_staging.sql` adds `crm_csv_sessions` and `crm_csv_rows`.
The Drizzle schema and snapshot are included. Staging rows are separate from live
business records. The server validates every source row and the ordered row hash
manifest before moving a session to Review. Explicit approval records the signed
in reviewer. Each posting batch is a transaction of at most 50 records, original
source mappings, audit entries and a progress update. Stable record IDs and a
unique operation key prevent batch replay and concurrent double posting.

Source values are retained without trimming in the staging rows and biginSource
metadata. Mapping uses a separate normalized copy. The source hash is a canonical
fingerprint of the parsed source rows, not a claim to archive the exact CSV bytes.
Headers, custom fields, quoted commas, line breaks, original IDs and phone row
associations are preserved. No sample row is inserted. Last Name is a name field,
never an inferred company or job title.

Previously imported IDs in the same operating company are skipped and counted.
Existing business records are not updated. Different source IDs that share email
or phone are flagged and retained separately after reviewer confirmation. The
server repeats duplicate checks against existing company records. A repeated ID
inside the same file blocks import. Imports in Hagadol do not modify WMK records.

Review and posting reauthenticate each request and check current company and role
permissions. Only the original reviewer and authorised import administrators in
the same company can continue a staged session. Revoking access takes effect on
the next request. A stage error creates no business records. A posting failure
rolls back the current batch; prior committed batches remain and the same upload
can resume. Source ID conflicts created after review stop the batch for review.

## Capacity and dates

Limits are 10,000 populated records and 20 MB per file, with at most 100 columns
and 10,000 characters per source field. The normal request limit remains 512 KB;
file data is sent in batches, never as a single 10,000 row request. Rate limiting
is retained. The browser automatically pauses on 429 and retries twice.

Bigin month/day/year timestamps and ISO dates are explicitly validated against
calendar dates. Timezone conversion is not inferred. Original timestamp strings
are retained. A blank creation timestamp uses the import date only for the ERP
record and is marked dateBasis=imported with a review flag.

## Verification

Run `npm run test:crm-csv` for temporary database API tests. It performs complete
10,000 company and 10,000 contact imports, validates approval and replay behavior,
checks preserved row associations, rejects unauthorized roles and company scope,
and confirms no finance journal entries are created. The browser test uses the
real component with intercepted synthetic transport; API tests separately exercise
actual SQL transactions. It does not replace Google login acceptance in Preview.

The source CSV supplied on 25 October was read locally and all 199 populated rows
mapped successfully. Its 483 fully empty rows are excluded. No real customer data
is bundled with tests or the source archive. No live database was changed.

Apply the migration to the separate CRM Preview database before pushing the
crm-review branch. Production migration and release require a separate rollout.
