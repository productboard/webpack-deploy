var path = require('path');
var fs = require('fs');
var gutil = require('gulp-util');

var redis = require('redis');
var revision = require('git-rev');
var argv = require('yargs').argv;

var CONFIG_FILENAME = 'deploy-config.js';

function requireConfig(filename) {
  gutil.log('Using config file ' + gutil.colors.magenta(filename));
  return require(filename);
}

if (fs.existsSync(path.join(process.cwd(), CONFIG_FILENAME))) {
  var deployConfig = requireConfig(path.join(process.cwd(), CONFIG_FILENAME));
} else if (fs.existsSync(path.join(__dirname, '..', CONFIG_FILENAME))) {
  var deployConfig = requireConfig(path.join(__dirname, '..', CONFIG_FILENAME));
} else {
  gutil.log(gutil.colors.red('No "' + CONFIG_FILENAME + '" provided'));
  process.exit(1);
}


var env = function() {
  return argv.env || 'development';
};

module.exports.env = env;

module.exports.hash = function() {
  return argv.hash || 'dev';
};

module.exports.getRevision = function(cb) {
  if (typeof argv.rev === 'string' && argv.rev !== 'current' && cb) cb(argv.rev);
  else revision.short(cb);
};

module.exports.getConfigFor = function(prop) {
  return deployConfig[prop] && deployConfig[prop][env()] || deployConfig[prop];
};

module.exports.getRedisClient = function(config, callback) {
  var client = redis.createClient(config.port, config.host, config.options);
  client.select(config.db, function(err){
    if (err) { gutil.log(gutil.colors.red("Error:"), err); }
    callback(client);
  });
};
