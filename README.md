# Scholar Search for Zotero

Right-click selected text in the Zotero PDF reader to search **Google Scholar**,
**Web of Science**, **Google** or **PubMed** — and open the result in the
browser of your choice.

A tiny, dependency-free Zotero 7 / 9 plugin.

> **Platform:** macOS only. The browser handoff uses AppleScript / `open`, which
> is macOS-specific. On other platforms searches fall back to opening in your
> system default browser.

## Features

- **Right-click to search.** Select text in the PDF reader, right-click, and
  pick a search engine.
- **Multiple search engines.** Enable any of Google Scholar, Web of Science,
  Google and PubMed in Settings. Each enabled engine appears as its own menu
  item.
- **Choose your browser.** Open searches in Google Chrome, Safari, Firefox,
  Edge, Brave, Arc, or your system default — overriding the OS default the same
  way the original Chrome-only version did.

## Install

1. Download the latest `scholar-search.xpi` from the
   [Releases page](https://github.com/Acatechnic/zotero-scholar-search/releases/latest).
2. In Zotero: **Tools → Plugins → ⚙ (gear) → Install Plugin From File…**
3. Select the downloaded `.xpi`.

Zotero will keep the plugin up to date automatically.

## Usage

1. Open a PDF in Zotero's reader and **select some text**.
2. **Right-click** the selection.
3. Choose **Search Google Scholar** (or any other enabled engine).

## Settings

**Tools → Plugins → Scholar Search → ⚙ → Plugin Options**, or via Zotero
**Settings → Scholar Search**:

- **Search engines** — tick the engines you want to appear in the right-click
  menu. One menu item is shown per enabled engine.
- **Browser** — choose which browser opens searches. "System default" uses your
  macOS default browser; any other choice overrides it. If the chosen browser
  isn't installed, the system default is used instead.

## Notes & limitations

- **Web of Science** is a session-based web app with no documented query URL.
  The plugin makes a best-effort attempt to pre-fill the search; depending on
  your institution's access it may simply open the Web of Science search page.
- Advanced users can override any engine's URL without waiting for an update by
  setting a hidden pref `extensions.scholar-search.url.<key>` (keys: `scholar`,
  `wos`, `google`, `pubmed`) to a template containing `{q}`.

## Build from source

The plugin has no build step — an `.xpi` is just a zip of the source files:

```bash
./build.sh
```

This produces `scholar-search.xpi` in the project root.

## License

[MIT](LICENSE)
