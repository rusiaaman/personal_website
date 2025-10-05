// Scroll Progress Indicator
document.addEventListener('DOMContentLoaded', () => {
  // Create scroll indicator
  const indicator = document.createElement('div');
  indicator.className = 'scroll-indicator';
  document.body.appendChild(indicator);
  
  // Update on scroll
  const updateScrollIndicator = () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / (documentHeight - windowHeight)) * 100;
    
    indicator.style.width = `${Math.min(progress, 100)}%`;
  };
  
  window.addEventListener('scroll', updateScrollIndicator);
  updateScrollIndicator(); // Initial call
});
