var gulp = require('gulp');
var os = require('os');
var gutil = require('gulp-util');
var request = require('superagent');
var argv = require('yargs').string('rev').argv;

var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;


function messagePayload(config, env, rev) {
  var title = "New frontend revision " + rev + " was deployed on " + env + " from " + os.hostname() + "." ;
  var link = config.url + "/?rev=" + rev;
  var text = "You can test it by going to <" + link + ">.";

  return {
    "channel": "#hacking",
    "username": "Deploy Bot",
    "icon_emoji": ":rocket:",
    "attachments": [
        {
            "title": title,
            "title_link": link,
            "text": text,
            "color": "#7CD197"
        }
    ]
  };
}

function notifyRevDeployed(config) {
  if (argv.env) {
    getRevision(function (rev) {
      var payload = messagePayload(config, argv.env, rev);
      return request.post(config.notifyWebHook).send(payload).end();
    });
  } else {
    gutil.log(gutil.colors.red('No environment provided to Slack Notify'));
  }
}

/**
 * Prints current revision number used as a redis key
 */
gulp.task('slack-notify', [], function() {
  return notifyRevDeployed(getConfigFor('slack'));
});
