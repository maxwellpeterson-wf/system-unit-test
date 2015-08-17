'use strict';

var gulp = require('gulp');
var config = require('./gulp.config.json');
var lazypipe = require('lazypipe');
var path = require('path');
var child_process = require('child_process');
var fs = require('fs');

var plugins = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'gulp.*', 'systemjs-*', 'yargs', 'tsd', 'plato', 'karma', 'del'],
    rename: {'angularTemplatecache': 'templateCache'} // a mapping of plugins to rename
});

var baseBuildTasks = ['compile:partials',
                      'compile:ts',
                      'compile:scss'];

var tslintOptions = {
    emitError: false,
    sort: true
};

var tsProject = plugins.typescript.createProject('src/tsconfig.json', {
    sortOutput: true,
    noExternalResolve: true,
    sourceMap: doMaps(),
    outDir: config.path.build,
    typescript: require('typescript')
});

var templateCacheConfig = {
    module: config.moduleName + '.templates',

    standalone: true,
    moduleSystem: 'RequireJS'
};

var htmlminOptions = {
    removeComments: true,
    collapseWhitespace: true,
    minifyJS: true,
    minifyCSS: true
};

var cordova = {
    create: plugins.cordovaCreate,
    plugin: plugins.cordovaPlugin,
    android: plugins.cordovaBuildAndroid,
    cmd: plugins.cordova,
    version: plugins.cordovaVersion,
    preference: plugins.cordovaPreference
};

if (process.env.BUILD_TARGET === undefined) {
    process.env.BUILD_TARGET = 'local';
}

// startup --------------------------------------------
process.stdout.write("\u001b[2J\u001b[0;0H"); //cls

var e = getEnvironment();
if (e !== 'local') {
    announce('BUILD TARGET', e);
}
//------------------------------------------------------


function startWebServer(path, port) {
    gulp.src(path)
        .pipe(plugins.webserver({
            port: port,
            livereload: {enable: true, port: port + 100},
            open: true
            // fallback: 'index.html'
        }));
}

// CLEAN TASKS

gulp.task('clean:android:apk', function(done) {
    plugins.del([config.path.apk], done);
});

gulp.task('clean:build', function(done) {
    plugins.del([config.path.build +
                 config.glob.all,
                 '!' +
                 config.path.build +
                 'jspm_packages/**',
                 '!' +
                 config.path.build +
                 'config.js'],
        done);
});

gulp.task('clean:cordova', function(done) {
    plugins.del([config.path.cordova], done);
});

gulp.task('clean:coverage', function(done) {
    plugins.del([config.path.coverage], done);
});

gulp.task('clean:dist', function(done) {
    plugins.del([config.path.dist + config.glob.all,
                 '!' + config.path.dist + 'jspm_packages/**'],
        done);
});

gulp.task('clean:docs', function(done) {
    plugins.del([config.path.docs], done);
});

gulp.task('clean:jspm', function(done) {
    plugins.del([config.path.build + 'jspm_packages/**'], done);
});

gulp.task('clean:tsd', function(done) {
    plugins.del([config.path.tsd, '!' + config.path.tsd + '.gitignore'], done);
});

gulp.task('clean:android', gulp.parallel('clean:android:apk', 'clean:cordova'));

gulp.task('clean:all', gulp.parallel('clean:build', 'clean:jspm', 'clean:tsd', 'clean:android'));

gulp.task('clean', gulp.parallel('clean:build', 'clean:android', 'clean:dist', 'clean:coverage'));

// END CLEAN TASKS

// COPY TASKS

gulp.task('copy:assets:build', function() {
    return gulp.src([path.join(config.path.assets, config.glob.all)])
        .pipe(gulp.dest(config.path.buildAssets));
});

gulp.task('copy:assets:dist', function() {
    return gulp.src([path.join(config.path.assets, config.glob.all)])
        .pipe(gulp.dest(config.path.distAssets));
});

gulp.task('copy:tests', function() {
    return gulp.src([path.join(config.path.srcApp, config.glob.spec), path.join(config.path.srcApp, config.glob.mock)])
        .pipe(gulp.dest(config.path.buildApp));
});

// END COPY TASKS

// COMPILE TASKS

