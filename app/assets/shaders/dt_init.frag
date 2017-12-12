#define INF 99999.

varying vec2 vUv;

uniform sampler2D tDiffuse; // source rendertarget

void main() {
  
  float r = texture2D( tDiffuse, vUv ).r; // color of the source pixel (use only the red channel)
  
  // white: seed pixels. vector (0,0), squared distance 0
  if (r > 0.5) {
    gl_FragColor = vec4(0.0);
  }
  
  // black: background pixels. vector (Inf,Inf), squared distance Inf
  else {
    gl_FragColor = vec4(INF);
  }
  
}
