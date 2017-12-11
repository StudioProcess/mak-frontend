const fs = require('fs');
const app = require('electron').remote.app;
const SHADER_LOCATION = app.getAppPath() + '/app/assets/shaders/';

function readShaderText(filename) {
  return fs.readFileSync(SHADER_LOCATION + filename, 'utf8');
}

const files = [
  'basic.vert', 'basic.frag', 
  'copy.vert', 'copy.frag',
  'noise.frag',
  'dt.vert', 'dt.frag',
  'hillshade.frag'
];

for (filename of files) {
  module.exports[filename] = readShaderText(filename);
}
