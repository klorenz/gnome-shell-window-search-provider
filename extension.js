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

var debug = false;

function logDebug() {
  if (debug) {
    log.call(this, arguments)
  }
}

function fuzzyMatch(term, text) {
  var pos = -1;
  var matches = [];
  var _text = text.toLowerCase();
  var _term = term.toLowerCase();
  logDebug("fuzzyTerm: "+_term);
  logDebug("fuzzyText: "+_text);

  for (var i=0; i<_term.length; i++) {
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
  logDebug("matches: "+matches.join(" "))
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

  _init: function(title, categoryType) {
    this.appInfo = Gio.AppInfo.get_all().filter(function(appInfo){
      try {
        let id = appInfo.get_id();
        return id.match(/gnome-session-properties/)
      }
      catch(e) {
      }
    })[0];
    this.windows = null;

    logDebug("_init");
  },

  _getResultSet: function(terms) {
    logDebug("getResultSet");
    var resultIds = [];
    var candidates = this.windows;

    if (terms[0][0] == "/") {
      let regex = terms.map(function (term) { return new RegExp(term.replace(/^\//, ''), 'i'); });
      logDebug("term: '" + terms.join("' '") + "'")
      var count = 0;
      for (var key in candidates) {
        logDebug("candidate: " + candidates[key].name)
        let matched = true;
        for (var j = 0; j < terms.length; j++) {
          if (!candidates[key].name.match(regex[j])) {
            matched = false;
            break;
          }
        }
        if (matched) {
          resultIds.push(key);
        }
        count += 1;
        logDebug("candidate " + (matched ? "matched" : "not matched"));
      }
    }
    else {
      // go for fuzzymatching
      logDebug("fuzzymatch");
      var term = terms.join('');
      for (var key in candidates) {
        if (fuzzyMatch(term, candidates[key].name)) {
          resultIds.push(key);
        }
      }
    }
    logDebug("found " + resultIds.length + " results out of " + count);
    return resultIds;
  },

  getResultMetas: function(resultIds, callback) {
    logDebug("result metas for name: "+resultIds.join(" "));
    let _this = this;
    let metas = resultIds.map(function(id) { return _this.getResultMeta(id); });
    logDebug("metas: " + metas.join(" "));
    callback(metas);
  },

  getResultMeta: function(resultId) {
    var result = this.windows[resultId];
    const app = Shell.WindowTracker.get_default().get_window_app(result.window);
    logDebug("result meta for name: "+result.name);
    logDebug("result meta: ", resultId);
    return {
      'id': resultId,
      'name': result.appName,
      'description': result.windowTitle,
      'createIcon': function(size) {
        return app.create_icon_texture(size);
      }
    }
  },

  activateResult: function(resultId, terms) {
    var result = this.windows[resultId];
    logDebug("activateResult: " + result);
    Main.activateWindow(result.window);
  },

  launchSearch: function(result) {
     logDebug("launchSearch: " + result.name);
    Main.activateWindow(result.window);
  },

  getInitialResultSet: function(terms, callback, cancellable) {
   logDebug("getInitialResultSet: " + terms.join(" "));
   this.windows = windows = {};
   global.display.get_tab_list(Meta.TabList.NORMAL, null).map(function(v,i) { windows['w'+i] = makeResult(v,'w'+i) });
   logDebug("getInitialResultSet: " + this.windows);
   //logDebug("window id", windows[0].get_id());
   callback(this._getResultSet(terms));
 },

  filterResults: function(results, maxResults) {
    logDebug("filterResults", results, maxResults);
    return results.slice(0, maxResults);
    //return results;
  },

  getSubsearchResultSet: function(previousResults, terms, callback, cancellable) {
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

function enable() {
  logDebug("enable window search provider");
  if (!windowSearchProvider) {
    logDebug("enable window search provider");
    windowSearchProvider = new WindowSearchProvider();
    //Main.overview.addSearchProvider(windowSearchProvider);
    Main.overview.viewSelector._searchResults._registerProvider(
      windowSearchProvider
    );
  }
}

function disable() {
  if (windowSearchProvider) {
    logDebug("disenable window search provider");
    // Main.overview.removeSearchProvider(windowSearchProvider)
    Main.overview.viewSelector._searchResults._unregisterProvider(
      windowSearchProvider
    );
    windowSearchProvider = null;
  }
}
