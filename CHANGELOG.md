# Changelog

## Local maintenance — Quiznet v1.26.0

Internal stage: `alpha` (early development). The owner authorized pushing the current code and resolving the reviewed dependency PRs on 2 November 2026.

- Bring the verified Electron `45.2.1` update and version-only release naming onto GitHub, superseding the older Electron `45.1.0` bot target. Retain the explicit development-runtime preparation before timed desktop tests.
- Update Playwright `1.63.0` → `1.64.1`, electron-builder `26.15.3` → `26.18.0`, and KaTeX `0.19.0` → `0.19.1` from the reviewed development-tools PR.
- Regenerate the committed offline KaTeX browser assets from the exact locked package, fixing the PR's asset-consistency failure. Keep math trust/limits, renderer networking restrictions, permissions, and study-data storage unchanged.
- Refresh the setup-node update against current main, retaining its official v7.1.0 SHA pin, Node 22, npm caching, and read-only workflow permissions.
- Keep one offline `Quiznet-Setup.exe`, the same installed Quiznet/shortcut, and all study content. No Plugins/Explore implementation or stage promotion is included.

Validation: source/offline assets checked; all 98 core/build-metadata tests and 71 Electron workflow tests passed. The dependency audit passes the high-severity threshold with 15 moderate build-tool findings. The Windows installer built with electron-builder 26.18.0; all 102 packaged source/assets match the tested files. Installing twice retained one app, the same installation/shortcut, and the library/rolling-backup hashes. The installed app passed runtime, offline-math, unified creation, Help/Settings, hidden-navigation, blocked-networking, and single-instance checks with unchanged library hashes.

The offline installer is unsigned. SHA256: `ab34f71616d569b93625eb5d216fb546668f1da7dff04c94d09ea2b469c29cb8`. The existing development goals and internal stage remain unchanged; integration requires the final GitHub checks and maintainer review.

## Local milestone — Quiznet v1.25.0

Stage: **Alpha**. Internal installer build: `1.25.0`. Local Electron maintenance update.

- Use version-only public release names, such as **Quiznet v1.25.0**. Rename existing GitHub release titles while preserving tags, downloads, prerelease status, and development-stage metadata.

- Update the pinned Electron runtime from `44.9.3` to the latest stable `45.2.1`, including its Chromium fixes. Keep electron-builder and other development dependencies unchanged.
- Review Electron 45's sandboxed-preload, permission, ASAR, and window behavior changes. Quiznet's preload only requires Electron, file writes stay outside ASAR, all renderer permissions remain denied, and child windows remain blocked; no application API or storage changes are needed.
- Prepare Electron's development binary before timed desktop tests, accommodating Electron 45's first-use download behavior without adding runtime downloads to the packaged application.
- Preserve the same offline installer, installation identity, Desktop shortcut, and local study library. Plugins and Explore remain planned Alpha goals.

Release-name follow-up: syntax/offline-asset checks passed (73 JavaScript files) and all 98 core/build-metadata tests passed. The three published release titles now use their existing version tags (`v1.24.0`, `v1.17.0`, `v1.10.1`), with release IDs, tag targets, notes, asset IDs/checksums, download URLs, and prerelease status verified unchanged. The application identity and installed study files are unaffected.

Validation: source/offline-asset checks passed (72 JavaScript files), all 96 core/storage tests passed, and all 71 desktop workflows are verified on Electron 45.2.1. The initial cold-download run passed 70 workflows and timed out in the first workflow's setup; preparing the runtime outside Playwright's timed hooks fixed that path, and the full first workflow passed through the updated test command. The dependency audit passed its high-severity threshold with 15 existing moderate build-tool findings, and the redacted history scan found no leaks.

Matched all 102 packaged source/assets and retained package metadata to the tested files. Installed twice over the existing per-user application, retaining the registry identity, path, single Desktop shortcut, and library/rolling-backup/editor-draft hashes where present. Installed-app verification confirmed Electron `45.2.1`, Chromium `156.0.8078.75`, Node.js `24.22.1`, the normal data path, denied renderer networking, single-instance focus, and unchanged library hashes after navigation. Local update complete; the installer remains unsigned. Installer SHA256: `8235e9051aff53e8a80932bfc61088cac609c6c399ea5227b15543c87ba70344`.

