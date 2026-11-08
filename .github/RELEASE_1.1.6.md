# Hagadol ERP 1.1.6 · Start, meet, end

Open https://wmkhagadol.hagadol-grou-7027.chatgpt.site/eos and choose Start L10 meeting. Enter the facilitator and attendees. Group users also choose Hagadol or WMK. Starting saves an active meeting dated today in Kampala, starts its clock and opens Segue. There is no separate planning step in this flow. Earlier planned meeting records can still be started.

Work through the fixed agenda using the dynamic meeting menu. Capture actions while reviewing metrics, Rocks and issues. Each To do has an owner, deadline and link to its meeting. Existing action and issue links remain available.

At Conclude, review the To dos already agreed and add any final actions. Confirm their owners and deadlines, enter the decisions, messages and meeting rating, then choose End L10 meeting. The server saves new actions and closes the meeting together in one database transaction. Validation failures save neither partial actions nor a closed meeting. Repeated requests with the same request reference return the saved outcome without duplicate To dos.

If no follow up actions were agreed, explicitly confirm that result. The ERP does not fabricate tasks from general notes. To dos already recorded remain available throughout the meeting. Ending produces their saved action list alongside the final actions, and the minutes retain the agreed owners and deadlines.

Follow up actions appear in EOS To dos and the shared Tasks module. Updating a task later does not change the saved meeting summary. Download minutes includes the agreed To dos, and Download To dos exports the meeting action list as CSV. The CSV uses the completed snapshot; it is unavailable when no actions were recorded.

The timer stops when the meeting ends. Completed minutes remain locked. Start L10 meeting is also available from the closed meeting to open another session. Existing company boundaries, private access, optimistic record versions and transaction idempotency are preserved. No schema migration is required.

Validation includes direct start, required action owners and deadlines, explicit no action closure, outcome confirmation, atomic completion, stale versions, duplicate request protection, saved action snapshots and later task edits. Automated rendering checks cover the simplified start and end forms. TypeScript and the production build are checked before deployment. Browser click and responsive acceptance remain pending because browser QA is unavailable here.
