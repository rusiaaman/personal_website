// Page transition helper for preserving animation state
document.addEventListener('DOMContentLoaded', () => {
  // Capture all link clicks within the site
  document.body.addEventListener('click', (e) => {
    let target = e.target;
    
    // Find if click was on a link or its child
    while (target && target !== document.body) {
      if (target.tagName.toLowerCase() === 'a') {
        const href = target.getAttribute('href');
        const isSameOrigin = target.origin === window.location.origin;
        
        // Only handle internal links (not external, hash, or download links)
        if (isSameOrigin && 
            href && 
            !href.startsWith('#') && 
            !target.hasAttribute('download') &&
            target.getAttribute('target') !== '_blank') {
          
          // Trigger a save state event before navigation
          const saveEvent = new CustomEvent('save-animation-state');
          window.dispatchEvent(saveEvent);
          
          // Note: We don't prevent default - we just want to save state before the browser navigates
        }
        break;
      }
      target = target.parentElement;
    }
  });
  
  // Add an event listener for the custom event
  window.addEventListener('save-animation-state', () => {
    if (window.bioluminescentSeaInstance) {
      window.bioluminescentSeaInstance.saveState();
    }
  });
});
