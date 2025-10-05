// Interactive Wave Field Background
class WaveField {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.id = 'wave-field-background';
    
    // Configuration
    this.gridSize = 25;
    this.points = [];
    this.mouse = { x: null, y: null };
    this.mouseRadius = 200;
    this.waveSpeed = 0.02;
    this.time = 0;
    
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
    
    // Event listeners
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    
    document.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
    
    this.resize();
    this.createGrid();
    this.animate();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createGrid();
  }
  
  createGrid() {
    this.points = [];
    const cols = Math.ceil(this.canvas.width / this.gridSize) + 1;
    const rows = Math.ceil(this.canvas.height / this.gridSize) + 1;
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.points.push({
          x: x * this.gridSize,
          y: y * this.gridSize,
          baseX: x * this.gridSize,
          baseY: y * this.gridSize,
          vx: 0,
          vy: 0,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
    
    this.cols = cols;
    this.rows = rows;
  }
  
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(74, 224, 192, 0.15)';
    this.ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let y = 0; y < this.rows; y++) {
      this.ctx.beginPath();
      for (let x = 0; x < this.cols; x++) {
        const point = this.points[y * this.cols + x];
        if (x === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          this.ctx.lineTo(point.x, point.y);
        }
      }
      this.ctx.stroke();
    }
    
    // Vertical lines
    for (let x = 0; x < this.cols; x++) {
      this.ctx.beginPath();
      for (let y = 0; y < this.rows; y++) {
        const point = this.points[y * this.cols + x];
        if (y === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          this.ctx.lineTo(point.x, point.y);
        }
      }
      this.ctx.stroke();
    }
  }
  
  drawPoints() {
    for (const point of this.points) {
      const distance = this.mouse.x !== null && this.mouse.y !== null ?
        Math.sqrt((point.baseX - this.mouse.x) ** 2 + (point.baseY - this.mouse.y) ** 2) :
        Infinity;
      
      let alpha = 0.3;
      let size = 2;
      
      if (distance < this.mouseRadius) {
        alpha = 0.8 * (1 - distance / this.mouseRadius);
        size = 2 + 3 * (1 - distance / this.mouseRadius);
      }
      
      const gradient = this.ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, size * 3
      );
      gradient.addColorStop(0, `rgba(74, 224, 192, ${alpha})`);
      gradient.addColorStop(1, 'rgba(74, 224, 192, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, size * 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Core dot
      this.ctx.fillStyle = `rgba(96, 255, 218, ${alpha + 0.2})`;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  updatePoints() {
    for (const point of this.points) {
      // Wave motion
      const waveX = Math.sin(this.time * 0.5 + point.phase) * 3;
      const waveY = Math.cos(this.time * 0.5 + point.phase + 1) * 3;
      
      // Mouse interaction
      let targetX = point.baseX + waveX;
      let targetY = point.baseY + waveY;
      
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - point.baseX;
        const dy = this.mouse.y - point.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.mouseRadius) {
          const force = (this.mouseRadius - distance) / this.mouseRadius;
          const angle = Math.atan2(dy, dx);
          
          targetX += Math.cos(angle) * force * -50;
          targetY += Math.sin(angle) * force * -50;
        }
      }
      
      // Smooth movement
      point.vx += (targetX - point.x) * 0.1;
      point.vy += (targetY - point.y) * 0.1;
      point.vx *= 0.9;
      point.vy *= 0.9;
      
      point.x += point.vx;
      point.y += point.vy;
    }
  }
  
  animate() {
    this.time += this.waveSpeed;
    
    // Clear with fade effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.updatePoints();
    this.drawGrid();
    this.drawPoints();
    
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.waveFieldInstance = new WaveField();
});
