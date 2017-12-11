varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform float amount;
uniform float time;

float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  
  vec4 texel = texture2D( tDiffuse, vUv );
  gl_FragColor = texel * (1.0 - amount) + rand(vUv * time) * amount;
  
}
