/* eslint import/no-extraneous-dependencies: 0 */

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  watch: true,
  devtool: 'eval-cheap-source-map',
  mode: 'development',
  entry: ['./src/js/L.PM.js'],
  output: {
    filename: 'leaflet-geoman.min.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    // contentBase: baseWebpackConfig.externals.paths.dist,
    port: 'auto',
    static: {
      directory: path.join(__dirname, './src'),
      watch: true,
    },
    compress: true,
    // hot: true,
    liveReload: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
        loader: 'url-loader',
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'leaflet-geoman.css' }),
    new CopyPlugin({
      patterns: [{ from: 'leaflet-geoman.d.ts', to: 'leaflet-geoman.d.ts' }, {
        from: "./static/",
        to: "",
        noErrorOnMissing: true
      }],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '/index.html'),
      scriptLoading: 'blocking',
      filename: 'index.html',
    }),
  ],
};
