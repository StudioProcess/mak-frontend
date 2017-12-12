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
    // this.numPasses = Math.max(size.width, size.height) / 2;
    this.numPasses = 11; // for 1280 px 
    
    this.initPass = new THREE.ShaderPass({
      vertexShader: shader('copy.vert'),
      fragmentShader: shader('dt_init.frag'),
      uniforms: { "tDiffuse": { value: null } }
    });
    this.initPass.needsSwap = false;
    this.initPass.material.depthTest = false;

    this.finalPass = new THREE.ShaderPass({
      vertexShader: shader('copy.vert'),
      fragmentShader: shader('dt_final.frag'),
      uniforms: { 
        "tDiffuse": { value: null },
        "maxDist": { value: 5.0 }
      }
    });
    this.finalPass.material.depthTest = false;
    
    this.jfaPass = new THREE.ShaderPass({
      vertexShader: shader('dt.vert'),
      fragmentShader: shader('dt.frag'),
      uniforms: { 
        "tDiffuse": { value: null },
        "texOffset": { value: new THREE.Vector2(1.0/size.width, 1.0/size.height) },
        "k": { value: 1.0 }
      }
    });
    this.jfaPass.material.depthTest = false;
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
    this.initPass.render( renderer, this.readBuffer, sourceBuffer, delta, maskActive );
    
    // run jump flooding algoritm (JFA) in ping pong loop
    let k = 1024; // for 1280 px 
    for (let i=0; i<this.numPasses; i++) {
      this.jfaPass.uniforms['k'].value = k;
      //                             target            source
      this.jfaPass.render( renderer, this.writeBuffer, this.readBuffer, delta, maskActive)
      this.swapBuffers();
      k = k / 2;
    }
    
    // render the distance field to the final render target
    this.finalPass.renderToScreen = this.renderToScreen;
    this.finalPass.needsSwap = this.needsSwap;
    //                               target        source
    this.finalPass.render( renderer, targetBuffer, this.readBuffer, delta, maskActive );

  }
  
}

module.exports = DistanceTransformPass;
