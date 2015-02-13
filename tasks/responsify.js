'use strict';

var gm = require("gm").subClass({ imageMagick: true });
var async = require("async");
var done;

module.exports = function ( grunt ) {
	var _breakpoints = [];
	var _htmlTemplate = grunt.file.read("resources/partials/layout.html");
	var _cssTemplate = grunt.file.read("resources/partials/layout.css");
	var _html = "";
	var _css = "";


	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

  	grunt.registerMultiTask( 'responsify', 'generates a responsive prototype from layout comps/wireframes', function () {
		var templateHTML = grunt.file.read("resources/partials/template.html");

		// Force synchronous flow.
		// Don't allow next grunt task to start until this one is finished.
		done = this.async();

		// Get breakpoints.
		resetLayouts();
		grunt.file.recurse("layouts/", traverseFile);
		_breakpoints.sort(function(a,b){return a-b;});

		// Create image slices out of the layouts.
		async.each(_breakpoints, createSlices, onComplete);

		// Generate the HTML file.
		_html = getLayoutHTML();
		_css = getLayoutCSS();
		templateHTML = templateHTML.replace(/{{styles}}/g, _css);
		templateHTML = templateHTML.replace(/{{maxBreakpoint}}/g, _breakpoints[_breakpoints.length-1]);
		templateHTML = templateHTML.replace(/{{html}}/g, _html);
		grunt.file.write("index.html", templateHTML);

  	});

	function resetLayouts() {
		_breakpoints = [];
		grunt.file.delete("resources/img");
	}

	function onComplete(err) {
		grunt.log.writeln("everything done");
		done(true);
	}

	function traverseFile(abspath, rootdir, subdir, filename) {
		var filenameBase = getFilenameBase(filename);
		if (isNumber(filenameBase)) {
			var breakpoint = filenameBase;
			_breakpoints.push(breakpoint);
			// createSlices(abspath, filename);
		}
	}

	function getFilenameBase(filename) {
		var filenameType = "." + filename.split(".").pop();
		var filenameBase = filename.replace(filenameType, "");

		return filenameBase;
	}

	function createSlices(breakpoint, callbackSlicesComplete) {
		var filename = breakpoint + ".png";
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

	function getLayoutHTML() {
		var html = "";

		for (var i = 0; i < _breakpoints.length; i++) {
			html += _htmlTemplate;
			html = html.replace(/{{breakpoint}}/g, _breakpoints[i]);
			html = html.replace(/{{filenameBase}}/g, _breakpoints[i]);
		}

		return html;
	}

	function getLayoutCSS() {
		var css = "";
		var breakpointMin = 0;
		var breakpointMax = 0;

		for (var i = 0; i < _breakpoints.length-1; i++) {
			breakpointMin = (i===0 ? 0 : _breakpoints[i]);
			breakpointMax = _breakpoints[i+1] - 1;
			css += _cssTemplate;
			css = css.replace(/{{breakpoint}}/g, _breakpoints[i]);
			css = css.replace(/{{breakpointMin}}/g, breakpointMin);
			css = css.replace(/{{breakpointMax}}/g, breakpointMax);
		}

		return css;
	}

	function isNumber(string) {
		if (string === "") {
			string = "invalid";
		}
		return !isNaN(string);
	}

};

