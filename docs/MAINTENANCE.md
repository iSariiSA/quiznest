# Maintaining Quiznet

The owner controls releases and repository visibility. Change visibility only with explicit owner authorization, and keep the repository name and URL unchanged unless a change is requested.

Public releases are named Alpha, Beta, and Official Release. The current release is **Quiznet Alpha 8**, using internal installer build `1.10.1`. Keep public release names, the stage plan, and development milestones in the GitHub repository and release notes only; Settings shows the technical app version for diagnostics. Remain in Alpha until the owner explicitly approves Beta. Plugins and Explore are the two major Alpha goals; Beta is for wider testing, feedback, and fixes, followed by an owner-approved Official Release. See [RELEASES.md](RELEASES.md) for the stage policy and [ROADMAP.md](ROADMAP.md) for feature status.

## Code and data

| File | Responsibility |
| --- | --- |
| `src/core.cjs` | Import parsing, validation, hierarchy, scoring, and library schema |
| `src/store.cjs` | Serialized transactions, atomic saves, rolling backup, and recovery |
| `src/main.cjs` | Windows application, single-instance lock, file dialogs, and validated IPC |
| `scripts/release.cjs` | Repository release names and validated package metadata; build tooling only |
| `src/preload.cjs` | Narrow renderer API |
| `src/ui/renderer.js` | Navigation, quiz runner, editor, and formatted question presentation |
| `src/ui/question-types.js` | Shared type catalog, choice limits/labels, answer validation, selection, and scoring |
| `src/ui/instructions.js` | Shared preference catalog, validation, and Markdown quiz-brief generation |
| `src/ui/practice.js` | Shared attempt settings, preset validation, historical missed questions, and session lookup |
| `src/ui/timing.js` | Active study-time accounting, validation, and duration formatting |
| `src/ui/content.js` | Inert HTML parsing and reconstruction using safe formatting tags |
| `src/ui/code-policy.js` | Shared language catalog, aliases, and code/Markdown limits |
| `scripts/sync-content-vendor.cjs` | Reproducible offline browser libraries and license verification |
| `src/ui/content-policy.js` | Shared raster image validation and size limits |
| `src/ui/dark.css` | Compact dark interface |
| `src/sample.cjs` | Disposable demo material for a new library |

The installer version in `package.json` is separate from the stored library's `version`. The current library schema is version 1. Bumping an app version does not require changing that schema.

Internal version 1.10.1 marks quiz controls busy while a renderer mutation is being saved. Only controls that were enabled are restored after completion or failure; existing instant-feedback locks stay intact. The slow-save and failed-save Electron regressions use disposable synthetic libraries. Storage schema, scoring, and installer identity are unchanged.

Internal version 1.10 refines the renderer only: New quiz opens a three-route chooser (manual, finished-file import, agent instructions), with course/unit context retained. Question states use corner triangles on neutral squares; an info dialog replaces the permanent legend, and the flag control stays in the navigation toolbar even when squares/progress are hidden. The live quiz displays only the type label. In instant mode, Next checks and locks multiple selections through the existing validated checkAnswer action, leaves feedback visible on that question, and Continue/Finish then proceeds. Empty selections stay editable; jumping to another question does not silently commit them. Single answers still reveal feedback on selection; review mode has no live feedback. Existing session flags, checked answers, presets, data schema, and timing semantics are unchanged.

Internal version 1.9 extends optional practice settings with `showNavigator`, `showProgress`, and `allowFlags`. Omitted new display fields use enabled defaults without changing stored legacy objects on load. Optional top-level `practicePresets` contains up to 50 unique `{ id, name, options, shuffle }` records; names are case-insensitively unique, limited to 60 characters, and cannot replace built-in Test yourself/Practice presets. Core save/delete mutations use the normal serialized store; presets travel with backups. Starting uses a copy, so editing/deleting a preset cannot change an unfinished attempt.

Active sessions may have `flaggedQuestionIds`, validated as unique IDs in the active question set. Flags settle the active clock and survive navigation, restart, and restore; they do not alter correctness or prevent finishing after the renderer’s review reminder. Question-square completion derives only from selection/check state, never the answer key in review mode. The palette renders at most 100 squares; position and completion are shown separately. Timer, palette, progress, and flag controls can be hidden independently.

