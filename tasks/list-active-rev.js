const gulp = require('gulp');
const gutil = require('gulp-util');

const { getRedisClient, getConfigFor } = require('./utils');

async function getActiveRevision(client, config) {
  const activeRev = await client.get(config.mainRevKey);

  return `${config.mainRevKey}=${activeRev}`;
}

async function printActiveRevisions(config) {
  const client = await getRedisClient(config);

  const activeRevs = await Promise.all(
    (config.files || [config]).map((fileConfig) =>
      getActiveRevision(client, Object.assign({}, config, fileConfig)),
    ),
  );

  gutil.log(activeRevs);

  client.quit();
}

/**
 * Prints current active revision
 */
gulp.task('list-active-rev', () => printActiveRevisions(getConfigFor('redis')));
