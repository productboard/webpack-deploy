var gulp = require('gulp');
var util = require('util');
var gutil = require('gulp-util');

var argv = require('yargs').string('rev').argv;

var env = require('./utils').env;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;

function activateVersion(rev, config, majorRelease) {
  getRedisClient(config, function(client) {
    client.get(util.format(config.indexKey, rev), function (err, file) {
      if (!file) {
        gutil.log(gutil.colors.red("Revision " + rev + " not found"));
      } else if (err) {
        gutil.log(gutil.colors.red("Error:"), err);
      } else {
        gutil.log(gutil.colors.yellow(env()), 'Activating rev', gutil.colors.green(rev));
        client.set(config.mainIndexKey, file);
        client.set(config.mainRevKey, rev);

        // If the rev is marked as a major release, update the timestamp in Redis
        // under <lastMajorTimestampKey>
        if (majorRelease) {
          if (!config.revTimestampKey && !config.lastMajorTimestampKey) {
            gutil.log(gutil.colors.red(
              "Missing 'revTimestampKey' and 'lastMajorTimestampKey' keys " +
              "in config, unable to mark rev as major release."
            ));
          }

          client.get(util.format(config.revTimestampKey, rev), function(err, timestamp) {
            if (!timestamp) {
              gutil.log(gutil.colors.red("Revision timestamp not found"));
            } else if (err) {
              gutil.log(gutil.colors.red("Error:"), err);
            } else {
              client.set(config.lastMajorTimestampKey, timestamp);
            }
          });
        }
      }
      client.end();
    });
  });
}

/**
 * Promotes specified revision as current
 *
 * Use with '--m' or '--major' to set lastMajorTimestamp key
 */
gulp.task('activate-rev', [], function() {
  var majorRelease = argv.major || argv.m;

  if (argv.rev) {
    activateVersion(argv.rev, getConfigFor('redis'), majorRelease);
  } else {
    getRevision(function (rev) {
      activateVersion(rev, getConfigFor('redis'), majorRelease);
    });
  }
});
