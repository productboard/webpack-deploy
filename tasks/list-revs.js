/*eslint no-console: 0 */
var gulp = require('gulp');
var util = require('util');
var path = require('path');
var gutil = require('gulp-util');
var redis = require('redis');
var gitlog = require('gitlog');
var async = require('async');

var argv = require('yargs').string('rev').argv;

var env = require('./utils').env;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;

var DEFAULT_MAX_COUNT = 10;

//
// Deployment process tasks
//

function printVersionRevs(config) {
  getRedisClient(config, function(client) {
    client.get(config.mainRevKey, function(err, currentRev) {
      if (err) { gutil.log(gutil.colors.red("Error:"), err); }
      // gutil.log(gutil.colors.yellow(env()), 'Current revision', data);

      client.keys(util.format(config.indexKey, '???????'), function(err2, data) {
        if (err2) { gutil.log(gutil.colors.red("Error:"), err2); }
        gutil.log(gutil.colors.yellow(env()), 'List of deployed revisions for ' + config.indexKey + ':');

        var getRev = function(rev, callback) {
          var revHash = rev.substr(config.indexKey.indexOf('%s'));
          if (revHash === 'current') return callback();

          gitlog({
            repo: path.resolve(process.cwd(), '.git'),
            number: 1,
            fields: [ 'abbrevHash', 'subject', 'committerDate', 'committerDateRel', 'authorName', 'hash' ],
            branch: revHash,
          }, function(err3, commitData) {
            var str = revHash === currentRev ? rev + ' (current)' : rev;
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

        console.log('\tTotal count:', arr.length);
        if (!argv.all) {
          console.log('\tShowing last', DEFAULT_MAX_COUNT);
          console.log('\tRun with --all to show all');
        }

        async.parallel(arr, function(err, results) {
          if (err) {
            gutil.log('Error:', err);
          } else {
            results = results.filter(function(el) {
              return el && el.length > 0;
            }).sort(function(a, b) {
              return a[0] - b[0];
            });
            if (!argv.all) {
              results = results.slice(Math.max(arr.length - DEFAULT_MAX_COUNT, 1));
            }
            results.map(function(el) {
              console.log.apply(console, el.splice(1));
            });
          }

          client.quit();
        });

      });
    });
  });
}

function printRevs(config) {
  if (config.files) {
    for (var i = 0, l = config.files.length; i < l; ++i) {
      printVersionRevs(Object.assign({}, config, config.files[i]));
    }
  } else {
    printVersionRevs(config);
  }
}

/**
 * Prints list of deployed revision numbers
 */
gulp.task('list-revs', [], function() {
  printRevs(getConfigFor('redis'));
});

