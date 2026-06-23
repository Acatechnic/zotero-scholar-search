"use strict";

// Scholar Search – Zotero 7/9 plugin
//
// Right-click selected text in the PDF reader to search one or more academic
// search engines, opening the result in the browser of your choice.
//
// Reader menu API (from Zotero 9 source xpcom/reader.js):
//
//   Zotero.Reader.registerEventListener('createViewContextMenu', handler, pluginID)
//
// The handler receives { reader, params, append } and must call
// append({ label, onCommand }) synchronously for each menu item.
//
// Selected text lives in:
//   reader._state.primaryViewSelectionPopup.annotation.text
//
// The bootstrap sandbox has no setTimeout and no console.log – neither exists
// here. (The preferences pane, which runs in a real window, does; see
// preferences.js.) ChromeUtils IS available, used to lazily load Subprocess for
// launching a specific browser cross-platform.

var PLUGIN_ID = "scholar-search@acatechnic";
var PREF_BRANCH = "extensions.scholar-search.";

// Search-engine catalog. Each URL is a template with a {q} placeholder that is
// replaced by the URL-encoded selected text. URLs can be overridden at runtime
// via the hidden pref `extensions.scholar-search.url.<key>` (handy if a site
// changes its query format before a plugin update ships).
var ENGINES = [
  {
    key: "scholar",
    label: "Google Scholar",
    url: "https://scholar.google.com/scholar?q={q}",
    defaultOn: true,
  },
  {
    key: "google",
    label: "Google",
    url: "https://www.google.com/search?q={q}",
    defaultOn: false,
  },
  {
    key: "pubmed",
    label: "PubMed",
    url: "https://pubmed.ncbi.nlm.nih.gov/?term={q}",
    defaultOn: false,
  },
];

// User-defined engines are stored as a JSON array of {label, url} in the pref
// `extensions.scholar-search.custom`. Each url is a {q} template, just like the
// built-ins. This is how sites without a built-in entry (e.g. Web of Science,
// if your institution exposes a working query URL) are added.

var ScholarSearch = { rootURI: null, prefPaneID: null };

function install(data, reason) {}
function uninstall(data, reason) {}

function startup(data, reason) {
  // `data` = { id, version, rootURI, ... }. rootURI is needed to locate the
  // preferences pane files inside the (un-unpacked) xpi.
  ScholarSearch.rootURI = data && data.rootURI ? data.rootURI : null;
  try {
    Zotero.initializationPromise.then(function () {
      try { _init(); } catch (e) {}
      try { _registerPrefs(); } catch (e) {}
    });
  } catch (e) {}
}

