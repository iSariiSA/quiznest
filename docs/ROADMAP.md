# Quiznet roadmap

The goal is to let you test yourself in the way you choose, with a compact interface and a local library. Quiznet is currently **Alpha** and stays in Alpha until the owner explicitly approves Beta. See [RELEASES.md](RELEASES.md) for release names and stage rules. There are no committed launch dates.

## Alpha — current

Continue refining the local study application. Existing capabilities include courses, units, mixed question types, images and HTML, saved progress, results, and backup/restore.

The two major goals before Beta are:

| Feature | Status | Intended outcome | Ready for Beta when |
| --- | --- | --- | --- |
| Plugins | Planned | Optional capabilities can extend how people study. | The agreed initial plugin workflow works, can be tested and maintained, and preserves the base application's offline study workflow and data. |
| Explore | Planned | People can discover tests shared by others and add chosen tests to their own library. | The agreed discovery and sharing workflow works end to end, selected tests remain usable offline, imports are validated, and private material is shared only deliberately. |

Choose the first plugin capability and Explore discovery/sharing model before implementing their architecture or adding services. Do not assume a marketplace, account system, public repository, hosting provider, or network access to private libraries.

Once both features are implemented and verified, the owner decides whether to enter Beta. Their completion alone does not change the release stage.

## Beta — planned

- After owner approval, share Beta with a wider group of testers.
- Collect feedback about Plugins, Explore, and the core study workflow.
- Fix bugs, improve usability, and test installation, updates, data compatibility, and reliability across representative libraries.
- Stay in Beta while testing and fixes continue; release dates and distribution remain owner decisions.

## Official Release — planned

After Beta testing, resolve release-blocking problems and complete the Windows release checks. The owner explicitly approves the first Official Release and its distribution. Continue preserving the same installation, Desktop shortcut, and local study data.

## Reliability throughout all stages

- Expand regression coverage for invalid imports, disk errors, interrupted saves, and future data migrations.
- Test installation and updates against existing libraries, saved attempts, and larger collections.
- Keep startup, search, and imports responsive as the library grows. Measure before changing the architecture.
- Verify keyboard navigation, focus, contrast, and display scaling on Windows.

## Make study tasks smoother

- Improve bulk question editing and import previews based on actual use.
- Add useful study options, such as practicing missed questions, with few visible controls.
- Refine search and history so a growing course collection remains easy to navigate.
- Consider additional local import formats after agreeing on representative files and validation rules.

## Maintainable releases

- Keep one installer, one installation identity, and backwards-compatible data.
- Review dependency updates and keep the Windows checks passing.
- Publish tested installers with checksums when the owner is ready to distribute releases.
- Consider code signing when distributing the app more broadly.

Each feature proposal should state the user's task, smallest useful interface, data impact, and acceptance checks. Preserve offline operation and local study data. Review proposed dependencies and architecture changes with the owner before implementation.
