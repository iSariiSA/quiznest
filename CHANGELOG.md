# Changelog

## Quiznet Alpha 7

Stage: **Alpha**. Internal installer build: `1.10.0`.

- Open New quiz with three clear choices: write manually, import a finished file, or prepare with an agent.
- Keep question squares neutral with small status triangles, put color meanings behind an info button, and move the flag beside the progress controls.
- Show only the question type label during a quiz.
- Replace the separate Check answer button with Next to reveal multiple-answer feedback, followed by Continue/Finish; preserve single-answer and end-review behavior.

Validation: syntax, core and Electron workflows, dependency/secret checks, visual review, installer build, in-place reinstall, and unchanged library hashes.

Known limitations: question wording imported from a file stays unchanged. Practice answers lock once feedback appears. Plugins and Explore discovery remain Alpha goals.

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

Stage: **Alpha**. Current internal installer build: `1.4.3`.

- Start repository release naming with Alpha; keep the stage plan and development milestones in the repository and release notes only.
- Remove release planning from Settings; retain the technical version for diagnostics.
- Keep stage and release number in package metadata, independent of internal Windows version numbers.
- Remain in Alpha until the owner approves Beta. Plugins and Explore are the two major goals before that decision.
- Plan Beta for wider testing, feedback, and fixes; the first Official Release follows testing and owner approval.
- Retain existing study tools, the Focus identity, and the stable installer, installation, shortcut, and local data.

Validation: syntax, core and Electron workflows, dependency and secret checks, Windows installer build, in-place reinstall, and unchanged library hashes. Release records are kept locally with the installer.

Known limitations: Plugins and Explore are planned and are not available in this release. The interface is English; the personal-use installer is unsigned. Next goals: agree on and build the first Plugins and Explore workflows while continuing Alpha fixes.

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
- Use the maintainer's public GitHub identity in development history.

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
