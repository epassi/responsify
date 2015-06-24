/******************************************************************************

1. Get affected files from Watch task.
2. Build complete page-layout map.

3. Rebuild portions of site affected by changed files.
   For each affected file:
   a. Delete associated page files (slices, HTML).
   b. If applicable, create new page files (slices, HTML).

4. Create index.html based on entire page map.

******************************************************************************/


// 'use strict';

var gm = require("gm").subClass({ imageMagick: true });
var async = require("async");
var done;

module.exports = function ( grunt ) {
	const SLICE_COUNT = 3;
	var _allFilepaths = [];
	var _pages = {};
	var _issues = [];
	var _indexHtmlTemplate = grunt.file.read("resources/templates/index.html");
	var _prototypeHtmlTemplate = grunt.file.read("resources/templates/prototype.html");
	var _htmlTableRowPartial = grunt.file.read("resources/partials/index-table-row.html");
	var _htmlLayoutDivPartial = grunt.file.read("resources/partials/prototype-layout-div.html");
	var _htmlSliceImgPartial = grunt.file.read("resources/partials/slice-img.html");
	var _cssMediaQueryPartial = grunt.file.read("resources/partials/prototype-media-query.css");

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

  	grunt.registerMultiTask( 'responsify', 'generates a responsive prototype from layout comps/wireframes', function () {
		// Force synchronous flow.
		// Don't allow next grunt task to start until this one is finished.
		done = this.async();

		// Get files to process.
		var affectedFilepaths = grunt.config(["affectedFilepaths"]);
		if (!affectedFilepaths) {
			// If there are no affected files detected,
			// assume this is the first run and do full reset.
			affectedFilepaths = getAllLayoutFilepaths();
			if (grunt.file.exists("resources/pages/")) {
				grunt.file.delete("resources/pages/");
			}
			if (grunt.file.exists("resources/img/")) {
				grunt.file.delete("resources/img/");
			}
		}

		buildSite(affectedFilepaths);
  	});

	function buildSite(affectedFilepaths) {
		_allFilepaths = getAllLayoutFilepaths();

		grunt.log.subhead("Affected files:");
		grunt.log.writeln(affectedFilepaths.join().replace(/,/g, "\n"));

		// Reset.
		_issues = [];
		_pages = {};

		// Build page-layout map.
		grunt.log.subhead("Building page-layout map...");
		for (var i = 0; i < _allFilepaths.length; i++) {
			var imageFilename = _allFilepaths[i].replace(/layouts\//g, "");
			addToPageMap(imageFilename);
		}

		// Create responsive pages for new/updated layouts.
		grunt.log.subhead("Processing pages...");
		async.each(getUniqueTitlesFromFilepaths(affectedFilepaths), processPage, onTaskComplete);
	}

	function processPage(title, callback_processingComplete) {
		var pageTemplate = _prototypeHtmlTemplate;
		var breakpoints = _pages[title];
		var html = "";
		var css = "";
		var i = 0;

		// Delete existing page files (HTML, image slices).
		deletePage(title);

		// If there are no breakpoints,
		// assume page has been completely removed and abort.
		if (!breakpoints) {
			return callback_processingComplete();
		}

		// Create slices for each layout.
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
				grunt.log.ok(title + ".html complete");

				callback_processingComplete();
			}
		);
	}

	function createSlices(title, breakpoint, callback_slicingComplete) {
		// In getting filepath, account for both a PNG or JPG scenario.
		var filepaths = grunt.file.expand("layouts/" + title + "@" + breakpoint + "*");
		// There should be only one match, but just in case, we'll grab only the first match [0] to be sure.
		var abspath = filepaths[0];
		var filename = abspath.split("/").pop();

		var size = gm(abspath).size(function(err, size) {
			if (err) {
				_issues.push("Error occurred while slicing " + filename + ".");
				callback_slicingComplete();
			} else {			
				var width = size.width;
				var height = size.height;
				var pixelRatio = width / breakpoint;
				var pixelRatioRound = Math.round(pixelRatio*100) / 100;
				var sliceHeight = Math.ceil(height / SLICE_COUNT);

				var i = 1;
				var y = 0;
				async.whilst(
					function() {return y < height;},
					function(callback) {						
						// Create img folder if it doesn't already exist.
						if (!grunt.file.exists("resources/img")) {
							grunt.file.mkdir("resources/img");
						}

						// If image is high resolution,
						// Create low and high resolution slices.
						// Otherwise, just make a standard (low) resolution slice.
						if (pixelRatio > 1) {
							var sliceHiRes = gm(abspath).crop(width, sliceHeight, 0, y);
							var sliceHiResFilepath = "resources/img/" + getFilenameBase(filename) + "x" + pixelRatioRound + "_" + i + ".png";
							var sliceLoRes = gm(abspath).crop(width, sliceHeight, 0, y).scale(width/2, sliceHeight/2);
							var sliceLoResFilepath = "resources/img/" + getFilenameBase(filename) + "_" + i + ".png";
							sliceLoRes.quality(100).write(sliceLoResFilepath, function(err){});
							sliceHiRes.quality(100).write(sliceHiResFilepath, callback);
						} else {
							var slice = gm(abspath).crop(width, sliceHeight, 0, y);
							var sliceFilepath = "resources/img/" + getFilenameBase(filename) + "_" + i + ".png";
							slice.quality(100).write(sliceFilepath, callback);
						}

						// Advance to next slice.
						y += sliceHeight;
						i++;
					},
					function(err) {
						if (err) {
							grunt.log.warn("Error occurred while slicing " + filename + ".");
						} else {
							grunt.log.writeln("   " + filename + " sliced");
							callback_slicingComplete();
						}
					}
				);
			}
		});
	}

	function onTaskComplete(err) {
		grunt.log.subhead("Wrapping up...");
		writeIndexFile();

		if (_issues.length > 0) {
			grunt.log.fail("\nResponsify completed with issues:");
			for (var i = 0; i < _issues.length; i++) {
				grunt.log.error(_issues[i]);
			}
		} else {
			grunt.log.success("\nResponsify completed successfully.");
		}

		// Check to see if new files were dropped
		// while last batch of files was being processed.
		// Process any newly detected files ("stragglers").
		if (getStragglers().length > 0) {
			grunt.log.writeln("Stragglers detected, running again... ");
			buildSite(getStragglers());
		} else {
			done(true);
		}
	}

	function addToPageMap(filename) {
		var layoutInfo = getLayoutInfo(filename)
		if (layoutInfo) {
			if (_pages[layoutInfo.title]) {
				_pages[layoutInfo.title].push(layoutInfo.breakpoint);
				_pages[layoutInfo.title].sort(function(a,b){return a-b;});
			} else {
				_pages[layoutInfo.title] = [layoutInfo.breakpoint];
			}
			grunt.log.ok(layoutInfo.title + " " + _pages[layoutInfo.title].join().replace(/,/g, ", "));
		}
	}

	function deletePage(title) {
		// Delete image files.
		var imageSliceFilepaths = grunt.file.expand(["resources/img/" + title + "*.png"]);
		for (var i = 0; i < imageSliceFilepaths.length; i++) {
			if (grunt.file.exists(imageSliceFilepaths[i])) {
				grunt.file.delete(imageSliceFilepaths[i]);
			}
		}

		// Delete HTML file.
		var pageFilepath = "resources/pages/" + title + ".html";
		if (grunt.file.exists(pageFilepath)) {
			grunt.file.delete(pageFilepath);
		}
	}

	function getHtmlLayoutDivs(title, breakpoints) {
		var htmlLayoutDivs = "";
		var filenameBase = "";

		// Gather layouts.
		for (var i = 0; i < breakpoints.length; i++) {
			filenameBase = title + "@" + breakpoints[i];
			htmlLayoutDivs += _htmlLayoutDivPartial;
			htmlLayoutDivs = htmlLayoutDivs.replace(/{{breakpoint}}/g, breakpoints[i]);

			// Gather layout slices.
			var htmlSliceImgs = "";
			for (var j = 0; j < SLICE_COUNT; j++) {
				// Get the slices for the current layout.
				var sliceFilepathPattern = "resources/img/{{title}}@{{breakpoint}}*_{{slice}}.png";
				sliceFilepathPattern = sliceFilepathPattern.replace(/{{title}}/g, title);
				sliceFilepathPattern = sliceFilepathPattern.replace(/{{breakpoint}}/g, breakpoints[i]);
				sliceFilepathPattern = sliceFilepathPattern.replace(/{{slice}}/g, j+1);
				
				// Get HTML parameters for slices.
				var sliceFilepaths = grunt.file.expand(sliceFilepathPattern);
				var hiResAvailable = sliceFilepaths.length > 1; // Multiple slices means low and high resolution files.
				var filenameLoRes = "";
				var filenameHiRes = "";
				var srcset = "";

				if (hiResAvailable) {
					// Shorter filepath =  low resolution slice.
					var filepathLoRes = sliceFilepaths[0].length < sliceFilepaths[1].length ? sliceFilepaths[0] : sliceFilepaths[1];
					// Longer filepath = high resolution slice.
					var filepathHiRes = sliceFilepaths[0].length > sliceFilepaths[1].length ? sliceFilepaths[0] : sliceFilepaths[1];
					var pixelRatio = filepathHiRes.split("x").pop().split("_")[0];
					filenameLoRes = getValidHrefString(filepathLoRes.split("/").pop());
					filenameHiRes = getValidHrefString(filepathHiRes.split("/").pop());
					srcset = " srcset=\"../img/{{filenameLoRes}} 1x, ../img/{{filenameHiRes}} {{pixelRatio}}x\"";
					srcset = srcset.replace(/{{filenameLoRes}}/g, filenameLoRes);
					srcset = srcset.replace(/{{filenameHiRes}}/g, filenameHiRes);
					srcset = srcset.replace(/{{pixelRatio}}/g, pixelRatio);
				} else {
					// Just one file for low resolution scenario.
					filenameLoRes = getValidHrefString(sliceFilepaths[0].split("/").pop());
				}

				htmlSliceImgs += _htmlSliceImgPartial;
				htmlSliceImgs = htmlSliceImgs.replace(/{{filename}}/g, filenameLoRes);
				htmlSliceImgs = htmlSliceImgs.replace(/{{srcset}}/g, srcset);
			}
			htmlLayoutDivs = htmlLayoutDivs.replace(/{{slices}}/g, htmlSliceImgs);
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
			indexTableRowHtml = indexTableRowHtml.replace(/{{page}}/g, getValidLocationString(title));
			indexTableRowHtml = indexTableRowHtml.replace(/{{title}}/g, title);
			indexTableRowHtml = indexTableRowHtml.replace(/{{breakpoints}}/g, breakpoints.join().replace(/\,/g, ", "));
			indexTableRows += indexTableRowHtml;
		}

		indexHtml = indexHtml.replace(/{{project}}/g, project);
		indexHtml = indexHtml.replace(/{{pages}}/g, indexTableRows);
		grunt.file.write("index.html", indexHtml);
		grunt.log.ok("index.html complete");
	}

	function isNumber(string) {
		if (string === "") {
			string = "invalid";
		}
		return !isNaN(string);
	}

	function getUniqueTitlesFromFilepaths(filepaths) {
		var titles = [];

		for (var i = 0; i < filepaths.length; i++) {
			var title = filepaths[i].split("/").pop();
			title = title.replace(/@\d*\.(png|jpg)$/g, "");

			// Keep array normalized.
			// Don't add redundant titles.
			if (titles.indexOf(title) === -1) {
				titles.push(title);
			}
		}

		return titles;
	}

	function getFilenameBase(filename) {
		var filenameType = "." + filename.split(".").pop();
		var filenameBase = filename.replace(filenameType, "");

		return filenameBase;
	}

	// Returns a string formatted for an HTML href attribute.
	function getValidHrefString(href) {
		// Replace spaces with %20.
		href = href.replace(/\ /g, "%20");

		return href;
	}

	// Returns a string formatted for a window.document.location.
	function getValidLocationString(href) {
		// Replace spaces with %20.
		href = href.replace(/\ /g, "%20");

		// Escape single quotes, so that quote isn't interpretted as end-of-string delimitter.
		href = href.replace(/'/g, "\\'");

		return href;
	}

	function getLayoutInfo(filename) {
		var layoutInfo = false;

		var filenameType = filename.split(".").pop();
		var filenameBase = filename.replace("." + filenameType, "");
		if (filenameBase.indexOf("@") === -1) {
			_issues.push("Ignored file " + filename + ": missing @ symbol for indicating breakpoint.");
			return layoutInfo;
		}

		var breakpoint = filenameBase.split("@").pop();
		if (!isNumber(breakpoint)) {
			_issues.push("Ignored file " + filename + ": \"" + breakpoint + "\" is not a valid breakpoint.");
			return layoutInfo;
		}

		var title = filenameBase.replace("@" + breakpoint, "");
		// To do: check for blank page names.


		layoutInfo = {};
		layoutInfo.title = title;
		layoutInfo.breakpoint = breakpoint;

		return layoutInfo;
	}

	function getAllLayoutFilepaths() {
		return grunt.file.expand(["layouts/*.{png,jpg}"]);
	}

	function getStragglers() {
		var stragglers = [];
		var allFilepathsLastRun = _allFilepaths;
		var allFilepathsNow = getAllLayoutFilepaths();

		// If a file in the latest layouts folder wasn't in the
		// last run, add it to the list of stragglers for processing.
		for (var i = 0; i < allFilepathsNow.length; i++) {
			if (allFilepathsLastRun.indexOf(allFilepathsNow[i]) === -1) {
				stragglers.push(allFilepathsNow[i]);
			}
		} 

		return stragglers;
	}
};

