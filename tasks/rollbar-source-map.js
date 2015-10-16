var request = require('request');
var fs = require('fs');
var util = require('util');
var gulp = require('gulp');
var gutil = require('gulp-util');

var env = require('./utils').env;
var hash = require('./utils').hash;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;


gulp.task('rollbar-source-map', function(callback) {
  var config = getConfigFor('rollbar');
  var buildHash = hash();
  var url = util.format(config.minifiedUrl, buildHash);
  var sourceMap = fs.createReadStream(util.format(config.sourceMapPath, buildHash));

  if (buildHash) {
    // curl https://api.rollbar.com/api/1/sourcemap \
    // -F access_token=aaaabbbbccccddddeeeeffff00001111 \
    // -F version=version_string_here \
    // -F minified_url=http://example.com/static/js/example.min.js \
    // -F source_map=@static/js/example.min.map
    getRevision(function (rev) {
      request.post({
        url: 'https://api.rollbar.com/api/1/sourcemap',
        formData: {
          'access_token': config.accessToken,
          'version': rev,
          'minified_url': url,
          'source_map': sourceMap,
        }
      }, callback)
      .on('response', function(data) {
          data.on('data', function(all) {
            var d;
            try {
              d = JSON.parse(all);
            } catch(e) {}
            if (data.statusCode === 200 && d && !d.err && d.result) {
              gutil.log(gutil.colors.yellow(env()), 'Source map uploaded.');
              gutil.log('URL:', url);
              gutil.log(gutil.colors.green('rev:', rev));
            } else {
              gutil.log(gutil.colors.red('Non OK code returned'), d && d.result && d.result.msg);
            }
          });
      });
    });
  } else {
    gutil.log(gutil.colors.red('No build hash provided to Rollbar Source Map'));
  }
});
