# Engineering research for Quiznet's next Alpha

Historical research note: several recommendations below were implemented in later Alpha builds. See [MAINTENANCE.md](MAINTENANCE.md), [LIMITS.md](LIMITS.md), and the [changelog](../CHANGELOG.md) for current behavior.

Research date: **22 October 2026**. Quiznet baseline: the current working tree for technical version **1.12.0 / Quiznet Alpha 11**.

This is a documentation review and comparison with Quiznet's source, not a head-to-head installation or performance benchmark of competitors. Product observations below come from first-party documentation. Proposed priorities, designs, and acceptance checks are recommendations for Quiznet; they are not implemented features or publication approval.

## Main recommendation

Focus the next small development pass on protecting unfinished authoring, giving users several recovery points, and explaining problems in imported material. Quiznet already has a useful offline core and substantial quiz/practice behavior. These additions would address visible gaps in confidence and recoverability without requiring a server or a storage migration.

My recommended order is:

1. Recoverable editor drafts.
2. Backup history and a read-only library health check.
3. Import quality and duplicate warnings.
4. Reversible deletion and a privacy-safe diagnostic export in a following small increment.

Keep an Alpha release bounded by its published limitations and acceptance checks. The recommendations are product priorities, not evidence that every item is a blocker for a limited Alpha test.

## Comparable products and useful patterns

