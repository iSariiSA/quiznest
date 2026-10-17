# Contributing to Quiznet

Quiznet is a small offline Windows app for **Courses → Units → Quizzes**. Changes should make studying easier while keeping the interface simple and protecting existing libraries.

Use synthetic examples in issues and pull requests. Keep personal study material, credentials, and local audit records out of submissions.

The current release stage is Alpha. Use public names such as `Quiznet Alpha 1` in repository release notes; the technical app version is available in Settings for bug reports. Keep release stages, the plan, and development milestones in the repository rather than the application's Settings. Keep `quiznetRelease.stage` unchanged unless the owner explicitly approves a new stage. Plugins and Explore are the major Alpha goals; completing them does not automatically start Beta. See [RELEASES.md](docs/RELEASES.md).

## Start with a focused change

For a bug, describe how to reproduce it, what you expected, your Windows version, and the Quiznet version shown in Settings. Use sample questions and remove personal information from screenshots or attachments.

For a feature, explain the study task it improves and the smallest useful interaction. Discuss new dependencies, storage changes, and major architecture changes with the maintainer before implementing them. The [roadmap](docs/ROADMAP.md) lists suggested priorities.

## Set up locally

Use Windows 10/11 x64, Git, and Node.js 22.12 or newer with npm.

```sh
git clone https://github.com/iSariiSA/quiznest.git
cd quiznest
npm ci
```

Set your own GitHub-provided `noreply` commit email before committing. Use your public contributor name. See [GitHub's email instructions](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address).

To develop with a disposable library, run these commands in PowerShell:

```powershell
$env:QUIZNET_TEST_DATA = Join-Path $env:TEMP ('quiznet-dev-' + [guid]::NewGuid())
npm start
```

The development app uses that directory. The packaged app always uses the normal local library. Starting `npm start` without `QUIZNET_TEST_DATA` uses the normal library too, so set it before development. The Electron tests create their own temporary data automatically.

## Keep these properties stable

- Study material stays local. The app must work without accounts, servers, telemetry, or a network connection.
- Updates preserve courses, quizzes, scores, history, and unfinished attempts.
- Keep `com.quiznet.desktop`, product name `Quiznet`, and `%APPDATA%\Quiznet\data` stable.
- Ship `Quiznet-Setup.exe` and update the same installation and shortcut.
- Keep the dark interface compact. Put secondary actions in menus and use clear labels with accessible names.
- Treat imported questions and HTML as untrusted content. Keep the HTML element/attribute allowlist, raster-only embedded images, sandbox, IPC validation, blocked navigation, denied permissions, and network restrictions. Never insert raw question HTML directly into the live document.
- Use synthetic questions and temporary data in tests. Keep personal libraries, backups, credentials, and original-history bundles out of Git.

## Check your change

```sh
npm run check
npm test
npm run test:app
npm audit --audit-level=high
```

`check` verifies JavaScript syntax. Core tests cover parsing, validation, hierarchy, scoring, storage transactions, and recovery. The Electron test covers the real desktop workflow, including saved progress, repeat launches, import/export, and backup/restore.

Add a regression test when fixing behavior that could recur. Parser or storage changes need core tests; interaction changes need an appropriate desktop check. For documentation-only changes, verify commands and links; rerun application tests when behavior or the build changes.

On Windows, you can also run the redacted history scan used by CI:

```powershell
./.github/scripts/check-secrets.ps1
```

This downloads a pinned, checksum-verified Gitleaks tool for development. The finished app stays offline. Changes to scanner rules or exclusions need maintainer review.

## Send a pull request

Keep the change small enough to review. Explain the problem, resulting behavior, and checks you ran. Include a screenshot for visible changes, using a disposable demo library. Mention storage or compatibility effects explicitly.

Do not include generated installers, runtime dependencies, private data, or unrelated formatting changes. Update the README and unreleased changelog entry when behavior changes. Treat other contributors respectfully and respond to review with concrete changes or an explanation.

GitHub Actions checks history for secrets, audits dependencies, runs the tests, and builds the Windows installer. Dependency-update pull requests still need review and validation; they are not merged automatically.

## Sensitive reports and releases

For a security concern, use **Security → Report a vulnerability** when private reporting is available. Otherwise, ask the maintainer for a private reporting channel in an issue without including sensitive details, personal data, or an exploit. [GitHub reporting guidance](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately).

Maintainers follow [MAINTENANCE.md](docs/MAINTENANCE.md) for data compatibility, installer verification, releases, and the final publication check. Contributions are covered by the repository's [MIT license](LICENSE).
