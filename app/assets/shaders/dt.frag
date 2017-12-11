varying vec2 vUv;
varying vec4 vCoord01;
varying vec4 vCoord23;
varying vec4 vCoord56;
varying vec4 vCoord78;

uniform sampler2D tDiffuse;
uniform vec2 screenSize;
uniform float k;


void main() {
  vec4 n0 = texture2D( tDiffuse, vCoord01.xy );
  
  vec4 texel = texture2D( tDiffuse, vUv );
  gl_FragColor = texel;
  
}
