var gulp = require('gulp');
var webpack = require('gulp-webpack');
var revision = require('git-rev');

var configFactory = require("./webpack-production.config.js");

gulp.task('webpack', function(callback) {
  revision.short(function (rev) {
    var config = configFactory({
      revision: rev,
      publicPath: "//XXX.cloudfront.net/assets/",
    });

    gulp.src('src/js/app.js')
      .pipe(webpack(config, null, function(err, stats) {
        if (!err) {
          console.log('Build', stats.hash, 'done.');
        }
      }))
      .pipe(gulp.dest('dist/assets/'))
      .on('end', callback);
  });
});