gulp.task('compile:docs', gulp.series('clean:docs', function() {
    return gulp.src(path.join(config.path.src, config.glob.ts))
        .pipe(plugins.typedoc({
            module: 'commonjs',
            target: 'ES5',
            out: config.path.docs,
            name: 'app',
            includeDeclarations: true,
            theme: 'minimal'
        }));
}, function() {
    startWebServer(config.path.docs, config.server.docs.port);
}));


gulp.task('compile:partials', function() {
    return gulp.src([path.join(config.path.srcApp, config.glob.html)])
        .pipe(plugins.cached('html'))
        .pipe(plugins.if(doMinify(), plugins.htmlmin(htmlminOptions)))
        .pipe(plugins.remember('html'))
        .pipe(plugins.angularTemplatecache('templates.js', templateCacheConfig))
        .pipe(gulp.dest(config.path.buildApp));
});

// gulp.task('compile:routes', function() {
//     var routes = require(config.path.srcApp + 'routes.json');
//     // get the source paths of our routes
//     routes = routes.map(function(r) {
//         return r.src;
//     });

//     var routeBundleConfig = {
//         //baseURL: '../build',
//         main: path.join(config.path.build, config.mainModule),
//         routes: routes,
//         bundleThreshold: 0.6,
//         config: config.system,
//         sourceMaps: true,
//         minify: true,
//         dest: config.path.buildApp,
//         destJs: path.join(config.path.buildApp, 'main.js')
//     };

//     return plugins.systemjsRouteBundler.build(routeBundleConfig);
// });

gulp.task('compile:scss', function(done) {
    return gulp.src([path.join(config.path.srcApp, config.glob.scss)])
        .pipe(initSourceMaps())
        .pipe(plugins.cached('scss'))
        .pipe(plugins.sass({outputStyle: doMinify() ? 'compressed' : 'expanded'}))
        .pipe(plugins.remember('scss'))
        .pipe(plugins.concat('app.css', {newLine: ''}))
        .pipe(writeSourceMaps())
        .pipe(gulp.dest(config.path.buildApp));
});

gulp.task('compile:ts', function() {
    var tsconfig = require('./src/tsconfig.json')

    var target = tsconfig.compilerOptions.target;

    if (target == 'es5') {
        target += ':' + tsconfig.compilerOptions.module;
    }

    announce('COMPILE TARGET', target);
    return gulp.src([path.join(config.path.src, config.glob.ts)])
        .pipe(plugins.replace(config.transforms.authUrl.find,
            config.transforms.authUrl.replace[getEnvironment()]))
        .pipe(initSourceMaps())
        .pipe(plugins.typescript(tsProject))
        .pipe(writeSourceMaps())
        .pipe(gulp.dest(config.path.build));
});

gulp.task('compile:build',
    gulp.parallel(baseBuildTasks.concat([
        'copy:assets:build'])));

gulp.task('compile:cordova',
    gulp.parallel(
        baseBuildTasks.concat(['copy:assets:dist'])));

gulp.task('compile:dist',
    gulp.parallel(
        baseBuildTasks.concat(['copy:assets:dist'])));

gulp.task('compile:sfx', gulp.series('compile:dist', function() {
    return build(
        config.path.buildApp + "main",
        config.path.dist + 'build.js',
        {
            minify: doMinify(),
            sfx: true,
            sourceMaps: doMaps()
        });
}));

gulp.task('compile:sfx:dependencies', gulp.series('compile:dist'), function() {
    // dependency only build
    build(
        config.path.buildApp + config.glob.all + ' - ' + '[' + config.path.buildApp + config.glob.all + ']',
        config.path.dist + 'dependencies.js',
        {
            minify: doMinify(),
            sfx: true,
            sourceMaps: doMaps()

        });
});

gulp.task('compile:sfx:app', gulp.series('compile:dist'), function() {
    // dependency only build
    build(
        config.path.buildApp + config.glob.all + ' - ' + '[' + config.path.buildApp + config.glob.all + ']',
        config.path.dist + 'build.js',
        {
            minify: doMinify(),
            sfx: true,
            sourceMaps: doMaps()

        });
});

// END COMPILE TASKS

// CORDOVA TASKS

