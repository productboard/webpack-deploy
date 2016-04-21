var request = require('request');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var util = require('util');
var gulp = require('gulp');
var gutil = require('gulp-util');

var env = require('./utils').env;
var hash = require('./utils').hash;
var getRevision = require('./utils').getRevision;
var getConfigFor = require('./utils').getConfigFor;


function uploadSourceMap(config, rev, callback) {
  var url = util.format(config.minifiedUrl, config.buildHash);
  var sourceMap = fs.createReadStream(config.sourceMapPath);

  // curl https://api.rollbar.com/api/1/sourcemap \
  // -F access_token=aaaabbbbccccddddeeeeffff00001111 \
  // -F version=version_string_here \
  // -F minified_url=http://example.com/static/js/example.min.js \
  // -F source_map=@static/js/example.min.map
  gutil.log(gutil.colors.yellow(env()), 'Uploading source map ...');
  request.post({
    url: 'https://api.rollbar.com/api/1/sourcemap',
    formData: {
      'access_token': config.accessToken,
      'version': rev,
      'minified_url': url,
      'source_map': sourceMap,
    }
  }, callback)
  .on('response', function(data) {
      data.on('data', function(all) {
        var d;
        try {
          d = JSON.parse(all);
        } catch(e) {}
        if (data.statusCode === 200 && d && !d.err && d.result) {
          gutil.log(gutil.colors.yellow(env()), 'Source map uploaded.');
          gutil.log('File:', config.sourceMapPath);
          gutil.log('URL:', url);
          gutil.log(gutil.colors.green('rev:', rev));
        } else {
          gutil.log(gutil.colors.red('Non OK code returned'), d && d.result && d.result.msg);
        }
      });
  });
}

// Finds corresponding hashed source map file name
function findByHash(mask, hash) {
  var sourceMapFile = glob.sync(util.format(mask, hash));
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

function uploadAppVersions(config, rev, callback) {
  // Detect last build version hashes
  var logMask = config.files ? './build.*.log' : 'build.log';
  var buildLogFiles = glob.sync(logMask);

  if (buildLogFiles < 1) {
    gutil.log('ERROR: No build logs found')
    return callback();
  }

  var hashes = [
    // 'hashone', 'hashtwo', ...
  ];
  var reading = 0;
  var uploading = 0;

  var uploadDone = function() {
    uploading--;
    if (uploading === 0) {
      callback();
    }
  };

  var resolveFile = function(sourceMapPathMask) {
    return hashes.map(function(hash) {
      var sourceMapPath = findByHash(sourceMapPathMask, hash);
      if (sourceMapPath) {
        return {
          buildHash: hash,
          sourceMapPath,
        };
      }
    });
  };

  var resolveConfig = function(config) {
    if (config.files) {
      return config.files.map(function(file) {
        var found = resolveFile(file.sourceMapPath)
        .filter(Boolean)
        // Merge in app version specific config
        .map(function(conf) {
          return Object.assign({}, file, conf);
        });

        return checkDuplicates(found, file.sourceMapPath);
      }).filter(Boolean);
    } else {
      var found = resolveFile(config.sourceMapPath);

      var final = checkDuplicates(found, config.sourceMapPath);
      return [ final ].filter(Boolean);
    }
  };

  var readingDone = function() {
    reading--;
    if (reading === 0) {
      // Upload source maps one by one
      var resolvedSourceMapConfigs = resolveConfig(config);

      if (buildLogFiles.length !== resolvedSourceMapConfigs.length) {
        gutil.log('ERROR: Could not find source maps for all builds');
      } else {
        resolvedSourceMapConfigs.map(function(sourceMapConfig) {
          uploading++;
          uploadSourceMap(
            Object.assign({}, config, sourceMapConfig),
            rev, uploadDone
          );
        });
      }
    }
  };

  // Read build logs and fill up array of hashes
  buildLogFiles.map(function(file) {
    reading++;

    fs.open(file, 'r', function(err, fd) {
      if (err) {
        gutil.log('ERROR: Cannot read', file);
        readingDone();
        return;
      }
      var buff = new Buffer(64);
      fs.read(fd, buff, 0, 64, 0, function(err, read) {
        if (err) {
          gutil.log('ERROR: Cannot read', file);
          readingDone();
          return;
        }
        var header = buff.toString('utf-8', 0, read);
        var parsedHeader = header.match(/Hash:\s(\w+)/i);
        if (parsedHeader && parsedHeader[1]) {
          hashes.push(parsedHeader[1]);
        }
        readingDone();
      })
    });
  });
}

gulp.task('rollbar-source-map', function(callback) {
  getRevision(function (rev) {
    uploadAppVersions(getConfigFor('rollbar'), rev, callback);
  });
});
