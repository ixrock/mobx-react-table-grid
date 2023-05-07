import packageJson from "./package.json";
import webpack from "webpack"
import path from "path"
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const isDevelopment = process.env.NODE_ENV !== 'production';
const peerDependencies = Object.keys(packageJson.peerDependencies).map(name => name.replace("@", "\\@"));

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  entry: isDevelopment ? {
    demo: './src/demo.tsx',
  } : {
    index: path.resolve(__dirname, './src/table/index.ts'),
  },
  devtool: "source-map",
  externals: isDevelopment ? [] : peerDependencies, // exclude bundling with lib "react", "mobx", etc.
  output: {
    path: path.resolve(__dirname, 'dist/src/table'),
    filename: '[name].js',
    libraryTarget: "this",
    library: {
      type: "commonjs-module",
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  optimization: {
    minimize: false,
  },
  experiments: {
    topLevelAwait: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                sourceMap: isDevelopment,
              },
            },
          },
        ],
      },
      {
        test: /\.module\.css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]-[local]-[hash:base64:5]'
              },
              sourceMap: isDevelopment,
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset',
      },
    ],
  },
  plugins: [
    ...(isDevelopment ? [
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({
        title: 'Demo: mobx-react-css-grid-table',
        template: path.resolve(__dirname, 'public/index.html'),
        filename: 'index.html',
        inject: true
      }),
    ] : [
      new MiniCssExtractPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: "LICENSE" },
          { from: "README.md" },
          { from: "package.json" },
        ]
      }),
    ]),

  ],
  devServer: {
    compress: true,
    port: 9001,
  },
} as webpack.Configuration;
