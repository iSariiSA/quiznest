# Quiznet releases

Public releases use **Quiznet v<app version>**, such as **Quiznet v1.26.0**. The owner replaced the former stage-based names on 2 November 2026. The current published release is **Quiznet v1.24.0**. The local maintenance build is **Quiznet v1.26.0**.

Use the same version in `package.json`, the Git tag (`v1.26.0`), and the public release name. Keep the download named `Quiznet-Setup.exe`; every update uses the same installation, Desktop shortcut, and local library.

## Internal development stages

Removing the stage from a release title does not promote the application to a stable release. The existing `quiznetRelease` stage and counter remain internal metadata for compatibility:

| Internal stage | Purpose | Requirement for the next stage |
| --- | --- | --- |
| `alpha` — current | Early development and refinement of the offline study app, including the agreed Plugins and Explore goals. | Both features are implemented and verified, and the owner explicitly approves wider testing. |
| `beta` — planned | Wider testing, feedback, and fixes. | Resolve release-blocking issues, complete release checks, and obtain explicit owner approval for a stable release. |
| `official` — planned | Tested releases for regular use. | Further updates continue through review and release checks. |

The current internal stage remains `alpha`. Releases remain GitHub prereleases until the owner approves a stage change. There is no automatic promotion or scheduled launch date. Public titles never include the stage name or its counter.

## Planned development

- **Plugins:** agree on the first useful extension and its interface before selecting an implementation.
- **Explore:** agree on discovery, sharing, and distribution before selecting hosting or accounts. The application currently has only a placeholder screen.

These plans do not authorize implementation or publication. Studying must remain offline, and sharing private material always requires an explicit action. See [ROADMAP.md](ROADMAP.md).

## Release metadata

```json
"version": "1.26.0",
"quiznetRelease": {
  "stage": "alpha",
  "number": 25
}
```

`scripts/release.cjs` derives the public name from `version`, validates the internal metadata, and preserves the stage. `npm run release:info` prints **Quiznet v1.26.0**. For each packaged update, increase the app version and internal counter; changing the stage still requires owner approval.

Release planning and milestones belong in the repository and release notes. Do not display them in Settings or study screens. Settings may show the technical app version for diagnostics.

## Publishing

Each release entry records its version, changes, validation, known limitations, and next goals. Historical notes may retain their original development-stage wording.

After the owner authorizes publication, tag the tested commit with `v<app version>`, title the release with the version-based public name, and attach `Quiznet-Setup.exe` with its SHA256 checksum. Mark internal `alpha` and `beta` builds as prereleases; a stable release requires explicit owner approval. Verify the downloaded asset against the checksum.

Keep the repository name, URL, visibility, application identity, and study-data path unchanged unless the owner requests a change. Follow [MAINTENANCE.md](MAINTENANCE.md) for source review, tests, backup, reinstall, and publication checks.
