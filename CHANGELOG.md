# Changelog

All notable changes to this project are documented here.

## [2.2.0] — 2026-06-23

### Added
- **Windows and Linux support for browser choice.** Picking a specific browser
  (Chrome, Firefox, Edge, Brave, Arc) now works on all three platforms, not just
  macOS, by launching the browser directly via Zotero's subprocess API. If the
  chosen browser isn't found, the search falls back to the system default
  browser, so searching always works. (Safari remains macOS-only.)

### Changed
- The browser setting is stored as a stable key (e.g. `chrome`) instead of a
  macOS app name. Existing settings are migrated automatically.

## [2.1.0] — 2026-06-23

### Added
- **Custom search engines.** Add your own engines in Settings (name + a URL
  template containing `{q}`). Each appears as its own right-click menu item.
  Add or remove as many as you like.

### Removed
- **Web of Science built-in.** It's a session-based web app with no public
  query URL, so the link only ever opened an empty page. Add it as a custom
  engine if your institution provides a working search URL.

## [2.0.0] — 2026-06-23

First public release.

### Added
- **Settings pane** (Zotero **Settings → Scholar Search**) for configuring the
  plugin without editing code.
- **Multiple search engines.** Google Scholar (on by default), Web of Science,
  Google and PubMed can each be enabled independently; one right-click menu
  item is shown per enabled engine.
- **Browser selector.** Open searches in Google Chrome, Safari, Firefox, Edge,
  Brave, Arc, or the system default. The chosen browser overrides the OS
  default; if it isn't installed, the system default is used.
- Advanced per-engine URL override via the hidden pref
  `extensions.scholar-search.url.<key>`.
- GitHub-hosted auto-update manifest, icon, build script, README, LICENSE.

### Changed
- Browser handoff now uses `open -a` (via AppleScript) so it works for any
  browser, not just Chrome, while keeping the "fall back to the default
  browser" behaviour.
- Plugin id is now `scholar-search@acatechnic` (was `scholar-search@local`).
  Existing local installs should be removed and replaced once.

### Prior history
- 1.x — private builds: single "Search Google Scholar" reader menu item that
  always opened in Chrome (falling back to the default browser).
