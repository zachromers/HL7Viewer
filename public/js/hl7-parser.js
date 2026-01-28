// HL7 Viewer - Parser and Renderer Module
// Adapted from HL7browser extension content.js

const HL7Parser = (function() {
  'use strict';

  // Configuration defaults
  const DEFAULT_MESSAGES_PER_BATCH = 20;

  /**
   * Detect content type (json or hl7)
   */
  function detectContentType(content) {
    const trimmed = content.trim();

    // Check for JSON first
    if (isJSONContent(trimmed)) {
      return 'json';
    }

    // Check for HL7
    if (isHL7Content(content)) {
      return 'hl7';
    }

    return null;
  }

  /**
   * Check if the content appears to be JSON formatted
   */
  function isJSONContent(content) {
    const trimmed = content.trim();

    // Quick check: must start with { or [
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }

    // Try to parse it
    try {
      JSON.parse(trimmed);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if the content appears to be HL7 formatted
   */
  function isHL7Content(content) {
    const lines = content.split(/\r\n|\n|\r/).filter(line => line.trim());
    if (lines.length === 0) return false;

    // Check if any line starts with a known HL7 segment
    let hl7LineCount = 0;
    for (const line of lines) {
      const segmentId = line.substring(0, 3);
      if (HL7_SEGMENT_IDS.includes(segmentId)) {
        hl7LineCount++;
      }
    }

    // Consider it HL7 if at least 30% of lines are HL7 segments or has MSH
    const hasMSH = lines.some(line => line.startsWith('MSH'));
    return hasMSH || (hl7LineCount / lines.length > 0.3);
  }

  /**
   * Main render function - renders content to a container
   */
  function renderContent(container, content, settings) {
    const viewMode = settings.viewMode || 'collapsed';
    const hideEmptyFields = settings.hideEmptyFields || false;
    const messagesPerBatch = parseInt(settings.messagesPerBatch) || DEFAULT_MESSAGES_PER_BATCH;

    const contentType = detectContentType(content);

    if (!contentType) {
      container.innerHTML = '<div class="welcome-message"><p>Could not detect HL7 or JSON content. Please check your input.</p></div>';
      return;
    }

    if (contentType === 'json') {
      renderJSONContent(container, content, viewMode, messagesPerBatch);
    } else {
      renderHL7Content(container, content, viewMode, hideEmptyFields, messagesPerBatch);
    }
  }

  /**
   * Parse and render the HL7 content with interactive elements
   */
  function renderHL7Content(container, content, viewMode, hideEmptyFields, messagesPerBatch) {
    if (viewMode === 'collapsed') {
      renderCollapsedView(container, content, hideEmptyFields, messagesPerBatch);
    } else {
      renderStandardView(container, content, messagesPerBatch);
    }
  }

  /**
   * Render the standard inline view with hover tooltips
   */
  function renderStandardView(container, content, messagesPerBatch) {
    // Clear container and set up
    container.innerHTML = '';
    container.className = 'hl7-container hl7-standard-view';

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'hl7-tooltip';
    tooltip.style.display = 'none';

    // Split content into lines and group by messages
    const lines = content.split(/\r\n|\n|\r/);
    const messageGroups = groupLinesByMessage(lines);

    // State for pagination
    let renderedCount = 0;
    const totalMessages = messageGroups.length;

    // Render first batch
    renderedCount = renderStandardBatch(container, messageGroups, 0, messagesPerBatch);

    // Add tooltip to body (not container) for proper positioning
    document.body.appendChild(tooltip);

    // Add "Load More" button if there are more messages
    if (renderedCount < totalMessages) {
      const loadMoreBtn = createLoadMoreButton(totalMessages, renderedCount);
      container.appendChild(loadMoreBtn);

      loadMoreBtn.addEventListener('click', function() {
        // Remove the button temporarily
        loadMoreBtn.remove();

        // Render next batch
        const newCount = renderStandardBatch(container, messageGroups, renderedCount, messagesPerBatch);
        renderedCount = newCount;

        // Add button back if still more to load
        if (renderedCount < totalMessages) {
          updateLoadMoreButton(loadMoreBtn, totalMessages, renderedCount);
          container.appendChild(loadMoreBtn);
        }
      });
    }

    // Add event listeners for tooltips
    setupTooltipListeners(container, tooltip);
  }

  /**
   * Group lines by message (each message starts with MSH)
   */
  function groupLinesByMessage(lines) {
    const messageGroups = [];
    let currentGroup = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('MSH')) {
        if (currentGroup.length > 0) {
          messageGroups.push(currentGroup);
        }
        currentGroup = [line];
      } else {
        currentGroup.push(line);
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      messageGroups.push(currentGroup);
    }

    return messageGroups;
  }

  /**
   * Render a batch of messages in standard view
   */
  function renderStandardBatch(container, messageGroups, startIndex, batchSize) {
    const endIndex = Math.min(startIndex + batchSize, messageGroups.length);

    // Track message context (encoding characters)
    let fieldSeparator = '|';
    let componentSeparator = '^';
    let repetitionSeparator = '~';
    let escapeCharacter = '\\';
    let subcomponentSeparator = '&';

    for (let m = startIndex; m < endIndex; m++) {
      const messageLines = messageGroups[m];

      // Add message separator if not the first message
      if (m > 0) {
        const separatorDiv = document.createElement('div');
        separatorDiv.className = 'hl7-message-separator';
        container.appendChild(separatorDiv);
      }

      for (const line of messageLines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          // Empty line
          const lineDiv = document.createElement('div');
          lineDiv.className = 'hl7-line hl7-empty';
          lineDiv.innerHTML = '&nbsp;';
          container.appendChild(lineDiv);
          continue;
        }

        const segmentId = trimmedLine.substring(0, 3);

        if (!HL7_SEGMENT_IDS.includes(segmentId)) {
          // Non-HL7 line (comment or other)
          const lineDiv = document.createElement('div');
          lineDiv.className = 'hl7-line hl7-comment';
          lineDiv.textContent = trimmedLine;
          container.appendChild(lineDiv);
          continue;
        }

        // Parse MSH segment to get encoding characters
        if (segmentId === 'MSH') {
          if (trimmedLine.length > 3) {
            fieldSeparator = trimmedLine[3];
          }
          if (trimmedLine.length > 7) {
            const encodingChars = trimmedLine.substring(4, 8);
            componentSeparator = encodingChars[0] || '^';
            repetitionSeparator = encodingChars[1] || '~';
            escapeCharacter = encodingChars[2] || '\\';
            subcomponentSeparator = encodingChars[3] || '&';
          }
        }

        // Create line container
        const lineDiv = document.createElement('div');
        lineDiv.className = 'hl7-line';
        lineDiv.dataset.segment = segmentId;

        // Parse and render the segment
        const parsedSegment = parseSegment(
          trimmedLine,
          segmentId,
          fieldSeparator,
          componentSeparator,
          repetitionSeparator,
          subcomponentSeparator
        );

        // Create segment name span
        const segmentSpan = document.createElement('span');
        segmentSpan.className = 'hl7-segment-id';
        segmentSpan.textContent = segmentId;
        segmentSpan.dataset.segment = segmentId;
        segmentSpan.dataset.tooltipText = getSegmentTooltip(segmentId);
        lineDiv.appendChild(segmentSpan);

        // Handle MSH specially - field separator is MSH.1
        if (segmentId === 'MSH') {
          // Add the field separator as MSH.1
          const sepSpan = document.createElement('span');
          sepSpan.className = 'hl7-field';
          sepSpan.textContent = fieldSeparator;
          sepSpan.dataset.segment = 'MSH';
          sepSpan.dataset.field = '1';
          sepSpan.dataset.tooltipText = 'MSH.1 - Field Separator';
          lineDiv.appendChild(sepSpan);

          // Add encoding characters as MSH.2
          if (parsedSegment.fields.length > 0) {
            const encSpan = createFieldSpan(
              parsedSegment.fields[0],
              'MSH',
              2,
              componentSeparator,
              subcomponentSeparator
            );
            lineDiv.appendChild(encSpan);
          }

          // Add remaining fields starting from index 1 (which is MSH.3)
          for (let i = 1; i < parsedSegment.fields.length; i++) {
            const sepSpan = document.createElement('span');
            sepSpan.className = 'hl7-separator';
            sepSpan.textContent = fieldSeparator;
            lineDiv.appendChild(sepSpan);

            const fieldSpan = createFieldSpan(
              parsedSegment.fields[i],
              segmentId,
              i + 2, // MSH fields are offset by 2
              componentSeparator,
              subcomponentSeparator
            );
            lineDiv.appendChild(fieldSpan);
          }
        } else {
          // Regular segment
          for (let i = 0; i < parsedSegment.fields.length; i++) {
            const sepSpan = document.createElement('span');
            sepSpan.className = 'hl7-separator';
            sepSpan.textContent = fieldSeparator;
            lineDiv.appendChild(sepSpan);

            const fieldSpan = createFieldSpan(
              parsedSegment.fields[i],
              segmentId,
              i + 1,
              componentSeparator,
              subcomponentSeparator
            );
            lineDiv.appendChild(fieldSpan);
          }
        }

        container.appendChild(lineDiv);
      }
    }

    return endIndex;
  }

  /**
   * Create the "Load More" button
   */
  function createLoadMoreButton(total, loaded) {
    const btn = document.createElement('button');
    btn.className = 'hl7-load-more';
    btn.innerHTML = `Load More <span class="hl7-load-more-count">(showing ${loaded} of ${total} messages)</span>`;
    return btn;
  }

  /**
   * Update the "Load More" button text
   */
  function updateLoadMoreButton(btn, total, loaded) {
    btn.innerHTML = `Load More <span class="hl7-load-more-count">(showing ${loaded} of ${total} messages)</span>`;
  }

  /**
   * Render the collapsed/tree view with expandable segments
   */
  function renderCollapsedView(container, content, hideEmptyFields, messagesPerBatch) {
    // Clear container and set up
    container.innerHTML = '';
    container.className = 'hl7-container hl7-collapsed-view';

    // Split content into lines and parse into messages
    const lines = content.split(/\r\n|\n|\r/);
    const messages = parseIntoMessages(lines);

    // State for pagination
    let renderedCount = 0;
    const totalMessages = messages.length;

    // Render first batch
    renderedCount = renderCollapsedBatch(container, messages, 0, messagesPerBatch, hideEmptyFields);

    // Add "Load More" button if there are more messages
    if (renderedCount < totalMessages) {
      const loadMoreBtn = createLoadMoreButton(totalMessages, renderedCount);
      container.appendChild(loadMoreBtn);

      loadMoreBtn.addEventListener('click', function() {
        // Remove the button temporarily
        loadMoreBtn.remove();

        // Render next batch
        const newCount = renderCollapsedBatch(container, messages, renderedCount, messagesPerBatch, hideEmptyFields);
        renderedCount = newCount;

        // Add button back if still more to load
        if (renderedCount < totalMessages) {
          updateLoadMoreButton(loadMoreBtn, totalMessages, renderedCount);
          container.appendChild(loadMoreBtn);
        }
      });
    }

    // Setup expand/collapse listeners
    setupCollapseListeners(container);
  }

  /**
   * Render a batch of messages in collapsed/tree view
   */
  function renderCollapsedBatch(container, messages, startIndex, batchSize, hideEmptyFields) {
    const endIndex = Math.min(startIndex + batchSize, messages.length);

    for (let m = startIndex; m < endIndex; m++) {
      const message = messages[m];
      const messageDiv = createMessageNode(message, m, hideEmptyFields);
      container.appendChild(messageDiv);
    }

    return endIndex;
  }

  /**
   * Parse lines into separate messages (each starting with MSH)
   */
  function parseIntoMessages(lines) {
    const messages = [];
    let currentMessage = null;
    let fieldSeparator = '|';
    let componentSeparator = '^';
    let subcomponentSeparator = '&';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const segmentId = trimmedLine.substring(0, 3);

      if (segmentId === 'MSH') {
        // Start a new message
        if (currentMessage) {
          messages.push(currentMessage);
        }

        // Parse encoding characters
        if (trimmedLine.length > 3) {
          fieldSeparator = trimmedLine[3];
        }
        if (trimmedLine.length > 7) {
          const encodingChars = trimmedLine.substring(4, 8);
          componentSeparator = encodingChars[0] || '^';
          subcomponentSeparator = encodingChars[3] || '&';
        }

        currentMessage = {
          fieldSeparator,
          componentSeparator,
          subcomponentSeparator,
          segments: []
        };
      }

      if (currentMessage && HL7_SEGMENT_IDS.includes(segmentId)) {
        const parsed = parseSegment(trimmedLine, segmentId, fieldSeparator, componentSeparator, '~', subcomponentSeparator);
        currentMessage.segments.push({
          segmentId,
          rawLine: trimmedLine,
          fields: parsed.fields,
          fieldSeparator,
          componentSeparator,
          subcomponentSeparator
        });
      }
    }

    // Don't forget the last message
    if (currentMessage) {
      messages.push(currentMessage);
    }

    return messages;
  }

  /**
   * Create a message node for the collapsed view
   */
  function createMessageNode(message, msgIndex, hideEmptyFields) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'hl7-tree-message';

    // Get message type from MSH.9 if available
    let messageType = 'HL7 Message';
    const mshSegment = message.segments.find(s => s.segmentId === 'MSH');
    if (mshSegment && mshSegment.fields.length > 7) {
      const msgTypeField = mshSegment.fields[7]; // MSH.9 (0-indexed: field 7 after encoding chars)
      if (msgTypeField) {
        const parts = msgTypeField.split(message.componentSeparator);
        messageType = parts.slice(0, 2).filter(p => p).join('^') || 'HL7 Message';
      }
    }

    // Get patient name from PID.5 if available
    let patientName = '';
    const pidSegment = message.segments.find(s => s.segmentId === 'PID');
    if (pidSegment && pidSegment.fields.length > 4) {
      const nameField = pidSegment.fields[4]; // PID.5 (0-indexed: field 4)
      if (nameField && nameField.trim()) {
        patientName = nameField;
      }
    }

    // Build message title
    let messageTitle = `Message ${msgIndex + 1}: ${escapeHtml(messageType)}`;
    if (patientName) {
      messageTitle += `, ${escapeHtml(patientName)}`;
    }

    // Message header
    const messageHeader = document.createElement('div');
    messageHeader.className = 'hl7-tree-header hl7-tree-message-header collapsed';
    messageHeader.innerHTML = `
      <span class="hl7-tree-toggle">&#9654;</span>
      <span class="hl7-tree-icon">&#128232;</span>
      <span class="hl7-tree-title">${messageTitle}</span>
      <span class="hl7-tree-count">${message.segments.length} segments</span>
    `;
    messageDiv.appendChild(messageHeader);

    // Message content (segments)
    const messageContent = document.createElement('div');
    messageContent.className = 'hl7-tree-content';
    messageContent.style.display = 'none';

    message.segments.forEach(segment => {
      const segmentNode = createSegmentNode(segment, hideEmptyFields);
      messageContent.appendChild(segmentNode);
    });

    messageDiv.appendChild(messageContent);

    return messageDiv;
  }

  /**
   * Create a segment node for the collapsed view
   */
  function createSegmentNode(segment, hideEmptyFields) {
    const segmentDiv = document.createElement('div');
    segmentDiv.className = 'hl7-tree-segment';

    const segmentInfo = HL7_SEGMENTS[segment.segmentId];
    const segmentName = segmentInfo ? segmentInfo.name : 'Unknown Segment';

    // Count non-empty fields
    const nonEmptyFields = segment.fields.filter(f => f && f.trim()).length;

    // Segment header
    const segmentHeader = document.createElement('div');
    segmentHeader.className = 'hl7-tree-header hl7-tree-segment-header collapsed';
    segmentHeader.dataset.segment = segment.segmentId;
    segmentHeader.innerHTML = `
      <span class="hl7-tree-toggle">&#9654;</span>
      <span class="hl7-tree-segment-id">${segment.segmentId}</span>
      <span class="hl7-tree-segment-name">${escapeHtml(segmentName)}</span>
      <span class="hl7-tree-count">${nonEmptyFields} fields</span>
    `;
    segmentDiv.appendChild(segmentHeader);

    // Segment content (fields)
    const segmentContent = document.createElement('div');
    segmentContent.className = 'hl7-tree-content';
    segmentContent.style.display = 'none';

    // Handle MSH specially
    if (segment.segmentId === 'MSH') {
      // MSH.1 - Field Separator (always show)
      const field1Node = createFieldNode(segment.segmentId, 1, segment.fieldSeparator, null, segment.componentSeparator, segment.subcomponentSeparator, hideEmptyFields);
      if (field1Node) segmentContent.appendChild(field1Node);

      // MSH.2 - Encoding Characters (always show)
      const field2Node = createFieldNode(segment.segmentId, 2, segment.fields[0], null, segment.componentSeparator, segment.subcomponentSeparator, hideEmptyFields);
      if (field2Node) segmentContent.appendChild(field2Node);

      // Remaining fields
      for (let i = 1; i < segment.fields.length; i++) {
        const fieldNum = i + 2;
        const fieldValue = segment.fields[i];
        // Skip empty fields if hideEmptyFields is enabled
        if (hideEmptyFields && (!fieldValue || !fieldValue.trim())) continue;
        const fieldNode = createFieldNode(segment.segmentId, fieldNum, fieldValue, segmentInfo, segment.componentSeparator, segment.subcomponentSeparator, hideEmptyFields);
        if (fieldNode) segmentContent.appendChild(fieldNode);
      }
    } else {
      // Regular segment
      for (let i = 0; i < segment.fields.length; i++) {
        const fieldNum = i + 1;
        const fieldValue = segment.fields[i];
        // Skip empty fields if hideEmptyFields is enabled
        if (hideEmptyFields && (!fieldValue || !fieldValue.trim())) continue;
        const fieldNode = createFieldNode(segment.segmentId, fieldNum, fieldValue, segmentInfo, segment.componentSeparator, segment.subcomponentSeparator, hideEmptyFields);
        if (fieldNode) segmentContent.appendChild(fieldNode);
      }
    }

    segmentDiv.appendChild(segmentContent);

    return segmentDiv;
  }

  /**
   * Create a field node for the collapsed view
   */
  function createFieldNode(segmentId, fieldNum, fieldValue, segmentInfo, compSep, subcompSep, hideEmptyFields) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'hl7-tree-field';

    // Get field info
    let fieldName = `Field ${fieldNum}`;
    let fieldDef = null;
    if (segmentInfo && segmentInfo.fields && segmentInfo.fields[fieldNum]) {
      fieldDef = segmentInfo.fields[fieldNum];
      fieldName = fieldDef.name;
    }

    const displayValue = fieldValue || '(empty)';
    const hasComponents = fieldValue && fieldValue.includes(compSep);
    const isEmpty = !fieldValue || !fieldValue.trim();

    if (hasComponents) {
      // Field with components - make it expandable
      const fieldHeader = document.createElement('div');
      fieldHeader.className = 'hl7-tree-header hl7-tree-field-header collapsed';
      fieldHeader.innerHTML = `
        <span class="hl7-tree-toggle">&#9654;</span>
        <span class="hl7-tree-field-id">${segmentId}.${fieldNum}</span>
        <span class="hl7-tree-field-name">${escapeHtml(fieldName)}</span>
      `;
      fieldDiv.appendChild(fieldHeader);

      // Field content (components)
      const fieldContent = document.createElement('div');
      fieldContent.className = 'hl7-tree-content';
      fieldContent.style.display = 'none';

      const components = fieldValue.split(compSep);
      components.forEach((comp, compIndex) => {
        const compNum = compIndex + 1;
        // Skip empty components if hideEmptyFields is enabled
        if (hideEmptyFields && (!comp || !comp.trim())) return;
        const compNode = createComponentNode(segmentId, fieldNum, compNum, comp, fieldDef, subcompSep, hideEmptyFields);
        fieldContent.appendChild(compNode);
      });

      fieldDiv.appendChild(fieldContent);
    } else {
      // Simple field - just show inline
      fieldDiv.className += isEmpty ? ' hl7-tree-field-empty' : '';
      fieldDiv.innerHTML = `
        <span class="hl7-tree-field-id">${segmentId}.${fieldNum}</span>
        <span class="hl7-tree-field-name">${escapeHtml(fieldName)}</span>
        <span class="hl7-tree-field-value ${isEmpty ? 'empty' : ''}">${escapeHtml(displayValue)}</span>
      `;
    }

    return fieldDiv;
  }

  /**
   * Create a component node for the collapsed view
   */
  function createComponentNode(segmentId, fieldNum, compNum, compValue, fieldDef, subcompSep, hideEmptyFields) {
    const compDiv = document.createElement('div');
    compDiv.className = 'hl7-tree-component';

    // Get component name
    let compName = `Component ${compNum}`;
    if (fieldDef && fieldDef.components && fieldDef.components[compNum]) {
      compName = fieldDef.components[compNum];
    }

    const displayValue = compValue || '(empty)';
    const hasSubcomponents = compValue && compValue.includes(subcompSep);
    const isEmpty = !compValue || !compValue.trim();

    if (hasSubcomponents) {
      // Component with subcomponents - make it expandable
      const compHeader = document.createElement('div');
      compHeader.className = 'hl7-tree-header hl7-tree-component-header collapsed';
      compHeader.innerHTML = `
        <span class="hl7-tree-toggle">&#9654;</span>
        <span class="hl7-tree-comp-id">${segmentId}.${fieldNum}.${compNum}</span>
        <span class="hl7-tree-comp-name">${escapeHtml(compName)}</span>
      `;
      compDiv.appendChild(compHeader);

      // Component content (subcomponents)
      const compContent = document.createElement('div');
      compContent.className = 'hl7-tree-content';
      compContent.style.display = 'none';

      const subcomponents = compValue.split(subcompSep);
      subcomponents.forEach((subcomp, subcompIndex) => {
        const subcompNum = subcompIndex + 1;
        // Skip empty subcomponents if hideEmptyFields is enabled
        if (hideEmptyFields && (!subcomp || !subcomp.trim())) return;
        const subcompDiv = document.createElement('div');
        subcompDiv.className = 'hl7-tree-subcomponent';
        const subcompEmpty = !subcomp || !subcomp.trim();
        subcompDiv.innerHTML = `
          <span class="hl7-tree-subcomp-id">${segmentId}.${fieldNum}.${compNum}.${subcompNum}</span>
          <span class="hl7-tree-subcomp-name">Subcomponent ${subcompNum}</span>
          <span class="hl7-tree-subcomp-value ${subcompEmpty ? 'empty' : ''}">${escapeHtml(subcomp || '(empty)')}</span>
        `;
        compContent.appendChild(subcompDiv);
      });

      compDiv.appendChild(compContent);
    } else {
      // Simple component - just show inline
      compDiv.className += isEmpty ? ' hl7-tree-component-empty' : '';
      compDiv.innerHTML = `
        <span class="hl7-tree-comp-id">${segmentId}.${fieldNum}.${compNum}</span>
        <span class="hl7-tree-comp-name">${escapeHtml(compName)}</span>
        <span class="hl7-tree-comp-value ${isEmpty ? 'empty' : ''}">${escapeHtml(displayValue)}</span>
      `;
    }

    return compDiv;
  }

  /**
   * Handle tree node expand/collapse click
   * Exported so it can be called from a persistent event listener
   */
  function handleTreeClick(e) {
    const header = e.target.closest('.hl7-tree-header');
    if (!header) return;

    const content = header.nextElementSibling;
    if (!content || !content.classList.contains('hl7-tree-content')) return;

    const isCollapsed = header.classList.contains('collapsed');

    if (isCollapsed) {
      // Expand
      header.classList.remove('collapsed');
      header.classList.add('expanded');
      content.style.display = 'block';
      // Update toggle icon
      const toggle = header.querySelector('.hl7-tree-toggle');
      if (toggle) toggle.innerHTML = '&#9660;';
    } else {
      // Collapse
      header.classList.remove('expanded');
      header.classList.add('collapsed');
      content.style.display = 'none';
      // Update toggle icon
      const toggle = header.querySelector('.hl7-tree-toggle');
      if (toggle) toggle.innerHTML = '&#9654;';
    }
  }

  /**
   * Setup expand/collapse click listeners (no-op, handled by app.js)
   */
  function setupCollapseListeners(container) {
    // Listener is now set up once in app.js to avoid duplicate listeners
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Parse a segment into its fields
   */
  function parseSegment(line, segmentId, fieldSep, compSep, repSep, subcompSep) {
    let fields;

    if (segmentId === 'MSH') {
      // MSH is special - the field separator is part of the segment
      // Split starting after the field separator (position 4)
      const afterSep = line.substring(4);
      fields = afterSep.split(fieldSep);
    } else {
      // Regular segment - split after the segment ID
      const afterId = line.substring(3);
      if (afterId.startsWith(fieldSep)) {
        fields = afterId.substring(1).split(fieldSep);
      } else {
        fields = afterId.split(fieldSep);
      }
    }

    return { segmentId, fields };
  }

  /**
   * Create a span element for a field with component-level hovering (standard view)
   */
  function createFieldSpan(fieldValue, segmentId, fieldNum, compSep, subcompSep) {
    const fieldSpan = document.createElement('span');
    fieldSpan.className = 'hl7-field';
    fieldSpan.dataset.segment = segmentId;
    fieldSpan.dataset.field = fieldNum;

    // Check if this field has components
    if (fieldValue && fieldValue.includes(compSep)) {
      const components = fieldValue.split(compSep);

      for (let c = 0; c < components.length; c++) {
        if (c > 0) {
          const compSepSpan = document.createElement('span');
          compSepSpan.className = 'hl7-comp-separator';
          compSepSpan.textContent = compSep;
          fieldSpan.appendChild(compSepSpan);
        }

        const component = components[c];

        // Check for subcomponents
        if (component && component.includes(subcompSep)) {
          const subcomponents = component.split(subcompSep);
          for (let s = 0; s < subcomponents.length; s++) {
            if (s > 0) {
              const subcompSepSpan = document.createElement('span');
              subcompSepSpan.className = 'hl7-subcomp-separator';
              subcompSepSpan.textContent = subcompSep;
              fieldSpan.appendChild(subcompSepSpan);
            }

            const subcompSpan = document.createElement('span');
            subcompSpan.className = 'hl7-subcomponent';
            subcompSpan.textContent = subcomponents[s];
            subcompSpan.dataset.segment = segmentId;
            subcompSpan.dataset.field = fieldNum;
            subcompSpan.dataset.component = c + 1;
            subcompSpan.dataset.subcomponent = s + 1;
            subcompSpan.dataset.tooltipText = getSubcomponentTooltip(segmentId, fieldNum, c + 1, s + 1);
            fieldSpan.appendChild(subcompSpan);
          }
        } else {
          const compSpan = document.createElement('span');
          compSpan.className = 'hl7-component';
          compSpan.textContent = component;
          compSpan.dataset.segment = segmentId;
          compSpan.dataset.field = fieldNum;
          compSpan.dataset.component = c + 1;
          compSpan.dataset.tooltipText = getComponentTooltip(segmentId, fieldNum, c + 1);
          fieldSpan.appendChild(compSpan);
        }
      }
    } else {
      // Simple field without components
      fieldSpan.textContent = fieldValue || '';
      fieldSpan.dataset.tooltipText = getFieldTooltip(segmentId, fieldNum);
    }

    return fieldSpan;
  }

  /**
   * Get tooltip text for a segment
   */
  function getSegmentTooltip(segmentId) {
    const segment = HL7_SEGMENTS[segmentId];
    if (segment) {
      return `${segmentId} - ${segment.name}`;
    }
    return segmentId;
  }

  /**
   * Get tooltip text for a field
   */
  function getFieldTooltip(segmentId, fieldNum) {
    const segment = HL7_SEGMENTS[segmentId];
    if (segment && segment.fields && segment.fields[fieldNum]) {
      return `${segmentId}.${fieldNum} - ${segment.fields[fieldNum].name}`;
    }
    return `${segmentId}.${fieldNum}`;
  }

  /**
   * Get tooltip text for a component
   */
  function getComponentTooltip(segmentId, fieldNum, compNum) {
    const segment = HL7_SEGMENTS[segmentId];
    if (segment && segment.fields && segment.fields[fieldNum]) {
      const field = segment.fields[fieldNum];
      if (field.components && field.components[compNum]) {
        return `${segmentId}.${fieldNum}.${compNum} - ${field.components[compNum]}`;
      }
      return `${segmentId}.${fieldNum}.${compNum} (${field.name})`;
    }
    return `${segmentId}.${fieldNum}.${compNum}`;
  }

  /**
   * Get tooltip text for a subcomponent
   */
  function getSubcomponentTooltip(segmentId, fieldNum, compNum, subcompNum) {
    const segment = HL7_SEGMENTS[segmentId];
    if (segment && segment.fields && segment.fields[fieldNum]) {
      const field = segment.fields[fieldNum];
      if (field.components && field.components[compNum]) {
        return `${segmentId}.${fieldNum}.${compNum}.${subcompNum} - ${field.components[compNum]} (subcomponent ${subcompNum})`;
      }
      return `${segmentId}.${fieldNum}.${compNum}.${subcompNum} (${field.name})`;
    }
    return `${segmentId}.${fieldNum}.${compNum}.${subcompNum}`;
  }

  /**
   * Setup tooltip event listeners (standard view)
   */
  function setupTooltipListeners(container, tooltip) {
    // Elements that can show tooltips
    const hoverableSelectors = [
      '.hl7-segment-id',
      '.hl7-field',
      '.hl7-component',
      '.hl7-subcomponent'
    ].join(', ');

    container.addEventListener('mouseover', function(e) {
      const target = e.target.closest(hoverableSelectors);
      if (target && target.dataset.tooltipText) {
        showTooltip(tooltip, target, target.dataset.tooltipText);
      }
    });

    container.addEventListener('mouseout', function(e) {
      const target = e.target.closest(hoverableSelectors);
      if (target) {
        hideTooltip(tooltip);
      }
    });

    // Also handle when hovering over fields that contain components
    container.addEventListener('mouseover', function(e) {
      if (e.target.classList.contains('hl7-field') && !e.target.dataset.tooltipText) {
        // Field with components - show field-level tooltip
        const segmentId = e.target.dataset.segment;
        const fieldNum = e.target.dataset.field;
        const tooltipText = getFieldTooltip(segmentId, parseInt(fieldNum));

        // Only show if we're directly on the field container (not a component)
        if (e.target === e.target) {
          e.target.dataset.tooltipText = tooltipText;
        }
      }
    });
  }

  /**
   * Show tooltip near the target element
   */
  function showTooltip(tooltip, target, text) {
    tooltip.textContent = text;
    tooltip.style.display = 'block';

    // Position the tooltip
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 5;

    // Adjust if tooltip would go off screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (left < 0) {
      left = 10;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';

    // Add highlight to target
    target.classList.add('hl7-hover');
  }

  /**
   * Hide tooltip
   */
  function hideTooltip(tooltip) {
    tooltip.style.display = 'none';

    // Remove highlights
    document.querySelectorAll('.hl7-hover').forEach(el => {
      el.classList.remove('hl7-hover');
    });
  }

  // ========================================
  // JSON RENDERING FUNCTIONS
  // ========================================

  /**
   * Parse and render JSON content
   */
  function renderJSONContent(container, content, viewMode, messagesPerBatch) {
    const parsed = JSON.parse(content.trim());

    if (viewMode === 'collapsed') {
      renderJSONCollapsedView(container, parsed, messagesPerBatch);
    } else {
      renderJSONStandardView(container, parsed, messagesPerBatch);
    }
  }

  /**
   * Get top-level items from JSON for pagination
   * If array, each element is an item; if object, the whole thing is one item
   */
  function getJSONItems(parsed) {
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [parsed];
  }

  /**
   * Render JSON in standard/textual view (formatted JSON)
   */
  function renderJSONStandardView(container, parsed, messagesPerBatch) {
    container.innerHTML = '';
    container.className = 'hl7-container json-standard-view';

    const items = getJSONItems(parsed);
    const isArray = Array.isArray(parsed);

    let renderedCount = 0;
    const totalItems = items.length;

    // Render first batch
    renderedCount = renderJSONStandardBatch(container, items, 0, messagesPerBatch, isArray);

    // Add "Load More" button if there are more items
    if (renderedCount < totalItems) {
      const loadMoreBtn = createLoadMoreButton(totalItems, renderedCount);
      container.appendChild(loadMoreBtn);

      loadMoreBtn.addEventListener('click', function() {
        loadMoreBtn.remove();
        const newCount = renderJSONStandardBatch(container, items, renderedCount, messagesPerBatch, isArray);
        renderedCount = newCount;

        if (renderedCount < totalItems) {
          updateLoadMoreButton(loadMoreBtn, totalItems, renderedCount);
          container.appendChild(loadMoreBtn);
        }
      });
    }

    // Setup JSON context menu for Python path copying
    setupJSONContextMenu(container);
  }

  /**
   * Render a batch of JSON items in standard view
   */
  function renderJSONStandardBatch(container, items, startIndex, batchSize, isArray) {
    const endIndex = Math.min(startIndex + batchSize, items.length);

    for (let i = startIndex; i < endIndex; i++) {
      if (i > 0) {
        const separator = document.createElement('div');
        separator.className = 'json-item-separator';
        container.appendChild(separator);
      }

      const itemContainer = document.createElement('div');
      itemContainer.className = 'json-item';

      // Add item header for arrays
      if (isArray && items.length > 1) {
        const header = document.createElement('div');
        header.className = 'json-item-header';
        header.textContent = `Item ${i + 1}`;
        itemContainer.appendChild(header);
      }

      const pre = document.createElement('pre');
      pre.className = 'json-content';
      // Use path-aware rendering for standard view
      pre.appendChild(renderJSONWithPaths(items[i], ''));
      itemContainer.appendChild(pre);

      container.appendChild(itemContainer);
    }

    return endIndex;
  }

  /**
   * Render JSON with path tracking for standard view
   * Creates a DOM tree with data-json-path attributes
   */
  function renderJSONWithPaths(value, currentPath, indent = 0) {
    const fragment = document.createDocumentFragment();
    const indentStr = '  '.repeat(indent);
    const valueType = getJSONValueType(value);

    if (valueType === 'object') {
      const keys = Object.keys(value);
      fragment.appendChild(document.createTextNode('{\n'));

      keys.forEach((key, idx) => {
        const childPath = currentPath + `['${key}']`;

        // Indentation
        fragment.appendChild(document.createTextNode(indentStr + '  '));

        // Key
        const keySpan = document.createElement('span');
        keySpan.className = 'json-key json-path-item';
        keySpan.dataset.jsonPath = childPath;
        keySpan.dataset.jsonValueType = getJSONValueType(value[key]);
        keySpan.textContent = `"${key}"`;
        fragment.appendChild(keySpan);

        fragment.appendChild(document.createTextNode(': '));

        // Value
        fragment.appendChild(renderJSONWithPaths(value[key], childPath, indent + 1));

        // Comma and newline
        if (idx < keys.length - 1) {
          fragment.appendChild(document.createTextNode(','));
        }
        fragment.appendChild(document.createTextNode('\n'));
      });

      fragment.appendChild(document.createTextNode(indentStr + '}'));
    } else if (valueType === 'array') {
      fragment.appendChild(document.createTextNode('[\n'));

      value.forEach((item, idx) => {
        const childPath = currentPath + `[${idx}]`;

        // Indentation
        fragment.appendChild(document.createTextNode(indentStr + '  '));

        // Value (with path)
        const valueWrapper = document.createElement('span');
        valueWrapper.className = 'json-array-item json-path-item';
        valueWrapper.dataset.jsonPath = childPath;
        valueWrapper.dataset.jsonValueType = getJSONValueType(item);
        valueWrapper.appendChild(renderJSONWithPaths(item, childPath, indent + 1));
        fragment.appendChild(valueWrapper);

        // Comma and newline
        if (idx < value.length - 1) {
          fragment.appendChild(document.createTextNode(','));
        }
        fragment.appendChild(document.createTextNode('\n'));
      });

      fragment.appendChild(document.createTextNode(indentStr + ']'));
    } else {
      // Primitive value
      const valueSpan = document.createElement('span');
      valueSpan.className = `json-${valueType} json-path-item`;
      if (currentPath) {
        valueSpan.dataset.jsonPath = currentPath;
        valueSpan.dataset.jsonValueType = valueType;
      }

      if (valueType === 'string') {
        valueSpan.textContent = `"${value}"`;
      } else if (valueType === 'null') {
        valueSpan.textContent = 'null';
      } else {
        valueSpan.textContent = String(value);
      }

      fragment.appendChild(valueSpan);
    }

    return fragment;
  }

  /**
   * Render JSON in collapsed/tree view
   */
  function renderJSONCollapsedView(container, parsed, messagesPerBatch) {
    container.innerHTML = '';
    container.className = 'hl7-container json-collapsed-view';

    const items = getJSONItems(parsed);
    const isArray = Array.isArray(parsed);

    let renderedCount = 0;
    const totalItems = items.length;

    // Render first batch
    renderedCount = renderJSONCollapsedBatch(container, items, 0, messagesPerBatch, isArray);

    // Add "Load More" button if there are more items
    if (renderedCount < totalItems) {
      const loadMoreBtn = createLoadMoreButton(totalItems, renderedCount);
      container.appendChild(loadMoreBtn);

      loadMoreBtn.addEventListener('click', function() {
        loadMoreBtn.remove();
        const newCount = renderJSONCollapsedBatch(container, items, renderedCount, messagesPerBatch, isArray);
        renderedCount = newCount;

        if (renderedCount < totalItems) {
          updateLoadMoreButton(loadMoreBtn, totalItems, renderedCount);
          container.appendChild(loadMoreBtn);
        }
      });
    }

    // Setup expand/collapse listeners (reuse HL7's)
    setupCollapseListeners(container);

    // Setup JSON context menu for Python path copying
    setupJSONContextMenu(container);
  }

  /**
   * Render a batch of JSON items in collapsed view
   */
  function renderJSONCollapsedBatch(container, items, startIndex, batchSize, isArray) {
    const endIndex = Math.min(startIndex + batchSize, items.length);

    for (let i = startIndex; i < endIndex; i++) {
      const itemNode = createJSONTreeNode(items[i], isArray ? `[${i}]` : 'root', i, isArray);
      container.appendChild(itemNode);
    }

    return endIndex;
  }

  /**
   * Create a tree node for JSON collapsed view
   * @param {*} value - The JSON value
   * @param {string} key - The key name
   * @param {number} index - The index in parent array/object
   * @param {boolean} isArrayItem - Whether this is a direct array item
   * @param {string} parentPath - The Python path to the parent (for building full path)
   */
  function createJSONTreeNode(value, key, index, isArrayItem, parentPath = '') {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'json-tree-node';

    const valueType = getJSONValueType(value);
    const isExpandable = valueType === 'object' || valueType === 'array';

    // Build the Python path for this node
    let currentPath;
    if (parentPath === '' && key === 'root') {
      // Root container - no path for the root itself
      currentPath = '';
    } else if (parentPath === '' && key.startsWith('[')) {
      // Array index at root level (for JSON arrays)
      currentPath = key;
    } else if (parentPath === '') {
      // First level object keys (direct children of root)
      currentPath = `['${key}']`;
    } else if (key.startsWith('[')) {
      // Array index in nested structure
      currentPath = parentPath + key;
    } else {
      // Object key in nested structure
      currentPath = parentPath + `['${key}']`;
    }

    if (isExpandable) {
      // Expandable node (object or array)
      const header = document.createElement('div');
      header.className = 'hl7-tree-header json-tree-header collapsed';

      const childCount = valueType === 'array' ? value.length : Object.keys(value).length;
      const typeLabel = valueType === 'array' ? `Array[${childCount}]` : `Object{${childCount}}`;
      const displayKey = isArrayItem ? `Item ${index + 1}` : key;

      // Store the path for context menu (only if not root)
      if (currentPath) {
        header.dataset.jsonPath = currentPath;
        header.dataset.jsonValueType = valueType;
      }

      header.innerHTML = `
        <span class="hl7-tree-toggle">&#9654;</span>
        <span class="json-tree-key">${escapeHtml(displayKey)}</span>
        <span class="json-tree-type">${typeLabel}</span>
      `;
      nodeDiv.appendChild(header);

      // Content (children)
      const content = document.createElement('div');
      content.className = 'hl7-tree-content';
      content.style.display = 'none';

      // Use currentPath if set, otherwise empty string for root object's children
      const pathForChildren = currentPath || '';

      if (valueType === 'array') {
        value.forEach((item, idx) => {
          const childNode = createJSONTreeNode(item, `[${idx}]`, idx, false, pathForChildren);
          content.appendChild(childNode);
        });
      } else {
        Object.keys(value).forEach((k, idx) => {
          const childNode = createJSONTreeNode(value[k], k, idx, false, pathForChildren);
          content.appendChild(childNode);
        });
      }

      nodeDiv.appendChild(content);
    } else {
      // Leaf node (primitive value)
      nodeDiv.className += ' json-tree-leaf';
      const displayValue = formatJSONValue(value, valueType);

      // Store the path for context menu
      if (currentPath) {
        nodeDiv.dataset.jsonPath = currentPath;
        nodeDiv.dataset.jsonValueType = valueType;
      }

      nodeDiv.innerHTML = `
        <span class="json-tree-key">${escapeHtml(key)}</span>
        <span class="json-tree-value json-${valueType}">${escapeHtml(displayValue)}</span>
      `;
    }

    return nodeDiv;
  }

  /**
   * Get the type of a JSON value
   */
  function getJSONValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Format a JSON value for display
   */
  function formatJSONValue(value, type) {
    if (type === 'null') return 'null';
    if (type === 'string') return `"${value}"`;
    if (type === 'boolean') return value ? 'true' : 'false';
    return String(value);
  }

  // ========================================
  // JSON CONTEXT MENU FOR PATH COPYING
  // ========================================

  /**
   * Convert a Python-style JSON path to Java-style method calls
   */
  function convertToJavaPath(pythonPath, valueType) {
    // Parse the path into segments
    const segmentRegex = /\['([^']+)'\]|\[(\d+)\]/g;
    const segments = [];
    let match;

    while ((match = segmentRegex.exec(pythonPath)) !== null) {
      if (match[1] !== undefined) {
        // Named key: ['key']
        segments.push({ type: 'key', value: match[1] });
      } else if (match[2] !== undefined) {
        // Array index: [0]
        segments.push({ type: 'index', value: parseInt(match[2], 10) });
      }
    }

    if (segments.length === 0) {
      return '';
    }

    // Build the Java path
    const parts = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      const nextSegment = segments[i + 1];

      if (segment.type === 'key') {
        if (isLast) {
          parts.push(getJavaGetter(valueType, segment.value));
        } else if (nextSegment && nextSegment.type === 'index') {
          parts.push(`getJSONArray("${segment.value}")`);
        } else {
          parts.push(`getJSONObject("${segment.value}")`);
        }
      } else if (segment.type === 'index') {
        if (isLast) {
          parts.push(getJavaArrayGetter(valueType, segment.value));
        } else if (nextSegment && nextSegment.type === 'index') {
          parts.push(`getJSONArray(${segment.value})`);
        } else {
          parts.push(`getJSONObject(${segment.value})`);
        }
      }
    }

    return parts.join('.');
  }

  /**
   * Get the appropriate Java getter method for a key based on value type
   */
  function getJavaGetter(valueType, key) {
    switch (valueType) {
      case 'string':
        return `getString("${key}")`;
      case 'number':
        return `getDouble("${key}")`;
      case 'boolean':
        return `getBoolean("${key}")`;
      case 'object':
        return `getJSONObject("${key}")`;
      case 'array':
        return `getJSONArray("${key}")`;
      case 'null':
        return `get("${key}")`;
      default:
        return `get("${key}")`;
    }
  }

  /**
   * Get the appropriate Java getter method for an array index based on value type
   */
  function getJavaArrayGetter(valueType, index) {
    switch (valueType) {
      case 'string':
        return `getString(${index})`;
      case 'number':
        return `getDouble(${index})`;
      case 'boolean':
        return `getBoolean(${index})`;
      case 'object':
        return `getJSONObject(${index})`;
      case 'array':
        return `getJSONArray(${index})`;
      case 'null':
        return `get(${index})`;
      default:
        return `get(${index})`;
    }
  }

  /**
   * Setup custom context menu for JSON elements
   */
  function setupJSONContextMenu(container) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.json-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu element
    const contextMenu = document.createElement('div');
    contextMenu.className = 'json-context-menu';
    contextMenu.style.display = 'none';
    contextMenu.innerHTML = `
      <div class="json-context-menu-item" data-action="copy-python-path">
        <span class="json-context-menu-icon">&#128203;</span>
        Copy Python path
      </div>
      <div class="json-context-menu-item" data-action="copy-java-path">
        <span class="json-context-menu-icon">&#9749;</span>
        Copy Java path
      </div>
    `;
    document.body.appendChild(contextMenu);

    let currentPath = null;
    let currentValueType = null;

    // Handle right-click on JSON elements
    container.addEventListener('contextmenu', function(e) {
      // Find the closest element with a JSON path
      const pathElement = e.target.closest('[data-json-path]');

      if (pathElement) {
        e.preventDefault();
        currentPath = pathElement.dataset.jsonPath;
        currentValueType = pathElement.dataset.jsonValueType || 'object';

        // Position and show the context menu
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.style.display = 'block';

        // Adjust position if menu would go off screen
        const menuRect = contextMenu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
          contextMenu.style.left = (e.pageX - menuRect.width) + 'px';
        }
        if (menuRect.bottom > window.innerHeight) {
          contextMenu.style.top = (e.pageY - menuRect.height) + 'px';
        }
      }
    });

    // Handle context menu item click
    contextMenu.addEventListener('click', function(e) {
      const menuItem = e.target.closest('.json-context-menu-item');
      if (menuItem && currentPath) {
        if (menuItem.dataset.action === 'copy-python-path') {
          copyToClipboard(currentPath);
          showCopyNotification('Python path copied to clipboard!');
        } else if (menuItem.dataset.action === 'copy-java-path') {
          const javaPath = convertToJavaPath(currentPath, currentValueType);
          copyToClipboard(javaPath);
          showCopyNotification('Java path copied to clipboard!');
        }
      }
      contextMenu.style.display = 'none';
    });

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', function(e) {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
      }
    });

    // Hide context menu on scroll
    document.addEventListener('scroll', function() {
      contextMenu.style.display = 'none';
    });

    // Hide context menu on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        contextMenu.style.display = 'none';
      }
    });
  }

  /**
   * Copy text to clipboard
   */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function(err) {
        // Fallback for older browsers
        fallbackCopyToClipboard(text);
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  }

  /**
   * Fallback copy method for browsers without clipboard API
   */
  function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
    document.body.removeChild(textArea);
  }

  /**
   * Show a brief notification that text was copied
   */
  function showCopyNotification(message) {
    // Remove any existing notification
    const existing = document.querySelector('.json-copy-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'json-copy-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Fade in
    setTimeout(function() {
      notification.classList.add('visible');
    }, 10);

    // Fade out and remove
    setTimeout(function() {
      notification.classList.remove('visible');
      setTimeout(function() {
        notification.remove();
      }, 300);
    }, 2000);
  }

  // Public API
  return {
    detectContentType: detectContentType,
    renderContent: renderContent,
    isJSONContent: isJSONContent,
    isHL7Content: isHL7Content,
    handleTreeClick: handleTreeClick
  };

})();
