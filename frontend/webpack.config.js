// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: path.resolve(__dirname, 'src', 'main.tsx'),
  output: {
    // In Docker: output to ./dist (default)
    // Locally: output to ../backend/dist/public for unified structure
    path: process.env.WEBPACK_OUTPUT_PATH 
      ? path.resolve(__dirname, process.env.WEBPACK_OUTPUT_PATH)
      : path.resolve(__dirname, '../backend/dist/public'),
    filename: 'assets/[name].[contenthash].js',
    chunkFilename: 'assets/[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: 'source-map',
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              url: {
                filter: (url) => {
                  // leave absolute URLs like /image.png as-is (served from public/)
                  return !url.startsWith('/')
                },
              },
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]'
        }
      }
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      // Check for undefined, not falsy (empty string is valid)
      'process.env.REACT_APP_API_BASE': JSON.stringify(
        process.env.REACT_APP_API_BASE !== undefined 
          ? process.env.REACT_APP_API_BASE 
          : 'http://localhost:8080'
      )
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'index.html'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, 'public'), 
          to: process.env.WEBPACK_OUTPUT_PATH 
            ? path.resolve(__dirname, process.env.WEBPACK_OUTPUT_PATH)
            : path.resolve(__dirname, '../backend/dist/public')
        },
      ],
    }),
  ],
  devServer: {
    static: [
      { directory: path.resolve(__dirname, 'public') },
    ],
    historyApiFallback: true,
    compress: true,
    port: 5173,
    open: true,
    hot: true,
  },
}
