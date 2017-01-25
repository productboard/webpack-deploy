var gulp = require('gulp');
var os = require('os');
var gutil = require('gulp-util');
var request = require('superagent');
var argv = require('yargs').string('rev').argv;

var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;
var getFullName = require('./utils').getFullName;


function messagePayload(config, env, rev, fullname) {
  var hostname = os.hostname();
  var fallback = "New frontend revision " + rev + " was deployed on " + env + " by " + fullname + " from " + hostname + ".";
  var text = "New frontend revision deployed!";
  var link = config.url + "/?rev=" + rev;

  return {
    "channel": config.channel || "#hacking",
    "username": config.botName || "Deploy Bot",
    "icon_emoji": config.botIconEmoji || ":rocket:",
    "attachments": [{
      "fallback": fallback,
      "pretext": text,
      "color": config.messageColor || "#7CD197",
      "fields": [{
        "title": "Revision",
        "value": rev,
        "short": true
      }, {
        "title": "Environment",
        "value": env,
        "short": true
      }, {
        "title": "URL",
        "value": link,
        "short": true
      }, {
        "title": "Author",
        "value": fullname + " (" + hostname + ")",
        "short": true
      }]
    }]
  };
}

function activatedPayload(config, env, rev, fullname, majorRelease) {
  var hostname = os.hostname();
  var fallback = "Frontend revision " + rev + " was activated on " + env + " by " + fullname + " from " + hostname + ".";
  var text = "Frontend revision activated" + ( majorRelease ? " as major release" : "" ) + "!";
  var link = config.url;
  return {
    "channel": config.channel || "#hacking",
    "username": config.botName || "Deploy Bot",
    "icon_emoji": config.botIconEmoji || ":rocket:",
    "attachments": [{
      "fallback": fallback,
      "pretext": text,
      "color": config.messageColor || "#7CD197",
      "fields": [{
        "title": "Revision",
        "value": rev,
        "short": true
      }, {
        "title": "Environment",
        "value": env,
        "short": true
      }, {
        "title": "URL",
        "value": link,
        "short": true
      }, {
        "title": "Author",
        "value": fullname + " (" + hostname + ")",
        "short": true
      }]
    }]
  };
}

function notifyRevDeployed(config, env) {
  env = env || argv.env;
  if (env) {
    getRevision(function (rev) {
      getFullName(function (name) {
        var payload = messagePayload(config, env, rev, name);
        request.post(config.notifyWebHook).send(payload).end();
      });
    });
  } else {
    gutil.log(gutil.colors.red('No environment provided to Slack Notify'));
  }
}

module.exports.notifyRevActivated = function notifyRevActivated(config, env, majorRelease) {
  env = env || argv.env;
  if (env) {
    getRevision(function (rev) {
      getFullName(function (name) {
        var payload = activatedPayload(config, env, rev, name, majorRelease);
        if (config.notifyWebHook) {
          request.post(config.notifyWebHook).send(payload).end();
        }
      });
    });
  } else {
    gutil.log(gutil.colors.red('No environment provided to Slack Notify'));
  }
}

/**
 * Prints current revision number used as a redis key
 */
gulp.task('slack-notify', [], function() {
  notifyRevDeployed(getConfigFor('slack'));
});

gulp.task('slack-notify-active', [], function() {
  notifyRevActivated(getConfigFor('slack'));
});
