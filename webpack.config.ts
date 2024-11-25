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

export default function webpackConfig(env: { demo?: boolean } = {}): webpack.Configuration {
  const isDemoBuild = Boolean(env.demo);
  const demoEntry = {
    demo: path.resolve(__dirname, './src/demo.tsx')
  };

  const htmlWebpackPlugin = new HtmlWebpackPlugin({
    template: path.resolve(__dirname, 'public/index.html'),
    filename: 'index.html',
    inject: true
  });

  return {
    mode: isDevelopment ? 'development' : 'production',
    entry: isDevelopment ? demoEntry : {
      ...(isDemoBuild ? demoEntry : {}), // for deployment in vercel
      index: path.resolve(__dirname, './src/table/index.ts'),
    },
    devtool: isDevelopment ? "source-map" : undefined,
    externals: (isDevelopment || isDemoBuild) ? [] : externals, // exclude bundling with lib "react", "mobx", etc.
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
          test: /\.?css$/,
          use: [
            MiniCssExtractPlugin.loader,
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
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset',
        },
        {
          test: /\.svg$/,
          type: "asset/inline" // data:image/svg+xml;base64,...
        },
      ],
    },
    plugins: [
      ...(isDevelopment ? [
        htmlWebpackPlugin,
        new ForkTsCheckerWebpackPlugin(),
      ] : []),

      ...(isDemoBuild ? [
        htmlWebpackPlugin
      ] : []),

      new MiniCssExtractPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: "LICENSE" },
          { from: "README.md" },
          { from: "package.json" },
        ]
      }),
    ],
  }
}