function getManifest() {
    return require("./manifest.json");
}
function setManifest(manifest, done) {
    done = done || function() { };    // done callback is optional now
    var fs = require("fs");
    fs.writeFile("manifest.json", JSON.stringify(manifest, null, 2), "utf8", done);
}
function getVersion(manifest) {
    return manifest.version.major + '.' + manifest.version.minor + '.' + manifest.version.patch;
}
function incrementMajorVersion() {
    // do versioning
    var manifest = getManifest();
    manifest.version.major++;
    manifest.version.minor = 0;
    manifest.version.patch = 0;
    setManifest(manifest);
    return getVersion(manifest);
}
function incrementMinorVersion() {
    // do versioning
    var manifest = getManifest();
    manifest.version.minor++;
    manifest.version.patch = 0;
    setManifest(manifest);
    return getVersion(manifest);
}
function incrementPatchVersion() {
    // do versioning
    var manifest = getManifest();
    manifest.version.patch++;
    setManifest(manifest);
    return getVersion(manifest);
}
gulp.task('version', function() {
    announce('VERSION:', getVersion(getManifest()));
});
gulp.task('inc:major', function() {
    var version = incrementMajorVersion();
    announce('VERSION CHANGED!', version);
});
gulp.task('inc:minor', function() {
    var version = incrementMinorVersion();
    announce('VERSION CHANGED!', version);
});


function buildCordova(debug /*boolean*/, done /* callback */) {
    var apkOptions;
    if (!debug) {
        apkOptions = {
            storeFile: '../../../utils/app.keystore',
            keyAlias: 'alias_name'
        };
    }

    var version;
    if (!debug) {
        version = incrementPatchVersion();
        announce('VERSION CHANGED!', version);
    }
    else {
        version = getVersion(getManifest())
        announce('VERSION', version);
    }

    gulp.src(config.path.dist)
        .pipe(cordova.create({
            id: config.appId,
            name: config.moduleName.toLowerCase()
        }))
        .pipe(cordova.version(version))
        .pipe(cordova.preference('loadUrlTimeoutValue', '600000'))
        .pipe(cordova.plugin('org.apache.cordova.dialogs'))
        .pipe(cordova.plugin('org.apache.cordova.camera'))

        /* https://github.com/rodenis/reader-plugin */
        .pipe(cordova.plugin('https://github.com/rodenis/reader-plugin.git'))

        /* https://github.com/alignace/card-reader-phonegap#card-reader-phonegap */
        // this plugin causes the release build to fail
        //  .pipe(cordova.plugin('https://github.com/alignace/card-reader-phonegap.git'))

        /* https://github.com/katzer/cordova-plugin-printer */
        .pipe(cordova.plugin('https://github.com/katzer/cordova-plugin-printer.git'))

        /*https://github.com/pankajnirwan103/cordova-plugin-printer */
        .pipe(cordova.plugin('https://github.com/pankajnirwan103/cordova-plugin-printer.git'))
        .pipe(cordova.android(apkOptions))
        .pipe(gulp.dest(config.path.apk))
        .on('end', done);
}

gulp.task('android', plugins.shell.task('utils\\emulate-android.bat ' + config.path.cordova));
//.pipe(plugins.shell.task('cordova emulate android', { cwd: config.path.cordova + 'apk' }))


gulp.task('android:debug', gulp.series('compile:sfx', 'clean:cordova', function(done) {
    buildCordova(true, done);
}));

gulp.task('android:release',
    gulp.series('compile:sfx', 'clean:cordova', function(done) {
        // should not be forced! use the -target command line argument
        //plugins.yargs.argv.target = "prod";
        buildCordova(false, done);
    }));

// END CORDOVA TASKS

// LINT TASKS

gulp.task('lint:partials', function() {
    return gulp.src(path.join(config.path.srcApp, config.glob.html))
        .pipe(plugins.htmlhint('.htmlhintrc'))
        .pipe(plugins.htmlhint.reporter());
});

gulp.task('lint:scss', function() {
    gulp.src(path.join(config.path.srcApp, config.glob.scss))
        .pipe(plugins.cached('scsslint'))
        .pipe(plugins.changed(config.path.srcApp, {extension: '.scss'}))
        .pipe(plugins.scssLint());
});

gulp.task('lint:tests', function() {
    return gulp.src([path.join(config.path.srcApp, config.glob.spec)])
        .pipe(plugins.cached('testlint'))
        .pipe(plugins.changed(config.path.srcApp, {extension: '.spec.js'}))
        .pipe(plugins.eslint())
        .pipe(plugins.eslint.format());
});

