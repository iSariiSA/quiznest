# Maintaining Quiznet

The owner controls releases and repository visibility. Keep the current repository private until explicitly instructed otherwise.

Public releases are named Alpha, Beta, and Official Release. The current release is **Quiznet Alpha 2**, using internal installer build `1.5.0`. Keep public release names, the stage plan, and development milestones in the GitHub repository and release notes only; Settings shows the technical app version for diagnostics. Remain in Alpha until the owner explicitly approves Beta. Plugins and Explore are the two major Alpha goals; Beta is for wider testing, feedback, and fixes, followed by an owner-approved Official Release. See [RELEASES.md](RELEASES.md) for the stage policy and [ROADMAP.md](ROADMAP.md) for feature status.

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
| `src/ui/content.js` | Inert HTML parsing and reconstruction using safe formatting tags |
| `src/ui/code-policy.js` | Shared language catalog, aliases, and code/Markdown limits |
| `scripts/sync-content-vendor.cjs` | Reproducible offline browser libraries and license verification |
| `src/ui/content-policy.js` | Shared raster image validation and size limits |
| `src/ui/dark.css` | Compact dark interface |
| `src/sample.cjs` | Disposable demo material for a new library |

The installer version in `package.json` is separate from the stored library's `version`. The current library schema is version 1. Bumping an app version does not require changing that schema.

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
