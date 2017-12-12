#define INF 999999.

varying vec2 vUv;
varying vec4 vCoord01;
varying vec4 vCoord23;
varying vec4 vCoord56;
varying vec4 vCoord78;

uniform sampler2D tDiffuse;
// uniform vec2 screenSize;
uniform vec2 texOffset; // texture coordinate offset between fragments
uniform float k;

vec4 pickBetter(vec4 n, vec2 offset, vec4 previousBest) {
  if (n.z < INF) {
    n += vec4(offset, 0.0, 0.0);
    n.z += 2.0 * n.x * offset.x 
        + offset.x * offset.x
        + 2.0 * n.y * offset.y
        + offset.y * offset.y;
  }
  if (n.z < previousBest.z) return n;
  return previousBest;
} 

void main() {
  // sample the current fragment and its 8 neighbors
  // 6  7  8
  // 3  4  5
  // 0  1  2
  vec4 n0 = texture2D( tDiffuse, vCoord01.st );
  vec4 n1 = texture2D( tDiffuse, vCoord01.pq );
  vec4 n2 = texture2D( tDiffuse, vCoord23.st );
  vec4 n3 = texture2D( tDiffuse, vCoord23.pq );
  vec4 n4 = texture2D( tDiffuse, vUv ); // current fragment
  vec4 n5 = texture2D( tDiffuse, vCoord56.st );
  vec4 n6 = texture2D( tDiffuse, vCoord56.pq );
  vec4 n7 = texture2D( tDiffuse, vCoord78.st );
  vec4 n8 = texture2D( tDiffuse, vCoord78.pq );
  
  // TODO: select best neighbor
  vec4 best = pickBetter(n0, vec2(-k, -k), n4);
  best = pickBetter(n1, vec2( 0.0, -k), best);
  best = pickBetter(n2, vec2( k, -k), best);
  best = pickBetter(n3, vec2(-k,  0.0), best);
  best = pickBetter(n5, vec2( k,  0.0), best);
  best = pickBetter(n6, vec2(-k,  k), best);
  best = pickBetter(n7, vec2( 0.0,  k), best);
  best = pickBetter(n8, vec2( k,  k), best);
  
  gl_FragColor = best;
  
// TESTING: flip distances
  // if (n4.z > 10000.0) {
  //   gl_FragColor = vec4(0.0);
  // } else {
  //   gl_FragColor = vec4(INF);
  // }
  
}
