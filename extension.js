// https://github.com/daniellandau/switcher/blob/master/extension.js
// https://extensions.gnome.org/extension/783/tracker-search-provider/
// https://github.com/hamiller/tracker-search-provider
// https://git.gnome.org/browse/gnome-weather/tree/src/service/searchProvider.js
// create atom project opener
// view log: journalctl /usr/bin/gnome-session -f -o cat


const Meta = imports.gi.Meta;
const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Gio = imports.gi.Gio;

var windowSearchProvider = null;

var windowSearchProviderDebug = false;

function logDebug(a,b,c,d,e) {
  if (windowSearchProviderDebug) {
    global.log.apply(this, [ 'WINDOW SEARCH PROVIDER' ].concat([].slice.call(arguments)))
  }
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
    print(e);
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

  _init: function (title, categoryType) {
    logDebug(`title: ${title}, cat: ${categoryType}`)
/* There is no more gnome-session-properties there, disable this code */
/*
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
*/
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
    let metas = resultIds.map(function (id) { return _this.getResultMeta(id); });
    logDebug("metas: " + metas.join(" "));
    callback(metas);
  },

  getResultMeta: function (resultId) {
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
        return app.create_icon_texture(size * 1.5);
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
    logDebug("getInitialResultSet: " + terms.join(" "));
    var windows = null
    this.windows = windows = {};
    global.display.get_tab_list(Meta.TabList.NORMAL, null).map(function (v, i) { windows['w' + i] = makeResult(v, 'w' + i) });
    //global.get_window_actors().map(function(v,i) { windows['w'+i] = makeResult(v,'w'+i) });
    logDebug("getInitialResultSet: " + this.windows);
    //logDebug("window id", windows[0].get_id());
    callback(this._getResultSet(terms));
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

