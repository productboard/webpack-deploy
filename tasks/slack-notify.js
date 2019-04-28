const gulp = require('gulp');
const os = require('os');
const gutil = require('gulp-util');
const request = require('request-promise-native');

const { argv, getRevision, getConfigFor, getFullName } = require('./utils');

function messagePayload(config, env, rev, fullname) {
  if (!config.url) {
    gutil.log(gutil.colors.red('No slack.url option set in config'));
    return;
  }
  const hostname = os.hostname();
  const fallback = `New frontend revision ${rev} was deployed on ${env}` +
    ` by ${fullname} from ${hostname}.`;
  const text = 'New frontend revision deployed!';
  const link = config.url + '/?rev=' + rev;
  const diffLink = 'https://github.com/productboard/pb-frontend/compare/' + rev.replace('branch/', '');
  const ciLink = 'https://circleci.com/workflow-run/' + process.env.CIRCLE_WORKFLOW_ID;
  const actions = `| <${link}|:point_right: open> | <${diffLink}|:mag_right: diff> | <${ciLink}|:circlepass: ci>`
  const encodedData = encodeURIComponent(JSON.stringify({
    CIRCLE_SHA1: process.env.CIRCLE_SHA1,
    CIRCLE_WORKFLOW_ID: process.env.CIRCLE_WORKFLOW_ID,
    CIRCLE_BUILD_NUM: process.env.CIRCLE_BUILD_NUM,
    CIRCLE_PULL_REQUEST: process.env.CIRCLE_PULL_REQUEST,
    CIRCLE_USERNAME: process.env.CIRCLE_USERNAME,
    CIRCLE_PROJECT_USERNAME: process.env.CIRCLE_PROJECT_USERNAME,
    CIRCLE_PROJECT_REPONAME: process.env.CIRCLE_PROJECT_REPONAME,
    revision: rev,
    activated: false,
  }));

  return {
    channel: config.channel || '#hacking',
    username: config.botName || 'Deploy Bot',
    icon_emoji: config.botIconEmoji || ':rocket:',
    // attachments: [
    //   {
    //     fallback,
    //     pretext: text,
    //     color: config.messageColor || '#7CD197',
    //     fields: [
    //       {
    //         title: 'Revision',
    //         value: rev,
    //         short: true,
    //       },
    //       {
    //         title: 'Environment',
    //         value: env,
    //         short: true,
    //       },
    //       {
    //         title: 'URL',
    //         value: link,
    //         short: true,
    //       },
    //       {
    //         title: 'Author',
    //         value: fullname + ' (' + hostname + ')',
    //         short: true,
    //       },
    //     ],
    //   },
    // ],
    blocks: [
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": `<aa://${encodedData}.data| >New frontend revision deployed! :sparkles:\n\t*${rev}*\t${actions}`
    },
    "accessory": {
      "type": "overflow",
      "action_id": "deploy_action_list",
      "confirm": {
        "title": {
            "type": "plain_text",
            "text": "Are you sure?"
        },
        "text": {
            "type": "mrkdwn",
            "text": "Do you really want to do this?"
        },
        "confirm": {
            "type": "plain_text",
            "text": "Do it"
        },
        "deny": {
            "type": "plain_text",
            "text": "Cancel"
        }
      },
      "options": [
        // {
        //   "text": {
        //     "type": "plain_text",
        //     "text": ":mag_right:  Open app at this revision",
        //     "emoji": true
        //   },
        //   "value": "open",
        //   "url": link
        // },
        // {
        //   "text": {
        //     "type": "plain_text",
        //     "text": ":bar_chart:  View deployment log",
        //     "emoji": true
        //   },
        //   "value": "log"
        // },
        // {
        //   "text": {
        //     "type": "plain_text",
        //     "text": ":arrows_counterclockwise:  View diff",
        //     "emoji": true
        //   },
        //   "value": "diff",
        //   "url": diffLink
        // },
        {
          "text": {
            "type": "plain_text",
            "text": ":rocket:  Activate",
            "emoji": true
          },
          "value": "activate"
        },
        {
          "text": {
            "type": "plain_text",
            "text": ":table_tennis_paddle_and_ball:  Rollback to this revision",
            "emoji": true
          },
          "value": "rollback"
        }
      ]
    }
  }
]
  };
}

function activatedPayload(config, env, rev, fullname, majorRelease) {
  if (!config.url) {
    gutil.log(gutil.colors.red('No slack.url option set in config'));
    return;
  }
  const hostname = os.hostname();
  const fallback = `Frontend revision ${rev} was activated on ${env}` +
    ` by ${fullname} from ${hostname}.`;
  const text = 'Frontend revision activated' +
    (majorRelease ? ' as major release' : '') +
    '!';
  const link = config.url;

  return {
    channel: config.channel || '#hacking',
    username: config.botName || 'Deploy Bot',
    icon_emoji: config.botIconEmoji || ':rocket:',
    attachments: [
      {
        fallback,
        pretext: text,
        color: config.messageColor || '#7CD197',
        fields: [
          {
            title: 'Revision',
            value: rev,
            short: true,
          },
          {
            title: 'Environment',
            value: env,
            short: true,
          },
          {
            title: 'URL',
            value: link,
            short: true,
          },
          {
            title: 'Author',
            value: fullname + ' (' + hostname + ')',
            short: true,
          },
        ],
      },
    ],
  };
}

async function notifyRevDeployed(config, env) {
  env = env || argv.env;
  if (env) {
    if (!config.notifyWebHook) {
      gutil.log(
        gutil.colors.red('No slack.notifyWebHook option set in config.'),
      );
      return;
    }
    const name = await getFullName();
    const rev = await getRevision();
    const payload = messagePayload(config, env, rev, name);
    if (payload)
      await request.post({ url: config.notifyWebHook, json: payload });
  } else {
    gutil.log(
      gutil.colors.red(
        'No environment provided to Slack Notify. Pass with --env',
      ),
    );
  }
}

async function notifyRevActivated(config, env, majorRelease) {
  env = env || argv.env;
  if (env) {
    if (!config.notifyWebHook) {
      gutil.log(
        gutil.colors.red('No slack.notifyWebHook option set in config'),
      );
      return;
    }
    const name = await getFullName();
    const rev = await getRevision();
    const payload = activatedPayload(config, env, rev, name, majorRelease);
    if (payload)
      await request.post({ url: config.notifyWebHook, json: payload });
  } else {
    gutil.log(gutil.colors.red('No environment provided to Slack Notify'));
  }
}

module.exports.notifyRevActivated = notifyRevActivated;

/**
 * Prints current revision number used as a redis key
 */
gulp.task('slack-notify', async () => notifyRevDeployed(getConfigFor('slack')));

gulp.task('slack-notify-active', async () =>
  notifyRevActivated(getConfigFor('slack')));
