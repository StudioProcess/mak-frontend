// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const app = require('electron').remote.app;
const debug = require('debug')('renderer');
const THREE = require('three');
const config = require('../config');
const data = require('./data'); // data handling
const stats = require('./stats');
const W = config.W;
const H = config.H;
console.log("Electron", process.versions.electron+",", "Node.js", process.versions.node+",", "Chromium", process.versions.chrome);


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
  // clear arrays
  positions.fill(0);
  indices.fill(0);
  
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
let currentIdx = 0; // current dot index
let animationSpeed = 200; // in nodes per second

function update(time) {
  if (dataNeedsUpdate) {
    updateData();
    dataNeedsUpdate = false;
    animationStart = time;
    firstNodeTime = nodeData.length > 0 ? nodeData[0].time : 0;
    currentIdx = 0;
  }
  let animationTime = time - animationStart;
  // Animation based on stored values
  // let lookupTime = firstNodeTime + animationTime;
  // while (currentIdx < nodeData.length 
  //     && nodeData[currentIdx].time < lookupTime) {
  //   currentIdx++;
  // }
  // Fixed speed animation looks much better than stored values:
  currentIdx = animationTime/1000 * animationSpeed;
  if (currentIdx >= nodeData.length) currentIdx = nodeData.length; // don't draw more than neccessary
  geometry.setDrawRange(0, currentIdx*2); // TODO: need correct length, respecting stroke gaps
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



/* 
  LOAD PAGE DATA
 */
let currentPage = 2;

function loadPage(n) {
  if (n < 1) n = 1; // 1 is the first page number
  debug('loading page', n);
  data.getPage(n).then(data => {
    // if (data.length == 0) return; // nothing to see here
    let nodes = data.reduce((acc, stroke) => acc.concat(stroke.nodes), []);
    pageData = data;
    nodeData = nodes;
    dataNeedsUpdate = true;
    currentPage = n;
    
    debug("strokes", pageData.length);
    debug("nodes", nodeData.length);
  });
}

loadPage(currentPage);

window.addEventListener('keyup', e => {
  if (e.keyCode == 37) { // LEFT ARROW
    loadPage(currentPage - 1);
  } 
  else if (e.keyCode == 39) { // RIGHT ARROW
    loadPage(currentPage + 1);
  }
}, true);
