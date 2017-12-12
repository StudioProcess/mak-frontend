const debug = require('debug')('dt');
const shader = require('./loadShader');
let THREE;

class DistanceTransformPass {
  
  constructor(three, renderer) {
    THREE = three;
    THREE.Pass.call( this );
    
    this.renderer = renderer;
    
    let parameters = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBFormat, // 3 components
      type: THREE.FloatType, // 32 bpc
      depthBuffer: false,
      stencilBuffer: false
    };
    
    let size = renderer.getDrawingBufferSize();
    let rt = new THREE.WebGLRenderTarget( size.width, size.height, parameters );
    this.rt1 = rt;
    this.rt2 = rt.clone();
    this.readBuffer = this.rt1;
    this.writeBuffer = this.rt2;
    
    this.initPass = new THREE.ShaderPass({
      vertexShader: shader('copy.vert'),
      fragmentShader: shader('dt_init.frag'),
      uniforms: { "tDiffuse": { value: null } }
    });
    this.initPass.needsSwap = false;
    
    this.finalPass = new THREE.ShaderPass({
      vertexShader: shader('copy.vert'),
      fragmentShader: shader('dt_final.frag'),
      uniforms: { "tDiffuse": { value: null } }
    });
  }
  
  swapBuffers() {
    let tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;
  }
  
  setSize() {}
  
  render( renderer, targetBuffer, sourceBuffer, delta, maskActive ) {
    // debug( renderer, targetBuffer, sourceBuffer, delta, maskActive );
    
    // initialize the read buffer from the source render target
    // Use a fragment shader to set initial vectors and squared distances
    //                              target           source
    this.initPass.render( renderer, this.readBuffer, sourceBuffer, delta, false );
    
    // TODO: jump flooding algoritm (JFA)
    
    // render the distance field to the final render target
    this.finalPass.renderToScreen = this.renderToScreen;
    this.finalPass.needsSwap = this.needsSwap;
    //                               target        source
    this.finalPass.render( renderer, targetBuffer, this.readBuffer, delta, false );
    // this.finalPass.render( renderer, targetBuffer, sourceBuffer, delta, maskActive );

  }
  
}

module.exports = DistanceTransformPass;