gulp.task('lint:ts', function() {
    return gulp.src(path.join(config.path.srcApp, config.glob.ts))
        .pipe(plugins.cached('tslint'))
        .pipe(plugins.tslint())
        .pipe(plugins.tslint.report(plugins.tslintStylish, tslintOptions));
});

gulp.task('lint', gulp.parallel('lint:ts', 'lint:partials', 'lint:tests'));

// END LINT TASKS

// REPORT TASKS

gulp.task('report:complexity', gulp.series('compile:dist', function(done) {
    return plugins.plato.inspect(path.join(config.path.dist, config.glob.js), config.path.complexity, {
        title: 'app', e: '.eslintrc'
    }, function(error, stdout, stderr) {
        if (stdout != null && stdout.length > 0) {
            console.log('stdout: ' + stdout);
        }
        if (stderr != null && stderr.length > 0) {
            console.log('stderr: ' + stderr);
        }
        return done();
    });
}, function() {
    startWebServer(config.path.complexity, config.server.complexity.port)
}));

// END REPORT TASKS

// SERVE TASKS

gulp.task('serve:build', function() {
    startWebServer(config.path.build, config.server.build.port);
});

gulp.task('serve:coverage', function() {
    startWebServer(config.path.coverage, config.server.coverage.port);
});

gulp.task('serve:dist', function() {
    startWebServer(config.path.dist, config.server.dist.port);
});

gulp.task('serve:docs', function() {
    startWebServer(config.path.docs, config.server.docs.port);
});

gulp.task('serve:report:complexity', function() {
    startWebServer(config.path.complexity, config.server.complexity.port);
});


// END SERVE TASKS

// TEST

function runTests(done, singleRun) {
    //.13+

    var karma = new plugins.karma.Server({
        configFile: __dirname + '/' + config.karma,
        singleRun: singleRun,
        autoWatch: !singleRun
    }, done);
    karma.start();
}

gulp.task('test:auto', gulp.series('compile:build', function(done) {
    runTests(done, false);
}));

gulp.task('test:coverage:auto', gulp.series('test:auto', 'serve:coverage'));

gulp.task('test', gulp.series('compile:build', function() {
    return runTests(false, true);
}));

gulp.task('test:ts', function() {
    return runTests(false, true);
});

gulp.task('test:coverage', gulp.series('test:ts', 'serve:coverage'));

// END TEST

// TSD

function getJSPMInstalledDependencies() {
    var npmConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), {encoding: 'utf8'}));
    var deps = [].concat(
        Object.keys(npmConfig.jspm.dependencies),
        Object.keys(npmConfig.jspm.devDependencies),
        ['karma-jasmine', 'numbro']
    );

    var i = deps.indexOf('typescript');
    deps.splice(i, 1);

    i = deps.indexOf('core-js');
    deps.splice(i, 1);
    return deps;
}


// generate a gitignore for the api directory
gulp.task('tsd:gitignore', function() {
    // use the list of external definitions to generate the .gitignore
    var tsdConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsd.json'), {encoding: 'utf8'}))
    var dependencies = Object.keys(tsdConfig.installed).concat(['tsd.d.ts']);
    return fs.writeFile(path.join(config.path.tsd, '.gitignore'), dependencies.join("\n"));
});

gulp.task('tsd:install', function() {
    var tsdApi = new plugins.tsd.getAPI(path.join(config.path.root, 'tsd.json'));
    var dependencies = getJSPMInstalledDependencies();
    var query = new plugins.tsd.Query();
    dependencies.forEach(function(dependency) {
        query.addNamePattern(dependency);
    });


    var options = new plugins.tsd.Options();
    options.resolveDependencies = true;
    options.overwriteFiles = true;
    options.saveBundle = true;
    options.saveToConfig = true;
    return tsdApi.readConfig()
        .then(function() {
            return tsdApi.select(query, options);
        })
        .then(function(selection) {
            return tsdApi.install(selection, options);
        })
        .then(function(installResult) {
            var written = Object.keys(installResult.written.dict);
            var removed = Object.keys(installResult.removed.dict);
            var skipped = Object.keys(installResult.skipped.dict);

            written.forEach(function(dts) {
                console.log('Definition file written: ' + dts);
            });

            removed.forEach(function(dts) {
                console.log('Definition file removed: ' + dts);
            });

            skipped.forEach(function(dts) {
                console.log('Definition file skipped: ' + dts);
            });
        });
});

