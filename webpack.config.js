const path = require('node:path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  mode: 'development',
  devtool: false,
  entry: {
    TabContent: './tab/src/TabContent.tsx',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      'azure-devops-extension-sdk': path.resolve(
        'node_modules/azure-devops-extension-sdk',
      ),
    },
    fallback: {
      buffer: require.resolve('buffer'),
    },
  },
  stats: {
    warnings: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'azure-devops-ui/buildScripts/css-variables-loader',
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(jpe?g|png|gif|woff|woff2|eot|ttf|svg)(\?[a-z0-9=.]+)?$/,
        loader: 'file-loader',
      },
      {
        test: /\.html$/,
        loader: 'file-loader',
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: '*.html', context: 'tab/src/' }],
    }),
    new webpack.SourceMapDevToolPlugin({}),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  devServer: {
    server: 'https',
    devMiddleware: {
      index: true,
      mimeTypes: { phtml: 'text/html' },
      publicPath: '/dist/',
      serverSideRender: true,
      writeToDisk: true,
    },
    port: 9000,
  },
}
