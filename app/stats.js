// Setup FPS display
const debug = require('debug')('stats');
const Stats = require('stats.js');
const stats = new Stats();
let panel = 0;

stats.showPanel( panel ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

stats.nextPanel = function() {
  stats.showPanel( ++panel );
}

stats.show = function() {
  stats.dom.style.display = 'block';
}

stats.hide = function() {
  stats.dom.style.display = 'none';
}

stats.toggle = function() {
  if (stats.dom.style.display != 'none') stats.hide()
  else stats.show();
}

window.addEventListener('keyup', e => {
  if (e.keyCode == 9) { // TAB key
    stats.toggle();
  }
}, true);

// debug(stats);

module.exports = stats;
