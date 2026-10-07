# Quiznet

A local Windows app for organizing **Courses → Units → Quizzes** and practicing multiple-choice questions. The interface uses a dark theme, compact lists, and menus for secondary actions.

Quiznet runs offline and stores your material on your computer. The repository is currently private; its contributor and maintenance guides prepare it for future development and eventual public release.

![Quiznet library](assets/screenshots/library.png)

## Use it

Download the `Quiznet-Windows` artifact from a successful [Windows app build](https://github.com/iSariiSA/quiznest/actions/workflows/build.yml), extract it, and find `Quiznet-Setup.exe`. GitHub sign-in and repository read access are required for artifact downloads. [Download instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts).

Run `Quiznet-Setup.exe` once, then open **Quiznet** from your Desktop or Start menu. It installs for your Windows account without administrator access. No account, browser, server, Node.js, or internet connection is required to use the app. The build supports Windows 10/11 on x64 computers. This personal-use build is unsigned.

For updates, run the new `Quiznet-Setup.exe`. It replaces the existing installation and keeps the same shortcut, courses, questions, history, and saved quiz progress. Versions 1.0 and 1.1 already use the same data folder; no migration is needed. Opening Quiznet again focuses the existing window.

Start with the included Biology, Chemistry, and Mathematics sample courses, or create your own. You can edit or delete the samples.

- Create, rename, and delete courses and units.
- Create and edit quizzes, including explanations and 2–8 answer options.
- Use the top-right **…** menu to import JSON/CSV, open Settings, or view Help.
- Preview imports and choose a destination course/unit.
- Take quizzes with optional question shuffling, question navigation, and keyboard shortcuts.
- Leave a quiz and resume it later, including after closing the app.
- See your score, correct answers, explanations, and practice history.
- Export individual quizzes, back up the whole library, and restore a backup.

## Local storage

Your library lives in `%APPDATA%\Quiznet\data\library.json`. **… → Settings → Open folder** shows its exact location.

Changes are serialized and saved using a flushed temporary file and atomic replacement. `library.json.bak` holds the previous successful state. If the main file is damaged, Quiznet recovers the previous state when possible and keeps the damaged file. If neither file is valid, Quiznet preserves both and reports the problem instead of silently resetting your library.

Restoring a backup also saves `before-restore-<timestamp>.json` in the data folder. These files may contain your study material; copy or manage them as you would any personal document.

To move to another computer, install Quiznet there and use **Save backup** and **Restore** in Settings. Updating or uninstalling the app keeps the data folder.

## Import questions

### JSON

```json
{
  "course": "Biology",
  "unit": "Unit 1: Cells",
  "title": "Quiz 1",
  "questions": [
    {
      "prompt": "Which organelle contains most of a cell's DNA?",
      "options": ["Nucleus", "Ribosome", "Golgi apparatus", "Lysosome"],
      "correctAnswer": 0,
      "explanation": "Most DNA in a eukaryotic cell is stored in the nucleus."
    }
  ]
}
```

`correctAnswer` is a **zero-based number**: 0 is the first answer, 1 the second, and so on. A letter (`A`–`H`) or exact option text is also accepted. Each question has exactly one correct answer; explanations are optional.

Aliases: `question` for `prompt`, `choices` for `options`, and `answer` or `correctIndex` for `correctAnswer`. Arrays of `{ "text": "…", "isCorrect": true/false }` options are accepted when exactly one is marked correct. A bare questions array is accepted. To import several quizzes, use `{ "quizzes": [<quiz>, <quiz>] }`.

Missing course/unit names default to `Imported course` and `Unit 1`. The preview lets you override the destination. Matching course/unit names reuse the existing items; duplicate quiz titles receive a numeric suffix so existing quizzes are preserved.

### CSV

```csv
course,unit,title,question,option_a,option_b,answer,explanation
Biology,Unit 1: Cells,Quiz 1,Where is most DNA stored?,Nucleus,Ribosome,A,Inside the nucleus.
```

Use consecutive `option_a` through `option_h` columns for 2–8 answers. CSV answers are letters or exact option text. Course, unit, title, and explanation are optional columns. Quotes support commas, escaped double quotes, and multiline text. Rows are grouped by course/unit/title.

Files are limited to 20 MB, 1,000 quizzes, and 10,000 questions per import. Validation is all-or-nothing. Examples are in [examples/](examples/). Full library backups are restored from Settings rather than imported as questions.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl + K | Search courses, quizzes, units, and question text |
| 1–8 | Select an answer while taking a quiz |
| Left / right arrows | Move between questions |
| Escape | Close a dialog |

## Develop

Node.js 22.12+ and npm are needed for development only. Dependency installation downloads the Electron runtime and packaging tools; the finished app runs offline.

```sh
npm ci
npm start
npm run check
npm test
npm run test:app
npm audit --audit-level=high
npm run build
```

The offline Windows installer appears as `dist/Quiznet-Setup.exe`. Keep the app ID, product name, install identity, and data folder stable so future releases update the same application. Internal version numbers change; the installer and shortcut names stay the same. See [AGENTS.md](AGENTS.md) for maintenance instructions.

The UI is plain HTML, CSS, and JavaScript with Windows system fonts and local SVG icons. There are no runtime npm dependencies or remote assets. Electron uses a sandboxed renderer, context isolation, a narrow IPC bridge, restrictive CSP, denied permissions, blocked external navigation, and blocked HTTP/WebSocket requests. Quiz content is rendered as text.

Tests exercise import validation, hierarchy operations, scoring, historical snapshots, concurrent saves, recovery, and a real Electron workflow covering creation, editor input, restart/resume, repeat launches, scoring, native-dialog import/backup/restore paths (file pickers are stubbed), and blocked renderer network requests. Before delivering a release, verify reinstalling keeps the install location, one shortcut, and the existing library unchanged.

For development, use a disposable library as described in [CONTRIBUTING.md](CONTRIBUTING.md). The Windows workflow also scans commit history for secrets and audits development dependencies before building the installer.

## Contribute and maintain

- [Contributing](CONTRIBUTING.md): setup, isolated study data, checks, and pull requests.
- [Maintenance](docs/MAINTENANCE.md): architecture, data compatibility, updates, releases, and publication checks.
- [Roadmap](docs/ROADMAP.md): suggested priorities for reliability and study workflows.
- [Changelog](CHANGELOG.md): application changes and development improvements.

MIT licensed.
