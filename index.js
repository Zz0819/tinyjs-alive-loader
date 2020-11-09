const loaderUtils = require('loader-utils');
const alive2json = require('./lib/alive2json');
const lottie2json = require('./lib/lottie2json');

module.exports = function(source) {
  const options = loaderUtils.getOptions(this) || {};
  const format = options.format || 'alive';

  let animationConfig = {};
  switch (format) {
    case 'lottie':
      animationConfig = lottie2json(source);
      break;
    case 'alive':
    default:
      animationConfig = alive2json(source);
      break;
  }

  return `module.exports=${JSON.stringify(animationConfig)}`;
}
