// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const app = require('electron').remote.app;
const debug = require('debug')('renderer');
const THREE = require('three');
window.THREE = THREE; // needed for postprocessing scripts below
require('three/examples/js/postprocessing/EffectComposer');
require('three/examples/js/postprocessing/RenderPass');
require('three/examples/js/postprocessing/ShaderPass');
require('three/examples/js/shaders/CopyShader');
const shader = require('./loadShader');
const DistanceTransformPass = require('./dt');
// debug(THREE);

const config = require('../config');
const data = require('./data'); // data handling
const stats = require('./stats');
const W = config.W * config.RENDER_SCALE;
const H = config.H * config.RENDER_SCALE;;
console.log("Electron", process.versions.electron+",", "Node.js", process.versions.node+",", "Chromium", process.versions.chrome);


// Renderer
var scene = new THREE.Scene();
var camera = new THREE.OrthographicCamera( -W/2, W/2, H/2, -H/2, 1, 1000 );
camera.position.z = 1; // need to move the camera outward (distance doesn't matter)
scene.add( camera ); // not needed?
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( W, H, false ); // false means don't set explicit px styles
renderer.setFaceCulling(THREE.CullFaceNone);
renderer.context.disable(renderer.context.DEPTH_TEST); // try it, but doesn't seem to work this way
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

let vertexData = new Float32Array(config.MAX_POINTS * 2); // 2d vertex positions
let indexData = new Uint32Array(config.MAX_POINTS * 2); // each pair of indices defines a line (GL_LINES)
let geometry = new THREE.BufferGeometry();
let material = new THREE.LineBasicMaterial( {color: 0xffffff, depthTest:false } );
geometry.addAttribute( 'position', new THREE.BufferAttribute(vertexData, 2) );
geometry.setIndex( new THREE.BufferAttribute(indexData, 1) );
geometry.setDrawRange(0, 8);
// geometry.computeBoundingBox();
let lines = new THREE.LineSegments( geometry, material );
lines.frustumCulled = false; // Prevents bounding sphere calculation error
scene.add(lines);
lines.position.x = 140 * config.RENDER_SCALE; // center horizontally on screen


// Postprocessing Setup
const composer = new THREE.EffectComposer(renderer);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);
// renderPass.renderToScreen = true;

const noisePass = new THREE.ShaderPass({
  vertexShader: shader('copy.vert'),
  fragmentShader: shader('noise.frag'),
  uniforms: {
    "tDiffuse": { value: null },
    "time" : { value: 0.0 },
    "amount":  { value: 0.1 }
  }
});
noisePass.material.depthTest = false;
// noisePass.material.depthWrite = false;
debug('noisePass', noisePass.material);

const hillshadePass = new THREE.ShaderPass({
  vertexShader: shader('copy.vert'),
  fragmentShader: shader('hillshade.frag'),
  uniforms: { 
    "tDiffuse": { value: null }, 
    "texOffset": { value: new THREE.Vector2(1.0/W, 1.0/H) },
    "azimuth": { value: 119 },
    "altitude": { value: 45 },
    "cellsize": { value: 1.0 },
    "z_factor": { value: 160.0 }
  }
});
hillshadePass.material.depthTest = false;
debug('hillshadePass', hillshadePass.material);

const dtPass = new DistanceTransformPass(THREE, renderer);
dtPass.finalPass.uniforms.maxDist.value = 5;
composer.addPass(dtPass);
// dtPass.renderToScreen = true;

composer.addPass(hillshadePass);
// hillshadePass.renderToScreen = true;

composer.addPass(noisePass);
noisePass.renderToScreen = true;





// const finalPass = new THREE.ShaderPass({
//   vertexShader: shader('copy.vert'),
//   fragmentShader: shader('dt_final.frag'),
//   uniforms: { "tDiffuse": { value: null } }
// });
// 
// composer.addPass(finalPass);
// finalPass.renderToScreen = true;


/* 
  RENDER LOOP
 */

let pageData;
let nodeData = [];
let dataNeedsUpdate;

const ox = config.PAGE_OFFSET[0];
const oy = config.PAGE_OFFSET[1];
const s = Math.min( W / config.PAGE_DIMENSIONS[0], H / config.PAGE_DIMENSIONS[1]);

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
      positions.set( [-W/2 + (node.x-ox) * s, H/2 - (node.y-oy) * s], iv );
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

// let prevTime = 0.0;
// let elapsedTime = 0.0;

function animate(time) {
  stats.begin();
  // elapsedTime = time-prevTime;
  // prevTime = time;

  update(time);
  noisePass.uniforms.time.value = time;
  hillshadePass.uniforms.azimuth.value += 0.33;
    // hillshadePass.uniforms.altitude.value += 0.33;
    
  // altitude = (altitude + 0.5) % 360;
  // hillshadePass.uniforms.altitude.value = altitude;
  // dtPass.finalPass.uniforms.maxDist.value -= 0.5;
  // renderer.render( scene, camera );
  composer.render(time);
  
  // let dep = renderer.context.getParameter(renderer.context.DEPTH_TEST);
  // debug("depth test", dep);
  
  stats.end();
  requestAnimationFrame( animate );
}
animate();



/* 
  LOAD PAGE DATA
 */
let currentPage = 12;

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
