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
Also make sure you have `./node_modules/.bin` in your `$PATH`.

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
- forbid rev redeploy; force with --force
- add example ala https://github.com/FormidableLabs/webpack-stats-plugin
- list deployed feature branches
- init: config copy
- tag deployed commits; date based??
- rollbar deploy notification: https://rollbar.com/docs/deploys_bash/
- optional deploy message (for slack)
- list commits in slack message
- provide reference backend code snippet
- notification center updates
- friendlier error messages "Did you forget to ...?"
- abstract slack notifs into utils

## License
MIT
