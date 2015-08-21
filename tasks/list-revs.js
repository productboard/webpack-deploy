/*eslint no-console: 0 */
var gulp = require('gulp');
var util = require('util');
var path = require('path');
var gutil = require('gulp-util');
var redis = require('redis');
var gitlog = require('gitlog');
var async = require('async');

var env = require('./utils').env;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;

//
// Deployment process tasks
//

function printAllRevs(config) {
  getRedisClient(config, function(client) {
    client.get(config.mainRevKey, function(err, currentRev) {
      if (err) { gutil.log(gutil.colors.red("Error:"), err); }
      // gutil.log(gutil.colors.yellow(env()), 'Current revision', data);

      client.keys(util.format(config.indexKey, '???????'), function(err2, data) {
        if (err2) { gutil.log(gutil.colors.red("Error:"), err2); }
        gutil.log(gutil.colors.yellow(env()), 'List of deployed revisions:');

        var getRev = function(rev, callback) {
          var revHash = rev.substr(4);
          if (revHash === 'current') return callback();

          gitlog({
            repo: path.resolve(process.cwd(), '.git'),
            number: 1,
            fields: [ 'abbrevHash', 'subject', 'committerDate', 'committerDateRel', 'authorName', 'hash' ],
            branch: revHash,
          }, function(err3, commitData) {
            var str = revHash === currentRev ? revHash + ' (current)' : revHash;
            if (err3) {
              if (err3.indexOf('unknown revision') > 0) {
                return callback(null, [
                  0,
                  gutil.colors.yellow(str),
                  gutil.colors.red('Unknown revision'),
                ]);
              }
              gutil.log(gutil.colors.yellow(str));
              gutil.log(gutil.colors.red("Error:"), err3);
              return callback(err3);
            }

            if (!commitData.length) {
              return callback();
            }

            commitData = commitData[0];

            client.get(util.format(config.metaKey, revHash), function(err4, metadata) {
              if (err4) {
                gutil.log(gutil.colors.red("Error:"), err4);
                return callback(err4);
              }

              callback(null, [
                new Date(commitData.committerDate),
                gutil.colors.yellow(str),
                commitData.subject,
                gutil.colors.white(commitData.committerDateRel),
                gutil.colors.white.blue('<' + commitData.authorName + '>'),
                metadata && gutil.colors.white.blue(metadata) || '',
              ]);
            });
          });
        };

        var arr = [];

        data.map(function(rev) {
          arr.push(function(cb){
            getRev(rev, cb);
          });
        });

        console.log('Total count:', arr.length);

        async.parallel(arr, function(err, results) {
          if (err) {
            gutil.log('Error:', err);
          }
          else {
            results.filter(function(el) {
              return el && el.length > 0;
            }).sort(function(a, b) {
              return a[0] - b[0];
            }).map(function(el) {
              console.log.apply(console, el.splice(1));
            });
          }

          client.end();
        });

      });
    });
  });
}

/**
 * Prints list of deployed revision numbers
 */
gulp.task('list-revs', [], function() {
  printAllRevs(getConfigFor('redis'));
});

