// README
// http://gruntjs.com/configuring-tasks
// http://ericnish.io/blog/compile-less-files-with-grunt
// http://www.sitepoint.com/writing-awesome-build-script-grunt/
// http://www.smashingmagazine.com/2013/10/29/get-up-running-grunt/

module.exports = function(grunt) {
	require('jit-grunt')(grunt);

	grunt.initConfig({
	    responsify: {
	      	default: {
		        options: {
		        },
		        files: {
		        	src:["layouts/*.png"]
		        }
			}
	    },
		copy: {
			default: {
				cwd: ".",			// Source folder
				src: [	"./*.html",
						"./resources/pages/**/*.html",
						"./resources/img/**/*.png",
						"./resources/css/**/*.css" 
						],		// The files to copy
				dest: "./dist",		// Destination folder
				expand: true		// Enables these options. Required when using cwd.
			},
		},
		clean: {
			default: {
				src: [ './dist' ],
				options: {
					force: true
				}
			},
		},
		browserSync: {
			default: {
				bsFiles: {
					src: [	"./dist/**/*.html",
							"./dist/resources/css/**",
							"./dist/resources/img/**"
							]
				},
				options: {
					server: {
						// baseDir: "./" // src build
						baseDir: "./dist/" // dist build
					},
					watchTask: true
				}
			}
		},
		watch: {
			default: {
				files: ["layouts/**"],
				tasks: ["responsify", "clean", "copy"],
				options: {
					spawn: false
				}
			}
		}
	});

	// When Watch task is triggered, tell Responsify task
	// which files have been udpated.
	// Without this, Responsify will process the entire
	// layout folder each time Watch is triggered. 
	var changedFiles = Object.create(null);
	var onChange = grunt.util._.debounce(function() {
		grunt.config('affectedFilepaths', Object.keys(changedFiles));
		changedFiles = Object.create(null);
	}, 200);
	grunt.event.on('watch', function(action, filepath) {
		changedFiles[filepath] = action;
		onChange();
	});

	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-browser-sync");

	grunt.loadTasks("tasks");

	grunt.registerTask('default', ['responsify', 'clean', 'copy', 'browserSync', 'watch']);
};
