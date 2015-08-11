'use strict';

var gulp = require('gulp');
var task = require('gulp-load-plugins')();
var version = require('package-version');
var fs = require('fs');
var path = require('path');
var del = require('del');

var tsOptions = {
    declarationFiles: false,
    noExternalResolve: true,
    noImplicitAny: false,
    removeComments: false,
    sortOutput: true,
    target: 'ES5'
};

var umdOptions = {
    exports: 'Fiji',
    namespace: 'Fiji',
    template: fs.readFileSync(path.resolve(__dirname, 'templates/umd.jst'))
};

gulp.task('default', ['dev'], function() {
    gulp.watch(['./lib/**/*.ts'], ['dev']);
});

gulp.task('dev', ['typescript:dev', 'info:dev', 'build:dev']);

gulp.task('release', ['typescript', 'clean', 'info', 'info:min', 'build', 'build:min']);

gulp.task('clean', function (cb) {
    del('./dist', cb);
});

gulp.task('typescript:dev', function () {
    var tsResult = gulp.src('./lib/**/*.ts')
        .pipe(task.sourcemaps.init())
        .pipe(task.typescript(tsOptions));

    return tsResult.js
        .pipe(task.sourcemaps.write())
        .pipe(task.rename(function(path) {
            path.extname = '.dev.js';
        }))
        .pipe(task.eslint())
        .pipe(task.eslint.format())
        .pipe(task.eslint.failAfterError())
        .pipe(gulp.dest('./lib'));
});

gulp.task('typescript', function () {
    var tsResult = gulp.src('./lib/**/*.ts')
        .pipe(task.typescript(tsOptions));

    return tsResult.js
        .pipe(task.eslint())
        .pipe(task.eslint.failAfterError())
        .pipe(gulp.dest('./lib'));
});

gulp.task('info:dev', ['typescript:dev'], function (cb) {
    var PKG_INFO = 'PKG_INFO';
    version('.', function (err, version) {
        var packageInfo = '/*! fiji v' + version;
            packageInfo += '\n\n';
            packageInfo += fs.readFileSync('./LICENSE');
            packageInfo += '*/\n';
        process.env[PKG_INFO] = packageInfo;
        cb(err);
    });
});

gulp.task('info', ['typescript'], function (cb) {
    var PKG_INFO = 'PKG_INFO';
    version('.', function (err, version) {
        var packageInfo = '/*! fiji v' + version;
            packageInfo += '\n\n';
            packageInfo += fs.readFileSync('./LICENSE');
            packageInfo += '*/\n';
        process.env[PKG_INFO] = packageInfo;
        cb(err);
    });
});

gulp.task('info:min', function (cb) {
    var PKG_INFO = 'PKG_INFO_MIN';
    version('.', function (err, version) {
        var packageInfo = '/*! fiji v' + version;
            packageInfo += ' | smt.mit-license.org */';
        process.env[PKG_INFO] = packageInfo;
        cb(err);
    });
});

gulp.task('build:dev', ['typescript:dev', 'info:dev'], function () {
    var PKG_INFO = 'PKG_INFO';
    return gulp.src(['./lib/**/*.dev.js'])
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
            path.extname = '.dev.js';
        }))
        .pipe(task.wrapUmd(umdOptions))
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env[PKG_INFO], DEBUG: true}}))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['typescript', 'clean', 'info'], function () {
    var PKG_INFO = 'PKG_INFO';
    return gulp.src(['./lib/**/*!(.dev).js'])
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
        }))
        .pipe(task.wrapUmd(umdOptions))
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env[PKG_INFO], DEBUG: false}}))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build:min', ['typescript', 'clean', 'info:min'], function () {
    var PKG_INFO = 'PKG_INFO_MIN';
    return gulp.src(['./lib/**/*!(.dev).js'])
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
            path.extname = '.min.js';
        }))
        .pipe(task.wrapUmd(umdOptions))
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env[PKG_INFO], DEBUG: false}}))
        .pipe(task.uglify({outSourceMap: false, preserveComments: 'some'}))
        .pipe(gulp.dest('./dist'));
});
