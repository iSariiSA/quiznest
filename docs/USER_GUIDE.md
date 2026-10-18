# Studying with Quiznet

[Back to the README](../README.md) · [Import format reference](IMPORT_FORMATS.md)

Detailed instructions for preparing quizzes, choosing feedback, reviewing mistakes, and keeping your library safe. For installation and a first quiz, start with the [README](../README.md#get-started).

## Prepare a quiz with an agent

Choose **Prepare a quiz** in the library toolbar, **… → Prepare a quiz…**, or **Prepare with an agent** inside **New quiz**. New quiz opens with three choices: **Write manually**, **Import file**, and **Prepare with an agent**. The manual editor opens only after you choose it; Import file opens the local file picker for a completed quiz. Starting preparation from a unit keeps that course/unit selected in the returned-file import preview. Start with question types, count, and topics. **Choose my mix** lets you specify counts per type, such as 10 multiple-choice and 5 true/false questions, or exclude types. Exact counts must agree with an exact total; an automatic total can follow the mix.

**Advanced** contains difficulty, ideas per question, thinking skills, source coverage, learner level, any quiz/code language, images, code questions, option count, explanations, source references, excluded topics, and course/unit/quiz names. Each preference defaults to **Let the agent decide**. Choose **Ask me** to require a question before generation, or set a specific value. Difficulty and connected reasoning are separate choices.

Use **Save Markdown** for `Quiznet-instructions.md`, or **Copy instructions**. **Preview** shows the exact instructions. Give those instructions and your chapter or notes to your preferred agent. The instructions require the agent to resolve Ask choices together, wait for answers, use the supplied sources, and produce one complete `quiznet-quiz.json` file. Import it with **Import quiz…** or the app menu. References and feedback are placed in explanations; generation preferences are authorship instructions, not additional stored quiz fields.

Quiznet does not call an AI service or upload material. Draft preferences stay in memory while the app is open; saving/copying instructions does not change your library. You choose what to share with the external agent. Generated answers still need your review. Agents without image-file tools may need to ask for an embedded image or permission to omit it. The exported instructions include the real import schema, limits, examples, and a final validation checklist; they cannot guarantee another agent follows them.

## Before starting a quiz

Start, Retry, Shuffle & start, and **Practice missed questions** open a compact **Before you start** dialog. Choose **Test yourself** for review after finishing or **Practice** for instant feedback with the total timer hidden. Change feedback, total/question timer visibility, question squares, the progress bar, flags, and shuffling independently. **Save as…** stores a named preset locally; saving the same name updates it. Select a saved preset to reuse it or delete it with the trash button. Changes to a running attempt are independent of later preset edits/deletion. Cancelling unsaved choices does not start a quiz or rewrite the library; saving a preset is an explicit library change. Resume continues the existing attempt and choices.

In review mode, answers stay editable and nothing is graded on the quiz screen. Instant mode checks single-answer and true/false responses as soon as you choose; multiple-answer questions use **Next** after you finish selecting. Next shows feedback on the current question; **Continue** moves on, or **Finish** ends the quiz after feedback on the last question. There is no separate Check answer button. Feedback shows Correct/Incorrect, the correct answer when needed, and the explanation. Checked answers lock, including after revisiting, restarting, or restoring a backup, so the score reflects the first checked response. Every answer must be checked before an instant-feedback attempt finishes. Retry opens fresh choices and a new attempt.

Completed review is available in both modes. History and results label instant-feedback attempts; previous-attempt comparisons use the same feedback mode. Hiding timers affects the live quiz only: totals and question times remain available in review. The question timer includes all visits and time reading feedback.

## Questions, flags, and mistakes

The compact numbered squares jump directly to a question. Blue marks the current question, green an answered question, orange a flag for review, and red an unanswered question. States use small corner triangles on neutral squares. The permanent color legend is replaced by **Question status help** (the info button); open it for the meanings. These colors describe progress, not correctness; review mode never reveals the answer through the squares. The current square keeps an orange dot if flagged. Instant-mode multiple answers count as answered only after checking. Text labels and accessible names explain each state.

The thin progress line shows your current question’s position; the adjacent count shows how many questions are answered. Large quizzes display groups of up to 100 squares with group navigation. The normal question dropdown and arrow-key navigation remain available when squares are hidden. The flag icon/button sits beside the progress controls. Choose **Flag** to mark uncertain answers and **Review flags** to jump through them. Before submitting a fully answered quiz with remaining flags, choose to review them or finish. Flags persist with unfinished progress and are cleared when that attempt ends.

**Practice missed questions** on a result starts a new attempt using only that result’s incorrect answers. Its default preset is Practice, and all start choices remain editable. It uses the saved historical question content even after editing the live quiz, preserves media/code, and leaves the original quiz and result unchanged. The new result has its own score, timing, and a Missed questions title. It does not inflate the full quiz’s Best score. Perfect results have no missed-question button. Previous-attempt comparisons use the same feedback mode, question set, and full/missed-only scope. Saved presets, active review flags, and missed-question progress are included in library backups.

## Quiz timing

The quiz header has a small stopwatch that counts up with no time limit or effect on your score. It measures time while the quiz screen is open, including time spent reconsidering answers. Leaving the quiz for another screen or closing the app pauses it; Resume continues from the saved total. Minimized windows and temporary dialogs still count while the quiz remains open.

Each question records the time you spend viewing it, including revisits. Question timers are hidden during the quiz by default; enable **Show question timer** before starting to display the current question’s accumulated time. They also appear as **Time spent** in the finished review. Results and history show total time. Results compare your score and time with the previous attempt at the same questions; timing comparisons require complete active-study timing on both attempts. Editing a quiz starts a new set of questions for comparisons.

Older results retain their recorded durations and scores but have no invented question times. When an older unfinished quiz is resumed, timing starts from that point and the completed result labels it **Tracked time**. Answers and progress remain intact. Timing is saved on answers, navigation, and normal closing, with a checkpoint every 15 seconds while studying. A crash may lose only the time since the latest save.

Explore currently contains only **Coming soon**. It does not connect to a server or upload your study material.

## Local storage

Your library lives in `%APPDATA%\Quiznet\data\library.json`. **… → Settings → Open folder** shows its exact location.

Changes are serialized and saved using a flushed temporary file and atomic replacement. `library.json.bak` holds the previous successful state. If the main file is damaged, Quiznet recovers the previous state when possible and keeps the damaged file. If neither file is valid, Quiznet preserves both and reports the problem instead of silently resetting your library.

Restoring a backup also saves `before-restore-<timestamp>.json` in the data folder. These files may contain your study material; copy or manage them as you would any personal document.

To move to another computer, install Quiznet there and use **Save backup** and **Restore** in Settings. Updating or uninstalling the app keeps the data folder.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl + K | Search courses, quizzes, units, and question text |
| 1–9 | Select or toggle the corresponding answer while taking a quiz |
| Tab, Shift + Tab, Space / Enter | Reach and select any choice, including beyond the first nine |
| Left / right arrows | Move between questions |
| Escape | Close a dialog |