function shutdown(data, reason) {
  // Reader listeners registered with our pluginID are removed automatically on
  // shutdown. The preferences pane must be unregistered explicitly.
  try {
    if (ScholarSearch.prefPaneID &&
        Zotero.PreferencePanes &&
        typeof Zotero.PreferencePanes.unregister === "function") {
      Zotero.PreferencePanes.unregister(ScholarSearch.prefPaneID);
    }
  } catch (e) {}
  ScholarSearch.prefPaneID = null;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

// Read a plugin pref, returning `fallback` when it is unset. Defaults live in
// code (rather than a defaults/prefs.js file) so the plugin needs no build
// step. The `true` arg makes Zotero.Prefs treat the name as a full pref path
// instead of prefixing it with `extensions.zotero.`.
function getPref(name, fallback) {
  try {
    var v = Zotero.Prefs.get(PREF_BRANCH + name, true);
    return (v === undefined || v === null) ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function _registerPrefs() {
  if (!ScholarSearch.rootURI) return;
  if (!Zotero.PreferencePanes ||
      typeof Zotero.PreferencePanes.register !== "function") {
    return;
  }
  Promise.resolve(
    Zotero.PreferencePanes.register({
      pluginID: PLUGIN_ID,
      src: ScholarSearch.rootURI + "preferences.xhtml",
      scripts: [ScholarSearch.rootURI + "preferences.js"],
      label: "Scholar Search",
      image: ScholarSearch.rootURI + "icons/icon.svg",
    })
  ).then(function (id) {
    ScholarSearch.prefPaneID = id;
  }).catch(function () {});
}

// ---------------------------------------------------------------------------
// Reader context menu
// ---------------------------------------------------------------------------

function _init() {
  if (!Zotero.Reader ||
      typeof Zotero.Reader.registerEventListener !== "function") {
    try {
      Zotero.debug("ScholarSearch: Zotero.Reader.registerEventListener not available");
    } catch (e) {}
    return;
  }

  Zotero.Reader.registerEventListener(
    "createViewContextMenu",
    function (event) {
      var reader = event.reader;
      var append = event.append;

      // reader._state is proxied from reader._internalReader._state.
      // primaryViewSelectionPopup is set when the user selects text.
      var state = reader._state;
      var popup = state
        ? (state.primaryViewSelectionPopup || state.secondaryViewSelectionPopup)
        : null;
      var selectedText = popup && popup.annotation && popup.annotation.text
        ? popup.annotation.text.trim()
        : "";

      if (!selectedText) return;

      var enabled = _enabledEngines();
      var text = selectedText; // capture for closures

      enabled.forEach(function (engine) {
        append({
          label: "Search " + engine.label,
          onCommand: function () {
            _openUrl(_buildSearchUrl(engine, text));
          },
        });
      });
    },
    PLUGIN_ID
  );

  try {
    Zotero.debug("ScholarSearch: createViewContextMenu listener registered");
  } catch (e) {}
}

// Engines shown in the menu: enabled built-ins (in catalog order) followed by
// the user's custom engines. Falls back to Google Scholar if nothing is
// enabled, so the menu is never empty.
function _enabledEngines() {
  var on = ENGINES.filter(function (e) {
    return getPref("engine." + e.key, e.defaultOn) === true;
  });
  var all = on.concat(_customEngines());
  if (all.length === 0) {
    all = ENGINES.filter(function (e) { return e.key === "scholar"; });
  }
  return all;
}

// Parse user-defined engines from the `custom` pref. Silently drops malformed
// entries and rows missing a label or url (the settings pane saves partially
// typed rows, which should not appear in the menu until complete).
function _customEngines() {
  var raw = getPref("custom", "");
  if (!raw) return [];
  var arr;
  try { arr = JSON.parse(raw); } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(function (c) {
      return c && typeof c.label === "string" && typeof c.url === "string" &&
             c.label.trim() && c.url.trim();
    })
    .map(function (c, i) {
      return { key: "custom-" + i, label: c.label.trim(), url: c.url.trim() };
    });
}

function _buildSearchUrl(engine, text) {
  var template = getPref("url." + engine.key, engine.url);
  return template.replace("{q}", encodeURIComponent(text));
}

// ---------------------------------------------------------------------------
// Open URL in the chosen browser (macOS / Windows / Linux)
// ---------------------------------------------------------------------------

// How to launch each browser on each platform.
//   mac   – application name passed to `open -a`
//   win   – candidate executable paths (%ENV% vars are expanded; the first one
//           that launches wins). cmd.exe is deliberately avoided so URL query
//           strings can't be reinterpreted by the shell.
//   linux – candidate command names resolved against PATH.
// A missing platform entry means "not available there" → falls back to the
// system default browser.
var BROWSERS = {
  chrome: {
    mac: "Google Chrome",
    win: [
      "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe",
      "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe",
      "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe",
    ],
    linux: ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"],
  },
  safari: { mac: "Safari" }, // macOS only
  firefox: {
    mac: "Firefox",
    win: [
      "%ProgramFiles%\\Mozilla Firefox\\firefox.exe",
      "%ProgramFiles(x86)%\\Mozilla Firefox\\firefox.exe",
    ],
    linux: ["firefox", "firefox-esr"],
  },
  edge: {
    mac: "Microsoft Edge",
    win: [
      "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe",
      "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    linux: ["microsoft-edge-stable", "microsoft-edge"],
  },
  brave: {
    mac: "Brave Browser",
    win: [
      "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "%ProgramFiles(x86)%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    ],
    linux: ["brave-browser", "brave", "brave-browser-stable"],
  },
  arc: {
    mac: "Arc",
    win: [
      "%LocalAppData%\\Microsoft\\WindowsApps\\Arc.exe",
      "%LocalAppData%\\Arc\\app\\Arc.exe",
    ],
  },
};

// Map the browser names used by v2.0/2.1 (macOS app names) to the new keys, so
// an existing setting keeps working after upgrade.
var LEGACY_BROWSER = {
  "Google Chrome": "chrome",
  "Safari": "safari",
  "Firefox": "firefox",
  "Microsoft Edge": "edge",
  "Brave Browser": "brave",
  "Arc": "arc",
};

// Lazily imported Subprocess module. undefined = not tried, null = unavailable.
var _subprocess = undefined;
function _getSubprocess() {
  if (_subprocess !== undefined) return _subprocess;
  _subprocess = null;
  try {
    _subprocess = ChromeUtils.importESModule(
      "resource://gre/modules/Subprocess.sys.mjs"
    ).Subprocess;
  } catch (e) {
    try {
      _subprocess = ChromeUtils.import(
        "resource://gre/modules/Subprocess.jsm"
      ).Subprocess;
    } catch (e2) {
      _subprocess = null;
    }
  }
  return _subprocess;
}

// Resolve the configured browser to a known key, accepting the legacy macOS
// app-name values. "" means "system default browser".
function _browserKey() {
  var v = getPref("browser", "");
  if (!v) return "";
  if (BROWSERS[v]) return v;
  if (LEGACY_BROWSER[v]) return LEGACY_BROWSER[v];
  return "";
}

// Open `url`. With no browser configured (or on any failure) it uses the system
// default browser; otherwise it launches the chosen browser for this platform.
// The URL is already encodeURIComponent-encoded and is passed as a single
// process argument (never through a shell), so it can't be misinterpreted.
function _openUrl(url) {
  var key = _browserKey();
  if (!key) { _launchDefault(url); return; }
  Promise.resolve()
    .then(function () { return _launchInBrowser(key, url); })
    .catch(function () { _launchDefault(url); });
}

function _launchDefault(url) {
  try { Zotero.launchURL(url); } catch (e) {}
}

function _launchInBrowser(key, url) {
  var spec = BROWSERS[key];
  if (!spec) return Promise.reject();
  var SP = _getSubprocess();

  if (Zotero.isMac) {
    if (SP && spec.mac) {
      return SP.call({ command: "/usr/bin/open", arguments: ["-a", spec.mac, url] });
    }
    // No Subprocess – fall back to Zotero's AppleScript wrapper.
    return _openMacAppleScript(spec.mac, url);
  }

  if (!SP) return Promise.reject();

  if (Zotero.isWin) {
    var env = _winEnv(SP);
    var paths = (spec.win || [])
      .map(function (p) { return _expandEnv(p, env); })
      .filter(function (p) { return p && p.indexOf("%") === -1; });
    return _tryPaths(SP, paths, url);
  }

  if (Zotero.isLinux) {
    return _tryLinuxNames(SP, spec.linux || [], url);
  }

  return Promise.reject();
}

// Try each Windows executable path in turn; resolve on the first that launches.
function _tryPaths(SP, paths, url) {
  var i = 0;
  function next() {
    if (i >= paths.length) return Promise.reject();
    var p = paths[i++];
    return SP.call({ command: p, arguments: [url] }).catch(next);
  }
  return next();
}

// Resolve each Linux command name against PATH and launch the first that works.
function _tryLinuxNames(SP, names, url) {
  var i = 0;
  function next() {
    if (i >= names.length) return Promise.reject();
    var name = names[i++];
    return Promise.resolve()
      .then(function () { return SP.pathSearch(name); })
      .then(function (exe) {
        if (!exe) return next();
        return SP.call({ command: exe, arguments: [url] });
      })
      .catch(next);
  }
  return next();
}

// Build a case-insensitive (upper-cased keys) copy of the process environment.
function _winEnv(SP) {
  var out = {};
  try {
    var raw = SP.getEnvironment();
    for (var k in raw) out[k.toUpperCase()] = raw[k];
  } catch (e) {}
  return out;
}

function _expandEnv(path, env) {
  return path.replace(/%([^%]+)%/g, function (_m, name) {
    return env[name.toUpperCase()] || "";
  });
}

// macOS fallback when Subprocess can't be loaded: Zotero's own osascript
// wrapper. `quoted form of` is shell-safe; the URL has no " or \, and the app
// name comes from the fixed catalog.
function _openMacAppleScript(appName, url) {
  return new Promise(function (resolve, reject) {
    try {
      var script = [
        'try',
        '  do shell script "open -a " & quoted form of "' + appName + '" & " " & quoted form of "' + url + '"',
        'on error',
        '  do shell script "open " & quoted form of "' + url + '"',
        'end try',
      ].join("\n");
      Zotero.Utilities.Internal.executeAppleScript(script, /* block= */ false);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}
