# Maintaining Quiznet

The owner controls releases and repository visibility. Change visibility only with explicit owner authorization, and keep the repository name and URL unchanged unless a change is requested.

Release names and stages are defined in [RELEASES.md](RELEASES.md); feature plans are in [ROADMAP.md](ROADMAP.md). Run `npm run release:info` for the current public name and technical installer version. Release planning belongs in the repository and release notes; Settings shows only the technical version for diagnostics.

## Code and data

| File | Responsibility |
| --- | --- |
| `src/core.cjs` | Import parsing, validation, hierarchy, scoring, and library schema |
| `src/store.cjs` | Serialized transactions, atomic saves, rolling backup, and recovery |
| `src/local-files.cjs` | Flushed atomic sidecar writes and bounded Windows replacement retries |
| `src/recovery.cjs` | Incomplete editor draft validation, bounded snapshot retention, and read-only library checks |
| `src/import-report.cjs` | Exact-content duplicate detection, type counts, and comparison with a validated quiz brief |
| `src/study-report.cjs` | Read-only historical report analysis, bounded Markdown generation, embedded media, and atomic export writes |
| `src/updates.cjs` | Fixed-source public release checks, device preferences, retry limits, and reminder state |
| `src/main.cjs` | Windows application, single-instance lock, file dialogs, and validated IPC |
| `scripts/release.cjs` | Repository release names and validated package metadata; build tooling only |
| `src/preload.cjs` | Narrow renderer API |
| `src/ui/renderer.js` | Navigation, quiz runner, editor, and formatted question presentation |
| `src/ui/question-types.js` | Shared type catalog, choice limits/labels, answer validation, selection, and scoring |
| `src/ui/instructions.js` | Shared preference catalog, validation, and Markdown quiz-brief generation |
| `src/ui/practice.js` | Shared attempt settings, preset validation, historical missed questions, and session lookup |
| `src/ui/timing.js` | Active study-time accounting, validation, and duration formatting |
| `src/ui/content.js` | Inert HTML reconstruction and controlled insertion of generated math |
| `src/ui/math.js` | Markdown math tokenization, bounded offline KaTeX rendering, and source fallback |
| `src/ui/code-policy.js` | Shared language catalog, aliases, and code/Markdown limits |
| `scripts/sync-content-vendor.cjs` | Reproducible offline browser libraries and license verification |
| `src/ui/content-policy.js` | Shared raster image validation and size limits |
| `src/ui/dark.css` | Compact dark interface |
| `src/ui/workspace.css` | Responsive navigation, study columns, and full-window editor/import layouts |
| `src/sample.cjs` | Disposable demo material for a new library |

## Storage and compatibility

Study reports use the completed attempt snapshot and shared correctness rules, independently of the current quiz, result filter, or visible page. The main process accepts only a saved attempt ID and a validated all/focus scope. It bounds the report at 20 MiB and 10,000 questions, quotes source with collision-safe fences, deduplicates valid embedded raster images, and keeps null/partial/legacy timing explicit. No library field is added or changed. Report exports use a native Markdown save dialog, reject the app data folder, serialize concurrent exports, and flush a uniquely named temporary file before atomic replacement. Cancellation or failure preserves existing reports and study files; graceful shutdown waits for an active report export.

The installer version in `package.json` is separate from the stored library's `version`. The current library schema is version 1. An app-version increase does not require a schema change. Consult [CHANGELOG.md](../CHANGELOG.md) for the development history; this guide describes the current contracts.

See [LIMITS.md](LIMITS.md) for tested workloads and hard versus practical limits. `npm test` includes the storage fault and boundary tests in `tests/stability.test.cjs`; Electron stability checks exercise close-time write failure, renderer recovery, failed checkpoints, and the real 10,000-question workflow. Temporary primary and backup files require disk headroom; do not replace the atomic backup step with an in-place overwrite.

