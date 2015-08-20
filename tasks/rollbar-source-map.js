var request = require('request');
var gulp = require('gulp');
var gutil = require('gulp-util');

var env = require('./utils').env;
var hash = require('./utils').hash;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;


gulp.task('rollbar-source-map', function(callback) {
  var config = getConfigFor('rollbar');
  // curl https://api.rollbar.com/api/1/sourcemap/download \
  // -F access_token=aaaabbbbccccddddeeeeffff00001111 \
  // -F version=92429d82a41e930486c6de5ebda9602d55c39986 \
  // -F minified_url=http://example.com/static/js/example.min.js
  getRevision(function (rev) {
    request.post({url: 'https://api.rollbar.com/api/1/sourcemap/download', form: {
      'access_token': config.accessToken,
      'version': rev,
      'minified_url': config.publicPath + 'main-' + hash() + '.js',
    }}, callback)
    .on('response', function(data) {
        data.on('data', function(all) {
          var d;
          try {
            d = JSON.parse(all);
          } catch(e) {}

          if (data.statusCode === 200 && d && d.result && d.result.msg) {
            gutil.log(gutil.colors.yellow(env()), 'Source map download queued.', gutil.colors.green('rev ' + rev));
          } else {
            gutil.log(gutil.colors.red('Non OK code returned'), d && d.result && d.result.msg);
          }
        });
    });
  });
});