## Quiznet v1.24.0

Stage: **Alpha**. Internal installer build: `1.24.0`. The owner requested publication on 2 November 2026.

- Use one **New quiz** entry for manual writing, agent preparation, and importing an existing file. Keep the selected course/unit across each route and explain the three choices in the creation dialog.
- Remove the App menu, standalone Prepare/Import commands, repeated creation buttons in Home and unit cards, and duplicated Home library/focused-review shortcuts. Keep folder creation in **Library actions** / **Course actions**, item commands beside their course/unit/quiz, and **Help** inside **Settings**.
- Hide creation controls during quiz/review answers and brief preparation. Keep Settings accessible when navigation is hidden, give saved practice/notebook/daily/results pages meaningful breadcrumbs, and keep discard actions beside the active quiz or saved resume card. Offer daily-review start/resume once on Home, with review settings as a distinct action. Align answer choices across quiz, daily, saved, and mistake practice. Preserve existing confirmation and cancellation behavior.
- Include the previously verified local milestones since Alpha 16: offline Daily review, Mistake Notebook with personal notes and focused practice, Home with saved-session resume and recent results, Copy question, Saved questions with resumable practice, and unified library search. Keep all material local and include saved study state in ordinary backups.
- Preserve the existing app ID, one offline installer and Desktop shortcut, plain JavaScript implementation, library schema, and in-place update behavior. Plugins and Explore remain planned; no stage change is included.

Validation: source/offline-asset checks passed (72 JavaScript files) and all 96 core/storage tests passed. All 70 desktop workflows passed together; the final Home refinement then passed all four Home workflows, including its new duplicate-action regression (71 distinct desktop workflows overall). Reviewed 21 screens/states at 1280×800 and the 760×560 minimum, with no horizontal overflow or renderer errors. The existing dependency tree has 15 moderate audit findings and no high/critical findings; dependencies are unchanged. The redacted history scan passed before the release commit; the release history is checked again before pushing.

Matched all 102 packaged source/assets to disk and the installed archive to the tested package. Installed twice over the existing per-user installation, retaining one registry identity, install directory, and Desktop shortcut; library, rolling-backup, and editor-draft hashes stayed unchanged where present. Installed-app checks verified unified creation, Help inside Settings, hidden-navigation access, the normal data path/version, denied renderer networking, repeat-launch focus, and unchanged library hashes after navigation. The installer remains unsigned. Installer SHA256: `33b2312a64530dd7abb8c769ff8a7cb86daacc1b300f48b15a44ebf2e62d65ed`.

## Local milestone — Quiznet v1.23.0

Stage: **Alpha**. Internal installer build: `1.23.0`. Local update; GitHub publication is not authorized.

- Replace the separate course filter and icon-only search with one labelled **Search library** button on every page, retaining **Ctrl + K**. Search course and unit names, quiz titles, and question text; include empty units and identify each result's type and location.
- Replace the application ellipsis with a labelled **App** menu. Place **Course actions** / **Unit actions**, **Prepare a quiz**, and the primary creation button beside the current page title, separating page actions from global commands. Individual quiz menus remain attached to their rows.
- Keep controls usable at the minimum window size, with long titles and hidden navigation. No storage, dependency, or application identity changes.

Validation: source/offline-asset checks passed (71 JavaScript files), all 96 core/storage tests and 68 Electron workflows passed, and the redacted history scan found no leaks in 19 commits. Header regressions cover one search entry, case-insensitive course matches, empty units, question-text results, escaped titles, empty results, focus restoration, current creation/brief destinations, cancelled actions, long titles, compact layout, hidden navigation, and unchanged library files. Normal and compact layouts were visually checked.

The dependency audit passed the high-severity threshold with no high/critical findings; it reported 15 moderate findings in the existing minimatch/build-tool dependency tree. Dependencies are unchanged; the audit's proposed forced downgrade is outside this interface fix.

Matched all 102 packaged source/assets to disk and the installed archive to the tested package. Installed the standard offline installer twice over the existing per-user installation, retaining one registry identity, install path, Desktop shortcut, and unchanged library/rolling-backup/editor-draft hashes where present. The installed-app smoke check verified the normal data path/version, single search across study pages, named context actions, empty search/focus restoration, hidden-navigation access, blocked renderer networking, and repeat-launch focus. Local update complete; no GitHub publication. The installer remains unsigned. Installer SHA256: `620e9f296f40b437cfbbf84201e76f32b6c9957c883a962049d927ba560ef0d1`.

