Window Search Provider
======================

Find your current open windows with gnome shell search :)

This is something I ever wanted to have again since I used compiz' windows
matching in expose mode.

So here it is: You can search current open windows using gnome search.  Type
windows key, then start typing to find your window.  It will fuzzy-match
application name and window title like you might know from
[Sublime Text](http://www.sublimetext.com/) or [Atom](http://atom.io).
Current algorithm does not yet order the matches by best score.

If you start your search with a "/", it will interprete all search terms
(separated by whitespace) as regular expressions, which have to match all.

This extension was inspired by https://github.com/daniellandau/switcher/


Features
--------

- Fuzzy match current open windows and activate selected

- Match current open windows with a regex starting search term with "/"
  (spaces are substituted with ".*?") and activate selected

- Start a search with !x and whitespace, then either fuzzy match or match
  regex to close *all* selected windows.

  Example: "!x specsu" to close all windows labelled "Spec Suite".  I
  tend to leave many atom package test windows open.  So this is a killer
  feature ;)

- End a search with "!x" to close all selected windows.  (using feature
  above showed me, that I intuitively first selected windows to close,
  then had to edit the search text)

  Example: "specsu!x" to close all windows labelled "Spec Suite".

- A "!" or "/" at end of a search string is ignored, if you have a "!" or "/" 
  in your search term (other than describe above), it is part of search term 
  as expected.

- A "!" (or "/") + number like "!2" or "/2" at end of your search term will 
  select the second matched window from list.

  Example: "code/2" will select the second window matching "code".  This makes 
  the search also more unique, such that you can simply hit return for
  activating the window.

- I found "/" at end of windows faster to type than "!", so you can use both
  chars at end of string for options.

Preferences
-----------

Preferences file is read, whenever you enable the extension.

There is some rudimentary preference support now.  For simplicity, this reads
prefs from a JSON file `prefs.json` in following order.  The first existing is
taken:

- `~/.config/gnome-shell-window-search-provider/prefs.json`
- `<EXTENSION_DIR>/prefs.json`

What you can configure:

```json
{
  "searchPrefix": ["kw", "p"],
  "useAppInfo": true,
  "debug": false
}
```

- `searchPrefix` is either a string or a list of strings, specifying optional
  prefixes to boost your window search over application results.  The prefix
  will not be considered in searches.

- `useAppInfo` - (this did not work in Gnome 40) if off, results displayed like
  application search results, if on, results are displayed like other search results
  (with more info)

- `debug` - Display very verbose logging in `journalctl /usr/bin/gnome-shell`

Installation
------------

You can install this extension from https://extensions.gnome.org or simply
clone this repository into your extension folder:
```
  $ cd ~/.local/share/gnome-shell/extensions
  $ git clone https://github.com/klorenz/gnome-shell-window-search-provider.git window-search-provider@quelltexter.org
  $ gnome-shell-extension-tool -e "window-search-provider"
```

You can also download a zip of this repo and install using [Gnome Tweak Tool](https://wiki.gnome.org/Apps/GnomeTweakTool).


Screenshots
-----------

Match all windows containing (case insensitive) characters "e" "x" "t" "a" and "t" in that order:

![Screenshot fuzzy search](https://github.com/klorenz/gnome-shell-window-search-provider/blob/master/window-search-provider-fuzzy.png)

Match all windows matching "ext" and "at" regular expressions:

![Screenshot regex search](https://github.com/klorenz/gnome-shell-window-search-provider/blob/master/window-search-provider-regex.png)
