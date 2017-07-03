const gulp = require('gulp');
const util = require('util');
const gutil = require('gulp-util');

const {
  argv,
  env,
  getRevision,
  getConfigFor,
  getRedisClient,
} = require('./utils');

const { notifyRevActivated } = require('./slack-notify');

async function updateMainRev(client, config, rev, majorRelease) {
  const file = await client.get(util.format(config.indexKey, rev));
  if (!file) {
    gutil.log(
      gutil.colors.red('Revision', rev, 'for', config.indexKey, 'not found'),
    );
    return;
  }

  gutil.log(
    gutil.colors.yellow(env()),
    'Activating rev',
    gutil.colors.green(rev),
    'for',
    config.indexKey,
  );
  client.set(config.mainIndexKey, file);
  await client.set(config.mainRevKey, rev);

  // If the rev is marked as a major release, update the timestamp in Redis
  // under <lastMajorTimestampKey>
  if (majorRelease) {
    if (!config.revTimestampKey || !config.lastMajorTimestampKey) {
      gutil.log(
        gutil.colors.red(
          "Missing 'revTimestampKey' or 'lastMajorTimestampKey' keys " +
            'in config, unable to mark rev as major release.',
        ),
      );
      return;
    }

    const timestamp = await client.get(
      util.format(config.revTimestampKey, rev),
    );
    if (!timestamp) {
      gutil.log(gutil.colors.red('Revision timestamp not found'));
    } else {
      gutil.log(
        gutil.colors.yellow(env()),
        'Setting major timestamp for ',
        config.indexKey,
        gutil.colors.green(timestamp),
      );
      await client.set(config.lastMajorTimestampKey, timestamp);
    }
  }
}

async function activateVersion(rev, config, majorRelease) {
  const notifyEnabled = argv.notify;
  const redis = await getRedisClient(config);

  await Promise.all(
    (config.files || [config])
      .map(fileConfig =>
        updateMainRev(
          redis,
          Object.assign({}, config, fileConfig),
          rev,
          majorRelease,
        )),
  );

  redis.quit();

  if (notifyEnabled) {
    notifyRevActivated(getConfigFor('slack'), env(), majorRelease);
  }
}

/**
 * Promotes specified revision as current
 *
 * Use with '-m' or '--major' to set lastMajorTimestamp key
 */
gulp.task('activate-rev', async () => {
  const majorRelease = argv.major || argv.m;

  if (argv.rev) {
    await activateVersion(argv.rev, getConfigFor('redis'), majorRelease);
  } else {
    const rev = await getRevision();
    await activateVersion(rev, getConfigFor('redis'), majorRelease);
  }
});