Next goals remain the Alpha roadmap; no stage change or Plugins/Explore implementation is included.

## Local milestone — Quiznet v1.22.0

Stage: **Alpha**. Internal installer build: `1.22.0`. Local update; GitHub publication is not authorized.

- Add a persistent star beside **Copy question** in quizzes, historical results, Daily review, Mistake Notebook, and focused reviews. Save questions regardless of correctness and open **Saved questions** from Home.
- Preserve an independent question snapshot with wording, choices, answer key, explanation, formatting, code, and embedded diagrams. Exactly matching content shares one star across source IDs; changed content can be saved separately. Saved copies remain available after original quizzes move, change, or are deleted.
- Browse 20 saved questions per page with answers hidden until requested, copy their question/choices, or practise a random selection of 1–100 saved questions. Save checked answers and round progress across pause, restart, and backup/restore. Saved practice uses its own score and leaves quiz history and daily scheduling untouched.
- Validate saved-question sources in the main process, reject stale practice tokens, bound the collection at 20,000 items / 64 MiB, and include it in existing atomic library saves/backups. Removal creates a recovery snapshot and is blocked for questions in an unfinished saved round until that round finishes or is ended.
- Await native clipboard completion for question and AI-instruction copying so asynchronous errors reach the UI. Keep study material local and renderer permissions denied.

Validation: source/offline-asset checks passed (70 JavaScript files), all 96 core/storage tests passed, the dependency audit reported zero vulnerabilities, and the redacted history scan found no leaks in 19 commits. All 66 Electron workflows are verified across the filtered run and follow-up checks: the first run passed 58 of 60, both timing-related failures passed an unchanged serial retry (all three app/navigation tests passed), and all six native-clipboard workflows passed on follow-up. All five Saved questions workflows passed, covering unanswered/correct stars, historical indices and pagination, inert content, media/code/math snapshots after source deletion, checked-answer locks, restart/backup restore, shared daily/notebook stars, failed-save rollback/retry, and asynchronous clipboard-error handling. Normal and compact saved-question layouts were visually checked.

Native clipboard follow-up: earlier Electron/Windows round trips returned empty text and a read-only Win32 probe reported access denied (error 5). Access later succeeded without app or permission changes. All six remaining workflows passed, verifying question/choice copying, HTML paragraphs, Markdown/math/code, images, omitted answer keys, unchanged selections, daily/notebook/focused contexts, and AI-instruction copying/export. A fresh installed-app smoke check also verified the native clipboard round trip and unchanged library/backup hashes. Renderer permissions remain denied.

Matched all 102 packaged source/assets to disk and installed twice over the existing per-user Quiznet installation. Verified one registry identity, the same executable path and Desktop shortcut, and unchanged library/rolling-backup hashes. The installed-app smoke check verified Home/Saved questions navigation, synthetic saved practice after source deletion, the normal profile/version, blocked renderer networking, repeat-launch focus, and unchanged study files. Local update complete; no GitHub publication. Standard installer: `Quiznet-Setup.exe`. SHA256: `5de461cae8fef19e13d8636bff6275073d4e05a2ee3b5f643620d5ec3d41bebc`.

## Local milestone — Quiznet v1.21.0

Stage: **Alpha**. Internal installer build: `1.21.0`. Local update; GitHub publication is not authorized.

- Add **Copy question** to the quiz runner, historical result questions, Daily review, Mistake Notebook, and focused mistake practice. Copy the selected question and all choices labelled A, B, C, D and onward for pasting into an external chat.
- Preserve Markdown/math source, readable HTML paragraphs, code attachments, and multiple-answer instructions. Omit saved answers, answer keys, explanations, and personal notes. Insert image descriptions and a reminder to attach diagrams separately instead of dumping encoded images into the chat.
- Use the existing trusted main-process bridge for a bounded plain-text clipboard write. Copying does not submit answers, reveal feedback, change the library, upload material, or open a chat service.

