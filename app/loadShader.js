const fs = require('fs');
const app = require('electron').remote.app;
const SHADER_LOCATION = app.getAppPath() + '/app/assets/shaders/';

const cache = {};

function readShaderText(filename) {
  if ( cache[filename] ) return cache[filename];
  cache[filename] = fs.readFileSync(SHADER_LOCATION + filename, 'utf8');
  return cache[filename];
}

module.exports = readShaderText;
