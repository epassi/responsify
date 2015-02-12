'use strict';

var gm = require("gm").subClass({ imageMagick: true });
var async = require("async");
var done;

module.exports = function ( grunt ) {
	var _pages = {};
	var _htmlTemplate = grunt.file.read("resources/partials/page-layout.html");
	var _cssTemplate = grunt.file.read("resources/partials/page-layout.css");

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

  	grunt.registerMultiTask( 'responsify', 'generates a responsive prototype from layout comps/wireframes', function () {
		// Force synchronous flow.
		// Don't allow next grunt task to start until this one is finished.
		done = this.async();

		// Get breakpoints.
		resetLayouts();
		grunt.file.recurse("layouts/", traverseFile);

		// Create image slices out of the layouts.
		async.each(Object.keys(_pages), processPage, onComplete);
  	});

	function resetLayouts() {
		_pages = {};
		grunt.file.delete("resources/img");
	}

	function processPage(title, callbackLayoutsComplete) {
		var pageTemplate = grunt.file.read("resources/partials/page.html");
		var breakpoints = _pages[title];
		var html = "";
		var css = "";
		var i = 0;
		async.whilst(
			function () {return i < breakpoints.length;},
			function (callback) {
				createSlices(title, breakpoints[i++], callback);
			},
			function (err) {
				// Generate the HTML file.
				html = getHtml(title, breakpoints);
				css = getCss(title, breakpoints);
				pageTemplate = pageTemplate.replace(/{{title}}/g, title);
				pageTemplate = pageTemplate.replace(/{{styles}}/g, css);
				pageTemplate = pageTemplate.replace(/{{maxBreakpoint}}/g, breakpoints[breakpoints.length-1]);
				pageTemplate = pageTemplate.replace(/{{html}}/g, html);
				grunt.file.write(title + ".html", pageTemplate);

				callbackLayoutsComplete();
			}
		);
	}

	function onComplete(err) {
		writeIndexFile();
		grunt.log.writeln("everything done");
		done(true);
	}


	function traverseFile(abspath, rootdir, subdir, filename) {
		var layoutInfo = getLayoutInfo(filename)
		if (layoutInfo) {
			if (_pages[layoutInfo.title]) {
				_pages[layoutInfo.title].push(layoutInfo.breakpoint);
				_pages[layoutInfo.title].sort(function(a,b){return a-b;});
			} else {
				_pages[layoutInfo.title] = [layoutInfo.breakpoint];
			}
			grunt.log.ok(layoutInfo.title + " " + _pages[layoutInfo.title].join());
		}
	}

	function getFilenameBase(filename) {
		var filenameType = "." + filename.split(".").pop();
		var filenameBase = filename.replace(filenameType, "");

		return filenameBase;
	}

	function getLayoutInfo(filename) {
		var layoutInfo = false;

		var filenameType = filename.split(".").pop();
		var filenameBase = filename.replace("." + filenameType, "");
		if (filenameBase.indexOf("@") === -1) {
			grunt.log.fail(filename + ": missing @ symbol for indicating breakpoint.");
			return layoutInfo;
		}

		var breakpoint = filenameBase.split("@").pop();
		if (!isNumber(breakpoint)) {
			grunt.log.fail(filename + ": \"" + breakpoint + "\" is not a valid breakpoint.");
			return layoutInfo;
		}

		var title = filenameBase.replace("@" + breakpoint, "");
		// To do: check for blank page names.


		layoutInfo = {};
		layoutInfo.title = title;
		layoutInfo.breakpoint = breakpoint;

		// grunt.log.ok(layoutInfo.title + " " + layoutInfo.breakpoint);

		return layoutInfo;
	}

	function createSlices(title, breakpoint, callbackSlicesComplete) {
		var filename = title + "@" + breakpoint + ".png";
		var abspath = "layouts/" + filename;

		var size = gm(abspath).size(function(err, size) {


			var width = size.width;
			var height = size.height;

			var sliceCount = 3;
			var sliceHeight = Math.ceil(height / sliceCount);

			var i = 1;
			var y = 0;
			async.whilst(
				function() {return y < height;},
				function(callback) {
					var slice = gm(abspath).crop(width, sliceHeight, 0, y);
					var croppedFilename = "resources/img/" + getFilenameBase(filename) + "_" + i++ + ".png";

					// Create img folder if it doesn't already exist.
					if (!grunt.file.exists("resources/img")) {
						grunt.file.mkdir("resources/img");
					}

					slice.quality(100).write(croppedFilename, callback);

					y += sliceHeight;
				},
				function(err) {
					if (err) {
						// error
					} else {
						grunt.log.ok(filename + " slices done");
						callbackSlicesComplete();
					}
				}
			);

		});
	}

	function getHtml(title, breakpoints) {
		var html = "";
		var filenameBase = "";

		for (var i = 0; i < breakpoints.length; i++) {
			filenameBase = title + "@" + breakpoints[i];
			html += _htmlTemplate;
			html = html.replace(/{{breakpoint}}/g, breakpoints[i]);
			html = html.replace(/{{filenameBase}}/g, filenameBase);
		}

		return html;
	}

	function getCss(title, breakpoints) {
		var css = "";
		var breakpointMin = 0;
		var breakpointMax = 0;

		for (var i = 0; i < breakpoints.length-1; i++) {
			breakpointMin = (i===0 ? 0 : breakpoints[i]);
			breakpointMax = breakpoints[i+1] - 1;
			css += _cssTemplate;
			css = css.replace(/{{breakpoint}}/g, breakpoints[i]);
			css = css.replace(/{{breakpointMin}}/g, breakpointMin);
			css = css.replace(/{{breakpointMax}}/g, breakpointMax);
		}

		return css;
	}

	function writeIndexFile() {
		var indexFile = grunt.file.read("resources/partials/index.html");
		var htmlForPages = "";

		for (var title in _pages) {
			var breakpoints = _pages[title];
			var htmlSnippet = grunt.file.read("resources/partials/index-page.html");
			htmlSnippet = htmlSnippet.replace(/{{title}}/g, title);
			htmlSnippet = htmlSnippet.replace(/{{breakpoints}}/g, breakpoints.join());
			htmlForPages += htmlSnippet;
		}

		// grunt.log.writeln(__dirname);
		indexFile = indexFile.replace(/{{pages}}/g, htmlForPages);
		grunt.file.write("index.html", indexFile);
	}

	function isNumber(string) {
		if (string === "") {
			string = "invalid";
		}
		return !isNaN(string);
	}

};

