module.exports = function ( grunt ) {

	'use strict';

	grunt.initConfig({

		pkg: grunt.file.readJSON( 'package.json' ),

		concat: {
			options: {
				banner: '// Sensor v<%= pkg.version %>\n// Copyright (2013) Rich Harris\n// Released under the MIT License\n\n// https://github.com/science-gamed/Sensor\n\n(function ( global ) {\n\n',
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
		}
	});

	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );

	grunt.registerTask( 'default', [ 'concat', 'uglify' ] );

};