// Added by three.js:
// attribute vec3 position;
// attribute vec2 uv;

varying vec2 vUv;
varying vec4 vCoord01;
varying vec4 vCoord23;
varying vec4 vCoord56;
varying vec4 vCoord78;

// uniform vec2 screenSize;
uniform vec2 texOffset; // texture coordinate offset between fragments
uniform float k; // current step length in px

void main() {
  
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); // vertex position in clip coordinates
  
  // +1 /2: normalizes the current vertex position into the [0,1]x[0,1] range
  // * screenSize: current vertex position in px (origin in bottom left)
  //vec2 posRect = (gl_Position.xy + 1.0) / 2.0 * screenSize;
  
  // sampling 8 neighbors around the current vertex (no.4)
  // 6  7  8
  // 3  4  5
  // 0  1  2
  vec4 pos4 = vec4(uv, uv); // current position (no.4) in texture coordinates 
  vec4 textex = vec4(texOffset, texOffset);
  
  // packing two neighbors each into one vec4
  vCoord01 = pos4 + vec4(  -k,  -k, 0.0,  -k) * textex;
  vCoord23 = pos4 + vec4(   k,  -k,  -k, 0.0) * textex;
  vCoord56 = pos4 + vec4(   k, 0.0,  -k,   k) * textex;
  vCoord78 = pos4 + vec4( 0.0,   k,   k,   k) * textex;
  
}
