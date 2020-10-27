# tinyjs-alive-loader
> 阿里喵动产物 *.alive 转 tinyjs-easy-animation 配置
### 使用方式：
webpack.config.js
```js
module.exports = {
  module: {
    test: /\.alive$/,
    use: [
      {
        loader: 'tinyjs-alive-loader',
      }
    ]
  }
};
