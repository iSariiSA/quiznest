# Changelog

## Quiznet Alpha 16

Stage: **Alpha**. Internal installer build: `1.17.0`. Publication authorized by the owner on 25 October 2026. This release also includes the local reliability, math, import-review, and workspace-interface improvements developed since the previous public Alpha 8.

- Add **Export study report** to the current results interface, available immediately after finishing or by opening an attempt from History. Save one Markdown file for an external tutor agent, with all questions by default or a focused selection of mistakes and questions with the most recorded time.
- Include saved question/choice content, selected and correct answer sets, explanations, code, math, deduplicated embedded diagrams, scoring, feedback mode, and timing coverage. Use historical attempt snapshots and original question numbers across review filters, pagination, and later quiz edits.
- Highlight the top 20% of questions with positive recorded time, capped at five with deterministic ties. Keep missing/partial timing explicit, and avoid treating time alone as evidence of difficulty. Include tutor instructions to verify the saved key, explain misconceptions, and ask for missing source/diagram context.
- Keep exports offline and read-only, capped at 20 MiB and 10,000 questions without silent truncation. Quote source safely, validate IPC selections, protect the app data folder, and use flushed atomic file replacement with unique temporary files. Preserve existing reports on failure and keep cancellation/retry available. Keep the current workspace UI, library schema, and application identity.

Validation: source/offline-asset checks passed (53 JavaScript files), all 75 core/storage tests passed, and all 54 Electron workflow tests passed with a 120-second per-test deadline. New checks cover historical snapshots after live edits, multiple answers and HTML/math/code, image deduplication and fenced untrusted content, full 10,000-question exports, explicit size failures, focused priorities, partial/legacy/zero timings, cancelled saves, wrong extensions, protected data paths, failed atomic writes with safe retry, invalid/concurrent IPC requests, compact dialogs, and exports across result pages without changing the current filter or library. Dependency audit reported zero vulnerabilities; the redacted 16-commit history scan found no leaks.

Built the offline `Quiznet-Setup.exe` and matched all 95 packaged source/assets to disk, including 60 local math fonts. Installed twice over the existing per-user installation, preserving its registry identity, installation location, one Desktop shortcut, and SHA256 hashes of the primary library, rolling backup, and any saved editor draft. Verified the installed archive against the tested build, normal version/data path, synthetic report generation from the packaged module, the report IPC bridge, current navigation/dialog behavior, offline math/import preview, read-only library checks, blocked renderer networking, and repeat-launch focus. Installer SHA256: `60513ee06221a39890f9e64ade5183daa3c77883d9e46c0e24119206a006d28e`. Local update and installation checks complete. The verified installer is the Alpha 16 release artifact.

Known limits: diagram data requires an agent with suitable file/image tools; historical attempts without recorded times cannot supply them. Reports are capped at 20 MiB without silent truncation. Next goals remain separately scoped Plugins and Explore.

## Unreleased — Quiznet Alpha 15

Stage: **Alpha**. Internal installer build: `1.16.0`. Local UI update; GitHub publication pending owner approval.

