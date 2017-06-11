module.exports = function(grunt){

	// load plugins
	[
		'grunt-contrib-less'
	].forEach(function(task){
		grunt.loadNpmTasks(task);
	});

	// configure plugins
	grunt.initConfig({
		cafemocha: {
			all: { src: 'qa/tests-*.js', options: { ui: 'tdd' }, }
		},
		jshint: {
			app: ['meadowlark.js', 'public/js/**/*.js', 'lib/**/*.js'],
			qa: ['Gruntfile.js', 'public/qa/**/*.js', 'qa/**/*.js'],
		},
		exec: {
			linkchecker: { cmd: 'linkchecker --ignore-url=\'!^(https?:)\/\/localhost\b\' http://localhost:3000' }
		},
		less: {
		development: {
			options: {
				customFunctions: {
					static: function(lessObject, name) {
							console.log("static");
							return 'url("' + require('./lib/static.js').map(name.value) +'")';
					}
				}
			},
			files: {
				'public/css/main.css': 'less/main.less'
			}
		}
	},
	});

	// register tasks
	grunt.registerTask('default', ['less']);
};
