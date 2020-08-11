const gulp = require('gulp');
const gutil = require('gulp-util');

const { getRedisClient, getConfigFor } = require('./utils');

async function getActiveRevision(client, config) {
  const activeRev = await client.get(config.mainRevKey);

  return activeRev;
}

async function printActiveRevision(config) {
  const client = await getRedisClient(config);

  const activeRev = await Promise.all(
    (config.files || [config]).map((fileConfig) =>
      getActiveRevision(client, Object.assign({}, config, fileConfig)),
    ),
  );

  gutil.log(`${config.mainRevKey}=${activeRev}`);

  client.quit();
}

/**
 * Prints current active revision
 */
gulp.task('list-active-rev', () => printActiveRevision(getConfigFor('redis')));