Validation: source/offline-asset checks passed (65 JavaScript files), all 88 core/storage tests and 61 Electron workflow tests passed, dependency audit reported zero vulnerabilities, and the redacted history scan found no leaks. New native-clipboard tests cover all choices through AD, multiple-answer instructions, readable HTML paragraphs, Markdown/math/code, image descriptions, preserved suffix text, omitted answer keys/explanations, untouched selected answers, historical result selection, daily/notebook/focused contexts, hidden feedback, and rejected invalid/oversized requests without overwriting the clipboard.

Matched all 98 packaged source/assets to disk and installed twice over the existing per-user installation, preserving registry/path/shortcut identity and library/rolling-backup/editor-draft hashes. Verified the installed formatter and native clipboard using synthetic content, normal profile/version, Home/daily/notebook navigation, blocked renderer networking, and repeat-launch focus. Local update complete; no GitHub publication. Installer SHA256: `48f79956b9bb1649e8f556735b28791848ab78ebf30edb861a91c12587e33caa`.

## Local milestone — Quiznet v1.20.0

Stage: **Alpha**. Internal installer build: `1.20.0`. Local update; GitHub publication is not authorized.

- Open on a new **Home** page with an actionable Continue studying card, today's review counts and allowance, Mistake Notebook access, recently studied quizzes, and create/import/agent shortcuts.
- Prioritize unfinished quiz answers, then saved focused mistake practice, then daily review. Keep each mode's existing resume behavior and pause quiz timing when returning Home. Show recent live quizzes once each, with their latest saved result and a fresh-practice action.
- Keep Home read-only, use existing library/history/schedule state, refresh due/day counts while open, preserve editor-draft recovery, and adapt the layout to compact windows. Home and Library have separate sidebar actions; the Quiznet brand returns Home.

Validation: source/offline-asset checks passed (63 JavaScript files), all 88 core/storage tests and 59 Electron workflow tests passed, dependency audit reported zero vulnerabilities, and the redacted history scan found no leaks. Home checks cover default/empty startup, read-only navigation and cancelled creation/import, escaped titles, saved-answer resume, pause timing on return Home, recent-quiz deduplication and result links, focused-session resume, daily allowance/day refresh, and compact layout. Existing workflow suites explicitly enter Library.

Matched all 97 packaged source/assets to disk, installed twice over the existing per-user installation, and verified the same registry identity, path, single Desktop shortcut, and primary library/rolling-backup/editor-draft hashes. Verified installed Home startup and brand/Library navigation, normal version/profile, packaged daily/notebook behavior, blocked renderer networking, and repeat-launch focus. Local update complete; no GitHub publication. Installer SHA256: `145567b3c45eeec1a09c6ad103580c36e6723be00057733838b498d164240dad`.

## Local milestone — Quiznet v1.19.0

Stage: **Alpha**. Internal installer build: `1.19.0`. Local update; GitHub publication is not authorized.

- Add **Daily review → Mistake notebook**, automatically collecting incorrect answers from historical quiz results and new daily reviews. Group exactly matching question content and show the saved question, last incorrect answer, correct answer, explanation, and mistake count.
- Save a personal “What did I misunderstand?” note with each question. Preserve annotated question snapshots across quiz edits and include notes in normal library backups and recovery.
- Add a focused review of up to 20 recent mistakes with answer checking, saved pause/resume progress, and a completion score. Keep ordinary quiz history, daily allowance, and spaced schedules separate.
- Validate notebook state/actions in the main process, reject stale/double advances, and save through existing atomic transactions. Bound saved snapshots/notes at 20,000 entries / 64 MiB and notes at 5,000 characters; render 20 notebook entries per page. Storage-limit failures are explicit and preserve the last successful save.

Validation: source/offline-asset checks passed (61 JavaScript files), all 88 core/storage tests and 56 Electron workflow tests passed, dependency audit reported zero vulnerabilities, and the redacted history scan found no leaks. New tests cover historical/daily grouping, saved question content and notes, exact-set answers, stale/double advances, failed-save retry, restart/restore, compact layout, and safe saved-copy removal that preserves original attempts. A removal requires confirmation, saves a recovery snapshot, and is blocked for questions in an unfinished focused session.

