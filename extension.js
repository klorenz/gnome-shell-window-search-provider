// https://github.com/daniellandau/switcher/blob/master/extension.js
// https://extensions.gnome.org/extension/783/tracker-search-provider/
// https://github.com/hamiller/tracker-search-provider
// https://git.gnome.org/browse/gnome-weather/tree/src/service/searchProvider.js
// https://gjs.guide/extensions/
// https://gjs-docs.gnome.org/gio20~2.0/
// gnome shell extension ts getInitialResultSet 2023
// view log: journalctl /usr/bin/gnome-session -f -o cat


const Meta = imports.gi.Meta;
const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();

var windowSearchProvider = null;

var windowSearchProviderDebug = false;

const {Gio, GLib} = imports.gi;


function logDebug(a,b,c,d,e) {
  if (windowSearchProviderDebug) {
    global.log.apply(this, [ 'WINDOW SEARCH PROVIDER', 'DEBUG' ].concat([].slice.call(arguments)))
  }
}

function logError(a,b,c,d,e) {
  global.log.apply(this, [ 'WINDOW SEARCH PROVIDER', 'ERROR' ].concat([].slice.call(arguments)))
}

function logWarning(a,b,c,d,e) {
  global.log.apply(this, [ 'WINDOW SEARCH PROVIDER', 'WARNING' ].concat([].slice.call(arguments)))
}

function logInfo(a,b,c,d,e) {
  global.log.apply(this, [ 'WINDOW SEARCH PROVIDER', 'INFO' ].concat([].slice.call(arguments)))
}


const myPrefs = {
  useAppInfo: true,

  // optional search prefix to make search unique (applicantion matcher is quite aggressive)
  searchPrefix: "w"
}

function fuzzyMatch(term, text) {
  var pos = -1;
  var matches = [];
  var _text = text.toLowerCase();
  var _term = term.toLowerCase();
  logDebug("fuzzyTerm: " + _term);
  logDebug("fuzzyText: " + _text);

  for (var i = 0; i < _term.length; i++) {
    var c = _term[i];
    while (true) {
      pos += 1;
      if (pos >= _text.length) {
        return false;
      }
      if (_text[pos] == c) {
        matches.push(pos);
        break;
      }
    }
  }
  logDebug("matches: " + matches.join(" "))

  return matches;
}


function makeResult(window, i) {
  const app = Shell.WindowTracker.get_default().get_window_app(window);
  // for (var k in window) {
  //   logDebug("window."+k);
  // }

  try {
    const appName = app.get_name();
    const windowTitle = window.get_title();
    return {
      'id': i,
      'name': appName + ": " + windowTitle,
      'appName': appName,
      'windowTitle': windowTitle,
      'window': window
    }
  }
  catch (e) {
    logWarning("Cannot create result (" + i + ") for window " + window + ": " + e);

    return {
      'id': i,
      'window': window,
      'name': "Not Available"
    }
  }
}


