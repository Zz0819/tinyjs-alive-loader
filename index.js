const alive2json = require('./lib/alive2json');

module.exports = function(source) {
  const animationConfig = alive2json(source);
  return `module.exports=${JSON.stringify(animationConfig)}`;
}