Built the standard offline installer and matched all 95 packaged source/assets to disk. Installed twice over the existing per-user Quiznet installation with the same registry identity, path, single Desktop shortcut, and primary library/rolling-backup/editor-draft hashes. Verified installed notebook navigation, synthetic packaged note/session/backup validation, normal profile/version, blocked renderer networking, and repeat-launch focus. Local update complete; no GitHub publication. Installer SHA256: `f26ff859dfc2407e3ce3c3786e5290893f63ccb03ab861024e225986f378336c`.

## Local milestone — Quiznet v1.18.0

Stage: **Alpha**. Internal installer build: `1.18.0`. Local update based on GitHub main; publication is not authorized. No Dev/Learn+ features are included.

- Add an offline **Daily review** screen with quiz selection, a configurable daily limit, due-first review, and Again / Hard / Good / Easy ratings showing their next intervals.
- Save answers before checking; lock checked answers and show explanations before rating. Incorrect answers return through Again. Repetitions count toward the daily cap, which resets at local midnight.
- Preserve review progress across pause, restart, backups, restores, moves, and unchanged question edits. Keep ordinary quiz attempts and scores separate. Use the existing atomic library storage and validate all review actions in the main process.
- Use a documented simple interval scheduler; no Anki dependency, cloud service, or FSRS claim. Keep the existing app identity and in-place installer.

Validation: syntax/offline-asset checks passed (57 JavaScript files), all 83 core/storage tests and 55 Electron workflow tests passed, dependency audit reported zero vulnerabilities, and the redacted history scan found no leaks. Verified review settings, exact-set answers, answer locking, rating intervals, daily rollover/cap, stale and duplicate actions, failed-save retry, unchanged-question remapping, pause/restart, backup/restore, and compact layout using synthetic data.

Built the standard offline installer and matched all 93 packaged source/assets to disk. Installed twice over the existing per-user Quiznet installation; the registry identity, installation path, single Desktop shortcut, and primary library/rolling-backup/editor-draft hashes stayed unchanged. Verified the installed version and normal data path, synthetic scheduling through the packaged module, review navigation/settings, blocked renderer networking, and repeat-launch focus. Local update complete; no GitHub publication. Installer SHA256: `f252d54f6bc6fc8a95cd311bcef3d4d9a25fc217a7497c41dcfdaca9c63733bd`.

## Quiznet v1.17.0

Stage: **Alpha**. Internal installer build: `1.17.0`. Publication authorized by the owner on 25 October 2026. This release also includes the local reliability, math, import-review, and workspace-interface improvements developed since the previous public Alpha 8.

- Add **Export study report** to the current results interface, available immediately after finishing or by opening an attempt from History. Save one Markdown file for an external tutor agent, with all questions by default or a focused selection of mistakes and questions with the most recorded time.
- Include saved question/choice content, selected and correct answer sets, explanations, code, math, deduplicated embedded diagrams, scoring, feedback mode, and timing coverage. Use historical attempt snapshots and original question numbers across review filters, pagination, and later quiz edits.
- Highlight the top 20% of questions with positive recorded time, capped at five with deterministic ties. Keep missing/partial timing explicit, and avoid treating time alone as evidence of difficulty. Include tutor instructions to verify the saved key, explain misconceptions, and ask for missing source/diagram context.
- Keep exports offline and read-only, capped at 20 MiB and 10,000 questions without silent truncation. Quote source safely, validate IPC selections, protect the app data folder, and use flushed atomic file replacement with unique temporary files. Preserve existing reports on failure and keep cancellation/retry available. Keep the current workspace UI, library schema, and application identity.

Validation: source/offline-asset checks passed (53 JavaScript files), all 75 core/storage tests passed, and all 54 Electron workflow tests passed with a 120-second per-test deadline. New checks cover historical snapshots after live edits, multiple answers and HTML/math/code, image deduplication and fenced untrusted content, full 10,000-question exports, explicit size failures, focused priorities, partial/legacy/zero timings, cancelled saves, wrong extensions, protected data paths, failed atomic writes with safe retry, invalid/concurrent IPC requests, compact dialogs, and exports across result pages without changing the current filter or library. Dependency audit reported zero vulnerabilities; the redacted 16-commit history scan found no leaks.

