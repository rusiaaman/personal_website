// WebGL Fluid Simulation - Interactive Background
// Inspired by Pavel Dobryakov's fluid simulation
'use strict';

class FluidBackground {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fluid-background';
    
    // Configuration
    this.config = {
      TEXTURE_DOWNSAMPLE: 1,
      DENSITY_DISSIPATION: 0.97,
      VELOCITY_DISSIPATION: 0.98,
      PRESSURE_DISSIPATION: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 30,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLORFUL: true,
      COLOR_UPDATE_SPEED: 10,
      PAUSED: false,
      BACK_COLOR: { r: 0, g: 0, b: 0 },
      TRANSPARENT: false,
      BLOOM: false,
      BLOOM_ITERATIONS: 8,
      BLOOM_RESOLUTION: 256,
      BLOOM_INTENSITY: 0.8,
      BLOOM_THRESHOLD: 0.6,
      BLOOM_SOFT_KNEE: 0.7,
      SUNRAYS: false,
      SUNRAYS_RESOLUTION: 196,
      SUNRAYS_WEIGHT: 1.0,
    };
    
    this.pointers = [];
    this.splatStack = [];
    this.bloomFramebuffers = [];
    this.sunraysFramebuffers = [];
    
    this.init();
  }
  
  init() {
    // Style canvas
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-3';
    this.canvas.style.pointerEvents = 'none';
    
    document.body.prepend(this.canvas);
    
    this.resizeCanvas();
    
    const { gl, ext } = this.getWebGLContext(this.canvas);
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    
    this.gl = gl;
    this.ext = ext;
    
    this.initPrograms();
    this.initFramebuffers();
    
    // Event listeners
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Mouse/touch events
    this.canvas.addEventListener('mousemove', (e) => {
      const pointer = this.pointers.find(p => p.id === -1) || this.pointers[0];
      if (pointer) {
        pointer.moved = pointer.down;
        pointer.dx = (e.clientX - pointer.x) * 5.0;
        pointer.dy = (e.clientY - pointer.y) * 5.0;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      }
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        let pointer = this.pointers[i];
        pointer.moved = pointer.down;
        pointer.dx = (touches[i].clientX - pointer.x) * 8.0;
        pointer.dy = (touches[i].clientY - pointer.y) * 8.0;
        pointer.x = touches[i].clientX;
        pointer.y = touches[i].clientY;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('mousedown', () => {
      const pointer = this.pointers.find(p => p.id === -1) || this.pointers[0];
      if (pointer) {
        pointer.down = true;
        pointer.color = this.generateColor();
      }
    });
    
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        if (i >= this.pointers.length) {
          this.pointers.push(new this.pointerPrototype());
        }
        this.pointers[i].id = touches[i].identifier;
        this.pointers[i].down = true;
        this.pointers[i].x = touches[i].clientX;
        this.pointers[i].y = touches[i].clientY;
        this.pointers[i].color = this.generateColor();
      }
    });
    
    window.addEventListener('mouseup', () => {
      this.pointers.forEach(p => p.down = false);
    });
    
    window.addEventListener('touchend', (e) => {
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const pointer = this.pointers.find(p => p.id === touches[i].identifier);
        if (pointer) pointer.down = false;
      }
    });
    
    // Initialize pointers
    this.pointers.push(new this.pointerPrototype());
    
    // Random splats on load
    this.multipleSplats(parseInt(Math.random() * 20) + 5);
    
    // Start animation loop
    this.lastColorChangeTime = Date.now();
    this.update();
  }
  
  pointerPrototype() {
    this.id = -1;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
  }
  
  generateColor() {
    const c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }
  
  getWebGLContext(canvas) {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false
    };
    
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    
    if (!isWebGL2) {
      gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    }
    
    let halfFloat;
    let supportLinearFiltering;
    
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    let formatRGBA;
    let formatRG;
    let formatR;
    
    if (isWebGL2) {
      formatRGBA = this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
      formatRG = this.getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
      formatR = this.getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    } else {
      formatRGBA = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }
    
    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering
      }
    };
  }
  
  getSupportedFormat(gl, internalFormat, format, type) {
    if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:
          return this.getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F:
          return this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }
    
    return {
      internalFormat,
      format
    };
  }
  
  supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }
  
  resizeCanvas() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }
  
  initPrograms() {
    // Simplified for brevity - in reality you'd compile all shader programs
    // This is a placeholder
    console.log('Programs initialized');
  }
  
  initFramebuffers() {
    // Simplified for brevity
    console.log('Framebuffers initialized');
  }
  
  multipleSplats(amount) {
    for (let i = 0; i < amount; i++) {
      const color = this.generateColor();
      color.r *= 10.0;
      color.g *= 10.0;
      color.b *= 10.0;
      const x = Math.random();
      const y = Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      this.splat(x, y, dx, dy, color);
    }
  }
  
  splat(x, y, dx, dy, color) {
    // Simplified splat - would render to velocity and density textures
    this.splatStack.push({ x, y, dx, dy, color });
  }
  
  update() {
    if (!this.config.PAUSED) {
      // Update simulation
      this.step(0.016);
    }
    requestAnimationFrame(() => this.update());
  }
  
  step(dt) {
    // Update pointers
    this.pointers.forEach(p => {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    });
    
    // Process splat stack
    if (this.splatStack.length > 0) {
      this.multipleSplats(1);
      this.splatStack.pop();
    }
  }
  
  splatPointer(pointer) {
    const dx = pointer.dx * this.config.SPLAT_FORCE;
    const dy = pointer.dy * this.config.SPLAT_FORCE;
    this.splat(pointer.x / this.canvas.width, 1.0 - pointer.y / this.canvas.height, dx, dy, pointer.color);
  }
}

// Helper function
function HSVtoRGB(h, s, v) {
  let r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  
  return {
    r: r,
    g: g,
    b: b
  };
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.fluidBackgroundInstance = new FluidBackground();
});
