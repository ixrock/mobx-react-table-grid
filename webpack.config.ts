import packageJson from "./package.json";
import webpack from "webpack"
import path from "path"
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const isDevelopment = process.env.NODE_ENV !== 'production';

const externals = Object.keys(packageJson.peerDependencies)
  .filter(name => !name.startsWith("@types"))
  .map(name => name.replace("@", "\\@"))
  .reduce((externals, packageName) => {
    return {
      ...externals,
      [packageName]: `commonjs ${packageName}`,
    }
  }, {})
;

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  entry: isDevelopment ? {
    demo: './src/demo.tsx',
  } : {
    index: path.resolve(__dirname, './src/table/index.ts'),
  },
  devtool: "source-map",
  externals: isDevelopment ? [] : externals, // exclude bundling with lib "react", "mobx", etc.
  output: {
    path: path.resolve(__dirname, isDevelopment ? "dev" : "dist"),
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
    minimize: !isDevelopment,
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
        test: /\.s?css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: isDevelopment,
              modules: {
                auto: /\.module\./i, // https://github.com/webpack-contrib/css-loader#auto
                mode: "local", // :local(.selector) by default
                localIdentName: '[name]-[local]-[hash:base64:5]'
              },
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: isDevelopment,
              sassOptions: {
                outputStyle: "expanded"
              }
            },
          }
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
