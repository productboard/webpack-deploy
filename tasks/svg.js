var gulp      = require('gulp');
var rename    = require("gulp-rename");
var svgstore  = require("gulp-svgstore");
var svgmin    = require('gulp-svgmin');

gulp.task('svg', function () {
  return gulp
    .src(['svg/**/*.svg', '!svg/dist'])
    .pipe(svgmin())
    .pipe(svgstore())
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('src/assets/icons/'));
});

