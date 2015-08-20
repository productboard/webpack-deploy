var gutil = require('gulp-util');

var redis = require('redis');
var revision = require('git-rev');
var argv = require('yargs').argv;

var deployConfig = require('./deploy-config.js');


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
  return deployConfig[prop] && deployConfig[prop][env()];
};

module.exports.getRedisClient = function(config, callback) {
  var client = redis.createClient(config.port, config.host, config.options);
  client.select(config.db, function(err){
    if (err) { gutil.log(gutil.colors.red("Error:"), err); }
    callback(client);
  });
};
