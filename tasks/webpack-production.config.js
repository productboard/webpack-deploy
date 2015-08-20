const path = require('path');
const webpack = require('webpack');
const objectAssign = require('object-assign');

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function(config) {

  config = objectAssign({ publicPath: "/assets/" }, config);

  return {
    // This is the main file that should include all other JS files
    entry: [ './src/js/app.js' ],

    target: 'web',

    devtool: 'source-map',

    output: {
      path: path.join(__dirname, "dist", "assets"),
      publicPath: config.publicPath,
      // If you want to generate a filename with a hash of the content (for cache-busting)
      filename: "main-[hash].js",
      chunkFilename: "[chunkhash].js",
      sourceMapFilename: '[file].map',
    },
    resolve: {
      // Tell webpack to look for required files in bower and node
      root: path.join(__dirname, '../src/js'),
      modulesDirectories: ['bower_components', 'node_modules', 'web_modules'],
      extensions: ['', '.js', '.less'],
    },
    module: {
      loaders: [
        // Less loader
        { test: /\.less$/, loader: 'style-loader!css-loader?modules!postcss-loader!less-loader' },
        { test: /\.css/, loader: 'style-loader!css-loader?modules!postcss-loader' },

        { test: /\.js$/, loaders: ['babel?stage=0'] },

        { test: /\.gif/, loader: "url-loader?limit=3000&minetype=image/gif" },
        { test: /\.jpg/, loader: "url-loader?limit=3000&minetype=image/jpg" },
        { test: /\.png/, loader: "url-loader?limit=3000&minetype=image/png" },

        { test: /\.eot/, loader: "url-loader?limit=100" },
        { test: /\.woff/, loader: "url-loader?limit=100" },
        { test: /\.ttf/, loader: "url-loader?limit=100" },
        { test: /\.svg/, loader: "url-loader?limit=100" },
      ],
      noParse: /\.min\.js/,
    },
    postcss: [
      require('autoprefixer-core'),
    ],
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
        '__DEV__': false,
        'REVISION': JSON.stringify(config.revision),
      }),
      new webpack.optimize.UglifyJsPlugin(),
      // new webpack.optimize.DedupePlugin(),
      new webpack.IgnorePlugin(/vertx/),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

      new HtmlWebpackPlugin({
        filename: '../index.html',
        template: 'src/index-template.html',
        minify: true,
      }),
    ],
  };
};
