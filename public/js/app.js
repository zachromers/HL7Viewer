// HL7 Viewer - Main Application Logic
// Handles file upload, copy/paste, settings, and UI coordination

(function() {
  'use strict';

  // DOM Elements - Viewer
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
  const viewerArea = document.getElementById('viewerArea');
  const jsonSearchGroup = document.getElementById('jsonSearchGroup');
  const jsonSearchInput = document.getElementById('jsonSearchInput');
  const jsonSearchPrevBtn = document.getElementById('jsonSearchPrevBtn');
  const jsonSearchNextBtn = document.getElementById('jsonSearchNextBtn');
  const jsonTreeControlsGroup = document.getElementById('jsonTreeControlsGroup');
  const jsonExpandAllBtn = document.getElementById('jsonExpandAllBtn');
  const jsonCollapseAllBtn = document.getElementById('jsonCollapseAllBtn');

  // DOM Elements - Page Mode
  const pageModeRadios = document.querySelectorAll('input[name="pageMode"]');
  const viewerOnlyControls = document.querySelectorAll('.viewer-only-control');
  const compareOnlyControls = document.querySelectorAll('.compare-only-control');
  const jsonOnlyControls = document.querySelectorAll('.json-only-control');

  // DOM Elements - Compare
  const comparePanel = document.getElementById('comparePanel');
  const compareInputA = document.getElementById('compareInputA');
  const compareInputB = document.getElementById('compareInputB');
  const compareStatusA = document.getElementById('compareStatusA');
  const compareStatusB = document.getElementById('compareStatusB');
  const compareFileA = document.getElementById('compareFileA');
  const compareFileB = document.getElementById('compareFileB');
  const compareClearA = document.getElementById('compareClearA');
  const compareClearB = document.getElementById('compareClearB');
  const comparePaneA = document.getElementById('comparePaneA');
  const comparePaneB = document.getElementById('comparePaneB');
  const compareRunBtn = document.getElementById('compareRunBtn');
  const compareResults = document.getElementById('compareResults');
  const compareShowUnflagged = document.getElementById('compareShowUnflagged');

  // DOM Elements - Statistics
  const statsPanel = document.getElementById('statsPanel');
  const statsNoDataMessage = document.getElementById('statsNoDataMessage');
  const statsInputSection = document.getElementById('statsInputSection');
  const statsFiltersList = document.getElementById('statsFiltersList');
  const addFilterBtn = document.getElementById('addFilterBtn');
  const filterLogicSection = document.getElementById('filterLogicSection');
  const customLogicSection = document.getElementById('customLogicSection');
  const customLogicInput = document.getElementById('customLogicInput');
  const statsFieldInput = document.getElementById('statsFieldInput');
  const statsGenerateBtn = document.getElementById('statsGenerateBtn');
  const statsResults = document.getElementById('statsResults');

  // Filter state
  let filterCounter = 1;

  // Current content state
  let currentContent = null;
  let currentPageMode = 'viewer';

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
  // PAGE MODE MANAGEMENT
  // ========================================

  /**
   * Switch between viewer and statistics pages
   */
  function setPageMode(mode) {
    currentPageMode = mode;

    const isViewer = mode === 'viewer';
    const isCompare = mode === 'compare';

    // Panels
    viewerArea.style.display = isViewer ? 'block' : 'none';
    statsPanel.classList.toggle('active', mode === 'statistics');
    comparePanel.classList.toggle('active', isCompare);

    // Input area belongs to the viewer only, and only while nothing is loaded.
    if (isViewer && !currentContent) {
      inputArea.classList.remove('hidden');
    } else {
      inputArea.classList.add('hidden');
    }

    // Menu controls scoped to a single page
    viewerOnlyControls.forEach(el => {
      el.style.display = isViewer ? 'flex' : 'none';
    });
    compareOnlyControls.forEach(el => {
      el.style.display = isCompare ? 'flex' : 'none';
    });

    // JSON search/tree controls only make sense on the viewer page. Leaving
    // the page hides them; returning restores whatever the content warrants.
    if (isViewer) {
      updateJSONControlsVisibility();
    } else {
      jsonOnlyControls.forEach(el => {
        el.style.display = 'none';
      });
    }

    if (mode === 'statistics') {
      updateStatsNoContentMessage();
    }
  }

  /**
   * Update the "no content" message in stats panel and enable/disable inputs
   */
  function updateStatsNoContentMessage() {
    // Get all inputs and buttons in the stats input section
    const statsInputs = statsInputSection.querySelectorAll('input, button');

    if (!currentContent) {
      // Show no data message, hide input section
      statsNoDataMessage.style.display = 'block';
      statsInputSection.classList.add('disabled');
      statsResults.innerHTML = '';

      // Disable all inputs and buttons
      statsInputs.forEach(el => {
        el.disabled = true;
      });
    } else {
      // Hide no data message, show input section
      statsNoDataMessage.style.display = 'none';
      statsInputSection.classList.remove('disabled');

      // Enable all inputs and buttons
      statsInputs.forEach(el => {
        el.disabled = false;
      });

      // Re-hide first filter's remove button (should stay hidden when only 1 filter)
      const firstRemoveBtn = statsFiltersList.querySelector('.stats-filter-remove-btn');
      if (firstRemoveBtn && statsFiltersList.querySelectorAll('.stats-filter-row').length === 1) {
        firstRemoveBtn.style.visibility = 'hidden';
      }

      // Only reset results if showing empty or no previous results
      const noContent = statsResults.querySelector('.stats-no-content');
      if (!statsResults.innerHTML.trim() || noContent) {
        statsResults.innerHTML = `
          <div class="stats-no-content">
            <p>Add filters and/or a field to analyze, then click "Evaluate"</p>
            <p class="stats-hint">Examples: PID.5 (Patient Name), FT1.13 (Description), MSH.9.1 (Message Type)</p>
          </div>
        `;
      }
    }
  }

  // ========================================
  // CONTENT RENDERING
  // ========================================

  /**
   * Render the current content with current settings
   */
  function renderCurrentContent() {
    // Re-render rebuilds the DOM, so any prior search state is stale.
    HL7Parser.clearJSONSearch(viewerContainer);

    if (!currentContent) {
      viewerContainer.innerHTML = '<div class="welcome-message"><p>Upload a file or paste content to view HL7/JSON data</p></div>';
      viewerContainer.className = 'hl7-container';
      if (jsonSearchGroup) jsonSearchGroup.style.display = 'none';
      if (jsonTreeControlsGroup) jsonTreeControlsGroup.style.display = 'none';
      if (jsonSearchInput) jsonSearchInput.value = '';
      return;
    }

    const settings = getSettings();
    HL7Parser.renderContent(viewerContainer, currentContent, settings);

    const isJSON = HL7Parser.detectContentType(currentContent) === 'json';
    updateJSONControlsVisibility();
    if (!isJSON && jsonSearchInput) {
      jsonSearchInput.value = '';
    }
  }

  /**
   * Show the JSON search box and tree controls only when the viewer page is
   * showing JSON content.
   */
  function updateJSONControlsVisibility() {
    const isJSON = currentPageMode === 'viewer' && !!currentContent &&
                   HL7Parser.detectContentType(currentContent) === 'json';
    const settings = getSettings();
    if (jsonSearchGroup) {
      jsonSearchGroup.style.display = isJSON ? '' : 'none';
    }
    if (jsonTreeControlsGroup) {
      jsonTreeControlsGroup.style.display = (isJSON && settings.viewMode === 'collapsed') ? '' : 'none';
    }
  }

  function setAllJSONTreeNodes(expand) {
    const headers = viewerContainer.querySelectorAll('.json-collapsed-view .hl7-tree-header');
    headers.forEach(function(header) {
      const content = header.nextElementSibling;
      if (!content || !content.classList.contains('hl7-tree-content')) return;
      const toggle = header.querySelector('.hl7-tree-toggle');
      if (expand) {
        header.classList.remove('collapsed');
        header.classList.add('expanded');
        content.style.display = 'block';
        if (toggle) toggle.innerHTML = '\u25BC';
      } else {
        header.classList.remove('expanded');
        header.classList.add('collapsed');
        content.style.display = 'none';
        if (toggle) toggle.innerHTML = '\u25B6';
      }
    });
  }

  if (jsonExpandAllBtn) {
    jsonExpandAllBtn.addEventListener('click', function() { setAllJSONTreeNodes(true); });
  }
  if (jsonCollapseAllBtn) {
    jsonCollapseAllBtn.addEventListener('click', function() { setAllJSONTreeNodes(false); });
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
    if (jsonSearchInput) jsonSearchInput.value = '';
    renderCurrentContent();

    // Collapse input area after successful load
    inputArea.classList.add('hidden');

    // Update stats panel state
    updateStatsNoContentMessage();
  }

  /**
   * Clear the viewer
   */
  function clearViewer() {
    // On the Compare page, Clear applies to the comparison, not the viewer.
    if (currentPageMode === 'compare') {
      clearComparison();
      return;
    }

    currentContent = null;
    textInput.value = '';
    fileInput.value = '';

    // Switch back to viewer mode if on statistics page
    if (currentPageMode === 'statistics') {
      document.querySelector('input[name="pageMode"][value="viewer"]').checked = true;
      setPageMode('viewer');
    } else {
      // Show input area
      inputArea.classList.remove('hidden');
    }

    renderCurrentContent();

    // Remove any existing tooltips
    const tooltip = document.querySelector('.hl7-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    // Reset stats panel
    resetFilters();
    statsFieldInput.value = '';
    updateStatsNoContentMessage();
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

  // Page mode change handlers
  pageModeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      setPageMode(this.value);
    });
  });

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

  // JSON search handlers
  let lastSearchedQuery = '';

  function runJSONSearch() {
    const q = jsonSearchInput.value.trim();
    lastSearchedQuery = q;
    HL7Parser.performJSONSearch(viewerContainer, q);
  }

  if (jsonSearchPrevBtn) {
    jsonSearchPrevBtn.addEventListener('click', function() {
      HL7Parser.navigateJSONSearch(viewerContainer, -1);
    });
  }
  if (jsonSearchNextBtn) {
    jsonSearchNextBtn.addEventListener('click', function() {
      HL7Parser.navigateJSONSearch(viewerContainer, 1);
    });
  }
  if (jsonSearchInput) {
    jsonSearchInput.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const current = jsonSearchInput.value.trim();
      if (!current) {
        HL7Parser.clearJSONSearch(viewerContainer);
        lastSearchedQuery = '';
        return;
      }
      // Re-run the search if the query text changed OR if the previous
      // search state was wiped by a re-render (view mode / settings change).
      const hasActiveMatches = !!viewerContainer.querySelector('.json-search-match');
      if (current !== lastSearchedQuery || !hasActiveMatches) {
        runJSONSearch();
      } else {
        HL7Parser.navigateJSONSearch(viewerContainer, e.shiftKey ? -1 : 1);
      }
    });
    jsonSearchInput.addEventListener('input', function() {
      if (jsonSearchInput.value === '') {
        HL7Parser.clearJSONSearch(viewerContainer);
        lastSearchedQuery = '';
      }
    });
  }

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

  // Auto-load content when pasted
  textInput.addEventListener('paste', function() {
    // Use setTimeout so the textarea value is updated with pasted content first
    setTimeout(function() {
      if (textInput.value.trim()) {
        loadContent(textInput.value);
      }
    }, 0);
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
  // STATISTICS HANDLERS
  // ========================================

  /**
   * Update filter logic section visibility
   */
  function updateFilterLogicVisibility() {
    const filterRows = statsFiltersList.querySelectorAll('.stats-filter-row');
    const hasMultipleFilters = filterRows.length > 1;

    filterLogicSection.style.display = hasMultipleFilters ? 'block' : 'none';

    // Update remove button visibility
    filterRows.forEach((row, index) => {
      const removeBtn = row.querySelector('.stats-filter-remove-btn');
      if (removeBtn) {
        removeBtn.style.visibility = filterRows.length > 1 ? 'visible' : 'hidden';
      }
    });
  }

  /**
   * Add a new filter row
   */
  function addFilterRow() {
    filterCounter++;
    const newRow = document.createElement('div');
    newRow.className = 'stats-filter-row';
    newRow.dataset.filterId = filterCounter;
    newRow.innerHTML = `
      <span class="stats-filter-label">F${filterCounter}</span>
      <input type="text" class="stats-field-input stats-filter-input" placeholder="e.g., PV1.2 = E">
      <button type="button" class="stats-filter-remove-btn" title="Remove filter">&#10005;</button>
    `;
    statsFiltersList.appendChild(newRow);
    updateFilterLogicVisibility();

    // Focus the new input
    newRow.querySelector('input').focus();
  }

  /**
   * Remove a filter row
   */
  function removeFilterRow(row) {
    row.remove();
    updateFilterLogicVisibility();
  }

  /**
   * Get all filters and logic settings
   */
  function getFiltersConfig() {
    const filterRows = statsFiltersList.querySelectorAll('.stats-filter-row');
    const filters = [];

    filterRows.forEach(row => {
      const input = row.querySelector('input');
      const label = row.querySelector('.stats-filter-label').textContent;
      const value = input.value.trim();
      if (value) {
        filters.push({ label, expression: value });
      }
    });

    if (filters.length === 0) {
      return null;
    }

    if (filters.length === 1) {
      return { filters, logic: 'single', expression: null };
    }

    const logicMode = document.querySelector('input[name="filterLogic"]:checked').value;
    let expression = null;

    if (logicMode === 'custom') {
      expression = customLogicInput.value.trim();
    }

    return { filters, logic: logicMode, expression };
  }

  /**
   * Reset filters to initial state
   */
  function resetFilters() {
    filterCounter = 1;
    statsFiltersList.innerHTML = `
      <div class="stats-filter-row" data-filter-id="1">
        <span class="stats-filter-label">F1</span>
        <input type="text" class="stats-field-input stats-filter-input" placeholder="e.g., PV1.2 = E">
        <button type="button" class="stats-filter-remove-btn" title="Remove filter" style="visibility: hidden;">&#10005;</button>
      </div>
    `;
    filterLogicSection.style.display = 'none';
    customLogicSection.style.display = 'none';
    customLogicInput.value = '';
    const andRadio = document.querySelector('input[name="filterLogic"][value="AND"]');
    if (andRadio) andRadio.checked = true;
  }

  // Add filter button
  addFilterBtn.addEventListener('click', addFilterRow);

  // Remove filter button (delegated)
  statsFiltersList.addEventListener('click', function(e) {
    const removeBtn = e.target.closest('.stats-filter-remove-btn');
    if (removeBtn) {
      const row = removeBtn.closest('.stats-filter-row');
      removeFilterRow(row);
    }
  });

  // Filter logic radio buttons
  document.querySelectorAll('input[name="filterLogic"]').forEach(radio => {
    radio.addEventListener('change', function() {
      customLogicSection.style.display = this.value === 'custom' ? 'block' : 'none';
    });
  });

  // Generate statistics button
  statsGenerateBtn.addEventListener('click', function() {
    const fieldRef = statsFieldInput.value.trim();
    const filtersConfig = getFiltersConfig();

    // Must have either a field to analyze or filters applied
    if (!fieldRef && !filtersConfig) {
      statsResults.innerHTML = '<div class="stats-error">Please enter a field reference to analyze, or add a filter to view filtered messages.</div>';
      return;
    }

    if (!currentContent) {
      statsResults.innerHTML = '<div class="stats-error">No HL7 content loaded. Switch to Viewer page to load data first.</div>';
      return;
    }

    // Check if content is HL7
    if (!HL7Parser.isHL7Content(currentContent)) {
      statsResults.innerHTML = '<div class="stats-error">Statistics are only available for HL7 content. The loaded content appears to be JSON.</div>';
      return;
    }

    HL7Stats.runStatistics(currentContent, fieldRef, 'statsResults', filtersConfig);
  });

  // Allow Enter key to generate statistics
  statsFieldInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      statsGenerateBtn.click();
    }
  });

  // ========================================
  // COMPARE HANDLERS
  // ========================================

  let lastCompareResult = null;

  /**
   * Report how many messages a pane holds, or why it can't be used.
   */
  function updateCompareStatus(textarea, statusEl) {
    const content = textarea.value;
    statusEl.classList.remove('error');

    if (!content.trim()) {
      statusEl.textContent = '';
      return;
    }

    if (!HL7Parser.isHL7Content(content)) {
      statusEl.textContent = 'Not recognized as HL7';
      statusEl.classList.add('error');
      return;
    }

    const messages = HL7Diff.parseMessages(content);
    if (messages.length === 0) {
      statusEl.textContent = 'No MSH segment found';
      statusEl.classList.add('error');
    } else if (messages.length === 1) {
      statusEl.textContent = '1 message, ' + messages[0].segments.length + ' segments';
    } else {
      statusEl.textContent = messages.length + ' messages (the first will be compared)';
    }
  }

  function refreshCompareStatuses() {
    updateCompareStatus(compareInputA, compareStatusA);
    updateCompareStatus(compareInputB, compareStatusB);
  }

  function runComparison() {
    const a = compareInputA.value;
    const b = compareInputB.value;

    if (!a.trim() || !b.trim()) {
      compareResults.innerHTML =
        '<div class="compare-error">Both panes need an HL7 message before a comparison can run.</div>';
      return;
    }

    const result = HL7Diff.compare(a, b);
    lastCompareResult = result;
    HL7Diff.render(result, compareResults, { showUnflagged: compareShowUnflagged.checked });
  }

  function rerenderComparison() {
    if (!lastCompareResult) return;
    // Keep whatever the user has collapsed; only a fresh comparison resets it.
    const collapsedGroups = HL7Diff.getCollapsedGroups(compareResults);
    HL7Diff.render(lastCompareResult, compareResults, {
      showUnflagged: compareShowUnflagged.checked,
      collapsedGroups: collapsedGroups
    });
  }

  function clearComparison() {
    compareInputA.value = '';
    compareInputB.value = '';
    compareFileA.value = '';
    compareFileB.value = '';
    lastCompareResult = null;
    refreshCompareStatuses();
    compareResults.innerHTML = `
      <div class="compare-no-content">
        <p>Load a message into each pane and click "Compare Messages".</p>
        <p class="compare-hint">Nothing is uploaded &mdash; parsing and comparison run entirely in this browser tab.</p>
      </div>
    `;
  }

  function loadCompareFile(file, textarea, statusEl) {
    if (!file) return;
    readFile(file)
      .then(function(content) {
        textarea.value = content;
        updateCompareStatus(textarea, statusEl);
      })
      .catch(function(error) {
        statusEl.textContent = 'Error reading file: ' + error.message;
        statusEl.classList.add('error');
      });
  }

  function setUpComparePaneDrop(pane, textarea, statusEl) {
    pane.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      pane.classList.add('drag-over');
    });
    pane.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!pane.contains(e.relatedTarget)) {
        pane.classList.remove('drag-over');
      }
    });
    pane.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      pane.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        loadCompareFile(files[0], textarea, statusEl);
      }
    });
  }

  setUpComparePaneDrop(comparePaneA, compareInputA, compareStatusA);
  setUpComparePaneDrop(comparePaneB, compareInputB, compareStatusB);

  compareInputA.addEventListener('input', function() {
    updateCompareStatus(compareInputA, compareStatusA);
  });
  compareInputB.addEventListener('input', function() {
    updateCompareStatus(compareInputB, compareStatusB);
  });

  compareFileA.addEventListener('change', function() {
    loadCompareFile(this.files[0], compareInputA, compareStatusA);
  });
  compareFileB.addEventListener('change', function() {
    loadCompareFile(this.files[0], compareInputB, compareStatusB);
  });

  compareClearA.addEventListener('click', function() {
    compareInputA.value = '';
    compareFileA.value = '';
    updateCompareStatus(compareInputA, compareStatusA);
  });
  compareClearB.addEventListener('click', function() {
    compareInputB.value = '';
    compareFileB.value = '';
    updateCompareStatus(compareInputB, compareStatusB);
  });

  compareRunBtn.addEventListener('click', runComparison);


  compareShowUnflagged.addEventListener('change', function() {
    localStorage.setItem('hl7viewer_compareShowUnflagged', compareShowUnflagged.checked);
    rerenderComparison();
  });

  // ---- Result actions (delegated; results are re-rendered on every run) ----

  compareResults.addEventListener('click', function(e) {
    if (e.target.closest('#compareExpandAllBtn')) {
      HL7Diff.setAllGroups(compareResults, true);
      return;
    }

    if (e.target.closest('#compareCollapseAllBtn')) {
      HL7Diff.setAllGroups(compareResults, false);
      return;
    }

    if (HL7Diff.handleGroupToggle(e)) {
      return;
    }


    if (e.target.closest('#compareCopyBtn')) {
      if (!lastCompareResult) return;
      copyTextToClipboard(HL7Diff.buildReport(lastCompareResult), e.target.closest('#compareCopyBtn'));
      return;
    }

    if (e.target.closest('#compareDownloadBtn')) {
      if (!lastCompareResult) return;
      downloadText(HL7Diff.buildReport(lastCompareResult), 'hl7-comparison.txt');
    }
  });

  compareResults.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target.closest('.compare-group-header')) return;
    e.preventDefault();
    HL7Diff.handleGroupToggle(e);
  });

  /**
   * Copy text without leaving the page. Falls back to execCommand for
   * contexts where the async clipboard API is unavailable.
   */
  function copyTextToClipboard(text, btn) {
    const original = btn ? btn.textContent : null;
    function done() {
      if (!btn) return;
      btn.textContent = 'Copied';
      setTimeout(function() { btn.textContent = original; }, 1500);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function() {
        legacyCopy(text);
        done();
      });
    } else {
      legacyCopy(text);
      done();
    }
  }

  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  /**
   * Save a report locally. Uses a blob URL so nothing touches the network.
   */
  function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 0);
  }

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

  // Initialize the compare page
  compareShowUnflagged.checked = localStorage.getItem('hl7viewer_compareShowUnflagged') === 'true';
  refreshCompareStatuses();

  // Initialize page mode
  setPageMode('viewer');

  // Initial render
  renderCurrentContent();

})();
