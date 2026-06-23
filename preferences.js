"use strict";

// Preferences pane wiring for Scholar Search.
//
// This script runs in the Zotero preferences window (a real chrome window, so
// `setTimeout`, `document` and `Zotero` are all available). It binds the plain
// checkboxes / menulist in preferences.xhtml to the plugin's prefs by hand, and
// builds the dynamic list of custom search engines.
//
// Why manual wiring instead of the `preference` attribute auto-binding: the
// pane's XHTML can be inserted a tick AFTER this script first runs, so a
// one-shot getElementById().addEventListener silently never attaches. We retry
// until every control exists, and mark each with a flag so retries don't
// double-bind. (Hard-won from a sibling plugin.)

(function () {
  var PREF_BRANCH = "extensions.scholar-search.";
  var XHTML = "http://www.w3.org/1999/xhtml";

  var ENGINES = [
    { key: "scholar", defaultOn: true },
    { key: "google", defaultOn: false },
    { key: "pubmed", defaultOn: false },
  ];

  // In-memory model for the custom-engine rows, loaded from / saved to the
  // `custom` pref as a JSON array of {label, url}.
  var customModel = [];

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

  // ---- custom engines -----------------------------------------------------

  function loadCustom() {
    var raw = getPref("custom", "");
    if (!raw) return [];
    try {
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  // Persist the current model verbatim (including partially typed rows, so the
  // user doesn't lose a half-entered row). bootstrap.js ignores rows missing a
  // label or url when building the menu.
  function persistCustom() {
    setPref("custom", JSON.stringify(customModel));
  }

  function makeCustomRow(item, idx) {
    var row = document.createElementNS(XHTML, "div");
    row.style.display = "flex";
    row.style.gap = "6px";
    row.style.alignItems = "center";
    row.style.marginBottom = "4px";

    var name = document.createElementNS(XHTML, "input");
    name.type = "text";
    name.placeholder = "Name (e.g. Web of Science)";
    name.value = item.label || "";
    name.style.flex = "0 0 200px";
    name.addEventListener("input", function () {
      customModel[idx].label = name.value;
      persistCustom();
    });

    var url = document.createElementNS(XHTML, "input");
    url.type = "text";
    url.placeholder = "URL with {q}, e.g. https://example.com/search?q={q}";
    url.value = item.url || "";
    url.style.flex = "1 1 auto";
    url.addEventListener("input", function () {
      customModel[idx].url = url.value;
      persistCustom();
    });

    var del = document.createElementNS(XHTML, "button");
    del.textContent = "Remove";
    del.addEventListener("click", function () {
      customModel.splice(idx, 1);
      renderCustom();
      persistCustom();
    });

    row.appendChild(name);
    row.appendChild(url);
    row.appendChild(del);
    return row;
  }

  // Rebuilds the whole list, so every row's listeners capture a current index.
  function renderCustom() {
    var list = document.getElementById("ss-custom-list");
    if (!list) return false;
    while (list.firstChild) list.removeChild(list.firstChild);
    customModel.forEach(function (item, idx) {
      list.appendChild(makeCustomRow(item, idx));
    });
    return true;
  }

  // ---- wiring -------------------------------------------------------------

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

    var addBtn = document.getElementById("ss-custom-add");
    var list = document.getElementById("ss-custom-list");
    if (!addBtn || !list) {
      ready = false;
    } else if (!addBtn._ssWired) {
      customModel = loadCustom();
      renderCustom();
      addBtn.addEventListener("command", function () {
        customModel.push({ label: "", url: "" });
        renderCustom();
      });
      addBtn._ssWired = true;
    }

    if (!ready && tries < 30) {
      setTimeout(function () { wireControls(tries + 1); }, 100);
    }
  }

  wireControls(0);
})();
