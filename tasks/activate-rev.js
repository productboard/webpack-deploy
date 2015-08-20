var gulp = require('gulp');
var gutil = require('gulp-util');

var argv = require('yargs').argv;

var env = require('./utils').env;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;


function activateVersion(rev, config) {
  getRedisClient(config, function(client) {
    client.get('app:' + rev, function (err, file) {
      if (!file) {
        gutil.log(gutil.colors.red("Revision " + rev + " not found"));
      } else if (err) {
        gutil.log(gutil.colors.red("Error:"), err);
      } else {
        gutil.log(gutil.colors.yellow(env()), 'Activating rev', gutil.colors.green(rev));
        client.set('app:current', file);
        client.set('app:current-revision', rev);
      }
      client.end();
    });
  });
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
