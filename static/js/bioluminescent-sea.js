// Bioluminescent Sea Animation - Top View
class BioluminescentSea {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.creatures = [];
    this.waves = [];
    this.lastTime = 0;
    this.numCreatures = 80; // Number of bioluminescent creatures
    this.resizeTimeout = null;
    this.animationFrameId = null; // Store reference to animation frame
    this.stateKey = 'bioluminescent_sea_state'; // Key for localStorage
    this.lastSaveTime = 0;
    this.saveInterval = 1000; // Save state every 1 second
    
    // Mouse interaction properties
    this.mousePosition = { x: null, y: null };
    this.mouseWaveIntensity = 0;
    this.mouseWaveRadius = 250; // Moderate radius of influence
    this.mouseWaveDecay = 0.85; // Faster decay so waves fade quickly
    this.mouseWaveMaxIntensity = 15; // Lower max intensity
    this.lastMouseMoveTime = 0;
    this.mouseIdle = true;
    this._mouseIdleTimer = null;
    
    // Brightness transition variables
    this.brightnessTransitionFactor = 1; // Current brightness multiplier (1 = full, 0 = normal)
    this.brightnessDecayRate = 0.97; // Slow decay for smooth transitions
    
    // Configuration
    this.config = {
      creatureSize: { min: 1, max: 4 },
      creatureSpeed: { min: 0.0001, max: 0.0004 }, // 1000x slower movement (10x slower than before)
      creatureDepth: { min: 0.1, max: 0.9 }, // Depth factor (0=surface, 1=deep)
      surfaceFrequency: 0.00002, // 100x less frequent surfacing
      deepGlowRadius: 15,
      deepGlowOpacity: 0.1,
      surfaceGlowRadius: 30,
      surfaceGlowOpacity: 0.7,
      waveCount: 5,
      waveSpeed: 0.0001, // 100x slower waves
      waveAmplitude: { min: 2, max: 5 },
      waveGridSize: 30, // Size of wave grid cells
    };
    
    this.waveGrid = []; // 2D grid for wave heights
    this.waveSeed = Math.random() * 1000; // Random seed for wave generation
    this.mouseWaves = []; // Array to store mouse-generated waves
    
