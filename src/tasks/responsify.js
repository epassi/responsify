'use strict';


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
		grunt.file.recurse("layouts/", onTraverseFile);
		_breakpoints.sort(function(a,b){return a-b;});

		_html = getLayoutHTML();
		_css = getLayoutCSS();

		templateHTML = templateHTML.replace(/{{styles}}/g, _css);
		templateHTML = templateHTML.replace(/{{maxBreakpoint}}/g, _breakpoints[_breakpoints.length-1]);
		templateHTML = templateHTML.replace(/{{html}}/g, _html);
		grunt.file.write("index.html", templateHTML);
  });

	function onTraverseFile(abspath, rootdir, subdir, filename) {
		var extension = "." + filename.split(".").pop();
		var filenameWithoutExtension = filename.replace(extension,"");
		if (isNumber(filenameWithoutExtension)) {
			var breakpoint = filenameWithoutExtension;
			_breakpoints.push(breakpoint);
		}
	}

	function getLayoutHTML() {
		var html = "";

		for (var i = 0; i < _breakpoints.length; i++) {
			html += _htmlTemplate;
			html = html.replace(/{{breakpoint}}/g, _breakpoints[i]);
			html = html.replace(/{{filename}}/g, _breakpoints[i]+".png");
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

