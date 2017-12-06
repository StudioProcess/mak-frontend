// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const stream = require('./ws');
console.log(stream);

stream.subscribe(e => console.log(e));

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
console.log(renderer);

// Geometry
let squareGeometry = new THREE.PlaneBufferGeometry( 100, 100 );
let squareMaterial = new THREE.MeshBasicMaterial( {color: 0xffff00} );
var square = new THREE.Mesh( squareGeometry, squareMaterial );
scene.add( square );

// Data
let data = require('./assets/data/loop.json');


function cleanEvents(eventData) {
  return eventData.filter( (event) => event.type != 'stroke' || (event.node.x >= 0 && event.node.y >= 0) );
}

// Create Stroke array from event data
// Stroke: { downTime, upTime, duration, timeDiff, nodes:[Node] }
// Node: { x, y, timeDiff, pressure }
function strokesFromEvents(eventData) {
  return eventData.reduce((acc, event) => {
    if (event.type == 'updown') {
      if (event.status == 'down') {
        let timeDiff = acc.length == 0 ? 0 : event.time - acc[acc.length-1].upTime;
        acc.push({ downTime: event.time, upTime: 0, duration: 0, timeDiff, nodes: [] });
      } else if (event.status == 'up') {
        let stroke = acc[acc.length-1];
        stroke.upTime = event.time;
        stroke.duration = stroke.upTime - stroke.downTime;
      }
    } else if (event.type == 'stroke') {
      acc[acc.length-1].nodes.push(event.node);
      // TODO: add absolute time
    }
    return acc;
  }, []);
}

// TODO: simplify strokes

// Create vertex array for rendering
function vertexArrayFromStrokes(strokes) {
  const offset = 5;
  const scale = 10;
  
  // let initialData = [-W/2, H/2, -W/2, -H/2, W/2, -H/2, W/2, H/2, -W/2, H/2,];
  let initialData = [];
  let vertexData = strokes.reduce((acc, stroke) => {
    let strokeVertices = stroke.nodes.reduce((acc, node) => {
      acc.push( -W/2 + (node.x-offset)*scale, H/2 - (node.y-offset)*scale ); // 
      return acc;
    }, []);
    return acc.concat(strokeVertices);
  }, initialData);
  
  
  return new Float32Array(vertexData);
}


data = cleanEvents(data);
console.log(data);
let strokes = strokesFromEvents(data);
// console.log(strokes);
let vertexData = vertexArrayFromStrokes(strokes);
// console.log(vertexData);

let lineGeometry = new THREE.BufferGeometry();
lineGeometry.addAttribute( 'position', new THREE.BufferAttribute(vertexData, 2) );
let lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
let line = new THREE.Line( lineGeometry, lineMaterial );
scene.add( line );


// triangulation
const earcut = require('earcut');
let triangles = earcut(vertexData);
let indexData = new Int32Array(triangles);
// console.log(indexData);

let tessGeometry = new THREE.BufferGeometry();
tessGeometry.addAttribute( 'position', new THREE.BufferAttribute(vertexData, 2) );
tessGeometry.setIndex( new THREE.BufferAttribute(indexData, 1) );
let tessMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
let tessMesh = new THREE.Mesh( tessGeometry, tessMaterial );
scene.add(tessMesh);



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
  square.rotation.z += 0.01;
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
