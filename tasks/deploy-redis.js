var gulp = require('gulp');
var fs = require('fs');
var os = require('os');
var gutil = require('gulp-util');

var env = require('./utils').env;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;
var getRedisClient = require('./utils').getRedisClient;

//
// Deployment process tasks
//

function uploadFile(config, file, rev) {
  getRedisClient(config, function(client) {
    client.set('app:' + rev, file);
    client.set('meta:' + rev, 'from ' + os.hostname() + ' on ' + new Date);
    client.end();
  });
}

function deployRedis(config) {
  var file = fs.readFileSync('dist/index.html', 'utf8');

  getRevision(function (rev) {
    gutil.log(gutil.colors.yellow(env()), 'Uploading revision', gutil.colors.green(rev));
    uploadFile(config, file, rev);
  });
}

function printCurrentRev() {
  getRevision(function (rev) {
    gutil.log('Current revision', gutil.colors.green(rev));
  });
}

/**
 * Prints current revision number used as a redis key
 */
gulp.task('current-rev', [], printCurrentRev);


/**
 * Promotes specified revision as current
 */
gulp.task('deploy-redis', [], function() {
  deployRedis(getConfigFor('redis'));
});

