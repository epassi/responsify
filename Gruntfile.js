// README
// http://ericnish.io/blog/compile-less-files-with-grunt
// http://www.sitepoint.com/writing-awesome-build-script-grunt/
// http://www.smashingmagazine.com/2013/10/29/get-up-running-grunt/

module.exports = function(grunt) {
	require('jit-grunt')(grunt);

	grunt.initConfig({
	    responsify: {
	      default_options: {
	        options: {
	        },
	        files: {
	          'tmp/default_options': ['test/fixtures/testing', 'test/fixtures/123']
	        }
	      }
	    },
		copy: {
			build: {
				cwd: ".",			// Source folder
				src: [	"./*.html",
						"./resources/img/**/*.png",
						"./resources/css/**/*.css" 
						],		// The files to copy
				dest: "./dist",		// Destination folder
				expand: true		// Enables these options. Required when using cwd.
			},
		},
		clean: {
			build: {
				src: [ './dist' ],
				options: {
					force: true
				}
			},
		},
		browserSync: {
			dev: {
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
			layouts: {
				files: ["layouts/**"],
				tasks: ["responsify", "clean", "copy"],
				options: {
					nospawn: true
				}
			}
		}
	});

	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-browser-sync");

	grunt.loadTasks("tasks");

	grunt.registerTask('default', ['responsify', 'clean', 'copy', 'browserSync', 'watch']);
};
