#!/bin/sh
# dont execute next commands on error
trap 'exit' ERR

# ENV is the first parameter, defaults to "staging"
ENV=${1-staging}

[[ $ENV = "production" ]] && TLD="com" || TLD="info"
COMMIT=`git rev-parse --short HEAD`
BRANCH=`git rev-parse --abbrev-ref HEAD`
REV="$COMMIT"

if [ $BRANCH == "dev" -o $BRANCH == "master" ]; then
  echo "Deploying with commit hash $REV"
else
  REV="branch/$BRANCH"
  echo "Deploying branch $BRANCH"
fi

npm run build

HASH=`ls dist/assets/main-*.js 2>/dev/null | cut -f3 -d'/' | cut -f2 -d'-' | cut -f1 -d'.'`

gulp deploy-s3 --env=$ENV
gulp rollbar-source-map --hash=$HASH --env=$ENV --rev=$REV
gulp deploy-redis --env=$ENV --rev=$REV
if [ $ENV != "development" ]; then
  gulp slack-notify --env=$ENV --rev=$REV
fi

echo "\nDeploy into $ENV environment took ${SECONDS}s.\n"

echo "TEST with:"
echo "\thttps://pb.productboard.$TLD/?rev=$REV"
echo "THEN to activate run:"
echo "\tgulp activate-rev --env=$ENV --rev=$REV\n"
