/*eslint no-console: 0 */
const { promisify } = require('bluebird');
const gulp = require('gulp');
const util = require('util');
const path = require('path');
const gutil = require('gulp-util');
const gitlog = promisify(require('gitlog'));

const { argv, env, getConfigFor, getRedisClient } = require('./utils');

const DEFAULT_MAX_COUNT = 10;

//
// Deployment process tasks
//

async function getRev(rev, currentRev, client, config) {
  var revHash = rev.substr(config.indexKey.indexOf('%s'));
  if (revHash === 'current') return;

  var str = revHash === currentRev ? rev + ' (current)' : rev;
  try {
    const commitData = await gitlog({
      repo: path.resolve(process.cwd(), '.git'),
      number: 1,
      fields: [
        'abbrevHash',
        'subject',
        'committerDate',
        'committerDateRel',
        'authorName',
        'hash',
      ],
      branch: revHash,
    });
    if (!commitData.length) {
      return;
    }

    const firstCommitData = commitData[0];

    const metadata = await client.get(util.format(config.metaKey, revHash));
    if (!metadata) {
      gutil.log(gutil.colors.red('Cannot retrieve metadata'));
      return;
    }

    return [
      new Date(firstCommitData.committerDate),
      gutil.colors.yellow(str),
      firstCommitData.subject,
      gutil.colors.white(firstCommitData.committerDateRel),
      gutil.colors.white.blue('<' + firstCommitData.authorName + '>'),
      (metadata && gutil.colors.white.blue(metadata)) || '',
    ];
  } catch (e) {
    if (e.toString().indexOf('unknown revision') > 0) {
      return [
        0,
        gutil.colors.yellow(str),
        gutil.colors.red('Unknown revision'),
      ];
    }
    gutil.log(gutil.colors.yellow(str));
    gutil.log(gutil.colors.red('Error:'), e);
  }
}

async function printVersionRevs(config) {
  const client = await getRedisClient(config);

  const currentRev = await client.get(config.mainRevKey);
  if (!currentRev) {
    gutil.log(gutil.colors.red('Could not find the current revision'));
    return;
  }
  // gutil.log(gutil.colors.yellow(env()), 'Current revision', data);

  const data = await client.keys(util.format(config.indexKey, '???????'));
  if (!data) {
    gutil.log(gutil.colors.red('Could not retrieve revision list'));
  }

  try {
    let results = await Promise.all(
      data.map(rev => getRev(rev, currentRev, client, config)),
    );

    results = results
      .filter(el => el && el.length > 0)
      .sort((a, b) => a[0] - b[0]);

    if (!argv.all && results.length > DEFAULT_MAX_COUNT) {
      results = results.slice(Math.max(results.length - DEFAULT_MAX_COUNT, 1));
    }

    gutil.log(
      gutil.colors.yellow(env()),
      'List of deployed revisions for ' + config.indexKey + ':',
    );

    gutil.log('\tTotal count:', data.length);
    if (!argv.all) {
      gutil.log('\tShowing last', DEFAULT_MAX_COUNT);
      gutil.log('\tRun with --all to show all');
    }

    // Send all to output, leaving out the date
    results.forEach(el => gutil.log.apply(gutil, el.splice(1)));
  } catch (e) {
    gutil.log('Error:', e);
  } finally {
    client.quit();
  }
}

async function printRevs(config) {
  await Promise.all(
    (config.files || [config])
      .map(fileConfig =>
        printVersionRevs(Object.assign({}, config, fileConfig))),
  );
}

/**
 * Prints list of deployed revision numbers
 */
gulp.task('list-revs', async () => printRevs(getConfigFor('redis')));
