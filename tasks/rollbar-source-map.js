const { promisifyAll } = require('bluebird');
const request = require('request-promise-native');
const fs = promisifyAll(require('fs'));
const glob = require('glob');
const util = require('util');
const gulp = require('gulp');
const gutil = require('gulp-util');

const { env, getRevision, getConfigFor } = require('./utils');

async function uploadSourceMap(config, rev, callback) {
  const url = util.format(config.minifiedUrl, config.buildHash);
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
          minified_url: url,
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
      gutil.log('URL:', url);
      gutil.log(gutil.colors.green('rev:', rev));
    }
  } catch (e) {
    gutil.log(gutil.colors.red('Uploading failed'), e);
  }
}

// Finds corresponding hashed source map file name
function findByHash(mask, hash) {
  const sourceMapFile = glob.sync(util.format(mask, hash));
  if (sourceMapFile && sourceMapFile.length > 0) {
    return sourceMapFile[0];
  }
}

function checkDuplicates(configs, sourceMapPath) {
  if (configs.length === 1) {
    return configs[0];
  } else if (configs.length > 1) {
    gutil.log('ERROR: Found duplicate source map(s) for', sourceMapPath);
  } else {
    gutil.log('ERROR: Could not find source map for', sourceMapPath);
  }
}

const resolveFile = (hashes, sourceMapPathMask) =>
  hashes.map(buildHash => {
    const sourceMapPath = findByHash(sourceMapPathMask, buildHash);
    if (sourceMapPath) {
      return {
        buildHash,
        sourceMapPath,
      };
    }
  });

const resolveConfig = (hashes, config) =>
  (config.files || [config])
    .map(fileConfig => {
      const found = resolveFile(hashes, fileConfig.sourceMapPath)
        .filter(Boolean)
        // Merge in app version specific config
        .map(conf => Object.assign({}, fileConfig, conf));

      return checkDuplicates(found, fileConfig.sourceMapPath);
    })
    .filter(Boolean);

async function uploadAppVersions(config, rev) {
  // Detect last build version hashes
  const logMask = config.files ? './build.*.log' : 'build.log';
  const buildLogFiles = glob.sync(logMask);

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
        const fd = await fs.openAsync(file, 'r');
        // Read just the first 64 chars from the log file
        const buff = new Buffer(64);
        const read = await fs.readAsync(fd, buff, 0, 64, 0);
        const header = buff.toString('utf-8', 0, read);
        // Look for the webpack hash
        const parsedHeader = header.match(/Hash:\s(\w+)/i);
        if (parsedHeader && parsedHeader[1]) {
          hashes.push(parsedHeader[1]);
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
    await Promise.all(
      resolvedSourceMapConfigs.map(async sourceMapConfig =>
        uploadSourceMap(Object.assign({}, config, sourceMapConfig), rev),
      ),
    );
  }
}

gulp.task('rollbar-source-map', async () => {
  const rev = await getRevision();

  await uploadAppVersions(getConfigFor('rollbar'), rev);
});
