const gulp = require('gulp');
const util = require('util');
const gutil = require('gulp-util');
const inquirer = require('inquirer');

const {
  argv,
  env,
  getBranch,
  getConfigFor,
  getRedisClient,
} = require('./utils');

async function updateMainBranch(client, config, { branch }) {
  const file = await client.get(util.format(config.branchKey, branch));
  const rev = await client.get(util.format(config.branchRevKey, branch));
  if (!file || !rev) {
    gutil.log(
      gutil.colors.red('Branch', branch, 'for', config.branchKey, 'not found'),
    );
    return;
  }

  gutil.log(
    gutil.colors.yellow(env()),
    'Activating branch',
    gutil.colors.cyan(branch),
    'for',
    gutil.colors.cyan(config.branchKey),
  );

  // Save activated branch name
  client.set(config.mainBranchKey, branch);

  gutil.log(
    gutil.colors.yellow(env()),
    'Setting current branch revision',
    gutil.colors.cyan(rev),
    'as the current revision for',
    gutil.colors.cyan(config.branchKey),
  );

  // Update current index and rev
  client.set(config.mainIndexKey, file);
  await client.set(config.mainRevKey, rev);
}

async function activateBranch(config, { branch }) {
  const redis = await getRedisClient(config);
  const redisFiles = config.files || [config];

  await Promise.all(
    redisFiles.map(fileConfig =>
      updateMainBranch(redis, Object.assign({}, config, fileConfig), {
        branch,
      }),
    ),
  );

  await redis.quit();
}

/**
 * Promotes specified branch as current
 */
gulp.task('activate-branch', async () => {
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
  await activateBranch(getConfigFor('redis'), { branch });
});
