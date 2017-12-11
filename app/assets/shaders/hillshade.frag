#define PI 3.1415926535897932384626433832795

// varying vec4 vertColor;
varying vec2 vUv; // texture coordinates

uniform sampler2D  tDiffuse; // input texture
uniform vec2       texOffset; // texture coordinate offset between fragments
// uniform vec2 screenSize;

// uniform vec3       color = vec3(1.0, 1.0, 1.0);
// uniform float      opacity = 1.0;
// uniform vec2       elevationRange = vec2(0.0, 1.0);

uniform float      azimuth; // compass direction, measured clockwisre form the north [0, 360]
uniform float      altitude; // degrees above horizontal [0, 90]
// both of these influence contrast
uniform float      z_factor; // makes contrast higher
uniform float      cellsize; // makes contrast lower


// returns 0.0 for full shade and 1.0 for full sunlight
float shade() {
  float zenith_rad = radians(90.0 - altitude);
  float azimuth_rad = radians(360.0 + azimuth - 90.0);
  if (azimuth_rad >= 2.0*PI) azimuth_rad -= 2.0*PI;
  
  vec2 tc_a = vUv.st + vec2(-texOffset.s, +texOffset.t);
  vec2 tc_b = vUv.st + vec2(         0.0, +texOffset.t);
  vec2 tc_c = vUv.st + vec2(+texOffset.s, +texOffset.t);
  vec2 tc_d = vUv.st + vec2(-texOffset.s,          0.0);
  vec2 tc_e = vUv.st + vec2(         0.0,          0.0);
  vec2 tc_f = vUv.st + vec2(+texOffset.s,          0.0);
  vec2 tc_g = vUv.st + vec2(-texOffset.s, -texOffset.t);
  vec2 tc_h = vUv.st + vec2(         0.0, -texOffset.t);
  vec2 tc_i = vUv.st + vec2(+texOffset.s, -texOffset.t);
  
  float a = texture2D(tDiffuse, tc_a).r;
  float b = texture2D(tDiffuse, tc_b).r;
  float c = texture2D(tDiffuse, tc_c).r;
  float d = texture2D(tDiffuse, tc_d).r;
  float e = texture2D(tDiffuse, tc_e).r;
  float f = texture2D(tDiffuse, tc_f).r;
  float g = texture2D(tDiffuse, tc_g).r;
  float h = texture2D(tDiffuse, tc_h).r;
  float i = texture2D(tDiffuse, tc_i).r;
  
  float dx = ((c + 2.0*f + i) - (a + 2.0*d + g)) / (8.0 * cellsize);
  float dy = ((g + 2.0*h + i) - (a + 2.0*b + c)) / (8.0 * cellsize);
  
  float slope_rad = atan(z_factor * sqrt(dx*dx + dy*dy));
  
  float aspect_rad = 0.0;
  if (dx != 0.0) {
    aspect_rad = atan(dy, -dx);
    if (aspect_rad < 0.0) aspect_rad += 2.0*PI;
  } else {
    if (dy > 0.0) aspect_rad = PI/2.0;
    else if (dy < 0.0) aspect_rad = 1.5*PI;
  }
  
  return ( cos(zenith_rad) * cos(slope_rad) ) 
    + ( sin(zenith_rad) * sin(slope_rad) * cos(azimuth_rad-aspect_rad) );
}

void main(void) {
  // vec4 col = texture2D(tDiffuse, vUv.st);
  // gl_FragColor = vec4(1.0, col.gba);
  // gl_FragColor = vec4( col.rgb * (1-shade()), 1.0 );
  
  // gl_FragColor = col.rgba;

  gl_FragColor = vec4( shade() );
}
