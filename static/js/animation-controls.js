// Animation recovery for tab visibility change
document.addEventListener('DOMContentLoaded', () => {
  // Ensure animation continues when tab becomes active again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Check if the animation needs to be restarted
      const canvas = document.getElementById('sea-background');
      if (canvas && !canvas.__animationRunning) {
        canvas.__animationRunning = true;
        
        // Check if the canvas has content
        setTimeout(() => {
          const ctx = canvas.getContext('2d');
          const pixels = ctx.getImageData(0, 0, 10, 10).data;
          let hasContent = false;
          for (let i = 0; i < pixels.length; i++) {
            if (pixels[i] !== 0) {
              hasContent = true;
              break;
            }
          }
          
          if (!hasContent) {
            location.reload();
          }
        }, 1000);
      }
    }
  });
});