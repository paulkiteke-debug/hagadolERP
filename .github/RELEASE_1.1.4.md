# Hagadol ERP 1.1.4 · Interactive L10

Open EOS at https://wmkhagadol.hagadol-grou-7027.chatgpt.site/eos. Select a Hagadol or WMK meeting, start it and work through its agenda. Group shows both companies for oversight; each meeting uses its own company records.

## Meeting flow

The fixed agenda remains Segue, Scorecard, Rock review, Customer and employee headlines, To do review, Identify discuss solve, and Conclude. Allocations remain 5, 5, 5, 5, 5, 60 and 5 minutes, totalling 90 minutes.

The meeting now supports quick capture of To dos, issues, headlines, messages and notes from any section. To dos require an owner and deadline. Issues require an owner and support priority selection. Actions created from a Rock or issue retain that source link and the meeting link. Captured messages are stored for the team to communicate; this does not send email.

In Scorecard, Update actual opens a small inline editor for a manual metric. Linked metrics retain their calculated actual and source configuration. Rock check ins, progress, blockers and linked actions remain available within Rock review.

To do review can show Agenda, Open or Done. IDS can show Open, Solved or All issues. Select an issue, adjust priority, save Identify, Discussion and Solution notes, assign an action and mark it solved. The server requires discussion and resolution before accepting solved status.

Conclude shows meeting actions, solved issues and additional notes. Save the conclusion, messages and rating before completing. Completion stores the review and timer with the meeting. Completed minutes are read only, and Download minutes includes captured notes. Plan next L10 retains the company and participants without copying the previous decisions.

## Saved timing and refresh

Start records the meeting timer on the server. Pause freezes elapsed time; Resume continues it. Moving through the agenda saves time against the previous section. Revisiting a section accumulates its time. A browser refresh reconstructs elapsed time from the saved clock. Closing the page does not pause the meeting, so pause it when taking a break.

An older meeting that was already in progress starts tracked timing when Resume is first used. Its earlier duration cannot be recovered. Completed older snapshots remain unchanged.

While a meeting is open, saved records refresh every 15 seconds. Refresh pauses while a save, quick capture or unsaved edit is active. This is periodic refresh, not simultaneous collaborative editing. Record versions reject stale saves rather than overwriting another saved version. Failed saves retain the draft and show an error.

## Validation and limits

The focused dynamic L10 suite passes 66 assertions covering deterministic timing, pause and resume, section changes, serialised clock reconstruction, archived timing, stale writes, company boundaries, quick capture rendering and inline actual rendering. ERP workflow and API checks pass 342 assertions against an isolated SQLite adapter. The existing L10 suite passes 103 assertions. Component checks pass 1522 assertions across 423 render cases.

TypeScript and the production build are required before publication. Browser click, keyboard, timer display and responsive acceptance remain pending because browser QA is unavailable in this authoring environment. Server rendering checks do not establish browser interaction behaviour.

The release uses existing record payloads and requires no schema migration. Existing private access is preserved. Runtime external integrations are unchanged.

## Reference

The selected Strety patterns are quick capture during meetings, reviewing scorecards and Rocks in context, focused IDS, action review, meeting timing and a clear close. The ERP retains the fixed agenda requested by Paul.

https://help.strety.com/en/articles/8887848-strety-l10-meetings-complete-guide
