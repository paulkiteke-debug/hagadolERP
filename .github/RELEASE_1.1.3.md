# Hagadol ERP 1.1.3 · EOS

EOS now opens on L10 meetings. Open the module from the sidebar, or use https://wmkhagadol.hagadol-grou-7027.chatgpt.site/eos. Choose a meeting, start it, and work through one section at a time. The record tabs remain available for preparation between meetings.

## Fixed agenda

1. Segue: 5 minutes. Personal good news and business wins.
2. Scorecard: 5 minutes. Review metrics and raise issues for exceptions.
3. Rock review: 5 minutes. Check quarterly priorities and blockers.
4. Customer and employee headlines: 5 minutes. Record relevant news.
5. To do review: 5 minutes. Review open actions and recent completions.
6. Identify, discuss, solve: 60 minutes. Agree decisions and assign actions.
7. Conclude: 5 minutes. Confirm actions, messages and meeting rating.

The total is 90 minutes. Agenda order and allocations are fixed. The presentation timer can pause and resume. It resets on section changes or reopening and does not represent an audited meeting duration.

## Work inside the meeting

Scorecard includes the full week, month and quarter containing the meeting date. Manual actuals can be updated through the existing form. Linked actuals remain calculated from the selected company source. A missing actual appears as Needs data. Metrics can become issues with a link to their original metric.

Quarterly Rocks can be updated, assigned a To do or raised as an issue inside the Rock review. To dos retain their owner, due date and optional Rock or issue link. Unfinished actions carry forward. Recent completed actions appear in the review; old completed actions are filtered out.

Issues can be selected by priority and worked through using Identify, Discussion and Solution fields within the L10. Save IDS notes before marking an issue solved. Assigned actions are linked to the meeting and selected issue. Existing issues discussed in a later meeting keep their original history and add the new meeting reference.

The conclusion shows new meeting actions and solved issues. Save decisions, messages and a rating, then complete the meeting. A meeting must be started before it can complete. Server checks require a conclusion and valid rating. Completed records cannot be reopened or edited.

New completed minutes freeze metrics, their source context, Rocks, actions, issues and meeting notes. Later updates to working records do not change those minutes. Download minutes produces a text summary from the saved snapshot. Plan next L10 carries only the company, facilitator and attendees into a date seven days later. Previous notes and ratings are not copied.

Hagadol and WMK meetings remain separate. Group provides oversight of both companies. Each meeting loads only its own company records. Unsaved meeting and IDS notes prompt before leaving the agenda, changing meetings, navigating to another ERP module or changing the company or workspace mode. The browser also receives a warning when leaving with unsaved notes.

## Existing records

This release adds payload fields without a database migration. Existing completed snapshots are kept unchanged. Legacy snapshots without period labels show existing scorecards as weekly. They do not acquire later monthly or quarterly values. Legacy To dos without a completion date use the previous saved open action list to identify recent completions where possible.

## Validation

103 focused EOS checks passed, including all agenda sections, metric periods, company separation, IDS requirements, To do carry forward, read only archives, snapshot stability and downloads. 330 workflow checks, 283 governance checks and 1522 component assertions across 423 rendered cases passed. TypeScript and source whitespace checks passed. The Sites publishing workflow verifies the production build.

Browser click, responsive visual and full screen acceptance remain pending because browser QA is unavailable here. Render tests do not test browser timers or unsaved navigation prompts.

## Benchmark

The meeting flow uses Strety's approach of reviewing the scorecard, Rocks and To dos in the agenda, solving issues within the meeting and concluding with assigned actions and a saved summary. This ERP uses the fixed agenda requested by Paul rather than allowing agenda customisation.

Reference: https://help.strety.com/en/articles/8887848-strety-l10-meetings-complete-guide
