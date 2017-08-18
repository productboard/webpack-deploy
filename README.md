# Webpack deploy utilities
Collection of useful utilities for deploying (not only) Webpack apps

## Deploy
Each deployment into Redis (`deploy-redis`) saves the `index.html` build file under a full SHA key of the current git commit. (e.g. `app:b45ab63a5aaafd35377ca571824e60fe07a52101`) and optionally updates the “tip” commit of a given branch (using the `--branch` argument). Updates to the branch tip are made by storing it’s revision and index under the `app:branch-revision:branchname` and `app:branch:branchname` respectively.

## Activation
There are two steps to activate a deployed build. 
1. Activate branch: use `activate-branch --branch branchname` to activate this branch and set the current main build to the tip of this branch. All consecutive activations **inside this branch** will be automatically promoted as the main current build.
2. Activate a revision: use `activate-rev --branch branchname --rev SHA` to activate a given SHA revision inside a given branch and set the revision as the main current build **if that branch has been previously activated**.

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
- `deploy [environment]`  
Batch command for quick deployment.
- `deploy-s3 [--env=environment]`  
AWS S3 asset upload of build files.
- `deploy-redis [--env=environment] [--rev=revision] [--branch=branch]`  
Redis deployment of revision index html file.
- `activate-rev [--env=environment] [--rev=revision] [--branch=branch] [--notify|-n] [--major|-m] [--confirm]`  
Redis activation of deployed revision.
- `activate-branch [--env=environment] [--branch=branch] [--confirm]`  
Redis activation of deployed branch.
- `current-rev`  
Display currently auto-detected revision.
- `list-revs [--env=environment] [--all|-a]`  
List of deployed revisions with meta information.
- `rollbar-source-map [--env=environment] [--rev=revision]`  
Rollbar source map upload.
- `slack-notify [--env=environment] [--rev=revision]`  
Slack channel notifier.
- `git-deploy-tag [--env=environment] [--rev=revision]`  
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
