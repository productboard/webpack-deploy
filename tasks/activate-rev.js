var gulp = require('gulp');
var util = require('util');
var gutil = require('gulp-util');

var argv = require('yargs').string('rev').argv;

var env = require('./utils').env;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;

var notifyRevActivated = require('./slack-notify').notifyRevActivated;

function updateMainRev(config, rev, majorRelease, cb) {
  getRedisClient(config, function(client) {
    client.get(util.format(config.indexKey, rev), function (err, file) {
      if (!file) {
        gutil.log(gutil.colors.red("Revision", rev, "for", config.indexKey, "not found"));
        if (typeof cb === 'function') cb();
      } else if (err) {
        gutil.log(gutil.colors.red("Error:"), err);
        if (typeof cb === 'function') cb();
      } else {
        gutil.log(gutil.colors.yellow(env()), 'Activating rev', gutil.colors.green(rev), 'for', config.indexKey);
        client.set(config.mainIndexKey, file);
        client.set(config.mainRevKey, rev);

        // If the rev is marked as a major release, update the timestamp in Redis
        // under <lastMajorTimestampKey>
        if (majorRelease) {
          if (!config.revTimestampKey || !config.lastMajorTimestampKey) {
            gutil.log(gutil.colors.red(
              "Missing 'revTimestampKey' or 'lastMajorTimestampKey' keys " +
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
            if (typeof cb === 'function') cb();
          });
        } else if (typeof cb === 'function') {
          cb();
        }
      }
      client.quit();
    });
  });
}

function activateVersion(rev, config, majorRelease) {
  var notifyEnabled = argv.notify;
  var slackNotify = function() {
    var targetEnv = env();
    notifyRevActivated(getConfigFor('slack'), targetEnv, majorRelease);
  };

  if (config.files) {
    // Async queue
    var totalTasks = config.files.length;
    var done = 0;
    var doneTask = function() {
      if (++done >= totalTasks) slackNotify();
    };
    for (var i = 0, l = totalTasks; i < l; ++i) {
      updateMainRev(Object.assign({}, config, config.files[i]), rev, majorRelease, notifyEnabled && doneTask);
    }
  } else {
    updateMainRev(config, rev, majorRelease, notifyEnabled && slackNotify);
  }
}

/**
 * Promotes specified revision as current
 *
 * Use with '--m' or '--major' to set lastMajorTimestamp key
 */
gulp.task('activate-rev', function() {
  var majorRelease = argv.major || argv.m;

  if (argv.rev) {
    activateVersion(argv.rev, getConfigFor('redis'), majorRelease);
  } else {
    getRevision(function (rev) {
      activateVersion(rev, getConfigFor('redis'), majorRelease);
    });
  }
});
