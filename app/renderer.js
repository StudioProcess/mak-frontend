// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const app = require('electron').remote.app;
const debug = require('debug')('renderer');
const THREE = require('three');
const config = require('../config');
const data = require('./data'); // data handling
const W = config.W;
const H = config.H;
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
renderer.setSize( W, H, false ); // false means don't set explicit px styles
renderer.domElement.id = "three_canvas";
document.body.appendChild( renderer.domElement );



// Stroke Data i.e. multiple line strips
// BufferGeometry // Vertex Buffer, Element Buffer, Attributes
// .addAttribute
// .setIndex
// -> need to use line segments to render lines with gaps from ONE buffer in ONE call
// https://stackoverflow.com/questions/45903837/multiple-strip-lines-in-one-draw-call
// 
// LineBasicMaterial
// LineSegments

let vertexData = new Float32Array(config.MAX_POINTS * 2);
let indexData = new Uint32Array(config.MAX_POINTS * 2);

// 2d vertex positions
vertexData.set([
  -500, 0,
  -300, 200,
  -100, 0,
   100, 0,
   300, 200,
   500, 0
]);
// each pair of indices defines a line
indexData.set([
  0, 1, 1, 2, // 1st stroke 
  3, 4, 4, 5  // 2nd stroke
]);

let geometry = new THREE.BufferGeometry();
let material = new THREE.LineBasicMaterial( {color: 0xffffff, linewidth: 3} );
geometry.addAttribute( 'position', new THREE.BufferAttribute(vertexData, 2) );
geometry.setIndex( new THREE.BufferAttribute(indexData, 1) );
geometry.setDrawRange(0, 8);
// geometry.computeBoundingBox();
let lines = new THREE.LineSegments( geometry, material );
scene.add(lines);



/* 
  RENDER LOOP
 */

let pageData;
let nodeData = [];
let dataNeedsUpdate;

function updateData() {
  // vertex buffer attribute is here: geometry.attributes.position
  // index buffer attribute is here: geometry.index
  // properties: array, needsUpdate, updateRange()

  let positions = geometry.attributes.position.array;
  let indices = geometry.index.array;
  
  let n = 0; // current node
  let n_stroke = 0; // current node within the current stroke
  
  let iv = 0; // current index into vertex buffer
  let ie = 0; // current index into index (i.e. element) buffer
  
  for (let stroke of pageData) {
    if (n >= config.MAX_POINTS) break;
    for (let node of stroke.nodes) {
      if (n >= config.MAX_POINTS) break;
      positions.set( [-config.W/2 + (node.x-5) * 10, config.H/2 - (node.y-5) * 10], iv );
      iv += 2;
      if (n_stroke > 0) {
        indices.set( [n-1, n], ie );
        ie += 2;
      }
      n_stroke++;
      n++;
    }
    n_stroke = 0;
  }
  debug('uploaded nodes:', n);
  geometry.attributes.position.needsUpdate = true;
  geometry.index.needsUpdate = true;
  geometry.setDrawRange(0, n);
}


let animationStart;
let firstNodeTime;
let currentIdx = 0;

function update(time) {
  if (dataNeedsUpdate) {
    updateData();
    dataNeedsUpdate = false;
    animationStart = time;
    firstNodeTime = nodeData[0].time;
    currentIdx = 0;
  }
  let animationTime = time - animationStart;
  let lookupTime = firstNodeTime + animationTime;
  while (currentIdx < nodeData.length 
      && nodeData[currentIdx].time < lookupTime) {
    currentIdx++;
  }
  // currentIdx += 5; // looks much better than stored values
  geometry.setDrawRange(0, currentIdx);
}

let prevTime = 0.0;
let elapsedTime = 0.0;

function animate(time) {
  elapsedTime = time-prevTime;
  prevTime = time;
  
  stats.begin();
  update(time);
  // square.rotation.z += 0.01;
  // line.rotation.z -= 0.01;
  renderer.render( scene, camera );
  stats.end();
  
  requestAnimationFrame( animate );
}
animate();


// load some data
data.getPage(4).then(data => {
  let nodes = data.reduce((acc, stroke) => acc.concat(stroke.nodes), []);
  
  // debug('page 4 nodes:', nodes.length);
  // debug('page 4 nodes', nodes);
  pageData = data;
  nodeData = nodes;
  dataNeedsUpdate = true;
});
