# Changelog

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
