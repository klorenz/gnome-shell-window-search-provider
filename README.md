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

Screenshots
-----------

Match all windows containing (case insensitive) characters "e" "x" "t" "a" and "t" in that order:

![Screenshot fuzzy search](https://github.com/klorenz/gnome-shell-window-search-provider/blob/master/window-search-provider-fuzzy.png)

Match all windows matching "ext" and "at" regular expressions:

![Screenshot regex search](https://github.com/klorenz/gnome-shell-window-search-provider/blob/master/window-search-provider-regex.png)
