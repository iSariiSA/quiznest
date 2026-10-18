<p align="center">
  <img src="assets/brand/mark.svg" width="80" height="80" alt="Quiznet logo">
</p>

<h1 align="center">Quiznet</h1>

<p align="center"><strong>Your courses. Your quizzes. Your own computer.</strong></p>
<p align="center">An offline Windows app for turning study material into quizzes, practicing at your own pace, and learning from your mistakes.</p>

<p align="center">
  <a href="https://github.com/iSariiSA/quiznest/releases/download/v1.10.1/Quiznet-Setup.exe"><strong>Download for Windows</strong></a> ·
  <a href="#get-started">Get started</a> ·
  <a href="#common-questions">Common questions</a> ·
  <a href="docs/USER_GUIDE.md">Study guide</a>
</p>

**Windows 10/11 · x64 · Works offline · MIT licensed**

Current release: **Quiznet Alpha 8** — a preview for testing and feedback. The installer is unsigned. See [release notes and the installer checksum](https://github.com/iSariiSA/quiznest/releases/tag/v1.10.1).

![Quiznet's compact dark library, with sample Biology, Chemistry, and Mathematics courses](assets/screenshots/library.png)

## What is Quiznet?

Quiznet gives your study material a home: **Courses → Units → Quizzes**. Write questions, import a quiz file, or prepare instructions for an AI assistant to help create one. Then test yourself, review explanations, and return to the questions you missed.

Studying requires no account or internet connection. Your questions, images, results, and unfinished attempts stay in a local library on your computer.

## What can I do with it?

| You want to… | Quiznet helps you… |
| --- | --- |
| Organize a subject | Group quizzes into courses and units; search your library with **Ctrl + K**. |
| Make your own questions | Mix single-answer, multiple-answer, and true/false questions, with explanations and up to 100 choices for choice questions. |
| Study visual or technical material | Include embedded images, HTML or Markdown formatting, and syntax-highlighted code. Code is displayed, never executed. |
| Choose how to practice | Use **Test yourself** for feedback after finishing or **Practice** for instant feedback. Customize timers, shuffling, navigation, and flags; save your own presets. |
| Pick up where you left off | Leave a quiz and resume your saved progress, even after closing the app. |
| Learn from mistakes | Review answers and explanations, practice only missed questions, and compare compatible attempts by score and study time. |
| Keep a copy or share a quiz | Export individual quizzes or save and restore a full library backup. Images and code travel with the files. |

## Get started

### 1. Install Quiznet

1. [Download **Quiznet-Setup.exe**](https://github.com/iSariiSA/quiznest/releases/download/v1.10.1/Quiznet-Setup.exe) from the current release.
2. Run the installer. It installs for your Windows account without administrator access.
3. Open **Quiznet** from your Desktop or Start menu.

You do not need Node.js or any development tools to use the app. On the [Releases page](https://github.com/iSariiSA/quiznest/releases), choose **Quiznet-Setup.exe** under **Assets**; the source-code archives are for development.

### 2. Take your first quiz

1. Open an included sample course, such as **Biology**, then choose a unit and a quiz.
2. Choose **Start**. In **Before you start**, select **Test yourself** or **Practice**, then start the attempt.
3. Answer the questions. Use the numbered squares or arrow keys to navigate; flag questions you want to revisit.
4. Finish to see your score, answers, explanations, and study time.
5. Choose **Practice missed questions** on the result to work on your mistakes, or return to the library and resume studying later.

The included Biology, Chemistry, and Mathematics courses are editable samples. Create your own with **New course → New unit → New quiz**.

### 3. Add your study material

Inside a unit, **New quiz** offers three starting points:

| Option | Use it when… |
| --- | --- |
| **Write manually** | You want to enter questions, choices, and correct answers yourself. |
| **Import file** | You already have a completed JSON or CSV quiz file. |
| **Prepare with an agent** | You want instructions to give an external AI assistant along with your notes. |

For imports, try [a small Biology quiz](examples/biology.json), [mixed question types](examples/mixed-questions.json), or [the CSV example](examples/questions.csv). The [import reference](docs/IMPORT_FORMATS.md) explains the format, images, Markdown, code, and limits.

## Turn notes into a quiz with an AI assistant

1. Open **Prepare a quiz** and choose the question types, count, and topics. Optional settings include difficulty, language, explanations, and source coverage.
2. Use **Save Markdown** or **Copy instructions**.
3. Give those instructions and your study material to your preferred AI assistant. Review the questions and answers it produces.
4. Import the returned `quiznet-quiz.json` file into Quiznet and confirm its destination in the preview.

**Quiznet does not call an AI service or upload your notes.** You choose what to share with an external assistant. Generated questions still need your review. See the [full preparation guide](docs/USER_GUIDE.md#prepare-a-quiz-with-an-agent).

## Common questions

### Does it work without internet or an account?

Yes. After downloading the installer, you can install and study offline. Quiznet has no sign-in, telemetry, or cloud sync. Using an external AI assistant is optional and separate from the app.

### Where are my questions and results stored?

In `%APPDATA%\Quiznet\data\library.json`. Open **… → Settings → Open folder** to find it. Quiznet saves changes as you work and keeps the previous successful state in `library.json.bak`. See [local storage and recovery](docs/USER_GUIDE.md#local-storage).

### How do I back up my library or move to another computer?

Choose **… → Settings → Save backup** and keep the file somewhere safe. On another computer, install Quiznet and choose **Restore** in Settings. A backup includes your questions, embedded media, practice history, presets, and unfinished progress.

**Restore replaces the current library.** Quiznet also keeps a separate copy of the library from before the restore. Export a single quiz instead when you want to add or share only that quiz.

### How do updates work? Will I lose my progress?

Download and run the new **Quiznet-Setup.exe**. It updates the existing installation, keeps the same Desktop shortcut, and preserves courses, questions, history, and unfinished attempts. Updates are installed manually. Saving a full backup before updating is a useful precaution.

### What happens if I close the app during a quiz?

Your saved answers and position remain available through **Resume**. Leaving the quiz or closing the app pauses study timing. A crash may lose time since the most recent save; timing checkpoints run every 15 seconds.

### Can I change an answer after seeing instant feedback?

Checked answers lock in **Practice** so the result reflects your first checked response. Single-answer and true/false questions check on selection. For multiple-answer questions, select your choices and use **Next** to see feedback, then **Continue** or **Finish**. Start a new attempt to answer again. In **Test yourself**, answers stay editable until you finish.

### How are multiple-answer questions scored?

You must select every correct choice and no incorrect choices. There is no partial credit. A question needs at least one selected answer before you can finish.

### Can I import a PDF, Word document, or Markdown notes directly?

Quiz imports accept **JSON and CSV**. Markdown is supported inside questions and in exported instructions for an external assistant. To use a chapter or document, write questions yourself or use **Prepare a quiz** with an assistant that can read your source material.

### Is Quiznet available on macOS, Linux, or mobile?

The current packaged app supports **Windows 10/11 on x64 computers**. Other platforms are not currently distributed.

### Are Plugins and Explore available?

Plugins are planned. Explore currently shows a **Coming soon** placeholder; discovery and sharing are planned. Quiznet remains in **Alpha**. See the [roadmap](docs/ROADMAP.md) and [Alpha → Beta → Official Release plan](docs/RELEASES.md).

## Guides and support

- [Study guide](docs/USER_GUIDE.md) — quiz preparation, feedback modes, flags, missed questions, timers, storage, and keyboard shortcuts.
- [Import reference](docs/IMPORT_FORMATS.md) — JSON/CSV formats, examples, images, HTML, Markdown, and code.
- [Changelog](CHANGELOG.md) — what changed between releases.
- [Report a bug or suggest an improvement](https://github.com/iSariiSA/quiznest/issues) — include your Windows version, the app version from Settings, what happened, and what you expected. Use synthetic questions; keep personal notes and backups out of public reports.

## Develop and contribute

The app uses Electron with plain HTML, CSS, and JavaScript. Formatting libraries, fonts, and icons are available locally; the finished app needs no server or remote assets. Development requires **Windows 10/11 x64, Git, Node.js 22.12+, and npm**.

```powershell
git clone https://github.com/iSariiSA/quiznest.git
cd quiznest
npm ci

# Use disposable data while developing.
$env:QUIZNET_TEST_DATA = Join-Path $env:TEMP ('quiznet-dev-' + [guid]::NewGuid())
npm start
```

Run `npm run check`, `npm test`, `npm run test:app`, and `npm audit --audit-level=high` before submitting code changes. `npm run build` produces `dist/Quiznet-Setup.exe`.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and pull requests, and [MAINTENANCE.md](docs/MAINTENANCE.md) for architecture, storage compatibility, and release verification. Editable artwork and export instructions are in the [brand guide](docs/BRAND.md).

## License

Quiznet is available under the [MIT license](LICENSE).
