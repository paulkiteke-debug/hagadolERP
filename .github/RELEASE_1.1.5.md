# Hagadol ERP 1.1.5 · Dynamic meeting menu

Open https://wmkhagadol.hagadol-grou-7027.chatgpt.site/eos and start a planned L10. EOS switches into meeting mode. Preparation views move into an expandable menu so the meeting agenda becomes the primary navigation.

The agenda displays the current section, reviewed sections, the next section and sections awaiting review. It also shows the number of metrics, Rocks, open actions and open issues for the selected meeting. These counts update when records are saved or refreshed.

Choose Finish section and continue to mark the current section reviewed and move the menu and working panel to the next section. Reviewed state is saved on the server with the meeting clock and survives refreshes. Jumping to a section changes the current section without marking skipped work reviewed. Returning to an earlier section retains its reviewed state. The current section remains clearly highlighted when revisiting it.

Pause and Resume remain available. Pausing changes the menu status without changing the selected section. Completing a meeting restores preparation navigation and retains saved agenda history. Older meetings have no reviewed marks until their sections are explicitly finished.

The seven agenda sections and 90 minute allocation remain fixed. Timer expiry does not automatically move the meeting or mark a section reviewed. Facilitators control progression.

Validation covers persisted review state, stepping and revisiting, menu state rendering, live record counts, meeting mode and completed navigation. The existing L10, ERP API and component checks, TypeScript and production build are required before publication. Browser interaction and responsive visual acceptance remain pending in this environment. No schema migration or audience change is required.