const WindowSearchProvider = new Lang.Class({
  Name: 'WindowSearchProvider',
  // appInfo: true,

  canLaunchSearch: true,
  isRemoteProvider: false,

  _init: function (title, categoryType) {
    logDebug(`title: ${title}, cat: ${categoryType}`)
    let prefs_file = "unkown"

    try {

      const default_prefs_file = Me.dir.get_path() + "/prefs.json"
      const config_prefs_file = GLib.get_home_dir() + "/.config/gnome-shell-window-search-provider/prefs.json"

      const cpf = Gio.File.new_for_path(config_prefs_file)

      if (cpf.query_exists(null)) {
        prefs_file = config_prefs_file
      } else {
        prefs_file = default_prefs_file
      }

      logInfo("Read Prefs "+prefs_file)
      let byte_array = GLib.file_get_contents(prefs_file)[1]
      let decoder = new TextDecoder("utf-8")

      logDebug("fileContents "+byte_array)
      this.prefs = JSON.parse(decoder.decode(byte_array))

    } catch(e) {
      logError("Error reading prefs file "+prefs_file+": "+e)
      this.prefs = myPrefs
    }

    if (this.prefs.debug) {
      windowSearchProviderDebug = true
    } else {
      windowSearchProviderDebug = false
    }

    if (this.prefs.useAppInfo) {
      this.appInfo = Gio.AppInfo.get_all().filter(function (appInfo) {
        try {
          let id = appInfo.get_id()
          return id.match(/gnome-session-properties/)
        }
        catch (e) {
          return null
        }
      })[0]

      this.appInfo.get_name = function () {
        return 'Windows';
      };
    }


    this.windows = null;

    logDebug("_init");
  },

  _getResultSet: function (terms) {
    logDebug("getResultSet");
    var resultIds = [];
    var candidates = this.windows;
    var _terms = [].concat(terms);
    var match = null;
    var m;
    this.action = "activate";
    var selection = null;

    logDebug("Getting results for terms "+terms)

    try {
      var searchPrefixes = this.prefs.searchPrefix;

      if (!(searchPrefixes instanceof Array)) {
        searchPrefixes = [ searchPrefixes ]
      }

      for (var i = 0; i < searchPrefixes.length; i++) {
        let searchPrefix = searchPrefixes[i]

        if (_terms[0].length >= searchPrefix.length && _terms[0].substring(0, searchPrefix.length) == searchPrefix) {
          logDebug("removing Prefix "+searchPrefix)
          _terms[0] = _terms[0].substring(searchPrefix.length)
        }
      }
    } catch(e) {
      logWarning("Cannot find/remove search prefix: "+e)
    }

    // action may be at start
    if (_terms.length > 1 && _terms[0][0] === '!') {
      if (_terms[0].toLowerCase === "!x") {
        this.action = 'close';
      }
      _terms = _terms.slice(1)

    } else if (_terms[_terms.length - 1].match(/(.*)[!\/]x$/)) {
      m = _terms[_terms.length - 1].match(/(.*)[!\/]x$/);
      // or at end
      this.action = 'close'
      if (m[1] !== '') {
        _terms[_terms.length - 1] = m[1]
      } else {
        _terms.pop()
      }
    } else if (_terms[_terms.length - 1].match(/(.*)[!\/](\d+)$/)) {
      m = _terms[_terms.length - 1].match(/(.*)[!\/](\d+)$/);
      selection = parseInt(m[2])
      if (m[1] !== '') {
        _terms[_terms.length - 1] = m[1]
      } else {
        _terms.pop()
      }
    } else if (_terms[_terms.length - 1].match(/(.*)[!\/]$/)) {
      m = _terms[_terms.length - 1].match(/(.*)[!\/]$/);
      if (m[1] !== '') {
        _terms[_terms.length - 1] = m[1]
      } else {
        _terms.pop()
      }
    }

    if (_terms[0][0] == "/") {
      var regex = new RegExp(_terms.join('.*?').substring(1), 'i');
      match = function (s) { 
        var m = s.match(regex); return m ? m[0].length+1 : false; }
    }
    else {
      var term = _terms.join('');
      match = function (s) { var m = fuzzyMatch(term, s); return m ? m[m.length - 1] - m[0] : false; }
    }
    var results = [];

    for (var key in candidates) {
      logDebug("match candidate: "+candidates[key].name);
      var m = match(candidates[key].name);

      if (m !== false) {
        results.push({ weight: m, id: key });
      }
    }
    results.sort(function (a, b) { if (a.weight < b.weight) return -1; if (a.weight > b.weight) return 1; return 0 });

    this.resultIds = results.map(function (item) { return item.id });

    // let the user select number of match
    if (selection !== null) {
      if (selection > results.length) {
        return [];
      }
      return [ results[selection-1].id ]
    }

    logDebug("resultSet: ", this.resultIds);

    return this.resultIds;
  },

  getResultMetas: function (resultIds, callback) {
    logDebug("result metas for name: " + resultIds.join(" "));
    let _this = this;
    let metas = resultIds.map(function (id) { return _this._getResultMeta(id); });
    logDebug("metas: " + metas.join(" "));
    logDebug("callback: " + callback)

    if (typeof callback === "function") {
      logDebug("metas called with callback")
      callback(metas);
    } else {
      logDebug("metas NOT called with callback: " + callback)
      return metas;
    }
  },

  _getResultMeta: function (resultId) {
    logDebug("getResultMeta: " + resultId);
    var result = this.windows[resultId];
    const app = Shell.WindowTracker.get_default().get_window_app(result.window);
    logDebug("result meta for name: " + result.name);
    logDebug("result meta: " + resultId);
    return {
      'id': resultId,
      'name': result.windowTitle,
      // TODO: do highlighting of search term (i.e. for fuzzy matching)
//      'description': "hel<b>lo</b> "+result.windowTitle,
      'description': result.appName,
      'createIcon': function (size) {
        logDebug('createIcon size='+size);
        return app.create_icon_texture(size);
      }
    }
  },

  activateResult: function (resultId, terms) {
    logDebug("action: " + this.action)
    if (this.action === "activate") {
      var result = this.windows[resultId]
      logDebug("activateResult: " + result)
      Main.activateWindow(result.window)
    } else if (this.action === "close") {
      for (var i = 0; i < this.resultIds.length; i++) {
        const win = this.windows[this.resultIds[i]]
        const actor = win.window.get_compositor_private()
        try {
          const meta = actor.get_meta_window()
          meta.delete(global.get_current_time())
        }
        catch (e) {
          logDebug("my error")
          logDebug(e)
        }
      }
      Main.overview.hide();
    }
  },

  launchSearch: function (result) {
    logDebug("launchSearch: " + result);
    // Main.activateWindow(result.window);
  },

  getInitialResultSet: function (terms, callback, cancellable) {
    logDebug("getInitialResultSet: " + terms.join(" ") + " callback: " + callback + " cancellable: " + cancellable);
    var windows = null
    this.windows = windows = {};
    global.display.get_tab_list(Meta.TabList.NORMAL, null).map(function (v, i) { windows['w' + i] = makeResult(v, 'w' + i) });
    //global.get_window_actors().map(function(v,i) { windows['w'+i] = makeResult(v,'w'+i) });
    logDebug("getInitialResultSet: " + this.windows);
    //logDebug("window id", windows[0].get_id());
    var resultSet = this._getResultSet(terms);
    logDebug("getInitialResultSet resultSet: " + resultSet);

    // in the past this was a function, since Gnome 43 it is a cancellable
    if (typeof callback === "function") {
      logDebug("callback " + callback);
      callback(resultSet);
    } else {
      logDebug("return resultset")
      return resultSet || []
    }
  },

  filterResults: function (results, maxResults) {
    logDebug("filterResults", results, maxResults);
    //return results.slice(0, maxResults);
    return results;
  },

  getSubsearchResultSet: function (previousResults, terms, callback, cancellable) {
    logDebug("getSubSearchResultSet: " + terms.join(" "));
    this.getInitialResultSet(terms, callback, cancellable);
  },

  // createIcon: function (size, meta) {
  //   logDebug("createIcon");
  //   // TODO: implement meta icon?
  // },

  // createResultOjbect: function (resultMeta) {
  //   const app = Shell.WindowTracker.get_default().get_window_app(resultMeta.id);
  //   return new AppIcon(app);
  // }

});

function init() {
}

function getOverviewSearchResult() {
  if (Main.overview.viewSelector !== undefined) {
    return Main.overview.viewSelector._searchResults;
  } else {
    return Main.overview._overview.controls._searchController._searchResults;
  }
}

function enable() {
  global.log("*** enable window search provider");
  global.log("windowSearchProvider", windowSearchProvider)

  if (windowSearchProvider == null) {
    logDebug("enable window search provider");
    windowSearchProvider = new WindowSearchProvider();

    //Main.overview.addSearchProvider(windowSearchProvider);
    //log("main.overview", moan)
    getOverviewSearchResult()._registerProvider(
      windowSearchProvider
    );
  }
}

function disable() {
  if (windowSearchProvider) {
    global.log("*** disable window search provider");
    // Main.overview.removeSearchProvider(windowSearchProvider)
    getOverviewSearchResult()._unregisterProvider(
      windowSearchProvider
    );
    windowSearchProvider = null;
  }
}

