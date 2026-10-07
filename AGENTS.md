# Quiznet

Quiznet is a personal Windows application. It must work offline and keep all study material locally.

The user wants one continuing application, one Desktop shortcut, and updates installed in place. The standard user deliverable is `Quiznet-Setup.exe`, a per-user offline NSIS installer. Do not distribute separate version-named portable executables or ZIP copies as the normal update flow.

Keep `appId` / Windows AppUserModelID `com.quiznet.desktop`, product name `Quiznet`, and `%APPDATA%\Quiznet\data` stable. The NSIS installation identity derives from the app ID; changing it would create another installed program. Internal semantic version numbers may increase, while the installer name and Desktop shortcut remain unchanged.

Updates must preserve courses, questions, practice history, and unfinished attempts. Never reset the library while installing, updating, or testing. Keep the single-instance lock so repeat launches focus the existing window.

For packaged releases, run the core and Electron workflow tests, build the installer, and verify a reinstall updates the existing install location and shortcut without changing the library file. Only test destructive library operations in isolated test data directories. Update the existing installation when delivering an authorized local update, rather than asking the user to manage multiple app copies.

The repository is private. Keep its name, URL, and visibility unless the owner explicitly requests a change. Use a GitHub noreply email for maintainer commits and the public GitHub handle rather than a private author name. Never reintroduce the original private commit history from backups or old clones.

Keep personal questions, libraries, exports, credentials, audit logs, and original-history backups out of Git. `work/` and `outputs/` are ignored workspace directories. Use synthetic examples and isolated temporary data in tests and screenshots.

Read `CONTRIBUTING.md` for development and review expectations, and `docs/MAINTENANCE.md` for storage, releases, and publication checks. Run `npm run check` for source changes. Follow meaningful tests for the affected behavior and the complete Windows checks for releases. Preserve the plain JavaScript implementation and compact desktop interface; discuss large architecture changes before implementing them.
