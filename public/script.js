// Wait for DOM to be fully loaded before attaching events
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing...');
  
  const urlInput = document.getElementById('urlInput');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const btnText = document.getElementById('btnText');
  const loader = document.getElementById('loader');
  const outputArea = document.getElementById('outputArea');
  const resultContent = document.getElementById('resultContent');

  // Check if all elements exist
  if (!urlInput || !summarizeBtn || !btnText || !loader || !outputArea || !resultContent) {
    console.error('Required elements not found!');
    return;
  }

  console.log('All elements found successfully');

  // Add click event to button
  summarizeBtn.addEventListener('click', function() {
    console.log('Button clicked!');
    getSummary();
  });

  // Add Enter key listener to input
  urlInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      console.log('Enter key pressed');
      getSummary();
    }
  });

  // Main function to get summary
  async function getSummary() {
    console.log('getSummary called');
    
    const url = urlInput.value.trim();
    console.log('URL:', url);

    // Validation
    if (!url) {
      showError('Please enter a URL');
      urlInput.focus();
      return;
    }

    if (!isValidUrl(url)) {
      showError('Please enter a valid URL (must start with http:// or https://)');
      urlInput.focus();
      return;
    }

    // Show loading state
    setLoadingState(true);
    outputArea.querySelector('.placeholder-text').style.display = 'none';
    resultContent.innerHTML = '<div class="loading-message">Processing your request...</div>';
    outputArea.classList.add('active');

    try {
      console.log('Sending fetch request...');
      
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url })
      });

      console.log('Response received:', response.status);

      const data = await response.json();
      console.log('Data received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      displayResults(data);

    } catch (error) {
      console.error('Error occurred:', error);
      showError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }

  // Display results
  function displayResults(data) {
    console.log('Displaying results');
    
    const html = `
      <div class="result-card">
        <h2 class="result-title">${escapeHtml(data.title)}</h2>
        
        <div class="metadata">
          <span class="metadata-item">
            <strong>Words:</strong> ${data.metadata.wordCount}
          </span>
          <span class="metadata-item">
            <strong>Reading Time:</strong> ${data.metadata.readingTime}
          </span>
        </div>

        <div class="summary-section">
          <h3>Summary</h3>
          <div class="summary-content">${marked.parse(data.summary)}</div>
        </div>

        ${data.keyPoints ? `
          <div class="keypoints-section">
            <h3>Key Points</h3>
            <div class="keypoints-content">${marked.parse(data.keyPoints)}</div>
          </div>
        ` : ''}

        <div class="powered-by">
          AI-powered summary | ${formatTimestamp(data.metadata.timestamp)}
        </div>
      </div>
    `;

    resultContent.innerHTML = html;
  }

  // Show error
  function showError(message) {
    console.log('Showing error:', message);
    
    outputArea.classList.add('active');
    outputArea.querySelector('.placeholder-text').style.display = 'none';
    
    resultContent.innerHTML = `
      <div class="error-message">
        <div class="error-icon">!</div>
        <h3>Error</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  // Set loading state
  function setLoadingState(isLoading) {
    if (isLoading) {
      btnText.style.display = 'none';
      loader.style.display = 'inline-block';
      summarizeBtn.disabled = true;
    } else {
      btnText.style.display = 'inline';
      loader.style.display = 'none';
      summarizeBtn.disabled = false;
    }
  }

  // Validate URL
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Format timestamp
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  console.log('Script initialization complete');
});
