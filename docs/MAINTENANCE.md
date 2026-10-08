# Maintaining Quiznet

The owner controls releases and repository visibility. Keep the current repository private until explicitly instructed otherwise.

## Code and data

| File | Responsibility |
| --- | --- |
| `src/core.cjs` | Import parsing, validation, hierarchy, scoring, and library schema |
| `src/store.cjs` | Serialized transactions, atomic saves, rolling backup, and recovery |
| `src/main.cjs` | Windows application, single-instance lock, file dialogs, and validated IPC |
| `src/preload.cjs` | Narrow renderer API |
| `src/ui/renderer.js` | Navigation, quiz runner, editor, and formatted question presentation |
| `src/ui/content.js` | Inert HTML parsing and reconstruction using safe formatting tags |
| `src/ui/content-policy.js` | Shared raster image validation and size limits |
| `src/ui/dark.css` | Compact dark interface |
| `src/sample.cjs` | Disposable demo material for a new library |

The installer version in `package.json` is separate from the stored library's `version`. The current library schema is version 1. Bumping an app version does not require changing that schema.

Version 1.3 adds optional question fields: `format: "html"`, an embedded raster data URL in `image`, and `imageAlt`. Omitted fields retain the original plain-text behavior. Quiz exports and historical snapshots carry these fields. No migration or installation-time rewrite is required. Version 1.2 and earlier discard these extensions on validation, so do not recommend downgrading an image/HTML library; preserve a backup before any rollback.

Images are stored inside library JSON, not as absolute paths or online resources. Each image is limited to 2 MB, and editor quizzes to 19 MB. Quiz imports retain their 20 MB limit. Full library backups can be larger and are restored through Settings without applying the quiz-import limit. Keep regression coverage for large media backups, historical snapshots, and file independence.

Study data is stored in `%APPDATA%\Quiznet\data`, outside the installation. Updates and uninstalls preserve that folder. The main file is `library.json`; `library.json.bak` is the previous successful state. Restores preserve a separate pre-restore copy. Recovered damaged files are retained for the owner.

For a future schema change, define and test a migration from every supported older schema before shipping it. Preserve the original file before migrating. A migration must be repeatable without duplicating material and must preserve history and saved attempts. Unsupported or damaged data should produce a recoverable error, never a silent reset.

## Review and dependency updates

Use small pull requests and the contribution guide. Read dependency release notes and inspect lockfile changes, especially Electron and installer updates. Dependabot proposes monthly npm and GitHub Actions updates; maintainer approval and passing checks are required before merging.

CI actions are pinned to full commit hashes. The Gitleaks binary is pinned to an official release and SHA256 checksum in `.github/scripts/check-secrets.ps1`. When updating it, download the official checksum file, verify the Windows x64 archive, and update the version and expected hash together.

Keep GitHub token permissions at read access for builds and disable persisted checkout credentials. Do not use `pull_request_target` to execute contributed application code with elevated permissions.

## Build and verify an update

1. Update the internal app version with `npm version <version> --no-git-tag-version` and update `CHANGELOG.md`. Keep the app ID, product name, data path, installer name, and shortcut name unchanged.
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

After the owner approves a release, tag the tested commit with `v<app version>` and create a GitHub Release with that installer, its SHA256 checksum, and notes from the changelog. Verify the downloaded release asset against the checksum. Maintain one installer filename; releases do not create separate installed programs.

For local delivery, update the existing installation and stable output filename. Archive older portable deliverables privately. Keep user backups and audit artifacts outside tracked source. The app uses local installers for updates; there is no network updater inside it.

## Final check before making the repository public

- Obtain the owner's explicit approval to change visibility. Keep the same repository name and URL unless the owner requests a change.
- Inspect all current branches, tags, pull-request references, releases, artifacts, screenshots, and Actions logs for private data. Rerun the redacted secret scan and dependency audit.
- Verify commit author and committer identities use intended public names and email addresses. Changing Git configuration only affects future commits.
- After an identity/history cleanup, check old GitHub commit views and retained references. Force-pushing a cleaned branch alone does not guarantee old cached views have been removed. Arrange any necessary cache removal with GitHub before publication; do not publish private-history backup bundles or their contents. [GitHub history-cleanup guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
- Verify the license, contributor instructions, README download path, and latest Windows installer checks.
- When visibility changes, enable GitHub secret-scanning push protection and private vulnerability reporting where available, and configure branch protection for reviewed, passing changes. Private vulnerability reporting requires a public repository. [GitHub reporting settings](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

Commit identity cleanup does not change the installed application or its library. Synchronize old development clones to the cleaned history before using them again, so a later merge cannot reintroduce private identities.
