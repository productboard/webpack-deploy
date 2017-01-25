var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var gutil = require('gulp-util');

var redis = require('redis');
var revision = require('git-rev');
var fullname = require('fullname');
var argv = require('yargs').string('rev').argv;

var DEFAULT_ABBREV_LENGTH = 7;
var CONFIG_FILENAME = 'deploy-config.js';
var CONFIG_PATHS = [
  path.join(process.cwd(), CONFIG_FILENAME),
  path.join(__dirname, '..', CONFIG_FILENAME)
];
var deployConfig = null;

function requireConfig(silent) {
  var filename = CONFIG_PATHS.find(function(configPath) {
    return fs.existsSync(configPath);
  });

  if (filename) {
    !silent && gutil.log('Using config file ' + gutil.colors.magenta(filename));
    return require(filename);
  }

  gutil.log(gutil.colors.red('No "' + CONFIG_FILENAME + '" provided'));
  process.exit(1);
}

var env = function() {
  return argv.env || 'development';
};

module.exports.env = env;

module.exports.hash = function() {
  return argv.hash;
};

module.exports.getRevision = function(cb) {
  if (typeof argv.rev === 'string' && argv.rev !== 'current' && cb) cb(argv.rev);
  else revision.long(function (rev) {
    var abbrevLength = getConfigFor('git').abbrev || DEFAULT_ABBREV_LENGTH;
    cb(rev.substr(0, abbrevLength));
  });
};

module.exports.getConfigFor = function(prop, silent) {
  if (!deployConfig) {
    deployConfig = requireConfig(silent);
  }
  return deployConfig[prop] && deployConfig[prop][env()] || deployConfig[prop];
};

module.exports.getRedisClient = function(config, callback) {
  var client = redis.createClient(config.port, config.host, config.options);
  client.select(config.db, function(err){
    if (err) { gutil.log(gutil.colors.red("Error:"), err); }
    callback(client);
  });
};

module.exports.getFullName = function(cb) {
  fullname().then(cb);
};

module.exports.createTag = function(name, message, cb) {
  exec('git tag -a "'+name+'" -m "' + message + '"', cb);
};

module.exports.pushTag = function(name, remote, cb) {
  exec('git push "'+remote+'" "'+name+'"', cb);
};
