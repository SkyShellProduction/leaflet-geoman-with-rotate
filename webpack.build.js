/* eslint import/no-extraneous-dependencies: 0 */
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
// const WebpackNodeExternals = require('webpack-node-externals');

module.exports = {
  watch: false,
  // devtool: 'cheap-source-map',
  entry: ['./src/js/L.PM.js'],
  mode: 'production',
  output: {
    filename: 'leaflet-geoman.min.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  externals: [{ leaflet: 'leaflet', subtract: './static/' }],
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            // exclude: './src/css/leaflet.css'
          },
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
      patterns: [{ from: 'leaflet-geoman.d.ts', to: 'leaflet-geoman.d.ts' }],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ie8: true,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
};
