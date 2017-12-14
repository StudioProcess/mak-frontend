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
var renderer = new THREE.WebGLRenderer({ antialias: false });
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
dtPass.finalPass.uniforms.maxDist.value = 150;
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





class RenderManager {
  
  constructor(geometry) {
    /* RENDER SYSTEM */
    this.render = {
      geometry: geometry,
      
      positionAttr: geometry.attributes.position, // BufferAttribute holding positions
      indexAttr: geometry.index, // BufferAttribute holding indices
      
      positionData: geometry.attributes.position.array, // TypedArray holding position data
      indexData: geometry.index.array, // TypedArray holding index data
      
      nodeCount: 0, // total number of nodes available
      positionPointer: 0, // i.e. length of position data to render
      indexPointer: 0, // i.e. length of index data to render
    };
    
    /* ANIMATION SYSTEM */
    this.anim = {
      offsetIdx:0,
      currentIdx: 0, // index we're currently drawing up to
      targetIdx: 0, // index to draw up to when animation is finished
      startTime: 0, // when the animation was started
      speed: config.ANIM_SPEED, // animation speed in indices per second
      liveSpeed: config.ANIM_SPEED_LIVE,
      isLive: false
    };
    
    /* UPDATE SYSTEM */
    this.updateState = { // can't call it 'update' because of the function
      needsUpdate: false, // setting this to true triggers data upload on next update
      strokes: [], // Stroke data to upload
      clearPage: false, // whether to start a new page when updating (nulls all data and adds from the beginning)
    };
  }
  
  // // get node list from a stroke
  // static function getNodes(stroke) {
  //   return data.reduce( (acc, stroke) => acc.concat(stroke.nodes), [] );
  // }
  
  clearPage() {
    this.updateDataNewPage([]); // just update with an empty stroke array
  }
  
  // set update system state for putting data for a completely new page
  updateDataNewPage(strokes) {
    this.updateState.strokes = strokes;
    this.updateState.clearPage = true;
    this.updateState.needsUpdate = true;
  }
  
  // set update system state for putting data for one additional stroke
  updateDataAddStroke(stroke) {
    if (!this.updateState.needsUpdate) {
      this.updateState.strokes = [stroke];
      this.updateState.needsUpdate = true;
    } else {
      this.updateState.strokes.push(stroke);
    }
    this.updateState.clearPage = false;
  }
  
  // update data according to update system state
  updateData() {
    if (this.updateState.clearPage) {
      this.render.indexData.fill(0); // clear index data so we can overdraw a bit
      this.render.nodeCount = 0;
      this.render.positionPointer = 0; // start filling at the beginning
      this.render.indexPointer = 0; // start filling at the beginning
    }
    let positionPointerStart = this.render.positionPointer; // save position pointer
    let indexPointerStart = this.render.indexPointer; // save index pointer

    let n_stroke = 0; // node index within the current stroke
    
    strokeLoop: // label to break out of this loop
    for (let stroke of this.updateState.strokes) {
      for (let node of stroke.nodes) {
        if (this.render.nodeCount >= config.MAX_POINTS) {
          break strokeLoop; // break out of the whole loop
        }
        
        this.render.positionData.set(
          [ -W/2 + (node.x-ox) * s,  H/2 - (node.y-oy) * s ],
          this.render.positionPointer
        );
        this.render.positionPointer += 2;
        
        if (n_stroke > 0) {
          this.render.indexData.set(
            [ this.render.nodeCount-1, this.render.nodeCount],
            this.render.indexPointer
          );
          this.render.indexPointer += 2;
        }
        
        this.render.nodeCount++;
        n_stroke++;
      }
      n_stroke = 0; // reset node count within stroke
    }
    
    this.render.positionAttr.needsUpdate = true;
    this.render.indexAttr.needsUpdate = true;
    let numPositionsUpdated = this.render.positionPointer - positionPointerStart;
    let numIndicesUpdated = this.render.indexPointer - indexPointerStart;
    if (this.updateState.clearPage) {
      this.render.positionAttr.updateRange.offset = 0;
      this.render.positionAttr.updateRange.count = -1;
      this.render.indexAttr.updateRange.offset = 0;
      this.render.indexAttr.updateRange.count = -1;
    } else {
      this.render.positionAttr.updateRange.offset = positionPointerStart;
      this.render.positionAttr.updateRange.count = numPositionsUpdated;
      this.render.indexAttr.updateRange.offset = indexPointerStart;
      this.render.indexAttr.updateRange.count = numIndicesUpdated;
    }
    this.render.geometry.setDrawRange(0, this.render.nodeCount*2);
    debug('nodes updated:', numPositionsUpdated/2);
    debug('nodes total:', this.render.nodeCount);
  }
  
  
  // call every frame
  // update data (if necessary) and animation
  update(time) {
    
    // new data coming
    if (this.updateState.needsUpdate) {
      this.updateData();
      this.updateState.needsUpdate = false;
      
      // calculate number of new indices based on stroke data
      let newIndices = 0;
      for (let stroke of this.updateState.strokes) {
        newIndices += (stroke.nodes.length - 1) * 2;
      }
      debug("NEW INDICES", newIndices);
      
      if (this.updateState.clearPage) { // restart animation from beginning
        this.anim.startTime = time;
        this.anim.offsetIdx = 0;
        this.anim.currentIdx = 0;
        this.anim.targetIdx = newIndices;
        debug("CLEAR PAGE", this.anim);
      } else {
        if (this.anim.currentIdx >= this.anim.targetIdx) { // animation is finished
          this.anim.startTime = time;
        }
        this.anim.targetIdx += newIndices;
      }
    }
    
    let animationTime = time - this.anim.startTime;
    let speed = this.anim.isLive ? this.anim.liveSpeed : this.anim.speed;
    // Fixed speed animation looks much better than stored values:
    this.anim.currentIdx = this.anim.offsetIdx + animationTime/1000 * speed;
    
    // if (this.currentIdx >= this.render.nodeCount) this.currentIdx = this.render.nodeCount; // don't draw more than neccessary
    if (this.anim.currentIdx >= this.anim.targetIdx) { // hitting end of animation
      this.anim.currentIdx = this.anim.targetIdx;
      this.anim.offsetIdx = this.anim.targetIdx;
      // debug("HITTING END", this.anim);
    }
    
    this.render.geometry.setDrawRange(0, this.anim.currentIdx);
  }
  
}

