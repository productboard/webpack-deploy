const gulp = require('gulp');
const util = require('util');
const gutil = require('gulp-util');

const { env, getConfigFor, getRedisClient } = require('./utils');

async function deployBuildInfo(redisConfig, gitConfig) {
  const client = await getRedisClient(redisConfig);
  const currentBranch = await client.get(redisConfig.mainBranchKey);
  const currentRev = await client.get(redisConfig.mainRevKey);
  const lastBranchRevision = await client.get(
    util.format(redisConfig.branchRevKey, currentBranch),
  );

  gutil.log(gutil.colors.yellow(env()), 'Info for', redisConfig.indexKey);

  gutil.log(
    gutil.colors.yellow(env()),
    '\tActive branch:',
    currentBranch ? gutil.colors.cyan(currentBranch) : gutil.colors.red('Not set'),
  );
  gutil.log(
    gutil.colors.yellow(env()),
    '\tActive revision:',
    gutil.colors.cyan(currentRev),
  );

  // Safety check to make sure that branch deploy was properly activated as main
  if (lastBranchRevision === currentRev) {
    gutil.log(
      gutil.colors.yellow(env()),
      '\t✅  Tip of the active branch is the main revision',
    );
  }
  // TODO: github diff link
  // gutil.log(gutil.colors.yellow(env()), 'GitHub diff link: https://');

  if (gitConfig.url) {
    const link = gitConfig.url + '/?rev=' + currentRev;
    gutil.log(gutil.colors.yellow(env()), '\tApp direct link:', link);
  }

  await client.quit();
}

async function deployInfo(redisConfig, gitConfig) {
  await Promise.all(
    (redisConfig.files || [redisConfig])
      .map(async fileConfig =>
        deployBuildInfo(Object.assign({}, redisConfig, fileConfig), gitConfig),
      ),
  );
}

/**
 * Deploy tasks
 */
gulp.task('deploy-info', async () =>
  deployInfo(getConfigFor('redis'), getConfigFor('git')),
);