gulp.task('tsd:purge', function() {
    var tsdApi = new plugins.tsd.getAPI(path.join(config.path.root, 'tsd.json'));
    return tsdApi.purge(true, true);
});

gulp.task('tsd', gulp.series('tsd:install', 'tsd:gitignore'));

// END TSD

// WATCH TASKS

gulp.task('watch:lint:partials', function() {
    var watcher = gulp.watch([path.join(config.path.srcApp, config.glob.html)], gulp.series('lint:html')); // watch
    // the
    // same files
    // in our
    // scripts task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.htmllint[event.path];       // gulp-cached remove api
            plugins.remember.forget('htmllint', event.path);         // gulp-remember remove api

        }
    }
});

gulp.task('watch:lint:scss', function() {
    var watcher = gulp.watch([path.join(config.path.srcApp, config.glob.scss)], gulp.series('lint:scss')); // watch
    // the
    // same files
    // in our
    // scripts task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.scsslint[event.path];       // gulp-cached remove api
            plugins.remember.forget('scsslint', event.path);         // gulp-remember remove api
        }
    }
});

gulp.task('watch:lint:tests', function() {
    var watcher = gulp.watch([path.join(config.path.srcApp, config.glob.spec)], gulp.series('lint:tests')); // watch
    // the same files
    // in our
    // scripts task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.testlint[event.path];       // gulp-cached remove api
            plugins.remember.forget('testlint', event.path);         // gulp-remember remove api
        }
    }
});

gulp.task('watch:lint:ts', function() {
    var watcher = gulp.watch([path.join(config.path.srcApp, config.glob.ts)], gulp.series('lint:ts')); // watch the
    // same files
    // in our
    // scripts task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.tslint[event.path];       // gulp-cached remove api
            plugins.remember.forget('tslint', event.path);         // gulp-remember remove api
        }
    }
});

gulp.task('watch:lint', gulp.parallel('watch:lint:ts', 'watch:lint:partials', 'watch:lint:scss'));

gulp.task('watch:partials', function() {
    var watcher = gulp.watch([path.join(config.path.srcApp, config.glob.html)], gulp.series('compile:partials')); // watch
    // the same files
    // in our
    // scripts task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.html[event.path];       // gulp-cached remove api
            plugins.remember.forget('html', event.path);         // gulp-remember remove api
        }
    }
});

gulp.task('watch:scss', function() {
    var watcher = gulp.watch([path.join(config.path.srcApp, config.glob.scss)], gulp.series('compile:scss')); // watch
    // the same
    // files in our scripts
    // task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.scss[event.path];       // gulp-cached remove api
            plugins.remember.forget('scss', event.path);         // gulp-remember remove api
        }
    }
});

gulp.task('watch:ts', function() {
    var watcher = gulp.watch([path.join(config.path.srcApp, config.glob.ts)], gulp.series('compile:ts')); // watch the
    // same files
    // in our
    // scripts task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.ts[event.path];       // gulp-cached remove api
            plugins.remember.forget('ts', event.path);         // gulp-remember remove api
        }
    }
});

gulp.task('watch:tsd', function() {
    var watcher = gulp.watch([path.join(config.path.tsd, config.glob.ts)], gulp.series('compile:ts')); // watch the
    // same files
    // in our
    // scripts task
    watcher.on('change', changes);
    function changes(event) {
        if (event.type === 'deleted') {                   // if a file is deleted, forget about it
            delete plugins.cached.caches.tsd[event.path];       // gulp-cached remove api
            plugins.remember.forget('tsd', event.path);         // gulp-remember remove api
        }
    }
});

gulp.task('watch:build', gulp.parallel('watch:ts', 'watch:partials', 'watch:scss', 'watch:tsd'));


// DEV

gulp.task('build:serve', gulp.series('clean:build', 'compile:build', 'serve:build'));
gulp.task('dev', gulp.parallel('build:serve', 'watch:build'));

// END DEV

gulp.task('update:jspm', plugins.shell.task([
    'jspm clean',
    'jspm update'
]))


