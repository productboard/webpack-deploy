var path = require('path');
var gulp = require('gulp');
var rename = require('gulp-rename');
var aws = require('gulp-awspublish');
var gutil = require('gulp-util');

var getConfigFor = require('./utils.js').getConfigFor;


/*
 * Deploy compiled, minified and fingerprinted assets to Amazon
 * S3.
 *
 * - main.js
 * - sprite.svg
 */


var deployS3 = function(config) {

  if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
    gutil.log(gutil.colors.red("AWS S3 credentials missing, skipping upload..."));
    return;
  }

  // create a new publisher
  var publisher = aws.create(config.credentials);

  // define custom headers
  var headers = { 'Cache-Control': 'max-age=315360000, no-transform, public' };

  return gulp.src(config.assetsPath)
    .pipe(rename(function (filepath) {
      filepath.dirname = path.join(config.dirname, filepath.dirname);
    }))
     // gzip, Set Content-Encoding headers and add .gz extension
    .pipe(aws.gzip())
    // publisher will add Content-Length, Content-Type and headers specified above
    // If not specified it will set x-amz-acl to public-read by default
    .pipe(publisher.publish(headers))
    // create a cache file to speed up consecutive uploads
    .pipe(publisher.cache())
     // print upload updates to console
    .pipe(aws.reporter());
};


/**
 * Deploy tasks
 */
gulp.task('deploy-s3', [], function() {
  return deployS3(getConfigFor('s3'));
});
