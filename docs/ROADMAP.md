# Quiznet roadmap

The goal is a dependable offline quiz app with a compact interface. These are planning priorities for owner review, rather than scheduled releases.

## Reliability first

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