| Product / reference | Verified observation | Lesson for Quiznet |
| --- | --- | --- |
| **Anki**, local study application | Retains periodic backups with daily/weekly/monthly retention, offers Check Database, and provides duplicate-aware import choices. Its automatic card backups exclude media; full collection exports can include it. [Backups](https://docs.ankiweb.net/manual/backups), [collection checks](https://docs.ankiweb.net/manual/files#checking-your-collection), [imports](https://docs.ankiweb.net/manual/importing/text-files#duplicates-and-updating) | Keep several recovery points and explain what each backup contains. Add an inspectable import report rather than silently merging content. Preserve Quiznet's existing full-library/media backup coverage. |
| **Obsidian**, adjacent local authoring application | File recovery retains local snapshots and supports restoring or comparing previous content. Its documented defaults are a minimum five-minute interval and seven-day retention; recovery covers Markdown/canvas files rather than every attachment. [File recovery](https://obsidian.md/help/plugins/file-recovery) | Unfinished writing needs a recovery mechanism separate from the saved study library. A note snapshot is useful inspiration, not a complete quiz/media backup design. |
| **Mochi**, offline-first study application | Documents local-first changes and portable exports. Its native format is a versioned data archive containing data and media; complete exports can preserve review history. [Backups](https://mochi.cards/docs/getting-started/backing-up/), [format reference](https://mochi.cards/docs/import-and-export/mochi-format-reference/) | Keep study-data formats explicit and portable. Distinguish sharing question content from restoring a private library. A packaged media format is worth considering as libraries grow. |
| **Moodle**, quiz-engine reference rather than a desktop/offline deployment model | Question banks support reuse, Draft/Ready status, and selecting a fixed version or the latest version of a question. [Question banks](https://docs.moodle.org/503/en/Question_bank) | Separate question identity, content revision, and attempt history before introducing shared question banks or automatic updates to questions. |
| **QuizFaber**, quiz-authoring application | Builds quizzes as HTML for local PCs or web delivery and documents Moodle import/export. [Overview](https://www.quizfaber.com/index.php/en/), [features](https://www.quizfaber.com/index.php/en/documentation/features) | Content portability and external authoring workflows are useful expansion directions. Additional servers, themes, and question types are optional product choices rather than prerequisites for Quiznet's next Alpha. |
| **Mnemosyne**, study application | Uses dated automatic backups and explicitly recommends copying the complete data directory, including media, to another location. [Backup documentation](https://mnemosyne-proj.org/help/backups.php) | A local recovery point and a backup on another device solve different failures. Make export and recovery understandable even for users who never enable online features. |

Moodle's current documentation alias resolved to its 5.3 documentation branch during research. The cited page establishes the described design; it is not a claim about which Moodle installer version is currently released. No product is being recommended on price, advertised capacity, or measured speed.

## What Quiznet already does well

The current code already provides serialized transactions, flushed temporary saves, atomic backup replacement, bounded Windows lock retries, recovery from a missing/damaged primary file, checked-answer protection, historical question snapshots, paused progress after restart, and in-place NSIS updates. Large editor/review views are grouped. These should remain invariants as new features are added.

The implementation already separates main-process storage/validation from renderer presentation through a narrow preload API. Preserve that boundary. See [MAINTENANCE.md](MAINTENANCE.md) and [LIMITS.md](LIMITS.md) for the existing contracts and tested workloads.

## Recommended next additions

### 1. Recoverable editor drafts — highest priority

**Current gap:** manual editor questions are held in renderer memory. `closeModal()` clears the editor, and display recovery cannot reconstruct unsaved edits. This is an expected limitation of the current design, rather than a claim that saved quizzes are being lost. See `src/ui/renderer.js` (`editQuiz`, `closeModal`) and the documented crash limitations.

**Smallest useful behavior:** save one active authoring draft locally after a short debounce and offer **Recover draft** after restart. Show whether the draft is saving, saved, or failed. A draft must support incomplete questions, selected destinations that do not yet exist, Markdown/code, and images. An explicit Discard removes the draft; ordinary background draft persistence never commits a half-written quiz or creates empty courses.

**Engineering:** use a separately versioned draft file under the existing data directory, written atomically by the main process. Define size limits and avoid writing an entire study library for every keystroke. Final Save still validates the complete quiz transaction. Draft recovery is independent of resumable practice attempts.

**Acceptance:** terminate the renderer and process during synthetic editing; recover the last acknowledged draft; preserve code whitespace and attachments; reject a corrupt draft without resetting the library; keep controls usable after a failed draft save; confirm Discard does not remove study history.

### 2. Backup history and Check library — highest priority

**Current gap:** the rolling `.bak` is the previous successful state. Subsequent saves can replace the state needed to undo a mistake noticed later. Manual backups and pre-restore copies exist, but there is no selectable timeline or user-facing library inspection operation. See `src/store.cjs` and the backup/restore handlers in `src/main.cjs`.

**Smallest useful behavior:** retain a bounded set of dated snapshots and provide a list with date, size, and content counts. A starting policy to evaluate is seven daily snapshots plus protected checkpoints before restore or other destructive bulk actions, with a documented byte budget. Include all referenced study media. Help the user save a full copy to another device or location of their choice.

Add **Check library**, initially read-only: validate schema, IDs, course/unit ownership, answer indices, historical snapshots, attachments, and saved-attempt consistency. Inspect historical question snapshots on their own terms; an old question does not need to remain in the current quiz. Report usable recovery options. Repairs or restore must preserve the original and require a deliberate action.

**Engineering:** build on the existing validator and transaction queue. Create snapshots at appropriate boundaries, not at every answer. A retention failure must not delete the last known-good copy. Take a consistent snapshot before copying it to an external location. Account for low disk space and test restore, rather than treating file creation as proof of a valid backup.

**Acceptance:** recover material after several later saves and a restart; retain images, history, flags, and unfinished attempts; reject a corrupt candidate without altering the live library; keep the original available if restore fails midway; enforce the retention budget without deleting protected recovery copies silently.

### 3. Import quality and duplicate warnings — high priority

**Current gap:** import validation checks structure and supported content, and the preview shows title/destination/count. Importing the same content again creates new IDs and a suffixed quiz name; it does not explain semantic duplicates. See `src/main.cjs` (`importPreview`) and `src/core.cjs` (`importPacks`).

**Smallest useful behavior:** show a compact report with counts by question type, duplicate-question warnings, repeated-file warnings, missing explanations, and differences from an explicitly associated agent brief. Let the user inspect a warning and choose Import copy or Cancel. Preserve intentional repeated questions; do not silently discard, rewrite, or merge them.

Structural validation cannot establish factual correctness or confirm a citation against source material that Quiznet does not possess. Label that distinction clearly. In particular, a complete JSON file with ten questions can still contain incorrect answers.

**Engineering:** use exact file/content fingerprints for a first duplicate check, with careful treatment of code whitespace and formatted content. Keep an imported package's external identity separate from internal object IDs. Updating an existing quiz should be a later, explicit operation with stable IDs/revisions and active-attempt protection, rather than an automatic side effect of import.

**Acceptance:** importing the same file twice produces an accurate warning; importing a deliberate copy remains possible; incomplete/mismatched briefs do not silently override the returned quiz; old results and active progress are unchanged by the preview or cancellation.

### 4. Reversible deletion — next small increment

**Current gap:** delete removes the selected quiz/course/unit and associated history; it may clear an unfinished session. The confirmation is useful, but there is no persistent trash. See the delete branch in `src/core.cjs`.

**Smallest useful behavior:** move deleted material into a bounded local trash and offer Restore. Keep the related question content and history together. Define retention and a separate, explicit permanent-delete operation.

Restoring an unfinished attempt must not overwrite a different active attempt. Resolve destination/ID conflicts within one validated transaction. A quick Undo button alone is insufficient for mistakes noticed after restarting.

**Acceptance:** restore a deleted quiz with its IDs, media and scores; restore into a missing destination; handle an occupied active-attempt slot; ensure failed restoration cannot partially duplicate content.

### 5. Privacy-safe support information — useful before wider Alpha testing

Anki's troubleshooting process includes copying debug information when reporting add-on errors. [Troubleshooting](https://docs.ankiweb.net/manual/troubleshooting)

For Quiznet, offer **Copy diagnostic information** containing the technical version, Windows/runtime versions, approximate library size/counts, and bounded error codes/timings. Redact user-directory paths and exclude quiz text, answers, images, names, exports, and credentials. The user chooses whether and where to send it; Quiznet needs no telemetry service.

**Acceptance:** an automated test seeds distinctive private-looking synthetic content and confirms it, embedded media, and user paths never appear in the diagnostic export. Keep diagnostic records outside Git and outside shared quiz exports.

## Larger engineering directions to design separately

### Stable questions, revisions, and reusable question banks

Moodle's version-selection model is useful for shared banks. Quiznet already protects history by copying question content into completed attempts and blocking edits to a quiz with an active attempt. However, saving an edited quiz currently gives all its questions fresh IDs; comparisons use matching IDs, so even a small edit begins a different comparison set.

A future model could distinguish a question's stable identity, immutable content revisions, quiz membership, and the revision used by each attempt. This would support reuse, deliberate updates, provenance, and longitudinal statistics. Keep the existing snapshot/attempt guarantees throughout migration. Decide the model before introducing shared banks or importing updates into existing questions.

### Local SQLite, separate media, and narrower IPC

The current JSON store copies and rewrites the full library. Embedded image content is also copied into historical question snapshots. This explains a practical growth constraint already recorded in [LIMITS.md](LIMITS.md).

SQLite is a candidate for incremental local transactions; its documentation specifically identifies desktop application storage as a suitable use. [Appropriate uses](https://www.sqlite.org/whentouse.html), [transactions](https://www.sqlite.org/transactional.html)

Evaluate a storage adapter with question/revision/attempt tables, indexed reads, and media addressed by content hash. Store identical media once while preserving exact historical references. Keep a complete, portable export. Changing to SQLite while still cloning and sending the whole library on each answer would leave a major source of memory/copying cost in place; the renderer API would also need smaller state updates and paged reads.

Require a repeatable migration, preservation of the original JSON, transaction-failure tests, same-version backup/restore, explicit rollback compatibility, and measurements on representative hardware. SQLite/WAL backups must use a consistent backup mechanism; copying only a live main database file can omit committed WAL content. [SQLite backup API](https://www.sqlite.org/backup.html), [WAL file rules](https://www.sqlite.org/wal.html#the_wal_file)

This is an architecture discussion and a separate implementation. The current Alpha's tested workload does not by itself establish a need for an immediate migration or guarantee that another engine will meet arbitrary capacities.

### Keep expensive operations away from window handling

Large validation, serialization, import analysis, and library inspection should be measured for main-thread stalls. Electron recommends keeping long CPU-heavy work away from the main process UI thread. A worker or utility process is a possible next step once measurements justify it. Keep one authority for serialized committed mutations, bounded job queues, and explicit busy/cancellation behavior. [Electron performance guidance](https://www.electronjs.org/docs/latest/tutorial/performance)

### Plugins need a recovery path from the start

Anki documents safe startup with add-ons disabled. [Safe mode](https://docs.ankiweb.net/manual/troubleshooting#2-check-add-ons)

Before Quiznet enables external plugin code, agree on the initial capability and trust model. Design a safe-start path that loads no plugins, supported-version checks, bounded execution, and narrow capabilities. A separate process alone is not a permission sandbox. Disabling an extension must leave saved quizzes readable. This is planning for the roadmap, not authorization to implement Plugins now.

### Explore should import portable content deliberately

Mochi separates portable deck export from publishing to the web. [Sharing](https://mochi.cards/docs/decks/sharing/)

For Quiznet, any future discovery service should supply validated question packages that remain usable locally. Shared question packages should omit private attempts and library recovery data by default. Define a package version, content identity, source/author information, byte limits and attachment rules. Imported material must remain inert data rather than executable extensions. Discovery and publishing are separate explicit actions; neither needs to become a dependency of studying.

### Useful later study behavior

Anki exposes spaced-review scheduling, including FSRS options. Moodle documents certainty-based marking. [Anki scheduling](https://docs.ankiweb.net/manual/deck-options#fsrs), [Moodle quiz use](https://docs.moodle.org/503/en/Using_Quiz#Results_in_a_quiz_using_CBM_.28Certainty-based_marking.29)

Potential Quiznet additions are review queues based on recent mistakes and question-level confidence, with a clear explanation of why each question was selected. Multiple-choice correctness should not be silently equated to a flashcard recall rating. Stable question identity and a documented grading/scheduling model should come first. These are later product experiments, not necessary additions to the next Alpha.

## A distinctive direction for Quiznet

My proposed direction is an **offline quiz workbench with a dependable agent handoff**: choose requirements, generate through a user-chosen external agent, inspect an import report, review source references, study, and retain recoverable work and history.

Quiznet already has the handoff and local study workflow. The differentiating addition would be connecting the returned file to its explicit brief and making questions easy to inspect and correct. This is a product recommendation, not a claim that no other product offers similar capabilities. Typed source/provenance metadata could follow later; the current instructions already request references in explanations.

## Checks before approving another Alpha

- Freeze a small release scope and list its known limitations. Keep the established stage policy; Plugins and Explore are goals before Beta, not automatic conditions for another Alpha increment.
- Run existing regression and fault suites, and the acceptance checks for whichever additions are implemented.
- Verify an upgrade from the published Alpha's synthetic data, not only reinstalling the current build. Check saved attempts, media, history, and backup round trips.
- Exercise the installer and core workflow on a separate representative Windows machine or VM, including no network, a standard user account, display scaling, and restricted/low-space storage. Record the environment and workload rather than claiming universal stability.
- Keep the same app ID, Desktop shortcut, data path, and `Quiznet-Setup.exe` installer name.
- Document signing status accurately. The separately approved [update-checking design](UPDATE_CHECKING_PROPOSAL.md) preserves offline study, fixed trusted release destinations, explicit installation, and saved progress.
- Obtain the owner's publication decision for the tested artifact. This research does not publish, change stages, or add network behavior.

The first three recommendations can be scoped independently and reviewed before any larger data-model change. No application source, dependency, installation identity, or stored library was changed for this research.


## Follow-through for the next local Alpha

The owner selected a focused reliability implementation after this research. The local Alpha 12 build adds the first three proposals: recoverable editor drafts, bounded backup history with a read-only library check, and import reports compared with the current valid brief. It retains library schema 1, plain JavaScript, and the offline runtime. See [the changelog](../CHANGELOG.md), [limits](LIMITS.md), and [maintenance contracts](MAINTENANCE.md) for actual behavior and validation. The larger storage/revision proposals and remaining product experiments above are still proposals, not shipped features.

The following local Alpha 13 adds the approved optional GitHub Releases API checker. It remains separate from studying and retains the existing installer flow; details are in the update-checking document.
