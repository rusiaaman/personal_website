// Morphing Gradient Blobs Background
class GradientMorph {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.blobs = [];
    this.numBlobs = 5;
    this.animationFrameId = null;
    
    this.init();
  }
  
  init() {
    // Set up canvas
    this.canvas.id = 'gradient-morph';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-2';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = '0.15';
    this.canvas.style.filter = 'blur(60px)';
    
    // Insert before sea background
    const seaCanvas = document.getElementById('sea-background');
    if (seaCanvas) {
      seaCanvas.parentNode.insertBefore(this.canvas, seaCanvas);
    } else {
      document.body.prepend(this.canvas);
    }
    
    // Resize handler
    window.addEventListener('resize', () => this.resize());
    
    this.resize();
    this.createBlobs();
    this.animate();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  createBlobs() {
    this.blobs = [];
    const colors = [
      'rgba(74, 224, 192, 0.4)',   // cyan-green
      'rgba(43, 133, 116, 0.4)',   // darker cyan
      'rgba(96, 255, 218, 0.3)',   // bright cyan
      'rgba(0, 200, 160, 0.4)',    // pure cyan
      'rgba(30, 180, 150, 0.4)'    // teal
    ];
    
    for (let i = 0; i < this.numBlobs; i++) {
      this.blobs.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 150 + 100,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  
  drawBlob(blob, time) {
    // Pulsing effect
    const pulse = Math.sin(time * 0.001 + blob.phase) * 0.2 + 1;
    const radius = blob.radius * pulse;
    
    // Gradient
    const gradient = this.ctx.createRadialGradient(
      blob.x, blob.y, 0,
      blob.x, blob.y, radius
    );
    
    gradient.addColorStop(0, blob.color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  updateBlobs() {
    for (let blob of this.blobs) {
      blob.x += blob.vx;
      blob.y += blob.vy;
      
      // Bounce off edges
      if (blob.x < -blob.radius) blob.x = this.canvas.width + blob.radius;
      if (blob.x > this.canvas.width + blob.radius) blob.x = -blob.radius;
      if (blob.y < -blob.radius) blob.y = this.canvas.height + blob.radius;
      if (blob.y > this.canvas.height + blob.radius) blob.y = -blob.radius;
    }
  }
  
  animate() {
    const time = performance.now();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.updateBlobs();
    
    for (let blob of this.blobs) {
      this.drawBlob(blob, time);
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gradientMorphInstance = new GradientMorph();
});
