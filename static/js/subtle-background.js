// Subtle Ambient Background - Minimalist and Elegant
class SubtleBackground {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.id = 'subtle-background';
    
    // Very subtle orbs
    this.orbs = [];
    this.numOrbs = 3; // Only 3 orbs
    
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
    this.canvas.style.opacity = '0.15'; // Very subtle
    
    document.body.prepend(this.canvas);
    
    window.addEventListener('resize', () => this.resize());
    
    this.resize();
    this.createOrbs();
    this.animate();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  createOrbs() {
    this.orbs = [];
    for (let i = 0; i < this.numOrbs; i++) {
      this.orbs.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: 150 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        hue: 170 + Math.random() * 20 // Cyan-green range
      });
    }
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update and draw orbs
    for (const orb of this.orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;
      
      // Bounce off edges
      if (orb.x < -orb.radius || orb.x > this.canvas.width + orb.radius) orb.vx *= -1;
      if (orb.y < -orb.radius || orb.y > this.canvas.height + orb.radius) orb.vy *= -1;
      
      // Draw with gradient
      const gradient = this.ctx.createRadialGradient(
        orb.x, orb.y, 0,
        orb.x, orb.y, orb.radius
      );
      gradient.addColorStop(0, `hsla(${orb.hue}, 80%, 60%, 0.3)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.subtleBackgroundInstance = new SubtleBackground();
});