- Implement the approved charcoal/sage design direction across Library, courses, quiz taking, editing, results, instruction preparation, import review, and Settings. Keep the existing offline JavaScript application and storage contracts.
- Add collapsible navigation, compact quiz navigation icons, local course filtering, and direct New quiz actions in course sections. Place questions and answers side by side on wide windows and stack them in compact windows.
- Give editing and import review full-window workspaces with bounded existing pagination. Add an editor question jump list and keep all content formats, previews, draft recovery, safe import rendering, and answer-reveal behavior.
- Add a live instruction-brief summary, an Incorrect result filter that retains historical question indices, and grouped neutral Settings actions. Keep background controls inert while dialogs are open.
- Focus the first dialog field, keep keyboard navigation inside dialogs, and prevent global search from replacing an open form with unsaved input. Keep import question-number labels on one line.
- Update Electron to 44.9.3 and the locked undici/fast-uri patch versions to resolve the reported dependency advisories. Reviewed upstream [Electron](https://releases.electronjs.org/release/v44.9.3), [undici 7](https://github.com/nodejs/undici/releases/tag/v7.30.1), [undici 6](https://github.com/nodejs/undici/releases/tag/v6.29.1), and [fast-uri](https://github.com/fastify/fast-uri/releases/tag/v3.1.9) release notes. Preserve installer identity, library schema, offline study behavior, and the existing installation path.

Validation: `npm run check` passed (50 JavaScript files and matching pinned offline assets), all 68 core/storage tests passed, and the final complete Electron suite passed all 50 tests with a 120-second per-test deadline. New checks cover course filtering, hidden navigation, wide/compact quiz layouts, answer preservation, historical mistake filtering across pages, editor jumps/draft recovery, escaped live-brief summaries, and keyboard protection of unsaved forms. The first run exposed a crash-test synchronization timeout; the test now waits for the replacement document to finish loading before inspecting it, passed five consecutive runs, and passed in the final full suite. Dependency audit reported zero vulnerabilities; the redacted 16-commit history scan found no leaks. Refreshed 42 screenshots using isolated synthetic study data.

Built the offline `Quiznet-Setup.exe` and matched all 94 packaged source/assets to disk. Installed twice over the existing per-user installation, retaining its registry identity, install location, and one Desktop shortcut. Primary-library and rolling-backup SHA256 hashes remained unchanged after both installations and the installed-app smoke check. Verified version/data path, Electron 44.9.3, navigation visibility, protection of unsaved dialog input, offline math/fonts/diagrams, answer reveal/reset, read-only import cancellation/library checks, blocked renderer networking, and repeat-launch focus. Installer SHA256: `c6a9634c9dd754787154f3b2bea535385614fc84bb721aa19208771998b22e85`. Local update complete; no GitHub release was published.

Known limits: the installer remains unsigned. Plugins and Explore remain separately scoped future goals; this UI update does not implement them or change the release stage.

## Unreleased — Quiznet Alpha 14

Stage: **Alpha**. Internal installer build: `1.15.0`. Local update authorized; GitHub publication pending owner approval.

- Display LaTeX math offline in Markdown questions, choices, and explanations: fractions, matrices, integrals, inline/display equations, and fenced math blocks. Bundle KaTeX 0.19.0, its local fonts, and license; no runtime downloads.
- Use embedded raster images for agent-prepared geometry and graphs, including solution diagrams in explanations. Update agent instructions and add a complete synthetic math/diagram quiz. Python remains display-only.
- Bound formula size, count, macro expansion, visual dimensions, output, and cache. Keep malformed notation readable with a Check formula note; preserve literal code, escaped dollars, and Text/HTML content. Keep library schema and stored question fields unchanged.
- Include the previously source-only import preview and its answer-reveal correction in this local update.

- Browse every question before confirming an import, with a quiz selector, Previous/Next controls, direct question-number entry, and a Needs review filter. Show choices, safely rendered formatting, embedded images, and inert code. Keep correct-answer markers and explanations hidden until **Show correct answer** is selected; allow hiding them again and reset the reveal when browsing or reopening the preview. Answer-key warnings avoid revealing the key before that action.
- Attach local review notes to specific questions: exact repeats, existing-library matches, conflicting keys for matching content, options differing only by case/spacing, possible placeholders, all-correct multiple-answer keys, missing explanations, and images without descriptions. Related-question links make conflicting/repeated questions easy to compare.
- Detect invisible prompt/option text when the selected question is safely rendered. Formatting notes join the review filter as questions are viewed. These heuristics do not verify facts, reference pages, or the supplied source material.
- Load one question at a time through a bounded token/index API; keep the full validated import in the main process. Navigation and cancellation do not write study data. Keep destination choices while browsing; filtering does not exclude questions from final import. Closing the dialog releases its pending import.

Validation: source/offline-asset checks, all 68 core/storage tests, and all 46 Electron workflow tests passed. The three math workflows passed again after the final inline-formula spacing fix, covering local fonts, hidden answer/solution diagrams, authoring, import/export, resume, results, backup restore, compact layout, and no unintended inline scrollbars. Large malformed delimiter inputs remain readable within bounded parsing work. The full desktop run used a 120-second test deadline after transient Windows launch/shutdown timeouts; clipboard checks now wait for the asynchronous copy result. Dependency audit reported zero vulnerabilities, and the redacted 16-commit history scan found no leaks.

Built `Quiznet-Setup.exe`; verified all 93 packaged source/assets against disk, including 60 local font files. Installed twice over the existing per-user installation, retaining its registry identity, install location, and one Desktop shortcut. Primary/rolling-backup SHA256 values stayed unchanged after both installs and the installed-app smoke check. Verified technical version/data path, math rendering/fonts/diagrams, answer reveal/reset, read-only import cancellation and library check, blocked renderer networking, and repeat-launch focus. Installer SHA256: `8989ef4d9dcd3b51cb08b493b6cfd33e5646b232b75778eb2228a9612d788db0`. Local update complete; no GitHub release was published.

Known limits: math displays notation and prepared diagrams only; it does not calculate, run Python, or support every LaTeX command. Next goals remain Plugins and Explore, with scope to be agreed separately.

## Unreleased — Quiznet Alpha 13

Stage: **Alpha**. Internal installer build: `1.14.0`. Publication pending owner approval.

- Add **Check for updates** in Settings using the fixed public GitHub Releases API, including Alpha prereleases with a complete newer `Quiznet-Setup.exe` asset.
- Offer optional automatic checks every 48 hours, off until chosen. Queue update notices until outside the quiz and other dialogs. Support Later (24 hours), Skip this version, and manual override.
- Open the verified release page only after an explicit Download click. Preserve the offline study workflow, renderer network restrictions, installed identity, and user-controlled installer flow.
- Keep manual checks nonblocking so navigation and answering remain usable. Bound checks by time, response size, and page count; share concurrent checks; honor retry/rate-limit delays. Report failed/offline checks without interrupting saved study progress or falsely reporting a fresh success.
- Store update preferences separately from the library, with atomic writes and recovery of damaged preferences. Cancel pending release requests during graceful shutdown.

Validation: source/offline-asset checks, 58 core/storage tests, and all 38 Electron workflow tests passed. Coverage includes prerelease selection, version/URL/asset validation, pagination/size bounds, offline/rate-limit errors, concurrent checks, atomic preferences, reminder behavior, quiz deferral, nonblocking manual checks while answering, and cancelling a request on close. Dependency audit reported zero vulnerabilities; the redacted history scan found no leaks. Visual review confirmed the compact Settings layout. The installer built successfully; 29 packaged source/asset files matched the tested source and runtime metadata matched. Two in-place reinstalls preserved the installed identity, shortcut, data paths, and library/rolling-backup hashes. The installed app completed a real public API check, retained blocked renderer networking, and passed single-instance and recovery-settings checks. The installer remains unsigned; no GitHub release was published.

Known limitations: detection requires a published public release with the expected installer asset. Local/unpublished builds and draft/private releases are not offered. Automatic checking runs only while the app is open, and is off by default. Downloads open the browser; no installer is downloaded or executed by the app. Installer unsigned. Publication and new product features remain separate work.

## Quiznet Alpha 12

Stage: **Alpha**. Internal installer build: `1.13.0`. Publication pending owner approval.

- Recover incomplete editor work, destination names, code, and images from a separate atomic local draft. Display saving/failure state, flush before normal close, and retain failed writes for retry. Closing the editor keeps its draft; Cancel discards it; saving the quiz clears it.
- Keep bounded local backup history before daily changes, imports, deletions, and restores. Browse backups, create a recovery point, and validate a snapshot before confirming a whole-library restore. Retain up to seven copies within 128 MiB, keeping a newest oversized copy alone.
- Add a read-only library check for current/rolling-copy structure, references, attempts, and item counts. No automatic repair or data-format migration.
- Show import type totals, exact-content duplicate warnings, existing-library matches, and missing explanations. Imports from Prepare a quiz also compare explicit totals/type choices with the valid current brief. Warnings preserve every question and do not certify factual correctness.
- Keep editor controls stable while a save is pending. Preserve the existing offline model, app identity, library schema, installer name, and shortcut.

Validation: syntax/offline-asset checks, 47 core/storage tests, all 32 Electron workflow tests, dependency audit (zero vulnerabilities), redacted secret scan, and visual review passed. Checks cover display crash, abrupt main-process exit, last-acknowledged draft recovery, immediate-close flushing, failed writes/retries, bounded history, damaged backups, read-only health checks, and complete warned imports. Pressure checks used 10,000 questions, six completed attempts, and roughly 39 MB libraries; eight snapshot creations retained five copies below 128 MiB without changing the active library. The installer built successfully; 28 packaged source/asset files matched byte for byte and runtime package metadata matched. Two in-place reinstalls and installed-app checks preserved one app, its shortcut/install/data paths, library/rolling-backup hashes, and single-instance focus. Installed read-only recovery settings were verified. No GitHub release was published.

Known limitations: one recovery draft; abrupt termination can lose edits after the last acknowledged save. Agent preferences remain in memory. Backups on the same drive do not protect against drive loss, and pre-restore/exported copies are outside history retention. JSON library capacity still depends on RAM and disk space. Installer unsigned. Plugins/Explore remain Alpha goals; no online updater or GitHub publication is included.

## Quiznet Alpha 11

Stage: **Alpha**. Internal installer build: `1.12.0`. Publication pending owner approval.

- Save pending progress before closing the window; keep it open for retry if the final save fails.
- Replace rolling backups atomically and retry temporary Windows replacement locks. Failed background checkpoints report an error and cannot queue overlapping checkpoints.
- Reopen a crashed display with saved quiz progress paused and ready to resume; unsaved editor drafts may need to be entered again.
- Use indexed lookups for large-quiz validation, grading, and navigation, and avoid unused full-library response copies on internal checkpoints and shutdown.
- Render large editors in groups of 25 and result reviews in groups of 50 while saving and grading the complete quiz. Validate hidden editor groups before saving and reveal the group containing a validation error.
- Export compact JSON when formatting would push a valid large quiz over the 20 MB import limit. Reject oversized question batches early and reject sparse question drafts before saving.
- Document hard limits, tested workloads, disk/RAM pressure, and recovery behavior in `docs/LIMITS.md`. Optional update checking remains a separate proposal pending the owner's preference.

Validation: source checks, 39 core/storage tests, 26 Electron workflow tests, a roughly 39 MB pressure library, 100 queued valid/invalid transactions, dependency/secret checks, visual inspection, and the Windows installer build passed. Eight packaged source files matched the tested sources. Two in-place reinstalls and installed-app checks retained one app, the same shortcut/data path, single-instance focus, and unchanged library/backup hashes. No GitHub release was published.

Known limitations: the library is still loaded and saved as one JSON document; capacity depends on RAM and disk space. Testing covers 10,000-question desktop workflows and a roughly 39 MB pressure library, not unlimited workloads. The installer is unsigned. Plugins and Explore remain Alpha goals.

## Quiznet Alpha 10

Stage: **Alpha**. Internal installer build: `1.11.1`. Publication pending owner approval.

- Keep the total in sync when exact question-type counts or included types change in **Prepare a quiz**. Show the minimum for mixes with undecided counts, preserve explicit **Ask me** totals, and include a resolved exact total in generated instructions.
- Clear and disable the code-language preference when **No code** is selected, so stale language choices cannot block saving or copying instructions.
- Keep duplicate imported quiz names within the 200-character limit, including their numeric suffix, so the saved library remains valid on restart.
- Recover a missing library file from its automatic backup before considering sample data. Preserve an unreadable backup and report a recoverable error instead of starting a sample library.

Validation: source checks, 33 core tests, 22 Electron workflow tests, targeted layout checks, dependency/secret checks, Windows installer build, matching packaged sources, and two in-place reinstalls. Installed-app checks verified automatic totals, No code instruction preview, the normal data path, single-instance focus, one unchanged Desktop shortcut, and unchanged library/backup hashes. The installer remains unsigned.

Known limitations: automatic recovery contains the last successful rolling backup; external agents still need to follow the generated instructions. Plugins and Explore remain Alpha goals.

## Quiznet Alpha 9

Stage: **Alpha**. Internal installer build: `1.11.0`. Publication pending owner approval.

- Choose an existing or new course and unit when writing or importing a quiz, with a destination summary before saving.
- Move quizzes between courses and units, including new locations, while preserving quiz IDs, practice history, and unfinished attempts.
- Include the chosen destination in agent instructions and carry it into the returned-file import preview. Creating or canceling a draft does not create empty courses or units.
- Add **New quiz…** to the app menu so a quiz can be created without first opening a unit. Reuse matching destination names without duplicating courses or units.

Validation: source checks, 31 core tests, 20 Electron workflow tests, dependency/secret checks, Windows installer build, and two in-place reinstalls with unchanged library/backup hashes. Library schema remains version 1.

Known limitations: the Windows installer is unsigned. Destination drafts stay in memory until the app closes. Plugins and Explore remain planned; further Alpha work follows the roadmap and user feedback.

## Quiznet Alpha 8

Stage: **Alpha**. Internal installer build: `1.10.1`.

- Show pending saves in quiz controls so quick Next/Finish actions wait for an answer to finish saving.
- Restore usable controls after a failed write without changing the saved answer or the library schema.
- Provide the public source repository and a direct Windows installer download through GitHub Releases.

Validation: source checks, 28 core tests, 17 Electron workflow tests including slow-save and failed-save regressions, dependency/secret checks, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: the Windows installer is unsigned. Plugins and Explore discovery remain planned. Next goals are those Alpha features and reliability improvements from feedback.

## Quiznet Alpha 7

Stage: **Alpha**. Internal installer build: `1.10.0`.

- Open New quiz with three clear choices: write manually, import a finished file, or prepare with an agent.
- Keep question squares neutral with small status triangles, put color meanings behind an info button, and move the flag beside the progress controls.
- Show only the question type label during a quiz.
- Replace the separate Check answer button with Next to reveal multiple-answer feedback, followed by Continue/Finish; preserve single-answer and end-review behavior.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: question wording imported from a file stays unchanged. Practice answers lock once feedback appears. A very quick Next or Finish click while an answer is saving can be ignored; wait for the answer highlight and click again. Plugins and Explore discovery remain Alpha goals.

## Quiznet Alpha 6

Stage: **Alpha**. Internal installer build: `1.9.0`.

- Add Practice missed questions using saved historical questions, with independent results and unchanged original quizzes.
- Add compact numbered squares, position progress, and persistent flags for review; keep correctness hidden in review mode.
- Refine pre-quiz setup with Test yourself/Practice presets, saved custom presets, and independent display, feedback, and shuffle choices.
- Preserve presets and unfinished flags/missed-question attempts through restart and backup/restore; bound large palettes to 100 squares.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: flags belong to unfinished attempts; progress colors show completion, not answer correctness. Older readers cannot resume missed-only sessions or retain presets/flags. Plugins and Explore discovery remain Alpha goals.

## Quiznet Alpha 5

Stage: **Alpha**. Internal installer build: `1.8.0`.

- Add **Prepare with an agent** inside New quiz alongside manual creation; keep the selected unit in the returned-file import preview.
- Show pre-start choices for feedback, total/question timer visibility, and question shuffling on every new attempt.
- Add instant Correct/Incorrect feedback and explanations, with explicit checking for multiple answers.
- Lock checked responses in the core and preserve settings/feedback across navigation, restart, and backup/restore.
- Retain the existing editable-answer review mode by default, and compare previous results only within the same feedback mode.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: hiding timers affects the live quiz, while timing remains available in results. Checked instant-feedback answers require a new attempt to change. Older versions discard practice metadata. Plugins and Explore discovery remain Alpha goals.

## Quiznet Alpha 4

Stage: **Alpha**. Internal installer build: `1.7.0`.

- Add **Prepare a quiz**, a compact offline instruction builder with optional Advanced preferences.
- Let users choose exact question mixes/counts, delegate choices to the agent, or require the agent to ask first.
- Configure difficulty, connected ideas, thinking skills, coverage, language, attachments, explanations, references, and names.
- Save or copy Markdown instructions containing the existing JSON import contract, dynamic type/attachment limits, examples, and source-grounded quality checks.
- Keep drafts in memory and import the complete returned JSON through the existing validated preview. No library migration, dependency, or AI/network service is added.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: external agents must follow the instructions and their answers need review. Image embedding depends on the agent’s tools. Draft preferences last for the current app session. Plugins and Explore discovery remain Alpha goals.

## Quiznet Alpha 3

Stage: **Alpha**. Internal installer build: `1.6.0`.

- Show a small count-up timer in the quiz header, with no limit, countdown, or time-based grading.
- Pause study timing when leaving the quiz or closing the app, and resume accumulated time later.
- Record time spent on each question across visits and show it only in the finished review.
- Show total time in results/history and compare scores and active study time with the previous attempt at the same questions.
- Add an Explore navigation item and a simple “Coming soon” screen; shared-test discovery is still planned.
- Preserve older history and unfinished attempts; label timing begun on older attempts as partial rather than inventing earlier question times.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: older attempts have no per-question times. Abrupt termination can lose time since the last answer, navigation, or 15-second checkpoint; normal app closing flushes timing. Plugins and Explore discovery remain Alpha goals.

## Quiznet Alpha 2

Stage: **Alpha**. Internal installer build: `1.5.0`.

- Add a code attachment with a language selector and syntax highlighting for Python and other common programming languages.
- Add Markdown formatting, including fenced code blocks, to prompts, options, and explanations.
- Preserve code indentation and show code in preview, practice, and historical reviews without executing it.
- Keep snippets and Markdown in JSON/CSV imports, exports, backups, and unfinished attempts.
- Bundle pinned Markdown and syntax-highlighting browser files and licenses for offline use; verify them during source checks.
- Retain existing plain-text/HTML questions and the stable installation, shortcut, and local data.

Validation: syntax and offline-asset checks, core and Electron workflows, dependency and secret checks, Windows installer build, and in-place reinstall with unchanged library hashes.

Known limitations: code is for reading, not execution; unknown languages and very long blocks display as plain code. Plugins and Explore remain planned Alpha goals. Stage changes still require owner approval.

## Quiznet Alpha 1

Stage: **Alpha**. Internal installer build: `1.4.3`.

- Start repository release naming with Alpha; keep the stage plan and development milestones in the repository and release notes only.
- Remove release planning from Settings; retain the technical version for diagnostics.
- Keep stage and release number in package metadata, independent of internal Windows version numbers.
- Remain in Alpha until the owner approves Beta. Plugins and Explore are the two major goals before that decision.
- Plan Beta for wider testing, feedback, and fixes; the first Official Release follows testing and owner approval.
- Retain existing study tools, the Focus identity, and the stable installer, installation, shortcut, and local data.

Validation: syntax, core and Electron workflows, dependency and secret checks, Windows installer build, in-place reinstall, and unchanged library hashes.

Known limitations: Plugins and Explore are planned and are not available in this release. The interface is English; the installer is unsigned. Next goals: agree on and build the first Plugins and Explore workflows while continuing Alpha fixes.

## Earlier internal builds

These technical build records predate public Alpha naming and remain for compatibility tracking.

### Internal build 1.4.1

- Introduce the Focus Q identity, with matching header, title-bar, Windows, and installer icons.
- Refine charcoal surfaces, muted text, and sage accents while retaining the compact layout.
- Include editable vector artwork, a brand guide, and reproducible Windows icon exports.
- Preserve question types, local study material, practice history, and unfinished attempts.

### Internal build 1.4.0

- Mix single-answer, multiple-answer, and true/false questions in any quiz.
- Choose each question's type in the editor, mark several correct choices, and edit binary labels in any language.
- Add and remove choice options up to a shared 100-option limit, with labels and CSV columns extending beyond Z.
- Save multiple selections across restart and score the full answer set, with every selected and correct choice shown in review.
- Share type definitions, answer validation, and scoring between the desktop UI and storage code, keeping persistent IDs separate from labels.
- Preserve existing quizzes, historical attempts, and unfinished progress without rewriting the library on startup.
- Extend JSON/CSV imports, exports, and backups for all supported types; include a mixed-quiz example.

### Internal build 1.3.0

- Attach local PNG, JPEG, GIF, and WebP images to questions, with optional descriptions.
- Support HTML formatting in prompts, options, and explanations, with an editor preview.
- Embed images in exports, backups, saved progress, and historical quiz reviews.
- Rebuild imported HTML from a formatting allowlist, keeping scripts and online resources blocked.
- Preserve existing plain-text questions and allow full media backups beyond the quiz-import limit.

- Add contributor, maintenance, release, and roadmap guidance.
- Add issue and pull-request templates using synthetic study data.
- Protect local data, exports, environment files, and history backups with ignore rules.
- Add source-syntax, secret-history, and dependency checks to the Windows build.
- Pin CI actions and configure monthly dependency-update proposals.

### Internal build 1.2.0

- Install through one `Quiznet-Setup.exe` and update the existing application in place.
- Keep the same Desktop and Start menu shortcuts and local library.
- Restore the existing window when Quiznet is opened again.
- Keep installer builds from publishing releases automatically.

### Internal build 1.1.0

- Use a dark interface with compact course lists and quiz rows.
- Move secondary actions into menus and open quizzes directly.
- Keep question navigation, saved progress, results, and backups available with less visible text.

### Internal build 1.0.0

- Organize courses, units, and multiple-choice quizzes locally.
- Import JSON and CSV, create and edit quizzes, and export questions.
- Save quiz progress, score attempts, and review answers and explanations.
- Back up, restore, and recover the local library.
