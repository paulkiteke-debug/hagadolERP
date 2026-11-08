# Version 1.3.1 UI alignment update

18 October 2026.

The reported CRM overlap came from a 240 px minimum column width inside a grid with 225 px tracks. The 15 px difference consumed almost all of the 16 px column gap. The final toolbar rule also centred controls instead of aligning the bottoms of labelled fields and buttons.

Columns now use explicit 280 px tracks, a zero child minimum, border box sizing and a 20 px clear gap. Small screens use 260 px tracks with a 16 px gap. Stage names wrap within their own header, and counts have separate fixed space. The board remains horizontally scrollable and keyboard focusable. Cards, stage selectors and activity buttons share the column's inner width.

The shared layout stylesheet also aligns CRM toolbar controls, Finance tabs, planning filters, form fields and table cells. It constrains wide content to its scroll container, allows headings and footers to wrap, and keeps controls at least 44 px high. Logos, Tahoma and the approved palette are unchanged.

Validation: Next.js production build and its TypeScript checks passed. Core release, CRM, Finance, Finance planning, simple UI and shell layout suites passed 691 assertions with no failures. No business logic, schema, permissions or live data changed. The previous release's complete regression results remain in CRM_FINANCE_QA.md; 691 is the rerun subset for this visual update.

No interactive browser or screenshot rendering check was available in this run. The original user screenshot was inspected and the conflicting column dimensions were checked directly. The updated private sample mockup is published separately from the Vercel ERP.
