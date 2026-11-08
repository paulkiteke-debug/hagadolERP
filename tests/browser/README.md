# Local CRM browser QA

These files render the real ERP components with synthetic records. They do not add a Next.js route, bypass authentication or connect to a database. They are development tools, not deployed functionality.

Optional local tools:

```sh
npm install --no-save --package-lock=false playwright esbuild
npx playwright install chromium
node tests/browser/build-preview.mjs
node tests/browser/crm-visual-qa.mjs
```

The default output is a temporary directory. Set `CRM_PREVIEW_OUTPUT` to choose another absolute directory. The test starts and stops its own local HTTP server. `CHROMIUM_EXECUTABLE` can select an installed Chromium executable; `PLAYWRIGHT_MODULE` can select a local Playwright module path.

The suite covers company isolation, group consolidation, source ID search, guarded stage changes, native drag, loss reason validation, follow up creation, contact creation and editing, company creation, call creation, task completion, drawer focus restoration, keyboard containment and desktop / tablet / mobile overflow. It also returns to Finance and checks its retained shell.

To rebuild the self contained sample review file:

```sh
node tests/browser/build-offline-preview.mjs
```

Set `CRM_OFFLINE_PREVIEW_OUTPUT` to choose its destination. Sample records are deliberately fictional and are never promoted into business data. Screenshots produced by these tools are temporary local QA output, not part of the source release.
