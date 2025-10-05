// Add cute copy buttons to code blocks
document.addEventListener('DOMContentLoaded', () => {
  // Find all code blocks inside articles
  const codeBlocks = document.querySelectorAll('article pre, .post pre, .content pre');
  
  codeBlocks.forEach((pre) => {
    // Skip if already wrapped
    if (pre.parentElement.classList.contains('code-block-wrapper')) {
      return;
    }
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    
    // Wrap the pre element
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    
    // Create copy button
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.setAttribute('type', 'button');
    
    // Add click handler
    button.addEventListener('click', async () => {
      try {
        // Get the code content
        const code = pre.querySelector('code') || pre;
        const text = code.textContent;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 2000);
        
      } catch (err) {
        console.error('Failed to copy code:', err);
        button.textContent = 'Error';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      }
    });
    
    // Add button to wrapper
    wrapper.insertBefore(button, pre);
  });
  
  console.log(`Added copy buttons to ${codeBlocks.length} code blocks`);
});
