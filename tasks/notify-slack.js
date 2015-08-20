var gulp = require('gulp');
var request = require('superagent');
var argv = require('yargs').argv;

var getRevision = require('./utils').getRevision;

var webhookUrl = 'https://hooks.slack.com/services/XXXX/XXXX/XXXXXYYYYYYZZZZZZ';


function messagePayload(env, rev) {
  var title = "New frontend revision " + rev + " was deployed on " + env + "." ;
  var tld = (env === 'production' ? 'com' : 'info');
  var link = "https://pb.productboard." + tld + "/?rev=" + rev
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

function notifyRevDeployed() {
  if (argv.env) {
    getRevision(function (rev) {
      var payload = messagePayload(argv.env, rev);
      return request.post(webhookUrl).send(payload).end();
    });
  }
}

/**
 * Prints current revision number used as a redis key
 */
gulp.task('slack-notify', [], notifyRevDeployed);


