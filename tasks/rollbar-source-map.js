const { promisifyAll } = require('bluebird');
const request = require('request-promise-native');
const fs = promisifyAll(require('fs'));
const glob = require('glob');
const gulp = require('gulp');
const gutil = require('gulp-util');

const { env, getRevision, getConfigFor } = require('./utils');

const BUILD_HASH_WILDCARD = '[hash]';

function injectHashIntoPath(path, hash) {
  return path.replace(BUILD_HASH_WILDCARD, hash).replace('%s', hash); // deprecated
}

async function uploadSourceMap(config, rev, callback) {
  const sourceMap = fs.createReadStream(config.sourceMapPath);

  // curl https://api.rollbar.com/api/1/sourcemap \
  // -F access_token=aaaabbbbccccddddeeeeffff00001111 \
  // -F version=version_string_here \
  // -F minified_url=http://example.com/static/js/example.min.js \
  // -F source_map=@static/js/example.min.map
  gutil.log(gutil.colors.yellow(env()), 'Uploading source map ...');

  try {
    const response = await request.post(
      {
        url: 'https://api.rollbar.com/api/1/sourcemap',
        formData: {
          access_token: config.accessToken,
          version: rev,
          minified_url: config.minifiedUrl,
          source_map: sourceMap,
        },
      },
      callback,
    );

    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch (e) {
      gutil.log(gutil.colors.red('Cannot parse reponse'));
    }

    if (parsed && !parsed.err && parsed.result) {
      gutil.log(gutil.colors.yellow(env()), 'Source map uploaded.');
      gutil.log('File:', config.sourceMapPath);
      gutil.log('URL:', config.minifiedUrl);
      gutil.log(gutil.colors.green('rev:', rev));
    }
  } catch (e) {
    gutil.log(gutil.colors.red('Uploading failed'), e);
  }
}

// Finds corresponding hashed source map file name
function findByHash(config, hash) {
  const re = new RegExp(injectHashIntoPath(config.sourceMapPath, hash));

  return glob
    .sync('./**')
    .filter(file => re.test(file))
    .map(sourceMapPath => {
      // strip relative path characters
      const sourceMapPathMatch = sourceMapPath.match(re);

      if (sourceMapPathMatch) {
        const minifiedUrl = sourceMapPathMatch[0].replace(
          re,
          injectHashIntoPath(config.minifiedUrl, hash),
        );

        return {
          sourceMapPath,
          minifiedUrl,
        };
      }
    })
    .filter(Boolean);
}

const resolveConfig = (hashes, config) =>
  hashes
    .map(hash =>
      (config.files || [config]).reduce(
        (result, fileConfig) => result.concat(findByHash(fileConfig, hash)),
        [],
      ),
    )
    .filter(paths => paths.length > 0);

async function uploadAppVersions(config, rev) {
  // Detect last build version hashes
  const buildLogFiles = glob.sync('./build*.log');

  if (buildLogFiles < 1) {
    gutil.log('ERROR: No build logs found');
    return;
  }

  const hashes = [
    // 'hashone', 'hashtwo', ...
  ];

  // Read build logs and fill up array of hashes
  await Promise.all(
    buildLogFiles.map(async file => {
      try {
        const buffer = await fs.readFileAsync(file);
        const buildInfo = JSON.parse(buffer);

        if (buildInfo) {
          hashes.push(buildInfo.hash);
        }
      } catch (e) {
        gutil.log('ERROR: Cannot read', file, e);
      }
    }),
  );

  const resolvedSourceMapConfigs = resolveConfig(hashes, config);

  // Upload source maps one by one
  if (buildLogFiles.length !== resolvedSourceMapConfigs.length) {
    gutil.log('ERROR: Could not find source maps for all builds');
  } else {
    const flattened = resolvedSourceMapConfigs.reduce(
      (result, configs) => [...result, ...configs],
      [],
    );
    await Promise.all(
      flattened.map(async sourceMapConfig =>
        uploadSourceMap(Object.assign({}, config, sourceMapConfig), rev),
      ),
    );
  }
}

gulp.task('rollbar-source-map', async () => {
  const rev = await getRevision();

  await uploadAppVersions(getConfigFor('rollbar'), rev);
});
