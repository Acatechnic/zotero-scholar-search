"use strict";

// Preferences pane wiring for Scholar Search.
//
// This script runs in the Zotero preferences window (a real chrome window, so
// `setTimeout`, `document` and `Zotero` are all available). It binds the plain
// checkboxes / menulist in preferences.xhtml to the plugin's prefs by hand.
//
// Why manual wiring instead of the `preference` attribute auto-binding: the
// pane's XHTML can be inserted a tick AFTER this script first runs, so a
// one-shot getElementById().addEventListener silently never attaches. We retry
// until every control exists, and mark each with a flag so retries don't
// double-bind. (Hard-won from a sibling plugin.)

(function () {
  var PREF_BRANCH = "extensions.scholar-search.";

  var ENGINES = [
    { key: "scholar", defaultOn: true },
    { key: "wos", defaultOn: false },
    { key: "google", defaultOn: false },
    { key: "pubmed", defaultOn: false },
  ];

  function getPref(name, fallback) {
    try {
      var v = Zotero.Prefs.get(PREF_BRANCH + name, true);
      return (v === undefined || v === null) ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function setPref(name, value) {
    try {
      Zotero.Prefs.set(PREF_BRANCH + name, value, true);
    } catch (e) {}
  }

  function wireControls(tries) {
    tries = tries || 0;
    var ready = true;

    ENGINES.forEach(function (e) {
      var cb = document.getElementById("ss-engine-" + e.key);
      if (!cb) { ready = false; return; }
      if (!cb._ssWired) {
        cb.checked = getPref("engine." + e.key, e.defaultOn) === true;
        cb.addEventListener("command", function () {
          setPref("engine." + e.key, cb.checked);
        });
        cb._ssWired = true;
      }
    });

    var bsel = document.getElementById("ss-browser");
    if (!bsel) {
      ready = false;
    } else if (!bsel._ssWired) {
      bsel.value = getPref("browser", "");
      bsel.addEventListener("command", function () {
        setPref("browser", bsel.value);
      });
      bsel._ssWired = true;
    }

    if (!ready && tries < 30) {
      setTimeout(function () { wireControls(tries + 1); }, 100);
    }
  }

  wireControls(0);
})();