- Keep `com.quiznet.desktop`, product name `Quiznet`, installer name `Quiznet-Setup.exe`, and the Desktop shortcut stable. Study data lives in `%APPDATA%\Quiznet\data`, outside the installation; updates and uninstalls preserve it.
- `src/store.cjs` serializes mutations and saves with flushed temporary files and atomic replacement. `library.json.bak` holds the previous successful state. Restores preserve a separate pre-restore copy; damaged files remain available for recovery. Unsupported or damaged data must produce a recoverable error, never a silent reset.
- Question types and scoring are shared between core and UI. Multiple answers require the exact correct set, with no partial credit. Historical attempts retain their own question snapshots, including media, formatting, and code.
- Practice settings, saved presets, flags, and unfinished attempts travel with backups. Starting an attempt copies its settings, so later preset changes cannot alter it. Instant-feedback checks lock answers in the main process as well as the UI; pending saves must preserve those locks and restore usable controls after failure.
- Missed-question practice uses the original attempt's saved questions through `sourceAttemptId`, leaving that result and the live quiz unchanged. Validation requires exactly the incorrect subset. Deleting the live quiz uses the established path that removes its history and active session.
- The main process owns timing and serialized writes. Answers, navigation, pause, finish, 15-second checkpoints, and graceful shutdown settle the active clock. Startup and restored backups begin paused; downtime is excluded. Partial timings must remain distinguishable from fully tracked attempts. Comparisons require compatible question sets, feedback modes, and full/missed-only scope.
- Images are embedded raster data, never external filenames or URLs. Limits are 2 MB per image, 19 MB per edited quiz, and 20 MB per quiz import. Whole-library backup restore is separate from quiz import and does not use that file-size limit.
- Code attachments allow 50,000 characters; Markdown fields allow 100,000. Highlighting stops above 12,000 characters per block. Unknown languages remain readable as plain code. Content passes through the shared formatting allowlist; imported attributes cannot become app controls. Snippets are never executed.
- The instruction builder generates text from validated preferences and shared catalogs. It never uploads material or reads library content to create the instructions. Generation preferences guide an external agent; they are not additional stored question fields.
- Editor recovery uses a separate version-1 `editor-draft.json`, limited to 20 MiB. It accepts incomplete questions but validates types, choices, answer indices, field bounds, and raster media. Writes are serialized and atomic; the renderer acknowledges successful persistence. A close handshake flushes pending editor changes, and failures keep the app open. The library schema remains version 1. Closing a dialog keeps its edited draft; Cancel discards it; saving the quiz clears it. Agent instruction preferences remain in memory.
- `snapshots/` retains up to 7 recognized recovery files within 128 MiB, keeping the newest file even if it alone exceeds that budget. Save the previous library before the first mutation each UTC day and before import, delete, and restore. Invalid mutations do not create snapshots. A snapshot failure prevents that mutation; a later retry is allowed. Retention deletes only recognized snapshot filenames after the new file is committed. Exported backups and legacy `before-restore-*` files are not pruned. Startup, listing, and Check library do not rewrite the library or rolling backup. Snapshot restore validates content and safe file identity before presenting confirmation.
- The main process validates course/unit ownership and names and creates destinations in the same transaction as the quiz. Matching names reuse existing courses/units. Moving transfers the existing quiz with its IDs intact, preserving history and unfinished progress; it never deletes an empty source parent.
- Import reports compare normalized question content without IDs (answer-set order is ignored), report repetitions and missing explanations, and optionally compare counts/types with a valid in-memory agent brief. Question preview adds bounded per-question issue lists, conflicting-key checks for matching stems/options/attachments, conservative local quality heuristics, and related-question references. Only two distinct answer-key representatives per stem are needed to avoid pairwise scans. Warnings do not remove content, merge quizzes, or claim factual validation.
- The pending import remains in the main process. Initial metadata includes counts and flagged question indices, not every question body or attachment. `importQuestion` requires the current token and valid integer quiz/question indices and returns one copied question and its notes. The renderer reconstructs content through the existing safe content renderer and checks visible text for the displayed question. Correct-answer styling, labels, explanations, and answer-revealing review details require the explicit reveal button. This renderer-only state starts hidden and resets before loading any question. Closing or replacing the import dialog expires its token. Browsing/filtering never calls a library mutation; final confirmation imports the full original batch transactionally. Keep only one question card in the DOM, including for 10,000-question imports.

The pinned development packages `markdown-it`, `@highlightjs/cdn-assets`, and `katex` supply committed browser assets, local math fonts, and licenses in `src/ui/vendor`. Math uses the existing Markdown strings and embedded raster images; library schema and question storage do not change. Only generated KaTeX output bypasses ordinary formatting reconstruction; imported HTML retains the existing allowlist. Keep trust disabled, macros fresh per formula, bounded formula counts/source/expansions/sizes/output/cache, escaped fallback text, and fonts bundled locally. Text/HTML and code blocks must retain literal math-like content. `content.plain` replaces generated math with its source once for search and review checks. Add supported languages through `code-policy.js`, regenerate with `npm run assets:content`, and verify with `npm run check`. Re-audit package changes. The app must not resolve runtime packages or fetch CDN resources.