const renderMan = new RenderManager(geometry);
debug(renderMan);





/* 
  RENDER LOOP
 */

const ox = config.PAGE_OFFSET[0];
const oy = config.PAGE_OFFSET[1];
const s = Math.min( W / config.PAGE_DIMENSIONS[0], H / config.PAGE_DIMENSIONS[1]);


// ANIMATION PARAMETERS
let baseDist = 220;
let aziSpeed = 10;

let altMin = 18;
let altMax = 60;
let altSpeed = 1;

function animate(time) {
  stats.begin();
  
  renderMan.update(time);
  
  dtPass.finalPass.uniforms.maxDist.value = baseDist + Math.sin(time/10000) * baseDist + 10;
  
  hillshadePass.uniforms.azimuth.value = (time/1000.0 * aziSpeed) % 360;
  hillshadePass.uniforms.altitude.value = altMin + (altMax-altMin) * (Math.sin(time/10000*altSpeed)*0.5 + 0.5);
  
  noisePass.uniforms.time.value = time;
  // hillshadePass.uniforms.z_factor = 

  composer.render(time);
  
  stats.end();
  requestAnimationFrame( animate );
}
animate();



/* 
  LOAD PAGE DATA
 */
let currentPage = config.START_PAGE;

function loadPageNumber(n) {
  if (n < 1) n = 1; // 1 is the first page number
  debug('LOADING PAGE', n);
  data.getPage(n).then(data => {
    renderMan.updateDataNewPage(data);
    currentPage = n;
  });
}

function loadRandomPage() {
  data.getRandomPageNumber().then(pageNum => {
    loadPageNumber(pageNum);
  });
}

loadPageNumber(currentPage);

window.addEventListener('keyup', e => {
  if (e.keyCode == 37) { // LEFT ARROW
    loadPageNumber(currentPage - 1);
    // resetIdleTimer();
  } 
  else if (e.keyCode == 39) { // RIGHT ARROW
    loadPageNumber(currentPage + 1);
    // resetIdleTimer();
  }
}, true);

window.addEventListener('keyup', e => {
  if (e.keyCode == 80) { // P
    loadRandomPage();
    // resetIdleTimer();
  } 
}, true);



/* 
  LIVE DATA
 */
let currentlivePageId;

data.stroke$.subscribe(stroke => {
  //debug("LIVE STROKE", stroke);
  resetIdleTimer();
  
  if (!renderMan.anim.isLive) { // we are NOT live -> GO LIVE
    renderMan.clearPage();
    renderMan.anim.isLive = true;
  } else { // we ARE live -> check if we have changed the page while writing
    if (!data.noteIdEquals(currentlivePageId, stroke.noteId)) {
      renderMan.clearPage(); // clear the page, since we have changed pages while writing
    }
  }
  currentlivePageId = stroke.noteId; // keep track of the page we're writing on
  
  // add the stroke only in the NEXT frame, since we might need to be clearing the page first
  requestAnimationFrame(() => { renderMan.updateDataAddStroke(stroke); });
});




/* 
  IDLE MODE
 */
let slideTimer = 0;
let idleTimer = 0;

function nextSlide() {
  debug("NEXT SLIDE");
  loadRandomPage();
  // slideTimer = setTimeout( nextSlide, config.SLIDE_TIME );
}

function startIdleMode() {
  debug("START IDLE");
  idleTimer = setInterval(nextSlide, config.SLIDE_TIME);
  renderMan.anim.isLive = false;
  nextSlide();
}

function resetIdleTimer() {
  // debug("TIMER RESET", slideTimer, idleTimer );
  clearInterval( slideTimer );
  clearTimeout( idleTimer );
  idleTimer = setTimeout( startIdleMode, config.IDLE_BEFORE_SLIDESHOW );
}

resetIdleTimer();


// class IdleMode {
//   constructor() {
//     this.resetTimer();
//     debug(this);
//   }
// 
//   nextSlide() {
//     debug("NEXT SLIDE");
//     loadRandomPage();
//     this.slideTimer = setTimeout( this.nextSlide.bind(this), config.SLIDE_TIME );
//   }
// 
//   resetTimer() {
//     debug("TIMER RESET");
//     clearTimeout( this.slideTimer );
//     clearTimeout( this.switchTimer );
//     this.switchTimer = setTimeout( this.nextSlide.bind(this), config.IDLE_BEFORE_SLIDESHOW );
//   }
// }
// 
// let idleMode = new IdleMode();