`startMissed` derives the complete incorrect subset from a historical attempt. Active sessions store `sourceAttemptId`; shared session lookup resolves the original snapshot, so later live quiz edits cannot change practice content. Validation requires exactly that incorrect subset, with consistent answers, timings, and flags. No question/media copies are stored in the active session. Finished attempts retain independent question snapshots and optional `missedOnly: true`, so comparison groups distinguish full quizzes and missed-only practice. Built-in Practice defaults to instant feedback; ordinary starts default to Test yourself. The original quiz and parent attempt remain unchanged. Deleting a live quiz still clears its history and active session through the established deletion path. No migration, startup rewrite, runtime dependency, or network service is added. Do not downgrade an unfinished missed-only attempt to older readers: they cannot resolve its subset/session reference, and older readers also discard presets and flags. Preserve a full backup before rollback.

Internal version 1.8 adds optional session/attempt `practice: { showTotalTimer, showQuestionTimer, feedback }` with strict booleans and feedback `review` or `instant`. Defaults for legacy data are total timer visible, question timer hidden, and review after finishing. Instant sessions also carry validated unique `checkedQuestionIds` referencing answered questions. Single answers lock on selection; multiple answers lock only on explicit check. Main-process mutations enforce locks and complete checks at finish; backup validation preserves and verifies them. Results record the mode, and comparisons require the same mode. Timing storage/accounting is independent of visibility. Existing data loads without a migration or startup rewrite. Older readers discard optional practice metadata, so do not downgrade an unfinished instant-feedback session if its lock semantics must be preserved.

Internal version 1.7 adds an offline quiz-instruction builder with in-memory preferences, UTF-8 Markdown export, and explicit clipboard copying. The shared module validates preferences in the renderer and main process before output. It derives type rules, image limits, and code languages from existing shared catalogs. The narrow instructions IPC accepts only save/copy actions and preferences; it generates the text itself and never reads library content. No dependency, network access, library schema, or startup migration is added. Difficulty, source references, and other generation preferences guide the external agent; supported content and names use the existing JSON importer. Do not silently claim unsupported generation metadata is stored. Source-grounded quality and correct answers still require review.

Internal version 1.6 adds optional session `timing: { elapsedMs, questionMs, runningSince, partial }` and attempt `timingMode` (`active` or `active-partial`) plus `questionTimesMs` in snapshot order. Millisecond values are nonnegative safe integers; totals are validated against per-question sums and the existing rounded `elapsedSeconds`. Returning to a question adds to its total. Single-answer and multiple-answer grading is unchanged.

The main process owns the timing clock and serialized writes. Answers, position changes, pause, finish, 15-second checkpoints, and graceful app shutdown settle elapsed time. Navigation out of the quiz pauses it. Timers use the device clock with a nonnegative delta guard; keep the system clock stable for accurate durations. On startup, clear the old running cursor in memory without rewriting the library. Restored backups also start paused. Only accumulated time survives a restart, so downtime is excluded; a crash may lose time since the latest checkpoint. Normal closing waits for timing and pending writes before quitting.

Existing history retains its original elapsed duration. Old unfinished sessions acquire partial timing only when resumed, retaining their answers and original start date. Unknown earlier question durations stay null and are omitted in review. Time comparisons require two full active-timing attempts with the same question IDs; older/partial attempts can still be compared by score. No migration or startup rewrite is required. Older readers discard these optional analytics, so preserve a backup before rollback.

Internal version 1.5 adds `format: "markdown"`, optional `code` text, and `codeLanguage`. Code retains its exact stored whitespace; renderer code blocks preserve indentation and use LTR layout and scrolling. These fields travel through question validation, portable imports/exports, snapshots, backup/restore, and saved attempts. Old libraries need no migration or startup rewrite. Do not downgrade a Markdown/code library to an older reader; preserve a backup before rollback.

Code attachments allow 50,000 characters; Markdown fields allow 100,000. Highlighting stops at 12,000 characters per block and uses escaped code thereafter. Unknown code language names are retained for future compatibility and fall back to readable text. Add supported languages through `code-policy.js`, regenerate with `npm run assets:content`, and run the code workflow tests. Markdown raw HTML is disabled and rendered output passes through the existing HTML allowlist. Only a validated language hint survives from imported code attributes; classes for highlighting are generated locally. Snippets are never executed.

The exact development packages `markdown-it` and `@highlightjs/cdn-assets` supply committed offline browser files and licenses in `src/ui/vendor`. `npm run check` verifies their content against locked package versions (normalizing Windows line endings). No runtime npm resolution, servers, or CDN resources are used. Re-audit and regenerate assets when updating either package. Existing image and quiz-size limits still apply.