// Functions

// SYSTEMJS FUNCTIONS

var Builder = require('jspm').Builder;

function getBuilder(config) {
    return Promise.resolve(Builder = new Builder(config));
}

function configureBuilder(options) {
    return function applyConfig(builder) {
        builder.config(options);
        return builder;
    }
}

function loadConfigFile(filename) {
    return function withBuilder(builder) {
        return builder.loadConfig(filename)
            .then(function() {
                return builder;
            });
    }
}

function build(inputPath, outputFile, outputOptions, buildConfig) {
    return getBuilder()
        .then(loadConfigFile(config.system))
        .then(configureBuilder(buildConfig))
        .then(function(builder) {
            if (outputOptions.sfx) {
                delete outputOptions.sfx;
                return builder.buildSFX(inputPath, outputFile, outputOptions);
            }
            return builder.build(inputPath, outputFile, outputOptions);
        });
}

// END SYSTEMJS FUNCTIONS

// SHARED FUNCTIONS

function getEnvironment() {
    var target;

    if (plugins.yargs.argv.target !== undefined) {
        target = plugins.yargs.argv.target;
    }
    else {
        target = process.env.BUILD_TARGET;
    }
    return target;
}

function announce(strSubject, strSetting) {
    strSubject = (strSubject || '').toString().toUpperCase();
    strSetting = (strSetting || '').toString().toUpperCase();
    var dashes = 50 - (strSubject.length + strSetting.length);
    var sb = '';
    for (var i = 0; i < dashes; i++) {
        sb += '-';
    }
    console.log('\n' + strSubject + ' ' + sb + '> ' + strSetting);
}

// these are undefined, if these are set to true or false, they override the env.


function getBooleanFromArg(arg) {
    if (arg === undefined) {
        return undefined;
    }

    var value = false;

    if (arg == true || arg == 'true') {
        value = true;
    }

    return value;
}


//exports.getTarget = function() {
//    return process.env.BUILD_TARGET;
//};


function getTargetConfig() {
    var target = plugins.yargs.argv.target;
    if (target === undefined) {
        target = process.env.BUILD_TARGET;
    }

    if (target === undefined) {
        target = 'local';
    }
    return config.targets[target];
}

function doBundle() {
    var arg = getBooleanFromArg(plugins.yargs.argv.bundle);
    if (arg !== undefined) {
        return arg;
    }
    return getTargetConfig().sfx;
}

function doMinify() {
    var arg = getBooleanFromArg(plugins.yargs.argv.minify);
    if (arg !== undefined) {
        return arg;
    }
    return getTargetConfig().minify;
}

function doMaps() {
    var arg = getBooleanFromArg(plugins.yargs.argv.maps);
    if (arg !== undefined) {
        return arg;
    }
    return getTargetConfig().sourceMaps;
}

// END SHARED FUNCTIONS

// SHARED LAZY PIPES

var writeSourceMaps = lazypipe().pipe(
    function() {
        return plugins.if(doMaps(), plugins.sourcemaps.write('.'));
    });

var initSourceMaps = lazypipe()
    .pipe(function() {
        return plugins.if(doMaps(), plugins.sourcemaps.init());
    });
// END SHARED LAZY PIPES


// TEMPLATES ------------------------------------------------------------------------------------------
var path = require('path');
var fs = require('fs');

