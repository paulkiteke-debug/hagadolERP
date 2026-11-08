# Hagadol ERP 1.1.2

This release simplifies daily navigation while preserving the separate Hagadol and WMK workflows, company ledgers, Group reporting, evidence controls and linked EOS metrics.

## Daily use

Choose Group, WMK or Hagadol from the company selector. The sidebar has one entry per module. Open a module to see its sections inside the workspace.

| Workspace | Simple structure | Reference |
| :--- | :--- | :--- |
| CRM | Pipeline, Contacts, Activities | Bigin |
| Finance | Sales, Purchases, Banking, Accountant, Reports | Zoho Books |
| Marketing | Campaigns and recorded website performance | Campaign oriented marketing workspace |
| Media | Calendar, posts and social performance | Zoho Social |
| EOS | Overview, Scorecard, Rocks, To dos, Issues, L10 meetings | Strety |

Company specific sales stages and finance classifications remain separate. Detailed industry configuration now appears in Settings rather than above everyday CRM and finance records.

The executive page shows performance, commercial priorities, marketing, metrics and a short Rock list. Bid deadlines and delivery details are available in a disclosure panel. Rock editing remains in EOS.

## Settings and Live

New metric and Explore workflows are under Settings → Workspace tools. The executive header no longer contains them.

Open Live → Launch office display screen to open a dedicated screen without the ERP sidebar. Settings → Workspace tools offers combined and rotating links with a Copy link button. Links reflect the company currently selected.

Group screen:
https://wmkhagadol.hagadol-grou-7027.chatgpt.site/office-display?company=Group&layout=Combined

WMK screen:
https://wmkhagadol.hagadol-grou-7027.chatgpt.site/office-display?company=WMK&layout=Combined

Hagadol screen:
https://wmkhagadol.hagadol-grou-7027.chatgpt.site/office-display?company=Hagadol&layout=Combined

Change layout to Rotating for a screen cycling through four sections every 15 seconds. Layout and company changes update the address so it can be reused. Both layouts refresh live records every 60 seconds while open. Initial failures retry, and later failures retain the last loaded records with a visible warning.

The screen keeps the site's private access. An authorised account must sign in on the display device. No access token is embedded in the screen URL. The display includes the existing office projection only. Internal field notes, Rock notes and blockers, customer balances and technical source detail are excluded.

## Scope

These references guide organisation and workflows. This ERP does not claim complete feature parity or a live connection to those products. Gmail sending and synchronisation, social publishing, platform analytics and bank feeds still require connection setup. The new social calendar organises saved post plans by date; it does not publish posts.

## Validation

48 focused navigation, screen projection, URL and calendar checks passed. 1522 component assertions across 423 rendered cases and all 20 existing views passed. 329 workflow checks passed. TypeScript and source whitespace checks passed. Production build status is recorded by the Sites publishing workflow.

Component checks render HTML and do not simulate browser clicks or full screen APIs. Browser visual acceptance remains pending because browser QA is unavailable in this environment.

## Benchmark sources

Bigin overview: https://help.zoho.com/portal/en/kb/bigin/get-started-with-bigin/articles/about-bigin

Zoho Books structure: https://www.zoho.com/us/books/help/getting-started/zoho-books.html

Zoho Social calendar: https://www.zoho.com/social/publishing-calendar.html

Strety EOS tools: https://strety.com/entrepreneurial-operating-system-software-traction-tools/