Built the offline `Quiznet-Setup.exe` and matched all 95 packaged source/assets to disk, including 60 local math fonts. Installed twice over the existing per-user installation, preserving its registry identity, installation location, one Desktop shortcut, and SHA256 hashes of the primary library, rolling backup, and any saved editor draft. Verified the installed archive against the tested build, normal version/data path, synthetic report generation from the packaged module, the report IPC bridge, current navigation/dialog behavior, offline math/import preview, read-only library checks, blocked renderer networking, and repeat-launch focus. Installer SHA256: `60513ee06221a39890f9e64ade5183daa3c77883d9e46c0e24119206a006d28e`. Local update and installation checks complete. The verified installer is the Alpha 16 release artifact.

Known limits: diagram data requires an agent with suitable file/image tools; historical attempts without recorded times cannot supply them. Reports are capped at 20 MiB without silent truncation. Next goals remain separately scoped Plugins and Explore.

## Unreleased — Quiznet v1.16.0

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

## Unreleased — Quiznet v1.15.0

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

## Unreleased — Quiznet v1.14.0

Stage: **Alpha**. Internal installer build: `1.14.0`. Publication pending owner approval.

- Add **Check for updates** in Settings using the fixed public GitHub Releases API, including Alpha prereleases with a complete newer `Quiznet-Setup.exe` asset.
- Offer optional automatic checks every 48 hours, off until chosen. Queue update notices until outside the quiz and other dialogs. Support Later (24 hours), Skip this version, and manual override.
- Open the verified release page only after an explicit Download click. Preserve the offline study workflow, renderer network restrictions, installed identity, and user-controlled installer flow.
- Keep manual checks nonblocking so navigation and answering remain usable. Bound checks by time, response size, and page count; share concurrent checks; honor retry/rate-limit delays. Report failed/offline checks without interrupting saved study progress or falsely reporting a fresh success.
- Store update preferences separately from the library, with atomic writes and recovery of damaged preferences. Cancel pending release requests during graceful shutdown.

Validation: source/offline-asset checks, 58 core/storage tests, and all 38 Electron workflow tests passed. Coverage includes prerelease selection, version/URL/asset validation, pagination/size bounds, offline/rate-limit errors, concurrent checks, atomic preferences, reminder behavior, quiz deferral, nonblocking manual checks while answering, and cancelling a request on close. Dependency audit reported zero vulnerabilities; the redacted history scan found no leaks. Visual review confirmed the compact Settings layout. The installer built successfully; 29 packaged source/asset files matched the tested source and runtime metadata matched. Two in-place reinstalls preserved the installed identity, shortcut, data paths, and library/rolling-backup hashes. The installed app completed a real public API check, retained blocked renderer networking, and passed single-instance and recovery-settings checks. The installer remains unsigned; no GitHub release was published.

Known limitations: detection requires a published public release with the expected installer asset. Local/unpublished builds and draft/private releases are not offered. Automatic checking runs only while the app is open, and is off by default. Downloads open the browser; no installer is downloaded or executed by the app. Installer unsigned. Publication and new product features remain separate work.

## Quiznet v1.13.0

Stage: **Alpha**. Internal installer build: `1.13.0`. Publication pending owner approval.

- Recover incomplete editor work, destination names, code, and images from a separate atomic local draft. Display saving/failure state, flush before normal close, and retain failed writes for retry. Closing the editor keeps its draft; Cancel discards it; saving the quiz clears it.
- Keep bounded local backup history before daily changes, imports, deletions, and restores. Browse backups, create a recovery point, and validate a snapshot before confirming a whole-library restore. Retain up to seven copies within 128 MiB, keeping a newest oversized copy alone.
- Add a read-only library check for current/rolling-copy structure, references, attempts, and item counts. No automatic repair or data-format migration.
- Show import type totals, exact-content duplicate warnings, existing-library matches, and missing explanations. Imports from Prepare a quiz also compare explicit totals/type choices with the valid current brief. Warnings preserve every question and do not certify factual correctness.
- Keep editor controls stable while a save is pending. Preserve the existing offline model, app identity, library schema, installer name, and shortcut.

