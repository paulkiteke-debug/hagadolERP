# Hagadol ERP 1.1.1

Release date: 10 October 2026. Private owner workspace for Hagadol, WMK and Group reporting.

## What changed

1. Document register with company specific IDs, source references, HTTPS file links, project links, revisions, classifications, owners and review dates.
2. Knowledge records with statements, categories, document evidence, authenticated verification and source version tracking. Expired or changed evidence makes a verified statement need review. Restricted sources cannot support externally approved statements.
3. Project gates with distinct Hagadol and WMK lifecycles. Advancement requires current verified project evidence, a recorded decision and explicit confirmation by the authenticated owner. Each approval stores evidence versions and the project scope at approval. The server rejects evidence changed since the reviewer selected it. Approved gate history is immutable. The final gate records the actual project completion date.
4. EOS actual links for posted revenue, operating costs, open pipeline, customer and supplier balances, website visits and enquiries, recorded social reach, active projects and completed projects. Targets, owners and Rock assessments remain management decisions. Linked metrics appear in EOS, Executive and Office display, and the authenticated ERP read API returns the calculated actual and source note. Completed L10 minutes retain the calculated actual, source and calculation note.
5. Different industry profiles for CRM and finance. Hagadol uses water and site qualification, installation billing and field cost categories. WMK uses building briefs, professional appointments, design fee stages and consultancy cost categories. The shared accounting structure supports separate company ledgers and consolidated reporting.
6. Industry analysis under Sales shows posted service revenue and operating costs separately for each company. Existing uncategorised documents appear explicitly rather than receiving inferred industry categories.

## Use the document register

1. Select Hagadol or WMK, then open Knowledge and documents → Document register.
2. Register the actual source, revision, owner, review date and optional file link. Attach the project where relevant.
3. Choose the appropriate classification. Verification accepts Verified Evidence, Authoritative or Restricted.
4. Save as Draft, move to Review, inspect the actual source and Verify record.
5. Verified records are locked. Return to Draft for correction, or Create revision to retain the previous document reference.

The register stores file references and links. It does not upload or generate DOCX, PDF or spreadsheet files. Source documents remain in your chosen file system. Classification does not create staff permissions; current access remains owner only.

## Verify knowledge

1. Open Knowledge records and enter a company statement, category, owner and review date.
2. Link its source document from the same company.
3. Move to Review and verify after checking the source. The ERP captures the authenticated reviewer and source version.
4. Reverify the statement when its evidence changes or either review expires.

No facts from the supplied implementation examples are inserted into live records. Sample statements are clearly marked as practice records. Knowledge is not automatically sent to OpenAI or Claude. The existing proposal assistant still sends only the selected saved bid and proposal context.

## Approve project gates

New projects start at Qualification with gates enabled. For an existing project, Enable evidence gates preserves the old delivery stage and starts a new review sequence. Earlier stages are not silently marked approved.

Hagadol: Qualification → Site assessment → Survey and design → Proposal and contract → Mobilisation → Execution → Testing and commissioning → Handover → Care.

WMK: Qualification → Design brief → Fee proposal and appointment → Concept design → Design development → Drawings and approvals → Site supervision → Handover → Defects follow up.

1. Select a project in Projects.
2. Register the evidence types listed under the current gate and verify them in the document register.
3. Select those documents, record the acceptance decision and confirm review.
4. Approve the gate to advance. Skipping stages or changing a gated delivery stage in an edit is rejected.
5. Review the approval history for evidence versions and subsequent source changes.

Gate approvals record human review. They do not issue engineering certification or calculate pump, solar, storage or structural specifications. Changed or expired historical evidence is flagged in the approval history; historical approvals remain recorded. Stage requirements are current default workflows, not buyer specific contractual requirements.

## Link EOS metrics

1. Open EOS → Scorecard and add or edit a metric.
2. Select a full Week, Month or Quarter, assign its owner and target, then choose Actual source.
3. Choose Manual for a management entered measure, or a recorded source for an automatic calculation.
4. Review the calculation note and cutoff. The metric calculates through today or the period end, whichever is earlier.

Financial sources use posted journal entries, including dated reversals. Revenue excludes VAT. Company metric values include internal transactions; Group consolidation remains the place to review eliminations. Pipeline and active project metrics use current statuses, not historical stage reconstruction. Completed projects require a recorded completion date. Existing completed projects without that date are not inferred.

Website and social links use recorded snapshots until authorised provider integrations are built. Missing data, overlapping snapshots within a channel or snapshots crossing a reporting boundary show Needs data. Social reach sums recorded channel reach; it does not deduplicate audiences across platforms.

## Industry setup

Choose Settings → Industry profiles to see each company's stages and finance categories. Enter the correct service line and sector on CRM records. On quotations and invoices choose the delivery billing or fee stage and commercial basis. On bills and expenses choose the industry cost category. Quotation conversion retains these dimensions.

Hagadol services: Boreholes, Water supply, Solar pumping, Water treatment, Irrigation and Maintenance.

WMK services: Architecture, Interior design, Site supervision, Construction management and Planning consultancy.

Industry analysis uses posted document values excluding VAT and linked posted credits. It excludes manual journal adjustments and capital or inventory purchases from operating costs. Use Profit and loss for the full ledger total and Group consolidation for eliminations. VAT and contractual fee rates remain explicit inputs; the ERP does not infer statutory treatment or client payment terms.

## Deployment and checks

The additive migration 0003_unusual_korg.sql adds a nullable document_code key and a company scoped unique index. Existing financial records retain their data. Document keys are normalised on server writes, so simultaneous duplicate IDs cannot pass the database constraint.

Run the workflow, AI, component and governance suites, TypeScript and the Sites production build. See QA.md for results and limits. Tests use isolated data and simulated AI providers, with no live business mutations.

Browser keyboard, responsive, printing and fullscreen acceptance remains pending because browser automation is unavailable in this environment. Live AI, Gmail synchronisation, GA4/social connectors, staff authorisation, historical financial reconciliation and recovery testing retain their earlier setup requirements.
