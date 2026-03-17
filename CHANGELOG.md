# Changelog

All notable changes to TaskBoard are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]




---

## [0.1.0] - 2026-03-15

### Added

#### TUI App (`@taskboard/tui`)
- Ink 5 terminal app, launchable via `npx taskboard-tui`
- CLI argument `--path <taskops-root>` for non-interactive startup
- **ProjectSelect** screen — folder path input + project list selection
- **Dashboard** screen — Epic/Task hierarchy with status icons and progress bars
- **TaskOperations** screen — task selector + operation flow timeline
- **Resources** screen — resource file list with type color coding
- **Settings** screen — key/value settings table
- Tab-key navigation between screens; `R` refresh; `Q` quit
- Component tests with ink-testing-library