Validation: syntax/offline-asset checks, 47 core/storage tests, all 32 Electron workflow tests, dependency audit (zero vulnerabilities), redacted secret scan, and visual review passed. Checks cover display crash, abrupt main-process exit, last-acknowledged draft recovery, immediate-close flushing, failed writes/retries, bounded history, damaged backups, read-only health checks, and complete warned imports. Pressure checks used 10,000 questions, six completed attempts, and roughly 39 MB libraries; eight snapshot creations retained five copies below 128 MiB without changing the active library. The installer built successfully; 28 packaged source/asset files matched byte for byte and runtime package metadata matched. Two in-place reinstalls and installed-app checks preserved one app, its shortcut/install/data paths, library/rolling-backup hashes, and single-instance focus. Installed read-only recovery settings were verified. No GitHub release was published.

Known limitations: one recovery draft; abrupt termination can lose edits after the last acknowledged save. Agent preferences remain in memory. Backups on the same drive do not protect against drive loss, and pre-restore/exported copies are outside history retention. JSON library capacity still depends on RAM and disk space. Installer unsigned. Plugins/Explore remain Alpha goals; no online updater or GitHub publication is included.

## Quiznet v1.12.0

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

## Quiznet v1.11.1

Stage: **Alpha**. Internal installer build: `1.11.1`. Publication pending owner approval.

- Keep the total in sync when exact question-type counts or included types change in **Prepare a quiz**. Show the minimum for mixes with undecided counts, preserve explicit **Ask me** totals, and include a resolved exact total in generated instructions.
- Clear and disable the code-language preference when **No code** is selected, so stale language choices cannot block saving or copying instructions.
- Keep duplicate imported quiz names within the 200-character limit, including their numeric suffix, so the saved library remains valid on restart.
- Recover a missing library file from its automatic backup before considering sample data. Preserve an unreadable backup and report a recoverable error instead of starting a sample library.

Validation: source checks, 33 core tests, 22 Electron workflow tests, targeted layout checks, dependency/secret checks, Windows installer build, matching packaged sources, and two in-place reinstalls. Installed-app checks verified automatic totals, No code instruction preview, the normal data path, single-instance focus, one unchanged Desktop shortcut, and unchanged library/backup hashes. The installer remains unsigned.

Known limitations: automatic recovery contains the last successful rolling backup; external agents still need to follow the generated instructions. Plugins and Explore remain Alpha goals.

## Quiznet v1.11.0

Stage: **Alpha**. Internal installer build: `1.11.0`. Publication pending owner approval.

- Choose an existing or new course and unit when writing or importing a quiz, with a destination summary before saving.
- Move quizzes between courses and units, including new locations, while preserving quiz IDs, practice history, and unfinished attempts.
- Include the chosen destination in agent instructions and carry it into the returned-file import preview. Creating or canceling a draft does not create empty courses or units.
- Add **New quiz…** to the app menu so a quiz can be created without first opening a unit. Reuse matching destination names without duplicating courses or units.

Validation: source checks, 31 core tests, 20 Electron workflow tests, dependency/secret checks, Windows installer build, and two in-place reinstalls with unchanged library/backup hashes. Library schema remains version 1.

Known limitations: the Windows installer is unsigned. Destination drafts stay in memory until the app closes. Plugins and Explore remain planned; further Alpha work follows the roadmap and user feedback.

## Quiznet v1.10.1

Stage: **Alpha**. Internal installer build: `1.10.1`.

- Show pending saves in quiz controls so quick Next/Finish actions wait for an answer to finish saving.
- Restore usable controls after a failed write without changing the saved answer or the library schema.
- Provide the public source repository and a direct Windows installer download through GitHub Releases.

Validation: source checks, 28 core tests, 17 Electron workflow tests including slow-save and failed-save regressions, dependency/secret checks, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: the Windows installer is unsigned. Plugins and Explore discovery remain planned. Next goals are those Alpha features and reliability improvements from feedback.

## Quiznet v1.10.0

Stage: **Alpha**. Internal installer build: `1.10.0`.

- Open New quiz with three clear choices: write manually, import a finished file, or prepare with an agent.
- Keep question squares neutral with small status triangles, put color meanings behind an info button, and move the flag beside the progress controls.
- Show only the question type label during a quiz.
- Replace the separate Check answer button with Next to reveal multiple-answer feedback, followed by Continue/Finish; preserve single-answer and end-review behavior.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: question wording imported from a file stays unchanged. Practice answers lock once feedback appears. A very quick Next or Finish click while an answer is saving can be ignored; wait for the answer highlight and click again. Plugins and Explore discovery remain Alpha goals.

