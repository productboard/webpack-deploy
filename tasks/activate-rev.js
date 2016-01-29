var gulp = require('gulp');
var util = require('util');
var gutil = require('gulp-util');

var argv = require('yargs').string('rev').argv;

var env = require('./utils').env;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;


function updateMainRev(config, rev) {
  getRedisClient(config, function(client) {
    client.get(util.format(config.indexKey, rev), function (err, file) {
      if (!file) {
        gutil.log(gutil.colors.red("Revision", rev, "for", config.indexKey, "not found"));
      } else if (err) {
        gutil.log(gutil.colors.red("Error:"), err);
      } else {
        gutil.log(gutil.colors.yellow(env()), 'Activating rev', gutil.colors.green(rev), 'for', config.indexKey);
        client.set(config.mainIndexKey, file);
        client.set(config.mainRevKey, rev);
      }
      client.end();
    });
  });
}

function activateVersion(rev, config) {
  if (config.files) {
    for (var i = 0, l = config.files.length; i < l; ++i) {
      updateMainRev(Object.assign({}, config, config.files[i]), rev);
    }
  } else {
    updateMainRev(config, rev);
  }
}

/**
 * Promotes specified revision as current
 */
gulp.task('activate-rev', [], function() {
  if (argv.rev) {
    activateVersion(argv.rev, getConfigFor('redis'));
  } else {
    getRevision(function (rev) {
      activateVersion(rev, getConfigFor('redis'));
    });
  }
});
