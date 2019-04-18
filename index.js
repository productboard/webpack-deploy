/**
 * Copyright (c) 2019-present, ProductBoard, Inc.
 * All rights reserved.
 */

const fs = require('fs');
const child = require('child_process');
const gzipSize = require('gzip-size');

/**
 * Webpack Plugin for generating info JSON (hash, sha, assetSize), it's consumable by webpack-deploy later on when deploying
 */
class BuildInfo {
  constructor({ filename = 'build.log' }) {
    this.filename = filename;
  }

  getSha() {
    return child
      .execSync('git rev-parse HEAD')
      .toString()
      .trim();
  }

  async createBuildInfoReport(compilation) {
    const hash = compilation.getStats().toJson().hash;

    const assetsSize = await Promise.all(
      Object.entries(compilation.assets)
        .filter(([asset]) => /.js$/.test(asset))
        .map(async ([asset, content]) => {
          const gzipedSize = await gzipSize(content.source());
          return {
            asset,
            size: content.size(),
            gzipedSize,
          };
        }),
    );

    // get full SHA from git
    const sha = this.getSha();

    const info = JSON.stringify({
      sha,
      hash,
      assetsSize,
    });

    fs.writeFileSync(this.filename, info);
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      this.createBuildInfoReport(compilation)
        .catch(e => {
          compilation.errors.push(
            new Error(
              `Webpack BuildInfo plugin has thrown an error in 'createBuildInfoReport': ${e}`,
            ),
          );
        })
        .then(callback);
    });
  }
}

module.exports = { BuildInfo };
