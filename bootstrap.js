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
// The bootstrap sandbox has no Services import, no setTimeout and no
// console.log – none of those exist here. (The preferences pane, which runs in
// a real window, does have them; see preferences.js.)

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
    key: "wos",
    label: "Web of Science",
    // Best-effort general search. Web of Science is a session-based app and may
    // simply open its search page rather than pre-filling the query.
    url: "https://www.webofscience.com/wos/woscc/summary/?q={q}&search_mode=GeneralSearch",
    defaultOn: false,
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

// Engines the user has switched on, in catalog order. Falls back to Google
// Scholar if every engine has been disabled, so the menu is never empty.
function _enabledEngines() {
  var on = ENGINES.filter(function (e) {
    return getPref("engine." + e.key, e.defaultOn) === true;
  });
  if (on.length === 0) {
    on = ENGINES.filter(function (e) { return e.key === "scholar"; });
  }
  return on;
}

function _buildSearchUrl(engine, text) {
  var template = getPref("url." + engine.key, engine.url);
  return template.replace("{q}", encodeURIComponent(text));
}

// ---------------------------------------------------------------------------
// Open URL in the chosen browser (macOS)
// ---------------------------------------------------------------------------

// Opens `url` in the browser named by the `browser` pref (e.g. "Google
// Chrome"). An empty pref means the macOS default browser. If the chosen
// browser is not installed, it falls back to the default browser.
//
// Uses Zotero.Utilities.Internal.executeAppleScript() – Zotero's own osascript
// wrapper. `quoted form of` makes the shell command injection-safe; the URL is
// already encodeURIComponent-encoded and the browser name comes from a fixed
// catalog, so neither can contain a " or \ to break the AppleScript literal.
function _openUrl(url) {
  var browser = getPref("browser", "");
  var script;

  if (browser) {
    script = [
      'try',
      '  do shell script "open -a " & quoted form of "' + browser + '" & " " & quoted form of "' + url + '"',
      'on error',
      '  do shell script "open " & quoted form of "' + url + '"', // fall back to macOS default
      'end try',
    ].join("\n");
  } else {
    script = 'do shell script "open " & quoted form of "' + url + '"';
  }

  try {
    Zotero.Utilities.Internal.executeAppleScript(script, /* block= */ false);
  } catch (e) {
    // executeAppleScript unavailable (e.g. non-macOS) – last resort.
    try { Zotero.launchURL(url); } catch (e2) {}
  }
}
