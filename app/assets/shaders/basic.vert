// Source: https://github.com/mrdoob/three.js/blob/dev/examples/js/shaders/BasicShader.js

void main() {

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
