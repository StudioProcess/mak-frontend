// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


// const stream = require('./ws');
// console.log(stream);
// stream.subscribe(e => console.log(e));

const dh = require('./data'); // data handling


const app = require("electron").remote.app;
const THREE = require('three');

const W = 1280;
const H = 720;
console.log("Electron", process.versions.electron+",", "Node.js", process.versions.node+",", "Chromium", process.versions.chrome);

// Setup FPS display
const Stats = require('stats.js');
var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

// Renderer
var scene = new THREE.Scene();
var camera = new THREE.OrthographicCamera( -W/2, W/2, H/2, -H/2, 1, 1000 );
camera.position.z = 1; // need to move the camera outward (distance doesn't matter)
scene.add( camera ); // not needed?
var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize( W, H );
document.body.appendChild( renderer.domElement );



/* 
  RENDER LOOP
 */

let prevTime = 0.0;
let elapsedTime = 0.0;

function animate(time) {
  elapsedTime = time-prevTime;
  prevTime = time;
  // console.log(elapsedTime)
  // 
  stats.begin();
  renderer.render( scene, camera );
  // square.rotation.z += 0.01;
  // line.rotation.z -= 0.01;
  stats.end();
  
  requestAnimationFrame( animate );
}
animate();


// document.addEventListener('keydown', function(e) {
//   if (e.keyCode == 27) { // escape key maps to keycode `27`
//     console.log("esc pressed");
//     app.quit();
//  }
// });
