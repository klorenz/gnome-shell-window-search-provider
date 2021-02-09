extension-package:
	rm -rf dist
	mkdir -p dist
	zip  dist/window-search-provider.zip extension.js LICENSE.md metadata.json README.md
