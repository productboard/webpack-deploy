const gulp = require('gulp');
const util = require('util');
const gutil = require('gulp-util');
const inquirer = require('inquirer');

const {
  argv,
  env,
  getRevision,
  getBranch,
  getConfigFor,
  getRedisClient,
} = require('./utils');

const { notifyRevActivated } = require('./slack-notify');

async function updateMainRev(client, config, { rev, branch, majorRelease }) {
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
    'for branch',
    gutil.colors.cyan(branch),
  );

  // Save to branch specific <branchKey> and <branchRevKey>
  client.set(util.format(config.branchKey, branch), file);
  await client.set(util.format(config.branchRevKey, branch), rev);

  const activeBranch = await client.get(config.mainBranchKey);

  if (activeBranch === branch) {
    gutil.log(
      gutil.colors.yellow(env()),
      'Activating rev',
      gutil.colors.green(rev),
      'for',
      gutil.colors.cyan(config.indexKey),
    );
    // Save to <mainIndexKey> and <mainRevKey> when updating activated branch
    client.set(config.mainIndexKey, file);
    await client.set(config.mainRevKey, rev);
    gutil.log(
      gutil.colors.yellow(env()),
      'Activated branch',
      gutil.colors.cyan(branch),
      'updated!',
    );
  }

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
        'Setting major timestamp',
        gutil.colors.cyan(timestamp),
        'for',
        config.indexKey,
      );
      const key = config.lastMajorTimestampKey.includes('%s')
        ? util.format(config.lastMajorTimestampKey, branch)
        : config.lastMajorTimestampKey;
      await client.set(key, timestamp);
    }
  }
}

async function activateVersion(config, { rev, branch, majorRelease }) {
  const notifyEnabled = argv.notify;
  const redis = await getRedisClient(config);
  const redisFiles = config.files || [config];

  await Promise.all(
    redisFiles.map(fileConfig =>
      updateMainRev(redis, Object.assign({}, config, fileConfig), {
        rev,
        branch,
        majorRelease,
      }),
    ),
  );

  await redis.quit();

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
  const majorRelease = argv.major;
  const rev = await getRevision();
  const branch = await getBranch();

  if (!argv.branch && !argv.confirm) {
    const answer = await inquirer.prompt({
      name: 'branch',
      type: 'confirm',
      message: `Auto-detected branch "${branch}". OK?`,
    });

    if (!answer.branch) {
      gutil.log('Canceling.');
      return;
    }
  } else if (!argv.branch) {
    gutil.log(
      gutil.colors.yellow(env()),
      'Auto-detected branch',
      gutil.colors.cyan(branch),
    );
  }

  await activateVersion(getConfigFor('redis'), { rev, branch, majorRelease });
});
