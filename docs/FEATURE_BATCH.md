# Feature batching workflow

[Documentation index](README.md) · [Contributing](../CONTRIBUTING.md)

**Current status: no open feature batch.** The published application is Quiznet v1.37.0. Its completed validation is recorded in the [release notes](https://github.com/iSariiSA/quiznest/releases/tag/v1.37.0) and [changelog](../CHANGELOG.md).

The owner prefers to collect small changes before a final testing and installation pass. When a new batch is explicitly requested, record its scope, completed work and remaining decisions here.

## While a batch is open

1. Implement the agreed changes and keep a short scope/status list.
2. Run `npm run check` for source edits and prepare meaningful regression coverage.
3. Defer the complete core/Electron suites, packaging and installation until the owner authorizes the final pass.
4. Preserve the installed app and real study files while collecting features.

## Final pass

Follow [Contributing](../CONTRIBUTING.md#check-your-change) and the [Windows delivery checks](MAINTENANCE.md#build-and-verify-an-update). Verify affected behavior, data compatibility, recovery and compact/accessible layouts. For an authorized app update, build the standard installer, install/reinstall in place and compare study-file hashes.

Publish owner-authorized source changes directly to `main`. Create a prerelease only when publication is requested; documentation and screenshot maintenance can be committed without a new release. Preserve the current internal development stage.

Mark the batch complete after its agreed validation and delivery. Keep detailed historical counts and installer checksums in the corresponding changelog/release entry, rather than presenting an older batch as current work.