// mk:service - create a new service
// options:
//      -n [service-name]
//      -name [service-name]
//          required. name of the service. should be dash-case.
//
//      -g  or  -global
//          optional. -g is assumed when no module is specified
//
//      -m [module-name]
//      -module [module-name]
//          optional name of the module (if creating a service in a module)
//
gulp.task('mk:service', function() {


    var arg = plugins.yargs.argv;


    var m = (arg.module || arg.m);
    if (m) {
        m = m.toLowerCase();
    }
    var g = arg.g || arg.global; // boolean

    var rawname = (arg.name || arg.n || 'example-service');
    rawname = replaceAll(rawname, '-service');
    rawname = replaceAll(rawname, 'service');
    var name = getCaseVariants(rawname);
    name.dashCase = name.dashCase + '-service';

    // global component?
    var parentPath;
    var componentPath;
    var backToRoot;
    var rootPath;
    if (g || !m) {
        componentPath = config.path.srcApp + 'api/services/' + name.dashCase;
        parentPath = config.path.srcApp + 'api/services';
        rootPath = config.path.srcApp + 'api';
        backToRoot = '../../../';
    } else {
        if (m === undefined) {
            console.error('ERROR: Must specify global (-g) or a module (-m)');
            return;
        }
        componentPath = config.path.srcApp + m + '/services/' + name.dashCase;
        parentPath = config.path.srcApp + m + '/services';
        rootPath = config.path.srcApp + m;
        backToRoot = '../../../';
    }

    var ts_txt = sb()
        .a("'use strict';")
        .a("import {Module} from '" + backToRoot + "appModule';")
        .a()
        .a("export interface I" + name.pascalCase + "Service {")
        .a("}")
        .a()
        .a("class " + name.pascalCase + "Service implements I" + name.pascalCase + "Service {")
        .a("    public static id: string = '" + name.camelCase + "Service';")
        .a("}")
        .a("Module.addService(" + name.pascalCase + "Service);")
        .toString();

    var all_txt = sb().a("export * from './" + name.dashCase + "';").toString();
    var allroot_txt = sb().a("export * from './" + name.dashCase + "/all';").toString();
    var allrootroot_txt = sb().a("export * from './services/all';").toString();

    try {
        mkdir(componentPath, function(e) {
            if (e) {
                throw e;
            }

            fs.writeFile(componentPath + '/' + name.dashCase + '.ts', ts_txt);
            fs.writeFile(componentPath + '/all.ts', all_txt);
            fs.appendFile(parentPath + '/all.ts', allroot_txt);
            if (rootPath) {
                fs.appendFile(rootPath + '/all.ts', allrootroot_txt);
            }
            console.log("The service was created at: " + componentPath);
        });
    }
    catch (e) {
        console.error('ERROR: service could not be created! --> \n' + JSON.stringify(e, null, 2));
    }
});

// mk:component - create a new component
// options:
//      -n [component-name]
//      -name [component-name]
//          required. name of the component. should be dash-case.
//
//      -g  or  -global
//          optional. -g is assumed when no module is specified
//
//      -m [module-name]
//      -module [module-name]
//          optional name of the module (if creating a component in a module)
//
gulp.task('mk:component', function() {
    var arg = plugins.yargs.argv;

    var m = (arg.module || arg.m);
    if (m) {
        m = m.toLowerCase();
    }
    var g = arg.g || arg.global; // boolean

    var rawname = (arg.name || arg.n || 'example-component');
    var name = getCaseVariants(rawname);

    // global component?
    var parentPath;
    var componentPath;
    var backToRoot;
    if (g || !m) {
        componentPath = config.path.srcApp + 'components/' + name.dashCase;
        parentPath = config.path.srcApp + 'components';
        backToRoot = '../../';
    } else {
        if (m === undefined) {
            console.error('ERROR: Must specify global (-g) or a module (-m)');
            return;
        }
        componentPath = config.path.srcApp + m + '/components/' + name.dashCase;
        parentPath = config.path.srcApp + m + '/components';
        backToRoot = '../../../';
    }

    var ts_txt = sb()
        .a("'use strict';")
        .a("import {Module} from '" + backToRoot + "appModule';")
        .a()
        .a("class " + name.pascalCase + "Directive implements ng.IDirective {")
        .a("    public static id: string = '" + name.camelCase + "';")
        .a()
        .a("    public scope = {")
        .a("        model: '=ngModel'")
        .a("    };")
        .a("    public templateUrl = 'components/" + name.dashCase + "/" + name.dashCase + ".html';")
        .a("    public require = 'ngModel';")
        .a("}")
        .a()
        .a("class " + name.pascalCase + "Controller {")
        .a("    public static id: string = '" + name.camelCase + "';")
        .a("    public model: any; // todo: replace with interface")
        .a("}")
        .a("Module.component(" + name.pascalCase + "Directive, " + name.pascalCase + "Controller);")
        .toString();

    var scss_txt = sb()
        .a("#" + name.camelCase + " {")
        .a("}")
        .toString();


    var html_txt = sb()
        .a("<md-content id=\"" + name.camelCase + "\">")
        .a("</md-content>")
        .toString();

    var all_txt = sb().a("export * from './" + name.dashCase + "';").toString();

    var allroot_txt = sb().a("export * from './" + name.dashCase + "/all';").toString();

    try {
        mkdir(componentPath, function(e) {
            if (e) {
                throw e;
            }
            fs.writeFile(componentPath + '/' + name.dashCase + '.html', html_txt);
            fs.writeFile(componentPath + '/' + name.dashCase + '.scss', scss_txt);
            fs.writeFile(componentPath + '/' + name.dashCase + '.ts', ts_txt);
            fs.writeFile(componentPath + '/all.ts', all_txt);
            fs.appendFile(parentPath + '/all.ts', allroot_txt);
            console.log("The component was created at: " + componentPath);
        });
    }
    catch (e) {
        console.error('ERROR: component could not be created! --> \n' + JSON.stringify(e, null, 2));
    }
});


