#define INF 999999.

varying vec2 vUv;

uniform sampler2D tDiffuse; // source rendertarget

float maxDist = 55.0;
vec4 minColor = vec4( 1.0 ); // color for distance 0
vec4 maxColor = vec4( vec3(0.0), 1.0 ); // color for maxDist and higher
// TESTING
// vec4 minColor = vec4(1.0, 0.0, 0.0, 1.0);
// vec4 maxColor = vec4(0.0, 0.0, 1.0, 1.0);

void main() {
  
  float maxDistSq = maxDist * maxDist;
  
  vec3 distVector = texture2D( tDiffuse, vUv ).xyz; // (dx, dy, squared dist)
  float dist = min(distVector.z, maxDistSq); // clamp at maxDistSq
  
  gl_FragColor = mix(minColor, maxColor, dist/maxDistSq);
  
  // if (dist < 999.) gl_FragColor = minColor;
  // else gl_FragColor = maxColor;
  
}
