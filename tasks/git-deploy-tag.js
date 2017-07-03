const gulp = require('gulp');
const os = require('os');
const gutil = require('gulp-util');

const {
  env,
  getRevision,
  getConfigFor,
  createTag,
  pushTag,
  getFullName,
} = require('./utils');

async function createGitTag(config, rev) {
  if (!config.url) {
    gutil.log(gutil.colors.red('No git.url option set in config'));
    return;
  }
  const tag = env() + '-' + rev;
  const link = config.url + '/?rev=' + rev;
  const name = await getFullName();

  gutil.log(
    gutil.colors.yellow(env()),
    'Creating deploy tag',
    gutil.colors.magenta(tag),
  );

  try {
    await createTag(
      tag,
      'Deploy ' + rev + '\nBy ' + name + ' (' + os.hostname() + ')\n' + link,
    );
  } catch (e) {
    gutil.log(gutil.colors.red('Error creating tag'), e);
    return;
  }

  if (!config.remote) {
    gutil.log(gutil.colors.red('No git.remote option set in config'));
    return;
  }

  gutil.log(
    gutil.colors.yellow(env()),
    'Pushing deploy tag',
    gutil.colors.magenta(tag),
  );
  try {
    await pushTag(tag, config.remote);
  } catch (e) {
    gutil.log(gutil.colors.red('Error pushing tag'), e);
  }
}

/**
 * Promotes specified revision as current
 */
gulp.task('git-deploy-tag', async () => {
  const rev = await getRevision();
  await createGitTag(getConfigFor('git'), rev);
});
