// const webpack = require('webpack');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

const config = {
  entry: './index.js',
  output: {
    path: path.resolve('./dist/')
  },
  module: {
    rules: [
      {
        test: /\.alive$/,
        use: [
          {
            loader: path.resolve('../index.js'),
            options: {
              format: 'lottie'
            }
          }
        ]
      }
    ]
  },
  optimization: {
    minimize: false
  }
};

if (isDev) {
  config.devtool = 'eval'; // https://webpack.js.org/configuration/devtool/#devtool
  config.devServer = {
    contentBase: './dist',
    hot: true,
    disableHostCheck: true
  };
}

module.exports = config;
