# Optional update checking

The owner approved this feature after the original proposal. It is implemented in the next local build. Studying still works offline; update checks are separate, optional requests for public release information.

## Using it

Open **Settings → Check for updates** for a manual check. Choose **Check automatically every two days** to enable automatic checks on this device. The default is off. When enabled, Quiznet checks on launch if due and checks the local schedule each minute while open. It does not run in the background when closed.

A newer eligible installer offers **Download update**, **Later** (24 hours), and **Skip this version**. Closing the prompt also postpones it. Skipping one version does not hide newer versions. A manual check can show a skipped version. Notifications wait until you leave the quiz, and do not replace an open editor or another dialog.

**Download update** opens the fixed GitHub release page in the normal browser. Download and run `Quiznet-Setup.exe` when ready. The existing per-user NSIS identity, install directory, shortcut, and study data remain unchanged. There is no unattended download, installer execution, forced restart, or automatic migration.

## Source and privacy

The main process queries the public GitHub Releases API for `iSariiSA/quiznest`. The renderer remains unable to make network requests, navigate to outside content, or choose a custom update URL. No GitHub account, token, cookies, quiz content, local filenames, or telemetry is sent. GitHub receives ordinary connection information such as the IP address and a fixed Quiznet update-check User-Agent.

Only published, non-draft releases with a canonical `v<major>.<minor>.<patch>` tag (optionally with a semantic prerelease suffix), a newer technical version, and exactly one uploaded, nonempty `Quiznet-Setup.exe` asset at the expected repository URL qualify. Alpha prereleases are intentionally included. Public release names/body/stage plans never enter study screens; only technical versions are displayed. Checks do not publish a release or change repository visibility.

## Failure and resource limits

- One in-flight check is shared by repeated clicks. Successful checks have a 60-second minimum manual interval; automatic checks run after 48 hours. A failed automatic check can retry after two hours. GitHub rate-limit/reset headers can delay checks further, including manual requests.
- Network work has an 8-second timeout; preference writes still depend on local storage. Each response is capped at 2 MiB, with at most five locally constructed pages of 20 releases. Redirects are not followed. A truncated/incomplete check reports failure, not a fresh success.
- Manual checks leave navigation and quiz answers usable while the request is pending. Offline, malformed responses, API failures, rate limits, and preference-save failures keep studying available. Only a complete successful check updates the last-success timestamp. An unsuccessful check does not announce a cached version as a fresh discovery; Settings can still expose a previously known release.
- Preferences, timing, skipped version, reminder time, and a small cached version/tag live in `%APPDATA%\Quiznet\updates.json`, separately from `data/library.json`. Writes are serialized and atomic. Corrupt preferences disable automation and are preserved before a later successful replacement. Library backups/restores do not copy or change this device preference.
- App close cancels a pending request and drains preference writes; library and draft save protection remains in place.
- Detection is limited to eligible public releases in the configured repository. Private/draft releases, unpublished local builds, tags without release assets, and incompatible artifact names are not update offers.

## Future installation work

The installer is currently unsigned. Downloading and executing an installer from inside Quiznet needs a separately reviewed publisher/artifact-verification design and an explicit install action after pending saves. A checksum served beside an installer is useful for integrity but does not independently establish the publisher. Keep NSIS and `com.quiznet.desktop`; do not introduce a second installation identity.

## Sources

- [GitHub release API](https://docs.github.com/en/rest/releases/releases#list-releases): published release listing, assets, pagination, and unauthenticated public access.
- [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api): anonymous request limits and retry headers.
- [GitHub REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api): bounded serial requests and rate-limit handling.

No hosting change, signing application, dependency addition, public release, or repository visibility change is included.
