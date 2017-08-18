#!/bin/bash
# dont execute next commands on error
trap 'exit' ERR

# colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# let echo interpret escape chars (\n)
shopt -s xpg_echo

GULP="`npm bin`/gulp"

if [[ ! -x "$GULP" ]]; then
  echo "${RED}ERROR: gulp executable not found$NC"
  echo "Check path for valid executable: $GULP"
  exit 1
fi

gulp_config() {
  $GULP --gulpfile "$DIRNAME/../gulpfile.js" --cwd=$PWD $@
}

# http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
set_dirname() {
  SOURCE="${BASH_SOURCE[0]}"
  while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
    DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
  done
  DIRNAME="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
}

set_dirname

# ENV is the first parameter, defaults to "staging"
ENV=${1-development}

echo "Environment: ${YELLOW}$ENV$NC"

case "$ENV" in
  production)
    DOMAIN="https://pb.productboard.com"
    ;;
  staging)
    DOMAIN="https://pb.productboard.info"
    ;;
  me)
    DOMAIN="https://pb.productboard.me"
    ;;
  development)
    DOMAIN="http://pb.pbe.dev"
    ;;
  *)
  echo "Usage: deploy [enviroment]"
  echo "Available environments: production, staging, me, development"
  exit 1
esac

ABBREV_LENGTH=`node ${DIRNAME}/../tasks/config-abbrev --env=$ENV`
ROLLBAR_ABBREV=`node ${DIRNAME}/../tasks/config-rollbar-abbrev --env=$ENV`
COMMIT=`git rev-parse --short=${ABBREV_LENGTH} HEAD`
COMMIT_ROLLBAR=`git rev-parse --short=${ROLLBAR_ABBREV} HEAD`
BRANCH=`git rev-parse --abbrev-ref HEAD`
REV="$COMMIT"
BUILD_COUNT=`ls -a build*log 2>/dev/null | cat | wc -l | awk {'print $1'}`

if [ $BRANCH == "HEAD" ]; then
  echo "Deploying with commit hash ${YELLOW}$REV$NC\n"
else
  REV="$BRANCH"
  echo "Deploying revision ${YELLOW}$COMMIT$NC for branch ${YELLOW}$BRANCH$NC\n"
fi

if [[ $BUILD_COUNT -ne 0 ]]; then
  echo "Detected $BUILD_COUNT build app versions from logs:"
  for build in build*log; do
    echo "\t${YELLOW}`grep Hash: "$build" | head -1 | cut -d' ' -f2`$NC: $build"
  done
  echo
else
  echo "ERROR: No builds found. Set up Webpack stats log into build.[app_buildsion].log"
  echo "See https://webpack.github.io/docs/node.js-api.html#stats-tostring\n"
  exit 1
fi

gulp_config deploy-s3 --env=$ENV

gulp_config rollbar-source-map --env=$ENV --rev=$COMMIT_ROLLBAR

gulp_config deploy-redis --env=$ENV --rev=$COMMIT --branch=$BRANCH

gulp_config git-deploy-tag --env=$ENV --rev=$REV

[ "$ENV" != "development" ] && \
gulp_config slack-notify --env=$ENV --rev=$REV

echo "\nDeploy into $ENV environment took ${SECONDS}s.\n"

echo "TEST with:"
echo "\t$DOMAIN/?rev=$REV\n"
echo "To activate the branch (auto updated revision with every branch deploy):"
echo "\t${CYAN}activate-branch --env=$ENV --branch=$BRANCH --notify$NC\n"
echo "To activate the commit:"
echo "\t${CYAN}activate-rev --env=$ENV --rev=$COMMIT --branch=$BRANCH --notify$NC\n"
