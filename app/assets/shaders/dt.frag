varying vec2 vUv;
varying vec4 vCoord01;
varying vec4 vCoord23;
varying vec4 vCoord56;
varying vec4 vCoord78;

uniform sampler2D tDiffuse;
// uniform vec2 screenSize;
// uniform vec2 texOffset; // texture coordinate offset between fragments
// uniform float k;


void main() {
  // sample the current fragment and its 8 neighbors
  vec4 n0 = texture2D( tDiffuse, vCoord01.st );
  vec4 n1 = texture2D( tDiffuse, vCoord01.pq );
  vec4 n2 = texture2D( tDiffuse, vCoord23.st );
  vec4 n3 = texture2D( tDiffuse, vCoord23.pq );
  vec4 n4 = texture2D( tDiffuse, vUv ); // current fragment
  vec4 n5 = texture2D( tDiffuse, vCoord56.st );
  vec4 n6 = texture2D( tDiffuse, vCoord56.pq );
  vec4 n7 = texture2D( tDiffuse, vCoord78.st );
  vec4 n8 = texture2D( tDiffuse, vCoord78.pq );
  
  // TODO: select best b
  
  vec4 texel = texture2D( tDiffuse, vUv );
  gl_FragColor = texel;
  
}
