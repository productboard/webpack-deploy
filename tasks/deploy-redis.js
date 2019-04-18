const gulp = require('gulp');
const fs = require('fs');
const os = require('os');
const util = require('util');
const gutil = require('gulp-util');

const { env, getRevision, getConfigFor, getRedisClient } = require('./utils');

//
// Deployment process tasks
//

async function uploadFiles(config, files, rev) {
  const client = await getRedisClient(config);

  const timestamp = new Date();

  // Store file under appropriate keys, e.g. 'app:<rev-number>'
  await Promise.all(
    Object.entries(files).map(([fileKey, fileContent]) => client.set(util.format(fileKey, rev), fileContent)),
  );

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

async function deployRedis(config, rev) {
  gutil.log(
    gutil.colors.yellow(env()),
    'Uploading revision',
    gutil.colors.green(rev),
  );

  await Promise.all(
    (config.files || [config]).map(async fileConfig => {
      /**
       * Define "files" keys to process. We currently support two of them: index and info.
       * They has to came in pairs like indexKey and indexPath.
       *
       * E.g:
       *
       * {
       *   indexPath: 'dist/index.html',
       *   indexKey: 'app:%s',
       *   infoPath: 'build.log',
       *   infoKey: 'info:%s',
       * },
       */
      const FILES = ['index', 'info'];

      const filesToUpload = FILES.reduce((acc, v) => {
        const path = fileConfig[`${v}Path`];
        const key = fileConfig[`${v}Key`];

        if (!path || !key) {
          return acc;
        }

        gutil.log(
          gutil.colors.yellow(env()),
          'Deploying',
          gutil.colors.magenta(path),
          '...',
        );
        const fileContent = fs.readFileSync(path, 'utf8');

        acc[key] = fileContent;

        return acc;
      }, {});

      return uploadFiles(
        Object.assign({}, config, fileConfig),
        filesToUpload,
        rev,
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
  await deployRedis(getConfigFor('redis'), rev);
});
