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

  // DOM Elements - Line End Utility
  const lineEndPanel = document.getElementById('lineEndPanel');
  const lineEndInputPane = document.getElementById('lineEndInputPane');
  const lineEndInput = document.getElementById('lineEndInput');
  const lineEndStatus = document.getElementById('lineEndStatus');
  const lineEndFile = document.getElementById('lineEndFile');
  const lineEndLoadBtn = document.getElementById('lineEndLoadBtn');
  const lineEndClearInputBtn = document.getElementById('lineEndClearInputBtn');
  const lineEndBanner = document.getElementById('lineEndBanner');
  const lineEndBannerText = document.getElementById('lineEndBannerText');
  const lineEndNormalizeBtn = document.getElementById('lineEndNormalizeBtn');
  const lineEndToolbar = document.getElementById('lineEndToolbar');
  const lineEndBulkSegment = document.getElementById('lineEndBulkSegment');
  const lineEndApplySegmentBtn = document.getElementById('lineEndApplySegmentBtn');
  const lineEndBulkMessage = document.getElementById('lineEndBulkMessage');
  const lineEndApplyMessageBtn = document.getElementById('lineEndApplyMessageBtn');
  const lineEndBulkLastSegment = document.getElementById('lineEndBulkLastSegment');
  const lineEndApplyLastSegmentBtn = document.getElementById('lineEndApplyLastSegmentBtn');
  const lineEndSummary = document.getElementById('lineEndSummary');
  const lineEndDownloadBtn = document.getElementById('lineEndDownloadBtn');
  const lineEndRows = document.getElementById('lineEndRows');

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

  // Line End Utility state. lineEndSourceText is the authoritative copy of the
  // loaded bytes: a <textarea> normalizes CR and CRLF to LF, so reading the
  // input box back after a file load would silently rewrite every terminator.
  let lineEndModel = null;
  let lineEndSourceText = null;
  let lineEndSourceName = null;
  let lineEndRendered = 0;
  // Set while the last-segment replacement is the reason the file holds more
  // than one kind of terminator, so the mixed-endings banner can say the mix
  // was asked for instead of reporting it as a defect.
  let lineEndMixIsIntended = false;
  const LINEEND_BATCH = 10;

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
    const isLineEnd = mode === 'lineend';

    // Panels
    viewerArea.style.display = isViewer ? 'block' : 'none';
    statsPanel.classList.toggle('active', mode === 'statistics');
    comparePanel.classList.toggle('active', isCompare);
    lineEndPanel.classList.toggle('active', isLineEnd);

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

    // Same for the Line End page: Clear resets that page and leaves whatever
    // the Viewer has loaded alone.
    if (currentPageMode === 'lineend') {
      clearLineEnd();
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

  // ========================================
  // LINE END HANDLERS
  // ========================================

  const LINEEND_PLACEHOLDER = `
    <div class="lineend-no-content">
      <p>Paste or drop an HL7 file above to choose its line endings.</p>
      <p class="lineend-hint">Nothing is uploaded &mdash; everything runs in this browser tab.</p>
    </div>
  `;

  function setLineEndStatus(text, isError) {
    lineEndStatus.textContent = text || '';
    lineEndStatus.classList.toggle('error', isError === true);
  }

  /**
   * Drop everything the page is showing and go back to the empty state. Used
   * both by Clear and by every failed load, so the rows on screen always match
   * what is actually in the model.
   */
  function resetLineEndOutput() {
    lineEndModel = null;
    lineEndRendered = 0;
    lineEndMixIsIntended = false;
    lineEndRows.innerHTML = LINEEND_PLACEHOLDER;
    lineEndToolbar.hidden = true;
    lineEndToolbar.classList.remove('stale');
    lineEndBanner.hidden = true;
  }

  function clearLineEnd() {
    lineEndInput.value = '';
    lineEndFile.value = '';
    lineEndSourceText = null;
    lineEndSourceName = null;
    lineEndBulkSegment.value = '';
    lineEndBulkMessage.value = 'NONE';
    lineEndBulkLastSegment.value = '';
    setLineEndStatus('');
    resetLineEndOutput();
  }

  /**
   * Validate, parse and render. Errors are reported inline next to the input
   * rather than through alert(), following the Compare page.
   *
   * @param {string} rawText the exact bytes to convert
   * @param {'file'|'paste'} sourceKind
   * @param {string|null} fileName used for the download filename
   */
  function loadLineEndContent(rawText, sourceKind, fileName) {
    if (!rawText || !rawText.trim()) {
      resetLineEndOutput();
      setLineEndStatus('Nothing to convert.');
      return;
    }

    if (!HL7Parser.isHL7Content(rawText)) {
      resetLineEndOutput();
      setLineEndStatus('Not recognized as HL7 content. This page only converts HL7 files.', true);
      return;
    }

    let model;
    try {
      model = HL7LineEnd.buildModel(rawText, sourceKind);
    } catch (error) {
      resetLineEndOutput();
      setLineEndStatus('Could not parse this content: ' + error.message, true);
      return;
    }

    // isHL7Content only checks the first three characters of each line against
    // the segment dictionary, with no field-separator check, so prose like
    // "PIDGEON" can pass it while yielding no usable segment at all.
    if (model.segmentCount === 0) {
      resetLineEndOutput();
      setLineEndStatus('Not recognized as HL7 content. This page only converts HL7 files.', true);
      return;
    }

    lineEndModel = model;
    lineEndSourceText = rawText;
    lineEndSourceName = fileName || null;
    lineEndRendered = 0;
    lineEndMixIsIntended = false;
    lineEndRows.innerHTML = '';
    lineEndToolbar.hidden = false;
    lineEndToolbar.classList.remove('stale');

    renderLineEndBatch();
    refreshLineEndSummary();

    const loaded = 'Loaded ' + model.rowCount.toLocaleString() + ' line'
      + (model.rowCount === 1 ? '' : 's') + (fileName ? ' from ' + fileName : '') + '.';
    if (sourceKind === 'paste') {
      setLineEndStatus(loaded + ' Pasted text always reports LF — use Browse File for exact detection.');
    } else {
      setLineEndStatus(loaded);
    }
  }

  /**
   * Append the next batch of message blocks. Only DOM construction is batched;
   * the whole file is already parsed, which is how the other pages work too.
   */
  function renderLineEndBatch() {
    if (!lineEndModel) return;

    const existingBtn = lineEndRows.querySelector('.hl7-load-more');
    if (existingBtn) existingBtn.remove();

    lineEndRendered = HL7LineEnd.renderMessages(
      lineEndRows, lineEndModel, lineEndRendered, LINEEND_BATCH
    );

    const total = lineEndModel.messages.length;
    if (lineEndRendered < total) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hl7-load-more';
      btn.innerHTML = 'Load More <span class="hl7-load-more-count">(showing '
        + lineEndRendered.toLocaleString() + ' of ' + total.toLocaleString()
        + ' messages)</span>';
      btn.addEventListener('click', renderLineEndBatch);
      lineEndRows.appendChild(btn);
    }
  }

  /**
   * Recompute the terminator tally and update the summary line and banner.
   * Never re-renders rows — a single dropdown change must not rebuild the DOM.
   */
  function refreshLineEndSummary() {
    if (!lineEndModel) {
      lineEndBanner.hidden = true;
      lineEndSummary.textContent = '';
      return;
    }

    const analysis = HL7LineEnd.analyzeEndings(lineEndModel);
    lineEndModel.analysis = analysis;

    const breakdown = HL7LineEnd.ENDING_TOKENS
      .filter(function(token) { return analysis.counts[token] > 0; })
      .map(function(token) { return token + ' ×' + analysis.counts[token].toLocaleString(); });
    if (analysis.noTrailing) breakdown.push('no trailing terminator');

    lineEndSummary.textContent = lineEndModel.messageCount.toLocaleString() + ' message'
      + (lineEndModel.messageCount === 1 ? '' : 's') + ' · '
      + lineEndModel.segmentCount.toLocaleString() + ' segment'
      + (lineEndModel.segmentCount === 1 ? '' : 's')
      + (breakdown.length ? ' · ' + breakdown.join(', ') : '');

    // A file with segments but no MSH is still worth converting — only the
    // end-of-message setting is inapplicable — so this is a warning, not the
    // hard error the Compare page raises for the same case.
    const noMsh = lineEndModel.messageCount === 0;
    const parts = [];
    if (noMsh) {
      parts.push('No MSH segment found — treating the whole file as one block. '
        + 'The end-of-message setting will not be applied.');
    }
    if (analysis.mixed) {
      parts.push(lineEndMixIsIntended
        ? 'Mixed line endings: ' + breakdown.join(', ')
          + ' — expected, since the last segment of each message was given its own ending.'
        : 'Mixed line endings detected: ' + breakdown.join(', ') + '.');
    }

    if (!parts.length) {
      lineEndBanner.hidden = true;
      return;
    }

    lineEndBanner.hidden = false;
    lineEndBanner.classList.toggle('warn', noMsh);
    lineEndBannerText.textContent = parts.join(' ');
    lineEndNormalizeBtn.hidden = !analysis.mixed;
    if (analysis.mixed) {
      lineEndNormalizeBtn.textContent = 'Normalize all to ' + analysis.majority;
    }
  }

  /**
   * Push a bulk value onto the <select> elements that are currently mounted.
   * The model has already been updated for every message; blocks rendered
   * later read their value from it, so they pick the change up on arrival.
   */
  function syncMountedSelects(selector, token) {
    const selects = lineEndRows.querySelectorAll(selector);
    for (let i = 0; i < selects.length; i++) {
      selects[i].value = token;
    }
  }

  /**
   * Same idea as syncMountedSelects, for an operation that touches one row per
   * message instead of every row. Targets in blocks not yet rendered have no
   * <select> to find, and read the model when they arrive.
   */
  function syncMountedRowSelects(targets, token) {
    for (let i = 0; i < targets.length; i++) {
      const select = lineEndRows.querySelector('select.lineend-row-select[data-msg="'
        + targets[i].message + '"][data-row="' + targets[i].row + '"]');
      if (select) select.value = token;
    }
  }

  function applyLineEndRowBulk(token) {
    const changed = HL7LineEnd.applyAllRowEndings(lineEndModel, token);
    lineEndMixIsIntended = false;
    syncMountedSelects('select.lineend-row-select', token);
    refreshLineEndSummary();
    setLineEndStatus('Set all ' + lineEndModel.rowCount.toLocaleString() + ' line'
      + (lineEndModel.rowCount === 1 ? '' : 's') + ' to ' + token
      + ' (' + changed.toLocaleString() + ' changed).');
  }

  /** Keep the original extension so a .txt holding HL7 stays a .txt. */
  function lineEndFilename() {
    if (lineEndSourceName) {
      const dot = lineEndSourceName.lastIndexOf('.');
      const base = dot > 0 ? lineEndSourceName.slice(0, dot) : lineEndSourceName;
      const ext = dot > 0 ? lineEndSourceName.slice(dot) : '.hl7';
      return base + '_lineends' + ext;
    }
    return 'line_endings_' + new Date().toISOString().slice(0, 10) + '.hl7';
  }

  function loadLineEndFile(file) {
    if (!file) return;
    readFile(file)
      .then(function(content) {
        // The textarea is display only from here on. Its .value normalizes CR
        // to LF, so the parse is handed `content`, never the box.
        lineEndInput.value = content;
        loadLineEndContent(content, 'file', file.name);
      })
      .catch(function(error) {
        setLineEndStatus('Error reading file: ' + error.message, true);
      });
  }

  function setUpLineEndDrop() {
    lineEndInputPane.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      lineEndInputPane.classList.add('drag-over');
    });
    lineEndInputPane.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!lineEndInputPane.contains(e.relatedTarget)) {
        lineEndInputPane.classList.remove('drag-over');
      }
    });
    lineEndInputPane.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      lineEndInputPane.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        loadLineEndFile(files[0]);
      }
    });
  }

  lineEndFile.addEventListener('change', function() {
    loadLineEndFile(this.files[0]);
  });

  lineEndLoadBtn.addEventListener('click', function() {
    lineEndSourceName = null;
    loadLineEndContent(lineEndInput.value, 'paste', null);
  });

  // Auto-load on paste, matching the viewer's input area.
  lineEndInput.addEventListener('paste', function() {
    setTimeout(function() {
      lineEndSourceName = null;
      loadLineEndContent(lineEndInput.value, 'paste', null);
    }, 0);
  });

  // Deliberately not a reparse: retokenizing a multi-megabyte paste on every
  // keystroke would lock the tab. Mark the results stale instead.
  lineEndInput.addEventListener('input', function() {
    if (!lineEndModel) return;
    lineEndToolbar.classList.add('stale');
    setLineEndStatus('Input changed — click Load to reparse.');
  });

  lineEndClearInputBtn.addEventListener('click', clearLineEnd);

  lineEndApplySegmentBtn.addEventListener('click', function() {
    if (!lineEndModel) return;
    const token = lineEndBulkSegment.value;
    if (!token) {
      setLineEndStatus('Choose CR, LF, or CRLF first.', true);
      return;
    }
    applyLineEndRowBulk(token);
  });

  lineEndApplyMessageBtn.addEventListener('click', function() {
    if (!lineEndModel) return;
    const token = lineEndBulkMessage.value;
    HL7LineEnd.applyAllMessageEndings(lineEndModel, token);
    syncMountedSelects('select.lineend-msg-select', token);

    const count = lineEndModel.messageCount.toLocaleString();
    if (token === 'NONE') {
      setLineEndStatus('Removed the end-of-message terminator from all ' + count + ' messages.');
    } else {
      setLineEndStatus('Set the end-of-message terminator to ' + token
        + ' on all ' + count + ' messages.');
    }
  });

  lineEndApplyLastSegmentBtn.addEventListener('click', function() {
    if (!lineEndModel) return;
    const token = lineEndBulkLastSegment.value;
    if (!token) {
      setLineEndStatus('Choose CR, LF, or CRLF first.', true);
      return;
    }

    const result = HL7LineEnd.applyAllLastSegmentEndings(lineEndModel, token);
    syncMountedRowSelects(result.targets, token);
    lineEndMixIsIntended = result.targets.length > 0;

    // The operation clears any appended end-of-message terminator, so the
    // per-message dropdowns and the toolbar control both have to follow it
    // back to None or they would claim bytes that are no longer there.
    if (result.cleared > 0) {
      syncMountedSelects('select.lineend-msg-select', 'NONE');
      lineEndBulkMessage.value = 'NONE';
    }
    refreshLineEndSummary();

    const count = result.targets.length.toLocaleString();
    setLineEndStatus('Replaced the last segment ending with ' + token + ' on '
      + count + ' message' + (result.targets.length === 1 ? '' : 's')
      + ' (' + result.changed.toLocaleString() + ' changed).'
      + (result.cleared > 0
        ? ' Cleared the appended end-of-message terminator on '
          + result.cleared.toLocaleString() + ' of them.'
        : ''));
  });

  lineEndNormalizeBtn.addEventListener('click', function() {
    if (!lineEndModel || !lineEndModel.analysis.majority) return;
    const token = lineEndModel.analysis.majority;
    lineEndBulkSegment.value = token;
    applyLineEndRowBulk(token);
  });

  lineEndDownloadBtn.addEventListener('click', function() {
    if (!lineEndModel) return;
    downloadText(HL7LineEnd.serialize(lineEndModel), lineEndFilename());
  });

  // One delegated listener for every dropdown on the page. Per-select
  // listeners would be thousands of closures on a large file.
  lineEndRows.addEventListener('change', function(e) {
    if (!lineEndModel) return;

    const select = e.target;
    if (select.classList.contains('lineend-row-select')) {
      const block = lineEndModel.messages[Number(select.dataset.msg)];
      if (!block) return;
      const row = block.rows[Number(select.dataset.row)];
      if (!row) return;
      row.ending = HL7LineEnd.decodeEnding(select.value);
    } else if (select.classList.contains('lineend-msg-select')) {
      const block = lineEndModel.messages[Number(select.dataset.msg)];
      if (!block) return;
      block.msgEnding = HL7LineEnd.decodeEnding(select.value);
      return;
    } else {
      return;
    }

    refreshLineEndSummary();
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

  // Initialize the Line End page
  setUpLineEndDrop();

  // Initialize page mode
  setPageMode('viewer');

  // Initial render
  renderCurrentContent();

})();
