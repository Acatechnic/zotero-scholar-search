# Scholar Search for Zotero

Right-click selected text in the Zotero PDF reader to search **Google Scholar**,
**Google**, **PubMed** — or any **custom search engine** you add — and open the
result in the browser of your choice.

A tiny, dependency-free Zotero 7 / 9 plugin.

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/acatechnic)

> **Platform:** macOS only. The browser handoff uses AppleScript / `open`, which
> is macOS-specific. On other platforms searches fall back to opening in your
> system default browser.

## Features

- **Right-click to search.** Select text in the PDF reader, right-click, and
  pick a search engine.
- **Multiple search engines.** Enable any of Google Scholar, Google and PubMed
  in Settings, and add your own. Each enabled engine appears as its own menu
  item.
- **Custom engines.** Add any site that supports a search URL — put `{q}` where
  the selected text should go (e.g. `https://www.semanticscholar.org/search?q={q}`).
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

- **Search engines** — tick the built-in engines you want in the right-click
  menu. One menu item is shown per enabled engine.
- **Custom search engines** — click **Add custom engine**, give it a name, and
  enter a URL with `{q}` where the search text should go. Add as many as you
  like; remove one with its **Remove** button.

## Notes & limitations

- **Web of Science** is intentionally not a built-in: it's a session-based web
  app with no public query URL, so a direct search link just opens an empty
  page. If your institution provides a URL that pre-fills a query, add it as a
  custom engine.
- Advanced users can override a built-in engine's URL without waiting for an
  update by setting a hidden pref `extensions.scholar-search.url.<key>` (keys:
  `scholar`, `google`, `pubmed`) to a template containing `{q}`.

## Build from source

The plugin has no build step — an `.xpi` is just a zip of the source files:

```bash
./build.sh
```

This produces `scholar-search.xpi` in the project root.

## Support

This plugin is free and open source. If it's useful to you and you'd like to
support its development, you can [**buy me a coffee ☕**](https://buymeacoffee.com/acatechnic).
Entirely optional — bug reports and PRs are just as welcome.

## License

[MIT](LICENSE)
