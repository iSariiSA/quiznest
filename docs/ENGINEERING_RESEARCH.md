# Engineering notes and open decisions

[Documentation index](README.md) · [Maintenance contracts](MAINTENANCE.md) · [Roadmap](ROADMAP.md)

Reviewed against **Quiznet v1.37.0** on **9 November 2026**. This page tracks implemented behavior and decisions that still need a separate design. Earlier research informed the recovery, import and review features now in the app; historical implementation details remain in the [changelog](../CHANGELOG.md).

## Current implementation

| Area | Shipped behavior | Current reference |
| --- | --- | --- |
| Offline storage | One version-1 local JSON library, serialized transactions, flushed temporary files, atomic replacement and a rolling backup. Updates retain one installation and data path. | [Storage and maintenance](MAINTENANCE.md#storage-and-compatibility) |
| Unfinished work | Resumable quiz/review responses and recoverable editor drafts, including incomplete questions and attachments. Normal close waits for pending saves. | [Study guide](USER_GUIDE.md) |
| Recovery | Configurable local recovery history, preview/restore, explicit pre-restore copies and a read-only library check. | [Limits and recovery](LIMITS.md) |
| Import inspection | Destination selection, per-question browsing, duplicate/conflict and brief-mismatch warnings, bounded rendering and explicit answer reveal. Human review still checks factual correctness. | [Import formats](IMPORT_FORMATS.md) |
| Study and feedback | Five question types, instant/delayed feedback, written self-correction, hints/reference sheets, flags, timing and missed-question practice. | [Study guide](USER_GUIDE.md) |
| Review | Daily limits and Again/Hard/Good/Easy scheduling; independent Saved practice and mistake review; course/unit/quiz filtering. | [Daily review](USER_GUIDE.md#daily-review) |
| Organization and progress | Collections, custom icons/colors, course focus, ordering/pinning, Home resume and History dashboards. | [Study guide](USER_GUIDE.md) |
| Presentation | App/Quiz/Review/Editor appearance, real-screen previews, English/Arabic/Spanish and bundled offline math/code rendering. | [Languages](LANGUAGES.md), [brand](BRAND.md) |
| Updates | Optional fixed-source GitHub release checks; users download and run the same offline installer. | [Update checking](UPDATE_CHECKING.md) |

The v1.37.0 release passed 149 core/storage tests and 102 Windows desktop workflows locally and in GitHub CI. Its installer was verified through two in-place installs and preserved study/preference hashes. These results describe that release; future changes need validation appropriate to their behavior. See the [release notes](https://github.com/iSariiSA/quiznest/releases/tag/v1.37.0).

## Contracts to preserve

- Studying works without accounts, servers or renderer networking. Imported markup stays inside the existing content allowlist; code is displayed without execution.
- Keep `com.quiznet.desktop`, Quiznet, the Desktop shortcut, `Quiznet-Setup.exe` and `%APPDATA%\Quiznet\data` stable.
- Historical attempts and saved copies retain their content snapshots. Explicit written self-correction changes the chosen result; accepting new wording changes one identifiable original question. Other past results retain their answer keys.
- A failed save keeps the last committed library and response available. Installation, screenshot capture and documentation work never reset a real library.
- The sole maintainer publishes authorized source changes directly to `main`. Documentation-only updates do not need a new app version, installer or release.

## Open engineering decisions

### Item-level recovery

Recovery snapshots can restore an earlier whole library. A dedicated trash view with per-item restore is still a possible improvement. Its design needs clear retention, parent-course/unit behavior, question/history ownership and conflict handling before implementation.

### Question identity and reusable banks

Current snapshots protect past answers; content fingerprints connect unchanged saved material, and editing can issue new question IDs. Reusable question banks and deliberate content updates need an agreed model for identity, revisions, membership and provenance. Preserve historical snapshots and backup compatibility throughout any migration.

### Larger libraries

The current store loads, copies and rewrites the complete library. Embedded media also appears in historical snapshots. [Measured workloads and limits](LIMITS.md#practical-capacity) describe the practical costs.

Incremental local storage, shared media, narrower renderer updates or worker-based processing are design options. Measure real startup/save/import workloads first. Any storage change needs owner approval, repeatable migration, preserved original files, failure tests and a complete portable backup format. The app currently uses plain JavaScript and the existing JSON store.

### Support information

Settings exposes the technical version, storage summaries, local recovery and fixed project links. A dedicated diagnostic export remains a proposal. Its content should be previewable and exclude study text, private paths and credentials by default. Study reports intentionally contain study material and are shared only by an explicit user action.

### Plugins and Explore

Plugins are planned. Explore currently has a placeholder screen. The first extension capability, trust/recovery model and discovery/sharing workflow still need agreement. Keep optional online activity separate from offline studying, and require deliberate sharing of study content. See the [roadmap](ROADMAP.md); this document does not authorize implementation or change the development stage.

### Distribution

The current Windows installer is unsigned and updates in place. Code signing and any future in-app installer download/execution need their own design and approval. Keep the present release metadata check and manual installation behavior documented accurately.
