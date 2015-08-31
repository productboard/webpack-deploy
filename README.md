# Webpack deploy utilities
Collection of useful utilities for deploying (not only) Webpack apps

## Installation
```
cd $YOUR_PROJECT
npm install --save-dev productboard/webpack-deploy
````

## Configuration
Copy `deploy-config-example.js` and `secrets-example.js` into the root of your
project and fit them to your needs.

## Use
Build your Webpack project and run `deploy [environment]`.
The script will automatically detect the build hash from `build.log`.

## Commands
- `deploy`
Batch command for quick deployment.
- `deploy-s3`
AWS S3 asset upload of build files.
- `deploy-redis`
Redis deployment of revision index html file.
- `activate-rev`
Redis activation of deployed revision.
- `list-revs`
List of deployed revisions with meta information.
- `rollbar-source-map`
Rollbar source map upload.
- `slack-notify`
Slack channel notifier.

## Other

### Why Bash with Gulp?
Gulp is great for building, Bash for running tasks.

## TODO
- list deployed feature branches
- init: config copy
- username for slack: https://github.com/sindresorhus/username
