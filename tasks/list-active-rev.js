const gulp = require('gulp');
const gutil = require('gulp-util');

const { getRedisClient, getConfigFor } = require('./utils');
const { some } = require('bluebird');

async function getActiveRevision(client, config) {
  const activeRev = await client.get(config.mainRevKey);

  gutil.log(`${config.mainRevKey}=${activeRev}`);
}

async function printActiveRevision(config) {
  const client = await getRedisClient(config);

  await Promise.all(
    (config.files || [config]).map((fileConfig) =>
      getActiveRevision(client, Object.assign({}, config, fileConfig)),
    ),
  );

  client.quit();
}

/**
 * Prints current active revision
 */
gulp.task('list-active-rev', () => printActiveRevision(getConfigFor('redis')));