    this.init();
  }
  
  init() {
    // Set up canvas
    this.canvas.id = 'sea-background';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.pointerEvents = 'none';
    document.body.prepend(this.canvas);
    
    // Resize handler
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.resize(), 200);
    });
    
    // Mouse movement handler - attach to document instead of canvas
    document.addEventListener('mousemove', (e) => {
      // Debug log to confirm event firing
      console.log('Mouse move detected', e.clientX, e.clientY);
      
      // Update mouse position
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
      
      // Calculate mouse speed (distance since last move)
      const now = performance.now();
      const timeDelta = now - this.lastMouseMoveTime;
      this.lastMouseMoveTime = now;
      
      // Generate wave intensity based on mouse movement
      const intensity = Math.min(this.mouseWaveMaxIntensity, 3 + Math.random() * 5);
      this.mouseWaveIntensity = intensity;
      this.mouseIdle = false;
      
      // Set brightness transition to full when mouse is moving
      this.brightnessTransitionFactor = 1;
      
      // Reset the mouse idle timer - shorter duration
      clearTimeout(this._mouseIdleTimer);
      this._mouseIdleTimer = setTimeout(() => {
        this.mouseIdle = true;
        // Don't immediately change brightness - let it fade gradually
      }, 200);
    });
    
    // Set mouse to idle after no movement
    setInterval(() => {
      const timeSinceLastMove = performance.now() - this.lastMouseMoveTime;
      if (timeSinceLastMove > 500) {
        this.mouseIdle = true;
      }
    }, 500);
    
    // Add visibility change listener to prevent animation stopping
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Resume animation if it was stopped
        if (!this.animationFrameId) {
          this.lastTime = performance.now();
          this.animate(this.lastTime);
        }
      } else {
        // Save state when page is hidden
        this.saveState();
      }
    });
    
    // Handle page navigation using History API
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
    
    // If Hugo is using Turbolinks or similar, add listener for page:before-change
    document.addEventListener('page:before-change', () => {
      this.saveState();
    });
    
    this.resize();
    this.initWaveGrid();
    this.loadState() || this.initCreatures(); // Try to load state, or init new creatures
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }
  
  // Save current animation state to localStorage
  saveState() {
    try {
      const state = {
        creatures: this.creatures,
        waveSeed: this.waveSeed,
        timestamp: Date.now()
      };
      localStorage.setItem(this.stateKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save animation state:', error);
    }
  }
  
  // Load animation state from localStorage
  loadState() {
    try {
      const savedState = localStorage.getItem(this.stateKey);
      if (!savedState) return false;
      
      const state = JSON.parse(savedState);
      
      // Check if state is too old (more than 10 minutes)
      if (Date.now() - state.timestamp > 10 * 60 * 1000) {
        localStorage.removeItem(this.stateKey);
        return false;
      }
      
      this.creatures = state.creatures;
      this.waveSeed = state.waveSeed;
      return true;
    } catch (error) {
      console.warn('Failed to load animation state:', error);
      return false;
    }
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Reinitialize wave grid after resize
    this.initWaveGrid();
  }
  
  initWaveGrid() {
    const { waveGridSize } = this.config;
    this.waveGrid = [];
    
    // Calculate grid dimensions based on screen size
    const cols = Math.ceil(this.canvas.width / waveGridSize) + 1;
    const rows = Math.ceil(this.canvas.height / waveGridSize) + 1;
    
    // Initialize grid with wave height values
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        row.push({
          height: 0,
          x: x * waveGridSize,
          y: y * waveGridSize,
        });
      }
      this.waveGrid.push(row);
    }
  }
  
  initCreatures() {
    this.creatures = [];
    for (let i = 0; i < this.numCreatures; i++) {
      this.creatures.push(this.createCreature());
    }
  }
  
  createCreature() {
    const atSurface = Math.random() < 0.1; // 10% chance to start at surface
    const size = Math.random() * (this.config.creatureSize.max - this.config.creatureSize.min) + this.config.creatureSize.min;
    const depth = atSurface ? 0 : 
                Math.random() * (this.config.creatureDepth.max - this.config.creatureDepth.min) + this.config.creatureDepth.min;
    
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: size,
      speed: Math.random() * (this.config.creatureSpeed.max - this.config.creatureSpeed.min) + this.config.creatureSpeed.min,
      direction: Math.random() * Math.PI * 2,
      depth: depth, // 0 = at surface, 1 = deepest
      targetDepth: depth,
      atSurface: atSurface,
      surfaceDuration: atSurface ? (Math.random() * 300 + 100) * 1000 : 0, // 100x longer duration (100-400 seconds)
      surfaceTime: 0,
      color: `hsl(${Math.random() * 40 + 160}, 100%, ${Math.random() * 30 + 50}%)`, // Blue-green hues for bioluminescence
      brightnessFactor: Math.random() * 0.3 + 0.7 // Random brightness variation
    };
  }
  
  updateWaves(deltaTime) {
    const { waveCount, waveSpeed, waveAmplitude } = this.config;
    this.waveSeed += waveSpeed * deltaTime;
    
    // Update wave heights across the grid using simplex noise simulation
    for (let y = 0; y < this.waveGrid.length; y++) {
      for (let x = 0; x < this.waveGrid[y].length; x++) {
        let height = 0;
        
        // Sum multiple wave components with different frequencies
        for (let i = 0; i < waveCount; i++) {
          const frequency = 0.005 / (i + 1);
          const amplitude = waveAmplitude.min + 
                         (waveAmplitude.max - waveAmplitude.min) * (1 - i / waveCount);
          
          // Use simplistic noise function since we don't have simplex noise readily available
          height += Math.sin(x * frequency * (i+1) + this.waveSeed) * 
                   Math.cos(y * frequency * (i+1) + this.waveSeed * 1.5) * 
                   amplitude;
        }
        
        // Add mouse-influenced wave if mouse position is known
        if (this.mousePosition.x !== null && this.mousePosition.y !== null) {
          const cell = this.waveGrid[y][x];
          const dx = cell.x - this.mousePosition.x;
          const dy = cell.y - this.mousePosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Apply wave effect in radius around mouse position
          if (distance < this.mouseWaveRadius) {
            // Circular wave with falloff based on distance from mouse
            const distanceFactor = 1 - distance / this.mouseWaveRadius;
            
            // Create outward rippling waves from mouse position
            const phase = distance * 0.05 - this.waveSeed * 2;
            const mouseWaveHeight = this.mouseWaveIntensity * distanceFactor * Math.sin(phase) * 0.8; // Reduced amplitude
            
            // Add mouse wave to natural waves
            height += mouseWaveHeight;
          }
        }
        
        this.waveGrid[y][x].height = height;
      }
    }
    
    // More rapidly reduce mouse wave intensity so it settles quickly
    this.mouseWaveIntensity *= this.mouseWaveDecay;
    
    // Force intensity to zero if very small
    if (this.mouseWaveIntensity < 0.1) {
      this.mouseWaveIntensity = 0;
    }
    
    // Smoothly decay the brightness transition factor when mouse is idle
    if (this.mouseIdle && this.brightnessTransitionFactor > 0) {
      this.brightnessTransitionFactor *= this.brightnessDecayRate;
      
      // Set a floor to avoid endless tiny values
      if (this.brightnessTransitionFactor < 0.01) {
        this.brightnessTransitionFactor = 0;
      }
    }
  }
  
  getWaveHeight(x, y) {
    const { waveGridSize } = this.config;
    
    // Find grid cell indices
    const gridX = Math.floor(x / waveGridSize);
    const gridY = Math.floor(y / waveGridSize);
    
    // Get surrounding grid points
    const rows = this.waveGrid.length;
    const cols = rows > 0 ? this.waveGrid[0].length : 0;
    
    if (gridX < 0 || gridX >= cols - 1 || gridY < 0 || gridY >= rows - 1) {
      return 0;
    }
    
    // Calculate fractional position within cell
    const fracX = (x % waveGridSize) / waveGridSize;
    const fracY = (y % waveGridSize) / waveGridSize;
    
    // Get heights at four corners
    const h00 = this.waveGrid[gridY][gridX].height;
    const h10 = this.waveGrid[gridY][gridX + 1].height;
    const h01 = this.waveGrid[gridY + 1][gridX].height;
    const h11 = this.waveGrid[gridY + 1][gridX + 1].height;
    
    // Bilinear interpolation for smooth transition
    const topMix = h00 * (1 - fracX) + h10 * fracX;
    const bottomMix = h01 * (1 - fracX) + h11 * fracX;
    
    return topMix * (1 - fracY) + bottomMix * fracY;
  }
  
  updateCreatures(deltaTime) {
    for (let i = 0; i < this.creatures.length; i++) {
      const creature = this.creatures[i];
      
      // Get wave height at creature's position
      const waveHeight = this.getWaveHeight(creature.x, creature.y);
      
      // Check for mouse influence
      let mouseInfluence = 0;
      let mouseDirectionX = 0;
      let mouseDirectionY = 0;
      
      if (this.mousePosition.x !== null && this.mousePosition.y !== null) {
        const dx = creature.x - this.mousePosition.x;
        const dy = creature.y - this.mousePosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Add a minimum distance to prevent extreme forces when directly over a creature
        const smoothedDistance = Math.max(10, distance);
        
        if (distance < this.mouseWaveRadius * 1.5) { // Reduced influence radius
          // Use eased distance factor to prevent abrupt movements
          const distanceFactor = 1 - Math.min(1, smoothedDistance / (this.mouseWaveRadius * 1.5));
          const depthFactor = 1 - Math.min(1, creature.depth * 2); // Only affect creatures closer to surface
          
          // Apply smoothing to the mouse influence to prevent jitter
          const easedInfluence = this.easeInOutCubic(distanceFactor);
          mouseInfluence = easedInfluence * depthFactor * this.mouseWaveIntensity * 0.3; // Reduced influence
          
          // Calculate direction away from mouse (for wave-like movement)
          // Use the normalized vector to create more consistent movement
          const length = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
          const normalizedDx = dx / length;
          const normalizedDy = dy / length;
          
          mouseDirectionX = normalizedDx * mouseInfluence;
          mouseDirectionY = normalizedDy * mouseInfluence;
          
          // Add a subtle rippling effect for creatures near the mouse
          // but not too close to prevent jitter
          if (distance > 5 && distance < this.mouseWaveRadius * 0.8) { // Only add ripples in a specific range
            const ripplePhase = smoothedDistance * 0.05 - this.waveSeed * 2;
            const rippleFactor = Math.sin(ripplePhase) * distanceFactor * depthFactor * 0.3; // Even more reduced effect
            
            // Calculate perpendicular direction (tangential movement for circular waves)
            mouseDirectionX += normalizedDy * rippleFactor; // perpendicular to radius
            mouseDirectionY += -normalizedDx * rippleFactor; // perpendicular to radius
          }
        }
      }
      
      // Move the creature with its base speed
      creature.x += Math.cos(creature.direction) * creature.speed * deltaTime;
      creature.y += Math.sin(creature.direction) * creature.speed * deltaTime;
      
      // Add very subtle background undulating motion based on depth
      // The closer to surface, the more pronounced the effect
      const depthFactor = Math.max(0, 1 - creature.depth * 1.5);
      
      // Create a subtle natural undulating motion using sine waves
      const waveTime = performance.now() * 0.001;
      const undulationX = Math.sin(waveTime * 0.3 + creature.x * 0.01) * (1 + Math.abs(waveHeight) * 0.5);
      const undulationY = Math.cos(waveTime * 0.2 + creature.y * 0.01) * (1 + Math.abs(waveHeight) * 0.5);
      
      // Apply subtle undulation based on depth and wave height - 10x slower
      creature.x += undulationX * 0.003 * depthFactor;  // 10x slower than before
      creature.y += undulationY * 0.003 * depthFactor;  // 10x slower than before
      
      // Add mouse-generated wave motion - more noticeable than background movement
      // but still subtle overall
      creature.x += mouseDirectionX * 0.8;
      creature.y += mouseDirectionY * 0.8;
      
      // Subtle additional wave displacement for creatures near surface
      if (creature.depth < 0.3) {  // Only affect creatures very near the surface
        // Apply stronger wave influence to creatures closer to surface
        const waveInfluence = (0.3 - creature.depth) / 0.3;
        creature.x += waveHeight * 0.005 * waveInfluence;  // 10x slower
        creature.y += waveHeight * 0.0025 * waveInfluence;  // 10x slower
      }
      
      // Even more rarely change direction (1000x less frequent)
      if (Math.random() < 0.00001) {
        creature.direction += (Math.random() - 0.5) * Math.PI * 0.5;
      }
      
      // Surface/depth behavior
      if (creature.atSurface) {
        creature.surfaceTime += deltaTime;
        
        // Check if it's time to dive
        if (creature.surfaceTime >= creature.surfaceDuration) {
          creature.atSurface = false;
          creature.targetDepth = Math.random() * (this.config.creatureDepth.max - this.config.creatureDepth.min) + 
                              this.config.creatureDepth.min;
        }
      } else {
        // Smooth depth transition (100x slower)
        creature.depth += (creature.targetDepth - creature.depth) * 0.0001 * deltaTime;
        
        // Random chance to surface
        if (Math.random() < this.config.surfaceFrequency * (deltaTime / 16)) {
          creature.atSurface = true;
          creature.surfaceTime = 0;
          creature.surfaceDuration = (Math.random() * 3 + 1) * 1000; // 1-4 seconds at surface
          creature.targetDepth = 0;
        }
      }
      
      // If at surface, slowly transition depth to 0 (100x slower)
      if (creature.atSurface) {
        creature.depth = Math.max(0, creature.depth - 0.001 * deltaTime / 16);
      }
      
      // Wraparound the screen
      if (creature.x < -50) creature.x = this.canvas.width + 50;
      if (creature.x > this.canvas.width + 50) creature.x = -50;
      if (creature.y < -50) creature.y = this.canvas.height + 50;
      if (creature.y > this.canvas.height + 50) creature.y = -50;
    }
  }
  
  drawSea() {
    // Fill with pure black color for deep sea
    this.ctx.fillStyle = '#000000'; // Pure black sea
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // No debug visualization to keep it clean
    
    // Draw wave grid for debugging (uncomment if needed)
    // this.drawWaveGridDebug();
  }
  
  drawWaveGridDebug() {
    // Helper to visualize the wave grid
    this.ctx.strokeStyle = 'rgba(30, 200, 180, 0.1)'; // Cyan-green tone to match theme
    this.ctx.lineWidth = 0.5;
    
    for (let y = 0; y < this.waveGrid.length; y++) {
      for (let x = 0; x < this.waveGrid[y].length; x++) {
        const cell = this.waveGrid[y][x];
        const height = cell.height;
        
        // Draw a circle sized by wave height
        this.ctx.beginPath();
        this.ctx.arc(cell.x, cell.y, Math.abs(height) + 1, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
    
    // Visualize mouse influence area if active
    if (!this.mouseIdle && this.mousePosition.x !== null && this.mousePosition.y !== null) {
      // Draw radius of influence
      this.ctx.strokeStyle = 'rgba(100, 255, 220, 0.1)';
      this.ctx.beginPath();
      this.ctx.arc(this.mousePosition.x, this.mousePosition.y, this.mouseWaveRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Draw current intensity
      this.ctx.fillStyle = 'rgba(100, 255, 220, 0.05)';
      this.ctx.beginPath();
      this.ctx.arc(this.mousePosition.x, this.mousePosition.y, 
                  this.mouseWaveIntensity * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  drawCreatures() {
    // Sort creatures by depth so deeper ones are drawn first
    const sortedCreatures = [...this.creatures].sort((a, b) => b.depth - a.depth);
    
    for (const creature of sortedCreatures) {
      this.ctx.save();
      
      const waveHeight = this.getWaveHeight(creature.x, creature.y);
      
      // Calculate wave response based on mouse position and creature depth
      let waveResponse = waveHeight;
      let distortionFactor = 0;
      let mouseDistance = Infinity;
      
      if (!this.mouseIdle && this.mousePosition.x !== null && this.mousePosition.y !== null) {
        const dx = creature.x - this.mousePosition.x;
        const dy = creature.y - this.mousePosition.y;
        mouseDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Use a minimum distance to prevent extreme effects when directly over a creature
        const smoothedDistance = Math.max(10, mouseDistance);
        
        if (mouseDistance < this.mouseWaveRadius * 1.5) {
          // Creatures respond more to mouse waves when they're near the surface
          const depthFactor = 1 - Math.min(1, creature.depth * 2);
          const distanceFactor = 1 - smoothedDistance / (this.mouseWaveRadius * 1.5);
          
          // Use easing function for smoother transitions
          const easedFactor = this.easeInOutCubic(distanceFactor);
          waveResponse = waveHeight * (1 + depthFactor * easedFactor * 2);
          
          // Calculate distortion factor for visual stretching/compression
          // Use easing and reduced effect when very close to avoid extreme distortion
          distortionFactor = Math.min(0.3, easedFactor * depthFactor * 0.4);
          
          // Chance for deep creatures to be attracted toward surface by mouse movement
          // Exclude creatures directly under the cursor to prevent jitter
          if (mouseDistance > 20 && creature.depth > 0.4 && Math.random() < 0.01 * distanceFactor) {
            creature.targetDepth = Math.max(0.1, creature.targetDepth - 0.1);
          }
        }
      }
      
      // Calculate current time for wave animation
      const now = performance.now() * 0.001;
      
      // Calculate brightness based on depth and wave response
      const depthFactor = 1 - creature.depth;
      let opacity = creature.atSurface ? 
                  this.config.surfaceGlowOpacity : 
                  this.config.deepGlowOpacity + depthFactor * 0.15;
      
      // Make opacity pulse with wave height for surface creatures
      if (creature.depth < 0.3) {
        opacity += Math.sin(now * 2 + creature.x * 0.05) * 0.1 * (0.3 - creature.depth) / 0.3;
      }
      
      // Apply smooth brightness transition for mouse proximity
      let mouseProximityBoost = 0;
      if (mouseDistance < this.mouseWaveRadius) {
        const mouseFactor = 1 - mouseDistance / this.mouseWaveRadius;
        // Calculate the full potential boost
        mouseProximityBoost = mouseFactor * 0.2 * (1 - creature.depth);
        
        // Apply the transition factor for smooth fading
        opacity += mouseProximityBoost * this.brightnessTransitionFactor;
      }
      
      // Calculate glow radius based on depth, with wave-based pulsing
      let glowRadius = creature.atSurface ? 
                     this.config.surfaceGlowRadius : 
                     this.config.deepGlowRadius + depthFactor * 15;
      
      // Add pulsing effect to surface creatures based on waves
      if (creature.depth < 0.3) {
        const pulseFactor = (0.3 - creature.depth) / 0.3; // 0 at depth 0.3, 1 at surface
        glowRadius += Math.sin(now * 2 + creature.x * 0.02) * 5 * pulseFactor;
      }
      
      // Parse color to get HSL components
      const hslMatch = creature.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      const h = hslMatch ? parseInt(hslMatch[1]) : 180;
      const s = hslMatch ? parseInt(hslMatch[2]) : 100;
      const l = hslMatch ? parseInt(hslMatch[3]) : 50;
      
      // Adjust colors based on depth and surface state
      const lightness = creature.atSurface ? 
                      l + 20 : 
                      l - 10 + depthFactor * 30;
                      
      const baseLightness = Math.min(90, Math.max(20, lightness));
      
      // Create wave distortion effect for creatures
      let drawX = creature.x;
      let drawY = creature.y;
      
      // Apply wave displacement - stronger for surface creatures
      const surfaceFactor = creature.atSurface ? 1 : Math.max(0, 0.6 - creature.depth * 2);
      
      // Add wave-based displacement
      drawX += waveResponse * 0.6 * surfaceFactor;
      drawY += waveResponse * 0.4 * surfaceFactor;
      
      // Add shape distortion for creatures near surface with mouse interaction
      let stretchX = 1;
      let stretchY = 1;
      if (distortionFactor > 0) {
        // Calculate distortion direction from mouse
        const dx = creature.x - this.mousePosition.x;
        const dy = creature.y - this.mousePosition.y;
        
        // Use a minimum distance to prevent extreme angles
        const length = Math.max(5, Math.sqrt(dx * dx + dy * dy));
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        
        // Calculate angle from normalized vector
        const angle = Math.atan2(normalizedDy, normalizedDx);
        
        // Create stretch/compress effect in direction away from mouse
        // Apply smoothly with less extreme values
        stretchX = 1 + Math.abs(Math.cos(angle) * distortionFactor);
        stretchY = 1 + Math.abs(Math.sin(angle) * distortionFactor);
      }
      
      // Draw elongated creature glow
      this.ctx.setTransform(stretchX, 0, 0, stretchY, drawX, drawY);
      
      const gradient = this.ctx.createRadialGradient(
        0, 0, 0,
        0, 0, glowRadius
      );
      
      // Create brightened version for center of glow
      const centerLightness = Math.min(95, baseLightness + 20);
      const centerColor = `hsla(${h}, ${s}%, ${centerLightness}%, ${opacity * creature.brightnessFactor})`;
      const midColor = `hsla(${h}, ${s}%, ${baseLightness}%, ${opacity * 0.5 * creature.brightnessFactor})`;
      const outerColor = `hsla(${h}, ${s - 20}%, ${baseLightness - 20}%, 0)`;
      
      gradient.addColorStop(0, centerColor);
      gradient.addColorStop(0.4, midColor);
      gradient.addColorStop(1, outerColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw the creature itself with pulsing
      const creatureLightness = Math.min(98, baseLightness + 30);
      let creatureSize = creature.size * (1 - creature.depth * 0.5);
      
      // Add pulsing size effect for surface creatures
      if (creature.depth < 0.3) {
        const pulseFactor = (0.3 - creature.depth) / 0.3;
        const pulseAmount = 0.2 * pulseFactor;
        creatureSize *= 1 + Math.sin(now * 3 + creature.x * 0.03) * pulseAmount;
      }
      
      const creatureColor = `hsla(${h}, ${s}%, ${creatureLightness}%, ${(opacity + 0.3) * creature.brightnessFactor})`;
      
      this.ctx.fillStyle = creatureColor;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, creatureSize, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Reset transformation
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // If at surface, illuminate surrounding area to show waves
      if (creature.atSurface) {
        this.illuminateWaves(creature, waveHeight);
      }
      
      this.ctx.restore();
    }
  }
  
  illuminateWaves(creature, waveHeight) {
    const radius = this.config.surfaceGlowRadius * 2;
    let illuminationIntensity = 0.15 + Math.abs(waveHeight) * 0.02;
    
    // Enhance illumination near mouse cursor - using smooth transition factor
    if (this.mousePosition.x !== null && this.mousePosition.y !== null) {
      const dx = creature.x - this.mousePosition.x;
      const dy = creature.y - this.mousePosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Increase illumination for creatures near mouse, with smooth transition
      if (distance < this.mouseWaveRadius * 2) {
        const mouseFactor = 1 - Math.min(1, distance / (this.mouseWaveRadius * 2));
        // Apply brightness transition factor for smooth fade out
        illuminationIntensity += mouseFactor * 0.2 * this.brightnessTransitionFactor; 
      }
    }
    
    // Parse color for wave illumination
    const hslMatch = creature.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    const h = hslMatch ? parseInt(hslMatch[1]) : 180;
    
    // Create a subtle illumination to reveal waves
    const gradient = this.ctx.createRadialGradient(
      creature.x, creature.y, radius * 0.3,
      creature.x, creature.y, radius
    );
    
    gradient.addColorStop(0, `rgba(${this.hslToRgb(h, 70, 60)}, ${illuminationIntensity * 1.5})`);
    gradient.addColorStop(1, `rgba(${this.hslToRgb(h, 100, 30)}, 0)`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(creature.x, creature.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Check if the creature is too close to the surface
    // If it's very shallow, skip drawing the grid points to avoid the visible grid pattern
    if (creature.depth < 0.1) {
      return; // Skip drawing grid points for very shallow creatures
    }
    
    // Only draw wave highlights if creature isn't too close to surface
    // This prevents the grid-like appearance when creatures get bigger
    
    // Use a much larger grid size to make the grid less visible
    const gridSize = this.config.waveGridSize;  // Double the size to reduce grid density
    const startX = Math.max(0, Math.floor((creature.x - radius) / gridSize));
    const startY = Math.max(0, Math.floor((creature.y - radius) / gridSize));
    const endX = Math.min(Math.ceil(this.canvas.width / gridSize), Math.ceil((creature.x + radius) / gridSize));
    const endY = Math.min(Math.ceil(this.canvas.height / gridSize), Math.ceil((creature.y + radius) / gridSize));
    
    // Check if we should add extra wave details near mouse - using transition factor
    const mouseNearby = this.mousePosition.x !== null && 
                     this.mousePosition.y !== null && 
                     Math.abs(creature.x - this.mousePosition.x) < this.mouseWaveRadius * 2 && 
                     Math.abs(creature.y - this.mousePosition.y) < this.mouseWaveRadius * 2;
    
    // Use the brightness transition factor to smoothly fade the effect
    const nearMouse = mouseNearby && this.brightnessTransitionFactor > 0.1;
    
    // Instead of drawing individual dots, draw a smoother wave effect
    const ctx = this.ctx;
    ctx.save();
    
    // Create a more organic-looking wave pattern
    if (nearMouse && waveHeight > 0.5) {
      // Draw a few random wave lines instead of a grid of dots
      ctx.strokeStyle = `rgba(${this.hslToRgb(h, 80, 70)}, ${illuminationIntensity * 0.5})`;
      ctx.lineWidth = 0.5;
      
      // Draw a few curved lines to represent waves
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const startRadius = radius * (0.3 + Math.random() * 0.5);
        
        ctx.beginPath();
        ctx.arc(creature.x, creature.y, startRadius, angle, angle + Math.PI * (0.2 + Math.random() * 0.3), false);
        ctx.stroke();
      }
      
      // No grid of dots at all
    }
    
    ctx.restore();
  }
  
  // Helper function for smooth easing - creates more natural movement
  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  
  // Helper to convert HSL to RGB for gradient creation
  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
  
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
  
    return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
  }
  
  animate(timestamp) {
    // Calculate delta time, with safety cap for when tab is inactive
    let deltaTime = timestamp - this.lastTime;
    if (deltaTime > 100) deltaTime = 16; // Cap for when tab is inactive
    this.lastTime = timestamp;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update waves first
    this.updateWaves(deltaTime);
    
    // Draw background
    this.drawSea();
    
    // Uncomment to see wave grid visually
    // this.drawWaveGridDebug();
    
    // Update and draw creatures
    this.updateCreatures(deltaTime);
    this.drawCreatures();
    
    // Periodically save state (not on every frame to avoid performance issues)
    if (timestamp - this.lastSaveTime > this.saveInterval) {
      this.saveState();
      this.lastSaveTime = timestamp;
    }
    
    // Continue animation loop
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Store the instance globally so it can be accessed by other scripts
  window.bioluminescentSeaInstance = new BioluminescentSea();
});
