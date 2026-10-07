# Quiznet

Quiznet is a personal Windows application. It must work offline and keep all study material locally.

The user wants one continuing application, one Desktop shortcut, and updates installed in place. The standard user deliverable is `Quiznet-Setup.exe`, a per-user offline NSIS installer. Do not distribute separate version-named portable executables or ZIP copies as the normal update flow.

Keep `appId` / Windows AppUserModelID `com.quiznet.desktop`, product name `Quiznet`, and `%APPDATA%\Quiznet\data` stable. The NSIS installation identity derives from the app ID; changing it would create another installed program. Internal semantic version numbers may increase, while the installer name and Desktop shortcut remain unchanged.

Updates must preserve courses, questions, practice history, and unfinished attempts. Never reset the library while installing, updating, or testing. Keep the single-instance lock so repeat launches focus the existing window.

For packaged releases, run the core and Electron workflow tests, build the installer, and verify a reinstall updates the existing install location and shortcut without changing the library file. Only test destructive library operations in isolated test data directories. Update the existing installation when delivering an authorized local update, rather than asking the user to manage multiple app copies.
