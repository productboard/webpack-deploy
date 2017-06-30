const gulp = require('gulp');
const fs = require('fs');
const os = require('os');
const util = require('util');
const gutil = require('gulp-util');

const {
  env,
  getRevision,
  getBranch,
  getConfigFor,
  getRedisClient,
} = require('./utils');

//
// Deployment process tasks
//

async function uploadFile(config, file, rev, branch) {
  const client = await getRedisClient(config);

  const timestamp = new Date();

  // Store index file under indexKey, e.g. 'app:<rev-number>'
  await client.set(util.format(config.indexKey, rev), file);

  if (branch) {
    await client.set(util.format(config.branchKey, branch), file);
    await client.set(util.format(config.branchRevKey, branch), rev);
  }

  // Store timestamp information under 'app-timestamp:<rev-number>'
  // so we can compare if we have newer version than latest major rev
  if (config.revTimestampKey) {
    await client.set(util.format(config.revTimestampKey, rev), timestamp);
  } else {
    gutil.log(
      gutil.colors.red(
        "Missing 'revTimestampKey' in config, unable to store rev timestamp.",
      ),
    );
  }

  // Store autor and timestamp info under metaKey, e.g. 'meta:<rev-number>'
  await client.set(
    util.format(config.metaKey, rev),
    'from ' + os.hostname() + ' on ' + timestamp,
  );
  await client.quit();
}

async function deployRedis(config, rev, branch) {
  gutil.log(
    gutil.colors.yellow(env()),
    'Uploading revision',
    gutil.colors.cyan(rev),
  );

  if (branch) {
    gutil.log(
      gutil.colors.yellow(env()),
      'Updating branch',
      gutil.colors.cyan(branch),
    );
  }

  await Promise.all(
    (config.files || [config]).map(async fileConfig => {
      const fileName = fileConfig.indexPath;
      gutil.log(
        gutil.colors.yellow(env()),
        'Deploying',
        gutil.colors.magenta(fileName),
        '...',
      );
      const file = fs.readFileSync(fileName, 'utf8');
      return uploadFile(
        Object.assign({}, config, fileConfig),
        file,
        rev,
        branch,
      );
    }),
  );
}

async function printCurrentRev() {
  const rev = await getRevision();
  gutil.log('Current revision', gutil.colors.green(rev));
}

/**
 * Prints current revision number used as a redis key
 */
gulp.task('current-rev', printCurrentRev);

/**
 * Promotes specified revision as current
 */
gulp.task('deploy-redis', async () => {
  const rev = await getRevision();
  const branch = await getBranch();
  await deployRedis(getConfigFor('redis'), rev, branch);
});
