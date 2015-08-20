var path      = require('path');
var gulp      = require('gulp');
var fs        = require('fs');
var clean     = require('gulp-clean');

require('require-dir')('./tasks');

gulp.task('clean', function() {
  return gulp.src('dist', { read: false }).pipe(clean());
});