Version 1.4 adds optional question `type`: `single-choice` (the default when omitted), `multiple-answer`, and `true-false`. Single answers retain scalar `correctAnswer` and scalar attempt/session answers. Multiple answers use `correctAnswers` and array attempt/session answers; sets are order-independent and scored with exact equality. Empty selection arrays are valid unfinished progress but cannot finish an attempt. Binary questions store two editable option labels and a scalar answer, without depending on English text. Choice questions share a configurable 2–100 limit; labels and CSV columns extend past Z. The shared type catalog separates persistent IDs from display labels and behavior, so adding choice-based types or translating their labels does not change storage IDs. Other response families will still need their own input and validation behavior. The full application interface is currently English.

Existing version-1 libraries, history, and unfinished single-answer quizzes load without a migration or startup rewrite. Tests verify the original file is unchanged by loading. New fields survive exports, backups, history, and restart. Versions before 1.4 cannot safely read multiple-answer libraries; keep a backup before rollback and do not downgrade new-type data.

Version 1.3 adds optional question fields: `format: "html"`, an embedded raster data URL in `image`, and `imageAlt`. Omitted fields retain the original plain-text behavior. Quiz exports and historical snapshots carry these fields. No migration or installation-time rewrite is required. Version 1.2 and earlier discard these extensions on validation, so do not recommend downgrading an image/HTML library; preserve a backup before any rollback.

Images are stored inside library JSON, not as absolute paths or online resources. Each image is limited to 2 MB, and editor quizzes to 19 MB. Quiz imports retain their 20 MB limit. Full library backups can be larger and are restored through Settings without applying the quiz-import limit. Keep regression coverage for large media backups, historical snapshots, and file independence.

Study data is stored in `%APPDATA%\Quiznet\data`, outside the installation. Updates and uninstalls preserve that folder. The main file is `library.json`; `library.json.bak` is the previous successful state. Restores preserve a separate pre-restore copy. Recovered damaged files are retained for the owner.

For a future schema change, define and test a migration from every supported older schema before shipping it. Preserve the original file before migrating. A migration must be repeatable without duplicating material and must preserve history and saved attempts. Unsupported or damaged data should produce a recoverable error, never a silent reset.

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

The build creates an offline installer and does not publish automatically. `--publish never` is deliberate. The current personal-use build is unsigned; document signing status accurately.

## Distribute a release

The Windows workflow uploads `Quiznet-Windows`, containing `Quiznet-Setup.exe`. Artifact downloads require GitHub sign-in and read access, and artifacts can expire. [GitHub artifact documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts).

After the owner approves publication, tag the tested commit with `v<app version>` and create a GitHub Release titled with the public name from `npm run release:info`, such as `Quiznet Alpha 1`. Mark Alpha and Beta as prereleases; mark Official Release as stable. Include the installer, its SHA256 checksum, and notes from the changelog. Verify the downloaded release asset against the checksum. Maintain one installer filename; releases do not create separate installed programs. Publishing or completing features never changes the stage automatically.

For local delivery, update the existing installation and stable output filename. Archive older portable deliverables privately. Keep user backups and audit artifacts outside tracked source. The app uses local installers for updates; there is no network updater inside it.

## Final check before making the repository public

- Obtain the owner's explicit approval to change visibility. Keep the same repository name and URL unless the owner requests a change.
- Inspect all current branches, tags, pull-request references, releases, artifacts, screenshots, and Actions logs for private data. Rerun the redacted secret scan and dependency audit.
- Verify commit author and committer identities use intended public names and email addresses. Changing Git configuration only affects future commits.
- After an identity/history cleanup, check old GitHub commit views and retained references. Force-pushing a cleaned branch alone does not guarantee old cached views have been removed. Arrange any necessary cache removal with GitHub before publication; do not publish private-history backup bundles or their contents. [GitHub history-cleanup guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
- Verify the license, contributor instructions, README download path, and latest Windows installer checks.
- When visibility changes, enable GitHub secret-scanning push protection and private vulnerability reporting where available, and configure branch protection for reviewed, passing changes. Private vulnerability reporting requires a public repository. [GitHub reporting settings](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

Commit identity cleanup does not change the installed application or its library. Synchronize old development clones to the cleaned history before using them again, so a later merge cannot reintroduce private identities.
