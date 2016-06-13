var gulp = require('gulp');
var os = require('os');
var gutil = require('gulp-util');
var revision = require('git-rev');

var env = require('./utils').env;
var getConfigFor = require('./utils').getConfigFor;
var createTag = require('./utils').createTag;
var pushTag = require('./utils').pushTag;
var getFullName = require('./utils').getFullName;

function createGitTag(config, rev, callback) {
  var tag = env() + '-' + rev;
  gutil.log(gutil.colors.yellow(env()), 'Creating deploy tag', gutil.colors.magenta(tag));
  var link = config.url + '/?rev=' + rev;
  getFullName(function (name) {
    createTag(tag, 'Deploy ' + rev + '\nBy ' + name + ' (' + os.hostname() + ')\n'+ link, function(err, res) {
      if (err) {
        gutil.log(gutil.colors.red("Error:"), err);
        return callback();
      }
      gutil.log(gutil.colors.yellow(env()), 'Pushing deploy tag', gutil.colors.magenta(tag));
      pushTag(tag, config.remote, function(err, res) {
        if (err) {
          gutil.log(gutil.colors.red("Error:"), err);
        }
        callback();
      });
    });
  });
}

/**
 * Promotes specified revision as current
 */
gulp.task('git-deploy-tag', [], function(callback) {
  // Always take the commit hash; ignore --rev argument
  revision.short(function (rev) {
    createGitTag(getConfigFor('git'), rev, callback);
  });
});