## Quiznet v1.9.0

Stage: **Alpha**. Internal installer build: `1.9.0`.

- Add Practice missed questions using saved historical questions, with independent results and unchanged original quizzes.
- Add compact numbered squares, position progress, and persistent flags for review; keep correctness hidden in review mode.
- Refine pre-quiz setup with Test yourself/Practice presets, saved custom presets, and independent display, feedback, and shuffle choices.
- Preserve presets and unfinished flags/missed-question attempts through restart and backup/restore; bound large palettes to 100 squares.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: flags belong to unfinished attempts; progress colors show completion, not answer correctness. Older readers cannot resume missed-only sessions or retain presets/flags. Plugins and Explore discovery remain Alpha goals.

## Quiznet v1.8.0

Stage: **Alpha**. Internal installer build: `1.8.0`.

- Add **Prepare with an agent** inside New quiz alongside manual creation; keep the selected unit in the returned-file import preview.
- Show pre-start choices for feedback, total/question timer visibility, and question shuffling on every new attempt.
- Add instant Correct/Incorrect feedback and explanations, with explicit checking for multiple answers.
- Lock checked responses in the core and preserve settings/feedback across navigation, restart, and backup/restore.
- Retain the existing editable-answer review mode by default, and compare previous results only within the same feedback mode.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: hiding timers affects the live quiz, while timing remains available in results. Checked instant-feedback answers require a new attempt to change. Older versions discard practice metadata. Plugins and Explore discovery remain Alpha goals.

## Quiznet v1.7.0

Stage: **Alpha**. Internal installer build: `1.7.0`.

- Add **Prepare a quiz**, a compact offline instruction builder with optional Advanced preferences.
- Let users choose exact question mixes/counts, delegate choices to the agent, or require the agent to ask first.
- Configure difficulty, connected ideas, thinking skills, coverage, language, attachments, explanations, references, and names.
- Save or copy Markdown instructions containing the existing JSON import contract, dynamic type/attachment limits, examples, and source-grounded quality checks.
- Keep drafts in memory and import the complete returned JSON through the existing validated preview. No library migration, dependency, or AI/network service is added.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: external agents must follow the instructions and their answers need review. Image embedding depends on the agent’s tools. Draft preferences last for the current app session. Plugins and Explore discovery remain Alpha goals.

## Quiznet v1.6.0

Stage: **Alpha**. Internal installer build: `1.6.0`.

- Show a small count-up timer in the quiz header, with no limit, countdown, or time-based grading.
- Pause study timing when leaving the quiz or closing the app, and resume accumulated time later.
- Record time spent on each question across visits and show it only in the finished review.
- Show total time in results/history and compare scores and active study time with the previous attempt at the same questions.
- Add an Explore navigation item and a simple “Coming soon” screen; shared-test discovery is still planned.
- Preserve older history and unfinished attempts; label timing begun on older attempts as partial rather than inventing earlier question times.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: older attempts have no per-question times. Abrupt termination can lose time since the last answer, navigation, or 15-second checkpoint; normal app closing flushes timing. Plugins and Explore discovery remain Alpha goals.

## Quiznet v1.5.0

Stage: **Alpha**. Internal installer build: `1.5.0`.

- Add a code attachment with a language selector and syntax highlighting for Python and other common programming languages.
- Add Markdown formatting, including fenced code blocks, to prompts, options, and explanations.
- Preserve code indentation and show code in preview, practice, and historical reviews without executing it.
- Keep snippets and Markdown in JSON/CSV imports, exports, backups, and unfinished attempts.
- Bundle pinned Markdown and syntax-highlighting browser files and licenses for offline use; verify them during source checks.
- Retain existing plain-text/HTML questions and the stable installation, shortcut, and local data.

Validation: syntax and offline-asset checks, core and Electron workflows, dependency and secret checks, Windows installer build, and in-place reinstall with unchanged library hashes.

Known limitations: code is for reading, not execution; unknown languages and very long blocks display as plain code. Plugins and Explore remain planned Alpha goals. Stage changes still require owner approval.

## Quiznet v1.4.3

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
