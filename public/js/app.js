// HL7 Viewer - Main Application Logic
// Handles file upload, copy/paste, settings, and UI coordination

(function() {
  'use strict';

  // DOM Elements
  const viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
  const hideEmptyCheckbox = document.getElementById('hideEmptyFields');
  const messagesPerBatchSelect = document.getElementById('messagesPerBatch');
  const clearBtn = document.getElementById('clearBtn');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('textInput');
  const loadBtn = document.getElementById('loadBtn');
  const inputArea = document.getElementById('inputArea');
  const viewerContainer = document.getElementById('viewerContainer');

  // Current content state
  let currentContent = null;

  // ========================================
  // SETTINGS MANAGEMENT
  // ========================================

  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    const viewMode = localStorage.getItem('hl7viewer_viewMode') || 'collapsed';
    const hideEmptyFields = localStorage.getItem('hl7viewer_hideEmptyFields') === 'true';
    const messagesPerBatch = localStorage.getItem('hl7viewer_messagesPerBatch') || '20';

    // Apply to UI
    viewModeRadios.forEach(radio => {
      radio.checked = radio.value === viewMode;
    });
    hideEmptyCheckbox.checked = hideEmptyFields;
    messagesPerBatchSelect.value = messagesPerBatch;
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    const viewMode = document.querySelector('input[name="viewMode"]:checked').value;
    localStorage.setItem('hl7viewer_viewMode', viewMode);
    localStorage.setItem('hl7viewer_hideEmptyFields', hideEmptyCheckbox.checked);
    localStorage.setItem('hl7viewer_messagesPerBatch', messagesPerBatchSelect.value);
  }

  /**
   * Get current settings
   */
  function getSettings() {
    return {
      viewMode: document.querySelector('input[name="viewMode"]:checked').value,
      hideEmptyFields: hideEmptyCheckbox.checked,
      messagesPerBatch: messagesPerBatchSelect.value
    };
  }

  // ========================================
  // CONTENT RENDERING
  // ========================================

  /**
   * Render the current content with current settings
   */
  function renderCurrentContent() {
    if (!currentContent) {
      viewerContainer.innerHTML = '<div class="welcome-message"><p>Upload a file or paste content to view HL7/JSON data</p></div>';
      viewerContainer.className = 'hl7-container';
      return;
    }

    HL7Parser.renderContent(viewerContainer, currentContent, getSettings());
  }

  /**
   * Load and render new content
   */
  function loadContent(content) {
    if (!content || !content.trim()) {
      alert('No content to display. Please upload a file or paste some content.');
      return;
    }

    const contentType = HL7Parser.detectContentType(content);
    if (!contentType) {
      alert('Could not detect HL7 or JSON content. Please check your input.');
      return;
    }

    currentContent = content;
    renderCurrentContent();

    // Collapse input area after successful load
    inputArea.classList.add('hidden');
  }

  /**
   * Clear the viewer
   */
  function clearViewer() {
    currentContent = null;
    textInput.value = '';
    fileInput.value = '';
    inputArea.classList.remove('hidden');
    renderCurrentContent();

    // Remove any existing tooltips
    const tooltip = document.querySelector('.hl7-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  // ========================================
  // FILE HANDLING
  // ========================================

  /**
   * Read file content
   */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.onerror = function(e) {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }

  /**
   * Handle file upload
   */
  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    try {
      // If multiple files, concatenate them
      let allContent = '';
      for (const file of files) {
        const content = await readFile(file);
        if (allContent) {
          allContent += '\n\n';
        }
        allContent += content;
      }

      loadContent(allContent);
    } catch (error) {
      alert('Error reading file: ' + error.message);
    }
  }

  // ========================================
  // EVENT HANDLERS
  // ========================================

  // Settings change handlers
  viewModeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      saveSettings();
      if (currentContent) {
        renderCurrentContent();
      }
    });
  });

  hideEmptyCheckbox.addEventListener('change', function() {
    saveSettings();
    if (currentContent) {
      renderCurrentContent();
    }
  });

  messagesPerBatchSelect.addEventListener('change', function() {
    saveSettings();
    if (currentContent) {
      renderCurrentContent();
    }
  });

  // Clear button
  clearBtn.addEventListener('click', clearViewer);

  // File input change
  fileInput.addEventListener('change', function() {
    handleFileUpload(this.files);
  });

  // Load button (for pasted content)
  loadBtn.addEventListener('click', function() {
    loadContent(textInput.value);
  });

  // Allow Enter key to load content (with Ctrl/Cmd)
  textInput.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      loadContent(textInput.value);
    }
  });

  // ========================================
  // DRAG AND DROP
  // ========================================

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  });

  // Prevent default drag behavior on the whole document
  document.addEventListener('dragover', function(e) {
    e.preventDefault();
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
  });

  // ========================================
  // CLICK TO SHOW INPUT AREA
  // ========================================

  // Allow clicking on viewer area to show input when there's content
  viewerContainer.addEventListener('dblclick', function(e) {
    // Only toggle if clicking on empty space, not on content
    if (e.target === viewerContainer || e.target.classList.contains('welcome-message')) {
      inputArea.classList.toggle('hidden');
    }
  });

  // Add a small toggle button to show/hide input when content is loaded
  function updateToggleHint() {
    if (currentContent && inputArea.classList.contains('hidden')) {
      viewerContainer.title = 'Double-click to show input area';
    } else {
      viewerContainer.title = '';
    }
  }

  // ========================================
  // DOWNLOAD LOCAL MODAL
  // ========================================

  const downloadLocalBtn = document.getElementById('downloadLocalBtn');
  const downloadModal = document.getElementById('downloadModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  downloadLocalBtn.addEventListener('click', function() {
    downloadModal.classList.add('visible');
  });

  modalCloseBtn.addEventListener('click', function() {
    downloadModal.classList.remove('visible');
  });

  downloadModal.addEventListener('click', function(e) {
    if (e.target === downloadModal) {
      downloadModal.classList.remove('visible');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && downloadModal.classList.contains('visible')) {
      downloadModal.classList.remove('visible');
    }
  });

  // Copy buttons inside the modal
  downloadModal.addEventListener('click', function(e) {
    const btn = e.target.closest('.copy-code-btn');
    if (!btn) return;
    const text = btn.getAttribute('data-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '\u2713';
        setTimeout(function() { btn.textContent = '\uD83D\uDCCB'; }, 1500);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = '\u2713';
      setTimeout(function() { btn.textContent = '\uD83D\uDCCB'; }, 1500);
    }
  });

  // ========================================
  // INITIALIZATION
  // ========================================

  // Set up tree view expand/collapse listener ONCE on the container
  // This persists across re-renders and avoids duplicate listener issues
  viewerContainer.addEventListener('click', function(e) {
    HL7Parser.handleTreeClick(e);
  });

  // Load saved settings
  loadSettings();

  // Initial render
  renderCurrentContent();

})();
