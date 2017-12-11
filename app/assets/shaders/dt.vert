varying vec2 vUv;
varying vec4 vCoord01;
varying vec4 vCoord23;
varying vec4 vCoord56;
varying vec4 vCoord78;

uniform vec2 screenSize;
uniform float k;

void main() {
  
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  
  vec2 posRect = (gl_Position.xy + 1.0) / 2.0 * screenSize;
  vec4 pos4 = vec4(posRect, posRect);
  vCoord01 = pos4 + vec4(-k, -k, 0.0, -k);
  vCoord23 = pos4 + vec4(k, -k, -k, 0.0);
  vCoord56 = pos4 + vec4(k, 0.0, -k, k);
  vCoord78 = pos4 + vec4(0.0, k, k, k);
  
}
