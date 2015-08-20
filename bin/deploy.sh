#!/bin/sh
# dont execute next commands on error
trap 'exit' ERR

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

echo "Environment: $ENV"

case "$ENV" in
  production)
    DOMAIN="https://pb.productboard.com"
    ;;
  staging)
    DOMAIN="https://pb.productboard.info"
    ;;
  development)
    DOMAIN="http://pb.pbe.dev"
    ;;
  *)
  echo "Usage: deploy [enviroment]"
  echo "Available environments: production, staging, development"
  exit 1
esac

COMMIT=`git rev-parse --short HEAD`
BRANCH=`git rev-parse --abbrev-ref HEAD`
REV="$COMMIT"

if [ $BRANCH == "dev" -o $BRANCH == "master" ]; then
  echo "Deploying with commit hash $REV\n"
else
  REV="branch/$BRANCH"
  echo "Deploying branch $BRANCH\n"
fi


gulp_config() {
  gulp --gulpfile "$DIRNAME/../gulpfile.js" --cwd=$PWD $@
}

# TODO: detect/get build hash
# npm run build
# HASH=`ls dist/assets/main-*.js 2>/dev/null | cut -f3 -d'/' | cut -f2 -d'-' | cut -f1 -d'.'`

gulp_config deploy-s3 --env=$ENV
gulp_config rollbar-source-map --hash=$HASH --env=$ENV --rev=$REV
gulp_config deploy-redis --env=$ENV --rev=$REV
if [ $ENV != "development" ]; then
  gulp_config slack-notify --env=$ENV --rev=$REV
fi

echo "\nDeploy into $ENV environment took ${SECONDS}s.\n"

echo "TEST with:"
echo "\t$DOMAIN/?rev=$REV"
echo "THEN to activate run:"
echo "\tactivate-rev --env=$ENV --rev=$REV\n"
