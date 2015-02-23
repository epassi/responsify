'use strict';

var gm = require("gm").subClass({ imageMagick: true });
var async = require("async");
var done;

module.exports = function ( grunt ) {
	var _pages = {};
	var _indexHtmlTemplate = grunt.file.read("resources/templates/index.html");
	var _prototypeHtmlTemplate = grunt.file.read("resources/templates/prototype.html");
	var _htmlTableRowPartial = grunt.file.read("resources/partials/index-table-row.html");
	var _htmlLayoutDivPartial = grunt.file.read("resources/partials/prototype-layout-div.html")
	var _cssMediaQueryPartial = grunt.file.read("resources/partials/prototype-media-query.css");

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
<<<<<<< HEAD
		async.each(_breakpoints, createSlices, onComplete);

		// Generate the HTML file.
		_html = getLayoutHTML();
		_css = getLayoutCSS();
		templateHTML = templateHTML.replace(/{{styles}}/g, _css);
		templateHTML = templateHTML.replace(/{{maxBreakpoint}}/g, _breakpoints[_breakpoints.length-1]);
		templateHTML = templateHTML.replace(/{{html}}/g, _html);
		grunt.file.write("index.html", templateHTML);

=======
		async.each(Object.keys(_pages), processPage, onComplete);
>>>>>>> origin/1.2
  	});

	function resetLayouts() {
		_pages = {};
		grunt.file.delete("resources/pages");
		grunt.file.delete("resources/img");
	}

<<<<<<< HEAD
=======
	function processPage(title, callbackLayoutsComplete) {
		var pageTemplate = _prototypeHtmlTemplate;
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
				html = getHtmlLayoutDivs(title, breakpoints);
				css = getCssMediaQueries(title, breakpoints);
				pageTemplate = pageTemplate.replace(/{{title}}/g, title);
				pageTemplate = pageTemplate.replace(/{{styles}}/g, css);
				pageTemplate = pageTemplate.replace(/{{maxBreakpoint}}/g, breakpoints[breakpoints.length-1]);
				pageTemplate = pageTemplate.replace(/{{html}}/g, html);
				grunt.file.write("resources/pages/" + title + ".html", pageTemplate);

				callbackLayoutsComplete();
			}
		);
	}

>>>>>>> origin/1.2
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

	function getHtmlLayoutDivs(title, breakpoints) {
		var htmlLayoutDivs = "";
		var filenameBase = "";

		for (var i = 0; i < breakpoints.length; i++) {
			filenameBase = title + "@" + breakpoints[i];
			htmlLayoutDivs += _htmlLayoutDivPartial;
			htmlLayoutDivs = htmlLayoutDivs.replace(/{{breakpoint}}/g, breakpoints[i]);
			htmlLayoutDivs = htmlLayoutDivs.replace(/{{filenameBase}}/g, filenameBase);
		}

		return htmlLayoutDivs;
	}

	function getCssMediaQueries(title, breakpoints) {
		var cssMediaQueries = "";
		var breakpointMin = 0;
		var breakpointMax = 0;

		for (var i = 0; i < breakpoints.length-1; i++) {
			breakpointMin = (i===0 ? 0 : breakpoints[i]);
			breakpointMax = breakpoints[i+1] - 1;
			cssMediaQueries += _cssMediaQueryPartial;
			cssMediaQueries = cssMediaQueries.replace(/{{breakpoint}}/g, breakpoints[i]);
			cssMediaQueries = cssMediaQueries.replace(/{{breakpointMin}}/g, breakpointMin);
			cssMediaQueries = cssMediaQueries.replace(/{{breakpointMax}}/g, breakpointMax);
		}

		return cssMediaQueries;
	}

	function writeIndexFile() {
		var indexHtml = _indexHtmlTemplate;
		var indexTableRows = "";
		var cwd = process.cwd().split("/");
		var project = cwd.pop();

		for (var title in _pages) {
			var breakpoints = _pages[title];
			var indexTableRowHtml = _htmlTableRowPartial;
			indexTableRowHtml = indexTableRowHtml.replace(/{{title}}/g, title);
			indexTableRowHtml = indexTableRowHtml.replace(/{{breakpoints}}/g, breakpoints.join().replace(/\,/g, ", "));
			indexTableRows += indexTableRowHtml;
		}

		indexHtml = indexHtml.replace(/{{project}}/g, project);
		indexHtml = indexHtml.replace(/{{pages}}/g, indexTableRows);
		grunt.file.write("index.html", indexHtml);
	}

	function isNumber(string) {
		if (string === "") {
			string = "invalid";
		}
		return !isNaN(string);
	}

};

