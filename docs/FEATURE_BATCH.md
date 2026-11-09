# Current feature batch

Status: complete. The owner requested batching on 3 November 2026, then explicitly authorized the final pass after the Collections/appearance feature. The validated batch is installed as Quiznet v1.28.0.

The batch workflow was to implement requested changes in source, prepare regression coverage for meaningful changes, and run quick source checks while collecting features. Full core/Electron checks, dependency/privacy scans and packaging were deferred until the owner authorized the final pass. For a future requested batch, record its scope and status separately and use the same explicit final-pass boundary.

Final results: syntax/offline assets passed; all 108 core/build-metadata tests and 75 Electron workflows passed. History and Library layouts were reviewed. All 110 packaged files matched source; installing twice retained app/shortcut identity and study-file hashes. The installed smoke check passed. See CHANGELOG.md for checksum and validation details. No publication or stage change was requested.

## Included so far

- History: cascading course/unit/quiz filters, course-focus filter, date range and session-type filters; Overview, Sessions, and Quiz details views.
- Overview: completed-session counts, answer accuracy, recorded active time with partial/missing timing explicit, local study days, recent scores, effort by course focus, and course coverage.
- Course study focus: Long-term focus, For now, Low priority, or Not set. Edit from the course page, Course actions, or History course progress. Existing courses remain unclassified until chosen.
- Course focus is organizational metadata. The user's daily-review quiz selection, study material, unfinished attempts, and historical answers retain their existing behavior.
- Library: Collections above courses, course/collection icons and independent icon/name colors, custom emoji/symbols, moving courses between collections, pinning and manual up/down order. Removing a collection preserves its courses and progress.

## Final validation scope

- Run syntax/offline-asset, core, Electron, dependency, and privacy checks from CONTRIBUTING.md.
- The new History and library-organization model/storage and desktop tests were executed successfully in the final pass.
- Check focus save/reset, invalid metadata, failed-write rollback, restart and backup/restore; preserve attempts and sessions.
- Check History cascade resets, date boundaries, focus/session filters, unlinked legacy attempts, paging, empty states, and links to results/reports and practice.
- Check weighted accuracy, fully/partially timed versus untracked attempts, full-quiz coverage and latest/best full scores; keep missed-question sessions separate in those comparisons.
- Review normal/compact layouts, escaped imported names, keyboard focus, large histories and read-only browsing. Verify older History/result workflows against the richer dashboard.
- When the owner requests delivery, assign the next technical version and internal counter, build the standard installer, install/reinstall in place and verify profile/shortcut identity and study-file hashes per MAINTENANCE.md. Preserve the current public release naming and internal stage. Mark this batch complete only after the agreed validation and delivery are complete.
