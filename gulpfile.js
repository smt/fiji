var gulp = require('gulp');
var task = require('gulp-load-plugins')();

gulp.task('default', ['min'], function(){
    gulp.watch(['fiji.js'], ['min']);
});

gulp.task('min', function(){
    gulp.src(['fiji.js'])
    .pipe(task.uglify({outSourceMap: false}))
    .pipe(task.rename(function(path){
        path.extname = '.min.js';
    }))
    .pipe(gulp.dest('.'));
});
