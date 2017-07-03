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
- `git-deploy-tag`
Git tag creation and push to remote.

## Other

### Why Bash with Gulp?
Gulp is great for building, Bash for running tasks.

## TODO
- reupload/rewrite source map upload to fix activation of feature branches
- build sample app in monolithic repo
- forbid rev redeploy; force with --force
- add example ala https://github.com/FormidableLabs/webpack-stats-plugin
- list deployed feature branches
- init: config copy
- github PR deploy notification: https://developer.github.com/changes/2014-01-09-preview-the-new-deployments-api/
- rollbar deploy notification: https://rollbar.com/docs/deploys_bash/
- optional deploy message (for slack)
- list commits in slack message
- provide reference backend code snippet
- notification center updates
- friendlier error messages "Did you forget to ...?"
- abstract slack notifs into utils
- disallow activation of feature branches?
- get rid of the callback hell
- deploy tags don't work well with feature branches, they keep overwriting
- integrate new deploy info command

## License
MIT

## Prettier config
```
{
  // Autoformat files on save
  "autoformat": true,

  // Only attempt to format files with extensions set there
  "extensions": ["js"],

  // Fit code within this line limit
  "printWidth": 80,

  // Number of spaces it should use per tab
  "tabWidth": 2,

  // If true, will use single instead of double quotes
  "singleQuote": true,

  // Controls the printing of trailing commas wherever possible
  "trailingComma": "all",

  // Controls the printing of spaces inside array and objects
  "bracketSpacing": true
}
```
