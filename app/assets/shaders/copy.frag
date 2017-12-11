// Source: https://github.com/mrdoob/three.js/blob/dev/examples/js/shaders/CopyShader.js

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float opacity;

void main() {
  
  vec4 texel = texture2D( tDiffuse, vUv );
  gl_FragColor = opacity * texel;
  
}
