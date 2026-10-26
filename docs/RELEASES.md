# Quiznet releases

Quiznet is currently **Alpha**. The current release is **Quiznet Alpha 16**, using internal installer version `1.17.0`. The owner approved publishing this Alpha; Beta remains a future owner decision. Remain in Alpha until the owner explicitly approves changing the stage.

## Names and stages

| Stage | Public names | Purpose | Requirement for the next stage |
| --- | --- | --- | --- |
| Alpha — current | Quiznet Alpha 1, Quiznet Alpha 2, … | Build and refine the application, including Plugins and Explore. | Both features are implemented and verified, and the owner explicitly approves Beta. |
| Beta — planned | Quiznet Beta 1, Quiznet Beta 2, … | Distribute to a wider group, collect feedback, improve the app, and test its workflows. | Resolve release-blocking issues, complete release checks, and obtain explicit owner approval for the first Official Release. |
| Official Release — planned | Quiznet Official Release; later updates can use Quiznet Official Release 2, … | Deliver the tested application for regular use. | Further updates continue through review and release checks. |

There is no automatic stage promotion, scheduled launch date, or change of stage caused by a version-number increase. Finishing Plugins and Explore makes Quiznet ready for the owner's Beta decision; it does not change Alpha on its own. Wider distribution and publication are separate owner-controlled actions.

## Current Alpha goals

- **Plugins — planned:** let Quiznet grow through optional capabilities for studying. Agree on the first useful extension and its interface before selecting the implementation.
- **Explore — planned:** let people discover tests shared by others and add chosen tests to their own library. Agree on discovery, sharing, and distribution before selecting hosting or account requirements.

These are development goals, not features available in Alpha 8; Explore currently has a placeholder screen only. See [ROADMAP.md](ROADMAP.md) for intended outcomes and readiness checks. Core studying and saved material must continue to work offline. Sharing must be explicit; do not automatically publish or upload private libraries.

## Release metadata

`package.json` is the single source for the current stage and release number being built:

```json
"quiznetRelease": {
  "stage": "alpha",
  "number": 16
}
```

`scripts/release.cjs` derives the repository release name from that metadata. `npm run release:info` prints the public name and internal installer build. The build commands validate this metadata before packaging. Public release names, the stage plan, and development milestones belong only in the GitHub repository and release notes. The application does not display them; Settings retains the technical app version for diagnostics.

For the next Alpha release, increment `quiznetRelease.number` while keeping `stage` equal to `alpha`. Only after explicit owner approval, set `stage` to `beta` or `official` and start that stage at number 1. The internal `version` must continue increasing for Windows installer ordering and diagnostics. Never set the technical version to the word Alpha or lower its numeric value just to match a public name.

Alpha 16 uses internal installer version `1.17.0`; the previous public Alpha 8 installer was `1.10.1`. Build and release records are in [CHANGELOG.md](../CHANGELOG.md).

## Preparing release notes

Each release entry must state its public name and stage, what changed, validation performed, known limitations, and the next goals. Technical build IDs can appear as secondary maintenance information.

When the owner authorizes a GitHub release, use the derived public name for its title. Alpha and Beta are prereleases; Official Release is a stable release. Keep the existing technical `v<app version>` tag convention for identifying the exact tested commit, and retain the stable `Quiznet-Setup.exe` asset name. Publication requires owner approval. Keep the repository's name, URL, and visibility unchanged unless the owner requests a change.

Follow [MAINTENANCE.md](MAINTENANCE.md) for the full test, backup, reinstall, and checksum checks. All stages update the same installed Quiznet application and preserve the same local library and shortcut.
