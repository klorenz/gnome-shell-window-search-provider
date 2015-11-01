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