Older app builds may discard optional fields or fail to resume newer practice sessions even when the library schema number matches. Preserve a full backup before any rollback and verify compatibility with the target build.

For a future schema change, define and test a migration from every supported older schema. Preserve the original file before migrating. A migration must be repeatable without duplicating material and must preserve history and saved attempts. Never test destructive operations against a real study library.

## Review and dependency updates

Use small pull requests and the contribution guide. Read dependency release notes and inspect lockfile changes, especially Electron and installer updates. Dependabot proposes monthly npm and GitHub Actions updates; maintainer approval and passing checks are required before merging.

CI actions are pinned to full commit hashes. The Gitleaks binary is pinned to an official release and SHA256 checksum in `.github/scripts/check-secrets.ps1`. When updating it, download the official checksum file, verify the Windows x64 archive, and update the version and expected hash together.

Keep GitHub token permissions at read access for builds and disable persisted checkout credentials. Do not use `pull_request_target` to execute contributed application code with elevated permissions.

## Build and verify an update

1. Increment the public release number in `package.json` under `quiznetRelease`; keep the current stage unless the owner explicitly approved changing it. Increase the internal installer version with `npm version <version> --no-git-tag-version`. Run `npm run release:info` and update `CHANGELOG.md` using the public name and stage, changes, checks, limitations, and next goals. Keep the app ID, product name, data path, installer name, and shortcut name unchanged.
2. Run syntax, core, Electron, dependency, and secret checks from `CONTRIBUTING.md`.
3. Build on Windows:

   ```powershell
   $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
   npm run build
   ```

4. Back up the existing library before testing an update. Record the SHA256 of `library.json` and its rolling backup while the app is closed.
5. Install `dist/Quiznet-Setup.exe`, then run that installer again. Confirm one installed application, the same install directory, and one Desktop shortcut targeting the installed `Quiznet.exe`.
6. Verify both recorded data hashes are unchanged by installation. Open the app, confirm its version and data path, and check that opening it again restores the same window. Perform destructive test operations only in disposable test data.
7. On disposable older-version data, verify upgrade compatibility and any migration. Keep a last-known-good installer privately for rollback. Do not assume an older app can read a newer schema.
8. Generate an installer checksum:

   ```powershell
   Get-FileHash -LiteralPath dist/Quiznet-Setup.exe -Algorithm SHA256
   ```

   Match the checksum to the exact file that will be distributed.

The build creates an offline installer and does not publish automatically. `--publish never` is deliberate. The current Windows installer is unsigned; document signing status accurately.

## Distribute a release

The Windows workflow uploads `Quiznet-Windows`, containing `Quiznet-Setup.exe`. Artifact downloads require GitHub sign-in and read access, and artifacts can expire. [GitHub artifact documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts).

After the owner approves publication, tag the tested commit with `v<app version>` and create a GitHub Release titled with the public name from `npm run release:info`, such as `Quiznet Alpha 1`. Mark Alpha and Beta as prereleases; mark Official Release as stable. Include the installer, its SHA256 checksum, and notes from the changelog. Verify the downloaded release asset against the checksum. Maintain one installer filename; releases do not create separate installed programs. Publishing or completing features never changes the stage automatically.

Updates use the same installer filename and existing installation. Keep study backups and local test artifacts outside tracked source. The optional main-process release checker queries only the fixed public GitHub source and never changes study files. Settings offers a manual check and opt-in 48-hour checks. It opens a verified release page after an explicit click; installation still uses the same offline NSIS installer. Device preferences live in `updates.json` outside the library. Keep renderer requests/navigation blocked and never accept a renderer-supplied source URL or credential. See [update checking](UPDATE_CHECKING_PROPOSAL.md) for bounds, retry behavior, and the separate future installer-verification work.

## Distribution checks

- Confirm publication is approved. Keep the repository name, URL, and visibility unchanged unless a change is explicitly requested.
- Check source, examples, screenshots, release assets, artifacts, and Actions logs for private data. Run the redacted history scan and dependency audit; keep study libraries, exports, credentials, and local audit records out of Git.
- Use the public GitHub handle and a GitHub noreply email for maintainer commits.
- Verify the license, contributor instructions, README download link, release name, and installer checksum match the tested release.
- Keep branch protection, secret scanning, and private vulnerability reporting configured where available. Changes still require review and passing checks.
