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
        .pipe(task.eslint({
            env: {
                "browser": true,
                "node": true,
                "amd": true
            },
            rules: {
                "key-spacing": 0,
                "no-debugger": 1,
                "no-extra-semi": 0,
                "no-multi-spaces": 0,
                "no-return-assign": 0,      // UMD does this, so =P
                "no-underscore-dangle": 0,
                "quotes": [1, "single", "avoid-escape"],
            }
        }))
        // .pipe(task.eslint.failOnError()) // currently broken
        .pipe(task.eslint.format());
});

gulp.task('info', function (cb) {
    version('.', function (err, version) {
        var packageInfo = '/*! fiji v' + version;
            packageInfo += '\n\n';
            packageInfo += fs.readFileSync('./LICENSE');
            packageInfo += '*/\n';
        process.env['PKG_INFO'] = packageInfo;
        cb(err);
    })
});

gulp.task('info:min', function (cb) {
    version('.', function (err, version) {
        var packageInfo = '/*! fiji v' + version;
            packageInfo += ' | smt.mit-license.org */';
        process.env['PKG_INFO_MIN'] = packageInfo;
        cb(err);
    })
});

gulp.task('build:dev', ['lint', 'info'], function () {
    return gulp.src(['./index.js'])
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env['PKG_INFO'], DEBUG: true}}))
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
            path.extname = '.dev.js';
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['lint', 'clean', 'info'], function () {
    return gulp.src(['./index.js'])
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env['PKG_INFO'], DEBUG: false}}))
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build:min', ['lint', 'clean', 'info:min'], function () {
    return gulp.src(['./index.js'])
        .pipe(task.preprocess({includeBase: '.', context: {PKG_INFO: process.env['PKG_INFO_MIN'], DEBUG: false}}))
        .pipe(task.uglify({outSourceMap: false, preserveComments: 'some'}))
        .pipe(task.rename(function(path) {
            path.basename = 'fiji';
            path.extname = '.min.js';
        }))
        .pipe(gulp.dest('./dist'));
});
