const { promisify } = require('bluebird');
const util = require('util');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;
const gutil = require('gulp-util');

const redis = require('promise-redis')();
const revision = require('git-rev');
const fullname = require('fullname');
const argv = require('yargs')
  .options({
    rev: {
      describe: 'Build revision',
      demandOption: false,
      type: 'string',
    },
    env: {
      describe: 'Specify deploy environment',
      demandOption: false,
      type: 'string',
    },
    major: {
      group: 'activate-rev',
      alias: 'm',
      describe: 'Flag revision as major',
      demandOption: false,
      type: 'boolean',
    },
    notify: {
      group: 'activate-rev',
      alias: 'n',
      describe: 'Send a slack notification after activation',
      demandOption: false,
      type: 'boolean',
    },
    all: {
      group: 'list-revs',
      alias: 'a',
      describe: 'List all revs above the default limit',
      demandOption: false,
      type: 'boolean',
    },
  })
  .help().argv;

const DEFAULT_ABBREV_LENGTH = 7;
const CONFIG_FILENAME = 'deploy-config.js';
const CONFIG_PATHS = [
  path.join(process.cwd(), CONFIG_FILENAME),
  path.join(__dirname, '..', CONFIG_FILENAME),
];
let deployConfig = null;

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

module.exports.argv = argv;

var env = function() {
  return argv.env || 'development';
};

module.exports.env = env;

module.exports.getRevision = function(cb) {
  if (typeof argv.rev === 'string' && argv.rev !== 'current' && cb)
    cb(null, argv.rev);
  else
    revision.long(function(rev) {
      var abbrevLength = getConfigFor('git').abbrev || DEFAULT_ABBREV_LENGTH;
      cb(null, rev.substr(0, abbrevLength));
    });
};

function getConfigFor(prop, silent) {
  if (!deployConfig) {
    deployConfig = requireConfig(silent);
  }
  return (deployConfig[prop] && deployConfig[prop][env()]) ||
    deployConfig[prop];
}

module.exports.getConfigFor = getConfigFor;

module.exports.getRedisClient = function(config, callback) {
  var client = redis.createClient(config.port, config.host, config.options);
  client.select(config.db, function(err) {
    if (err) {
      gutil.log(gutil.colors.red('Error:'), err);
    }
    callback(err, client);
  });
};

module.exports.getFullName = function(cb) {
  fullname().then(name => cb(null, name));
};

module.exports.createTag = async function(name, message) {
  await promisify(exec)(`git tag -a "${name}" -m "${message}"`);
};

module.exports.pushTag = async function(name, remote) {
  await promisify(exec)(`git push "${remote}" "${name}"`);
};
