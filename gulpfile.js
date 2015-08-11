'use strict';

var gulp = require('gulp');
var task = require('gulp-load-plugins')();
var version = require('package-version');
var fs = require('fs');
var del = require('del');

gulp.task('default', ['dev'], function() {
    gulp.watch(['./index.js'], ['dev']);
});

gulp.task('dev', ['lint', 'info', 'build:dev']);

gulp.task('release', ['lint', 'clean', 'info', 'info:min', 'build', 'build:min']);

gulp.task('clean', function (cb) {
    del('./dist', cb);
});

gulp.task('lint', function () {
    return gulp.src(['./index.js'])
        .pipe(task.eslint())
        // .pipe(task.eslint.failOnError()) // currently broken
        .pipe(task.eslint.format());
});

gulp.task('info', function (cb) {
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

gulp.task('build:dev', ['lint', 'info'], function () {
    var PKG_INFO = 'PKG_INFO';
    return gulp.src(['./index.js'])
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env[PKG_INFO], DEBUG: true}}))
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
            path.extname = '.dev.js';
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['lint', 'clean', 'info'], function () {
    var PKG_INFO = 'PKG_INFO';
    return gulp.src(['./index.js'])
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env[PKG_INFO], DEBUG: false}}))
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build:min', ['lint', 'clean', 'info:min'], function () {
    var PKG_INFO = 'PKG_INFO_MIN';
    return gulp.src(['./index.js'])
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env[PKG_INFO], DEBUG: false}}))
        .pipe(task.uglify({outSourceMap: false, preserveComments: 'some'}))
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
            path.extname = '.min.js';
        }))
        .pipe(gulp.dest('./dist'));
});
