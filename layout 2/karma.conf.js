// Karma configuration
var gc = require('./gulp.config.json');
var path = require('path');
module.exports = function(config) {
    config.set({
        //urlRoot: '/base',
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jspm', 'jasmine'],
        files: [
            // This is needed since SystemJS   depends on Function.bind(), which is not supported in PhantomJS.
            'node_modules/phantomjs-polyfill/bind-polyfill.js'
        ],


        // systemjs: {
        //     configFile: '.build/config.js',
        //     config: {
        //         transpiler: 'babel',
        //         "paths": {
        //             "systemjs": '.build/jspm_packages/system.js',
        //             "system-polyfills": '.build/jspm_packages/system-polyfills.js',
        //             "babel": '.build/jspm_packages/npm/babel-core@5.8.22/browser.js',
        //             "typescript": 'node_modules/typescript/bin/typescript.js',
        //             "es6-module-loader": 'node_modules/es6-module-loader/dist/es6-module-loader.js',
        //             "angular-mocks": '.build/jspm_packages/github/angular/bower-angular-mocks@1.4.4/angular-mocks.js'
        //         }
        //     },
        //     files: [
        //         '.build/app/**/*.js',
        //         //'src/app/**/*.js',
        //         'src/**/*.spec.js'
        //     ],
        // },


        jspm: {
            config: ".build/config.js",
            serveFiles: [
                '.build/app/**/*.js'],

            loadFiles: [
                'src/app/**/*.spec.js'
            ],
            // paths: {
            //     '*': '.build/*.js',
            // }

        },
        proxies: {
            
        //     'src/': '/base/src/',
        //     'jspm_packages/': '/base/.build/jspm_packages/',
        //     // '/base/app': '/base/.build/app',
        // '/.build/src/app': '/base/src/app',
        //     // '/base/jspm_packages': '/base/.build/jspm_packages',
        //     // '/base/app/src/app': '/base/src/app'
        },

        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        //'PhantomJS'
        browsers: ['PhantomJS',],

        preprocessors: {
            'src/**/!(*spec).js': ['babel', 'coverage']
        },

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['coverage', 'spec'],
        coverageReporter: {
            // isparta works as a custom instrumentor, which must be registered in Karma config:
            instrumenters: {isparta: require('isparta')},
            instrumenter: {
                'src/**/*.js': 'isparta'
            },

            reporters: [
                {
                    type: 'text-summary'
                },
                {
                    type: 'html',
                    dir: gc.path.coverage,
                    subdir: '.'
                }
            ]
        },

        // list of files to exclude

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO ||
        // config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable colors in the output (reporters and logs)
        colors: true

    });
};
