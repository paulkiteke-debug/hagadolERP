# CRM design rebuild · 25 October 2026

This update replaces the previous CRM presentation with the supplied Gemini final handover layout. It retains the full ERP and its existing backend. See `CRM_DESIGN_REBUILD.md` for scope, validation and installation.

Implemented: full width CRM shell, Slate header, authorised business switch, four primary navigation tabs, CRM search, Actions menu, Today priorities, redesigned pipeline, customer directories, working record forms, record drawer, activity history, stage restriction dialog and loss follow up workflow.

The previous pipeline rail and stacked toolbar are removed from CRM. Finance and the remaining ERP modules retain their existing presentation. Existing source IDs, company specific stages and permission rules remain authoritative.

The new Bigin review screen calculates counts and duplicate candidates from an uploaded original CSV. It is read only. The existing generic contact importer remains separate and limited to its existing template workflow. Neither screen repairs previous live data automatically.

The supplied prototype's invented records, fixed import counts, simulated AI, automatic invoices and new company tables are not used in the deployed application. The offline review file contains clearly labelled synthetic examples only.

Browser checks now cover the real client components using a local synthetic fixture. Live Google sign in, production customer data reconciliation and acceptance on your Vercel Preview remain separate checks.

The subsequent company access and CRM profile update is described in CRM_ACCESS_UPDATE.md. That update requires versioned migration 0011 before Preview deployment.
