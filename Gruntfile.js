module.exports = function ( grunt ) {

	'use strict';

	grunt.initConfig({

		pkg: grunt.file.readJSON( 'package.json' ),

		concat: {
			options: {
				banner: '// Sensor v<%= pkg.version %>\n// Copyright (2013) Rich Harris\n// Released under the MIT License\n\n// https://github.com/science-gamed/Sensor\n\n;(function ( global ) {\n\n\'use strict\';\n\n',
				footer: '\n\nif ( typeof global.module !== "undefined" && global.module.exports ) { global.module.exports = sensor; }\n' +
					'else if ( typeof global.define !== "undefined" && global.define.amd ) { global.define( function () { return sensor; }); }\n' +
					'else { global.sensor = sensor; }\n\n}( this ));'
			},
			files: {
				dest: 'build/sensor.js',
				src: [ 'src/sensor.js', 'src/events/**/*.js' ]
			}
		},

		uglify: {
			files: {
				src: '<%= concat.files.dest %>',
				dest: 'build/sensor.min.js'
			}
		},

		copy: {
			release: {
				files: {
					'release/<%= pkg.version %>/sensor.js': '<%= concat.files.dest %>',
					'release/<%= pkg.version %>/sensor.min.js': '<%= uglify.files.dest %>'
				}
			},
			shortcut: {
				files: {
					'sensor.js': '<%= concat.files.dest %>',
					'sensor.min.js': '<%= uglify.files.dest %>'
				}
			}
		}
	});

	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );

	grunt.registerTask( 'default', [ 'concat', 'uglify' ]);

	grunt.registerTask( 'release', [ 'default', 'copy:release', 'copy:shortcut' ]);

};