# Limits and stability

These are the current limits, checked against the parser, editor, storage code, and Windows tests. File-size labels in the app use MB for multiples of 1,048,576 bytes (MiB). Text limits count JavaScript string characters, rather than words.

| Area | Limit or behavior |
| --- | --- |
| Creating a quiz | 1–10,000 questions |
| JSON/CSV import | Up to 10,000 questions total and 1,000 quizzes per file; at most 20 MiB of UTF-8 data |
| Saving an edited quiz | At most 19 MiB of formatted portable JSON, leaving room for export/import |
| Export | At most 20 MiB; compact JSON is used when indentation would exceed that limit |
| Choice questions | 2–100 choices; true/false has exactly 2 |
| Plain text | Prompt/explanation: 10,000 characters; each choice: 5,000 |
| Markdown | 100,000 characters per prompt, choice, or explanation |
| Markdown math | 4,000 characters per formula; at most 64 formulas and 16,000 formula-source characters rendered per field. Unsupported/oversized formulas remain readable; display-budget overflow retains the source with a note. Macro expansions and visual dimensions are capped. Math displays notation; it does not run Python or calculate answers |
| HTML | 4,194,304 characters per prompt, choice, or explanation; formatting is sanitized |
| Attached code | 50,000 characters; highlighting stops above 12,000 characters per block |
| Images | Embedded PNG/JPEG/GIF/WebP; 2 MiB per image; description up to 500 characters |
| Names | Course/unit/quiz: 200 characters; custom practice preset: 60 |
| Custom practice presets | Up to 50 |
| Instruction preferences | Other free-text fields: 2,000 characters; code language used on a question: 50 |
| Question navigation | Groups of 100; this is a display size, not the quiz limit |
| Large editors and results | 25 questions per editor group; 50 per review group. Saving and grading use the complete quiz |
| Backup restore | Separate from quiz import; no 20 MiB file cap. Available memory and disk space still apply |
| Editor recovery draft | One draft, 1–10,000 incomplete questions, at most 20 MiB compact JSON; saved after a 500 ms input debounce and flushed before normal app close |
| Backup history | Up to 7 copies within 128 MiB; if the newest copy alone exceeds that budget, retain it alone. Exported/pre-restore copies are outside this budget |
| Update checking | Optional; 8 seconds per network check, 2 MiB per response, at most 100 releases across 5 pages. Automatic schedule 48 hours; failed checks can retry after 2 hours, subject to rate limits |
| Courses, units, quizzes, history | No configured total count cap; practical capacity depends on content and hardware |
| Study report | One completed attempt, up to 10,000 questions and 20 MiB of UTF-8 Markdown including embedded diagrams. All questions or mistakes/time priorities; no silent truncation. Most-time priorities: top 20% of positive recorded question times, capped at 5, with ties resolved by saved question order |

## Practical capacity

The complete library is one local JSON file. It is loaded into memory, copied for a transaction, and rewritten when a change is saved. Historical results retain their question content, including images and code. Repeated large or image-heavy quizzes can therefore grow the library substantially.

The Windows pressure checks successfully processed 10,000-question quizzes, restarted a 39,305,255-byte library (about 37.5 MiB), and completed queued writes without losing acknowledged changes. The real desktop check edited and saved question 10,000, reviewed the final group, answered it, closed the app, and resumed the same answer and position. These are tested workloads, not an unlimited-capacity guarantee or a minimum specification for every computer.

A separate recovery-history check used 10,000 questions and six completed attempts in a 38,745,271-byte library. Eight snapshot creations retained five copies totaling 134,171,535 bytes (just under 128 MiB), restored a valid snapshot in memory, and checked both library files without changing the active file.

An intentionally demanding backend test retained 20 full-library responses at once and reached roughly 1.3 GiB of process memory. The normal interface waits for each save, but very large libraries still require much more RAM than their file size. Larger capacities, long-running memory behavior, and all low-memory computers have not been certified. A different storage design should be discussed before promising libraries of hundreds of megabytes.

Allow approximately two extra library sizes of free disk space while saving, beyond the existing library and rolling backup, plus space for a new history snapshot before old snapshots are pruned. New data and backup copies are completed in temporary files before replacement. Draft replacement also needs its own temporary file. A restore preserves a separate pre-restore copy; those legacy copies accumulate until the owner manages them. Local backup history does not protect against losing the whole drive.

## Failure behavior

- Mutations are serialized. A failed operation leaves the committed library in place and does not prevent a later retry.
- Backup copies are replaced atomically. An interrupted or partial copy does not overwrite the previous good backup.
- Temporary Windows replacement locks receive five bounded retries. Permanent locks and full disks report errors rather than silently claiming a successful save.
- Closing waits for pending saves and pauses timing before destroying the window. If that save fails, Quiznet keeps the window open so the user can retry.
- Failed background timing checkpoints are reported, with at most one checkpoint pending at a time.
- A crashed display can reopen using saved library data and paused quiz progress. An edited quiz can be recovered from its last acknowledged on-device draft save, including incomplete questions, attachments, and destination names. A hard process stop can lose edits made after that acknowledgement. Closing the editor keeps its draft; Cancel explicitly discards it.
- Unexpected process termination or power loss can lose unacknowledged changes and timing since the last successful checkpoint. A checkpoint is attempted every 15 seconds; slow or failing storage can delay it.
- Automatic startup recovery uses the last valid rolling backup if the primary file is missing or damaged. If both copies are unreadable, their files are preserved; a valid history snapshot or external backup must be restored manually before reopening. History is not silently selected or merged. Recovery cannot reconstruct material that was never saved.
- Check library validates the structure, references, and attempts in the current file and rolling backup without repairing or rewriting them. It does not test drive hardware or certify question correctness. Import warnings detect exact content repeats, missing explanations, and current-brief count/type mismatches; near-duplicates and factual errors still require human review.

Study data remains local and studying works offline. Installer updates retain the installed application identity, Desktop shortcut, and data directory.
