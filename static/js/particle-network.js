// Interactive Particle Network - Inspired by tsParticles
class ParticleNetwork {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 120 };
    this.numParticles = 30; // Reduced from 60
    this.maxDistance = 120; // Reduced connection distance
    this.animationFrameId = null;
    
    this.init();
  }
  
  init() {
    // Set up canvas
    this.canvas.id = 'particle-network';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = '0.2'; // Much more subtle
    
    // Insert after sea background
    const seaCanvas = document.getElementById('sea-background');
    if (seaCanvas && seaCanvas.nextSibling) {
      seaCanvas.parentNode.insertBefore(this.canvas, seaCanvas.nextSibling);
    } else {
      document.body.prepend(this.canvas);
    }
    
    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    
    document.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
    
    // Resize handler
    window.addEventListener('resize', () => this.resize());
    
    this.resize();
    this.createParticles();
    this.animate();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        originalX: 0,
        originalY: 0
      });
      
      // Store original position
      this.particles[i].originalX = this.particles[i].x;
      this.particles[i].originalY = this.particles[i].y;
    }
  }
  
  drawParticle(particle) {
    // Gradient particle
    const gradient = this.ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.radius * 3
    );
    gradient.addColorStop(0, 'rgba(74, 224, 192, 0.8)');
    gradient.addColorStop(1, 'rgba(74, 224, 192, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Core
    this.ctx.fillStyle = 'rgba(74, 224, 192, 1)';
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.maxDistance) {
          const opacity = (1 - distance / this.maxDistance) * 0.15; // More subtle
          this.ctx.strokeStyle = `rgba(74, 224, 192, ${opacity})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
      
      // Connect to mouse
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.particles[i].x - this.mouse.x;
        const dy = this.particles[i].y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.mouse.radius) {
          const opacity = (1 - distance / this.mouse.radius) * 0.3; // More subtle
          this.ctx.strokeStyle = `rgba(74, 224, 192, ${opacity})`;
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.stroke();
        }
      }
    }
  }
  
  updateParticles() {
    for (let particle of this.particles) {
      // Mouse interaction
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - particle.x;
        const dy = this.mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.mouse.radius) {
          const force = (this.mouse.radius - distance) / this.mouse.radius;
          const angle = Math.atan2(dy, dx);
          particle.vx -= Math.cos(angle) * force * 0.3;
          particle.vy -= Math.sin(angle) * force * 0.3;
        }
      }
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Bounce off edges
      if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
      
      // Keep in bounds
      particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
      particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
      
      // Slight friction
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.updateParticles();
    this.drawConnections();
    
    for (let particle of this.particles) {
      this.drawParticle(particle);
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.particleNetworkInstance = new ParticleNetwork();
});