// templates: common functions
function sb() {
    var template = '';

    var inner = {
        append: _ap,
        a: _ap,
        toString: function() { return template; }
    };

    function _ap(str) {
        template += (str || '') + '\r\n';
        return inner;
    }

    return inner;
}

function replaceAll(str, searchMask, replaceMask) {
    if (replaceMask === undefined) {
        replaceMask = '';
    }
    var regEx = new RegExp(searchMask, "ig");
    var result = str.replace(regEx, replaceMask);
    return result;
}
function detectCase(str) {

    var isUpperCase = function(char) {
        return !!/[A-Z]/.exec(char[0]);
    };

    var dashCase = false;
    var camelCase = false;
    var pascalCase = false;

    if (str.indexOf('-') != -1) {
        dashCase = true;
    }
    else if (isUpperCase(str.charAt(0))) {
        pascalCase = true;
    }
    else {
        var hasUpperCase = false;
        for (var i = 0; i < str.length; i++) {
            if (isUpperCase(str.charAt(i))) {
                hasUpperCase = true;
                break;
            }
        }
        if (hasUpperCase) {
            camelCase = true;
        }
        else {
            dashCase = true;
        }
    }

    return {
        dashCase: dashCase,
        camelCase: camelCase,
        pascalCase: pascalCase
    };
}

function getCaseVariants(str) {

    var c = detectCase(str);

    if (c.dashCase) {
        return {
            dashCase: str,
            camelCase: dashCaseToCamelCase(str),
            pascalCase: dashCaseToPascalCase(str)
        }
    }
    else if (c.camelCase) {
        return {
            dashCase: camelCaseToDashCase(str),
            camelCase: str,
            pascalCase: camelCaseToPascalCase(str)
        }
    }
    else if (c.pascalCase) {
        return {
            dashCase: pascalCaseToDashCase(str),
            camelCase: pascalCaseToCamelCase(str),
            pascalCase: str
        }
    }
    else {
        throw "ERROR: unknown case convention"
    }
}

function pascalCaseToCamelCase(name) {
    return name.charAt(0).toLowerCase() + name.slice(1);
}
function camelCaseToPascalCase(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}
function pascalCaseToDashCase(str) {
    return camelCaseToDashCase(pascalCaseToCamelCase(str));
}
function camelCaseToDashCase(str) {
    return str.replace(/\W+/g, '-')
        .replace(/([a-z\d])([A-Z])/g, '$1-$2')
        .toLowerCase();
}
function dashCaseToCamelCase(name) {
    return name.replace(/-(\w)/g, function(match) {
        return match[1].toUpperCase();
    });
}

function dashCaseToPascalCase(name) {
    name = dashCaseToCamelCase(name);
    return camelCaseToPascalCase(name);
}

function mkdir(dirPath, mode, callback) {

    if (typeof mode == 'function') { // allow the `mask` parameter to be optional
        callback = mode;
        mode = 484;
    }
    //Call the standard fs.mkdir
    fs.mkdir(dirPath, mode, function(error) {
        //When it fail in this way, do the custom steps
        if (error) {
            if (error.errno === 34 || error.code === 'ENOENT') {
                //Create all the parents recursively
                mkdir(path.dirname(dirPath), mode, callback);
                //And then the directory
                mkdir(dirPath, mode, callback);
                error = null;
            }
            else if (error.code == 'EEXIST') {
                error = null;
            } // ignore the error if the folder already exists
        }

        //Manually run the callback since we used our own callback to do all these
        callback && callback(error);
    });
};
