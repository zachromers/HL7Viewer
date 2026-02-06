// HL7 Viewer - Statistics Module
// Handles field-based statistics generation and visualization

const HL7Stats = (function() {
  'use strict';

  /**
   * Parse a filter expression like "PV1.2 = E", "PV1.2 != E", or "PID.5 exists"
   * Returns { fieldRef, operator, value } or null if invalid
   */
  function parseFilterExpression(filterExpr) {
    if (!filterExpr || typeof filterExpr !== 'string') return null;

    const trimmed = filterExpr.trim();
    if (!trimmed) return null;

    // Support unary operators (no value): exists, !exists
    const unaryMatch = trimmed.match(/^(.+?)\s+(!exists|exists)\s*$/i);
    if (unaryMatch) {
      const fieldRef = unaryMatch[1].trim();
      const op = unaryMatch[2].toLowerCase();
      if (fieldRef && parseFieldReference(fieldRef)) {
        return {
          fieldRef: fieldRef,
          operator: op,
          value: ''
        };
      }
    }

    // Support operators: =, !=, contains, !contains
    const operators = ['!=', '=', '!contains', 'contains'];

    for (const op of operators) {
      const parts = trimmed.split(new RegExp(`\\s*${op.replace('!', '\\!')}\\s*`, 'i'));
      if (parts.length === 2) {
        const fieldRef = parts[0].trim();
        const value = parts[1].trim();

        if (fieldRef && parseFieldReference(fieldRef)) {
          return {
            fieldRef: fieldRef,
            operator: op.toLowerCase(),
            value: value
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if a message matches a single filter condition
   */
  function messageMatchesSingleFilter(messageSegments, filter, componentSeparator, subcomponentSeparator) {
    const parsed = parseFieldReference(filter.fieldRef);
    if (!parsed) return true; // No valid filter = include all

    // Find the segment in this message
    const segment = messageSegments.find(s => s.segmentId === parsed.segment);
    if (!segment) {
      // Segment not found - negation operators match, positive operators don't
      return filter.operator === '!=' || filter.operator === '!contains' || filter.operator === '!exists';
    }

    // Extract the field value
    const value = extractValueFromSegment(
      segment,
      parsed.field,
      parsed.component,
      parsed.subcomponent,
      componentSeparator,
      subcomponentSeparator
    );

    const fieldValue = (value || '').trim().toUpperCase();
    const filterValue = filter.value.trim().toUpperCase();

    switch (filter.operator) {
      case '=':
        return fieldValue === filterValue;
      case '!=':
        return fieldValue !== filterValue;
      case 'contains':
        return fieldValue.includes(filterValue);
      case '!contains':
        return !fieldValue.includes(filterValue);
      case 'exists':
        return fieldValue.length > 0;
      case '!exists':
        return fieldValue.length === 0;
      default:
        return true;
    }
  }

  /**
   * Evaluate multiple filters against a message
   */
  function messageMatchesFilters(messageSegments, filtersConfig, componentSeparator, subcomponentSeparator) {
    if (!filtersConfig || !filtersConfig.filters || filtersConfig.filters.length === 0) {
      return true;
    }

    const filters = filtersConfig.filters;

    // Build a map of filter results by label
    const filterResults = {};
    filters.forEach(f => {
      const parsedFilter = parseFilterExpression(f.expression);
      if (parsedFilter) {
        filterResults[f.label] = messageMatchesSingleFilter(
          messageSegments,
          parsedFilter,
          componentSeparator,
          subcomponentSeparator
        );
      } else {
        // Invalid filter expression - treat as true to not exclude messages
        filterResults[f.label] = true;
      }
    });

    // Single filter
    if (filtersConfig.logic === 'single' || filters.length === 1) {
      return filterResults[filters[0].label];
    }

    // AND logic
    if (filtersConfig.logic === 'AND') {
      return Object.values(filterResults).every(r => r === true);
    }

    // OR logic
    if (filtersConfig.logic === 'OR') {
      return Object.values(filterResults).some(r => r === true);
    }

    // Custom logic
    if (filtersConfig.logic === 'custom' && filtersConfig.expression) {
      return evaluateCustomLogic(filtersConfig.expression, filterResults);
    }

    // Default to AND
    return Object.values(filterResults).every(r => r === true);
  }

  /**
   * Validate custom logic expression
   * Returns { valid: true } or { valid: false, error: "error message" }
   */
  function validateCustomLogic(expression, availableLabels) {
    if (!expression || !expression.trim()) {
      return { valid: false, error: 'Custom logic expression is empty' };
    }

    const expr = expression.trim().toUpperCase();

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of expr) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return { valid: false, error: 'Unbalanced parentheses - extra closing parenthesis' };
      }
    }
    if (parenCount !== 0) {
      return { valid: false, error: 'Unbalanced parentheses - missing closing parenthesis' };
    }

    // Normalize the expression for validation
    let normalized = expr;

    // Sort labels by length descending to avoid partial replacements (F10 before F1)
    const sortedLabels = [...availableLabels].sort((a, b) => b.length - a.length);

    // Replace valid filter labels with a placeholder
    sortedLabels.forEach(label => {
      const regex = new RegExp('\\b' + label.toUpperCase() + '\\b', 'g');
      normalized = normalized.replace(regex, 'X');
    });

    // Replace AND/OR/NOT with placeholders
    normalized = normalized.replace(/\bAND\b/g, '&').replace(/\bOR\b/g, '|').replace(/\bNOT\b/g, '!');

    // Remove spaces and parentheses for final check
    const simplified = normalized.replace(/[\s()]/g, '');

    // Check if there are any unrecognized filter references (like F5 when only F1, F2 exist)
    const unmatchedFilters = simplified.match(/F\d+/gi);
    if (unmatchedFilters) {
      return {
        valid: false,
        error: `Unknown filter label(s): ${unmatchedFilters.join(', ')}. Available labels: ${availableLabels.join(', ')}`
      };
    }

    // Valid pattern should only contain: X (filter placeholders), & (AND), | (OR), ! (NOT)
    // Pattern: should be alternating X and operators, like X&X|X or X&(X|X) or X&!X
    if (!/^[X&|!]+$/.test(simplified)) {
      // Find what's invalid
      const invalidChars = simplified.replace(/[X&|!]/g, '');
      if (invalidChars) {
        return {
          valid: false,
          error: `Invalid characters or words in expression. Use only filter labels (${availableLabels.join(', ')}), AND, OR, NOT, and parentheses.`
        };
      }
    }

    // Check for consecutive operators or missing operands
    if (/^[&|]/.test(simplified)) {
      return { valid: false, error: 'Expression cannot start with AND/OR' };
    }
    if (/[&|!]$/.test(simplified)) {
      return { valid: false, error: 'Expression cannot end with AND/OR/NOT' };
    }
    if (/[&|]{2,}/.test(simplified)) {
      return { valid: false, error: 'Cannot have consecutive AND/OR operators' };
    }
    if (/![&|]/.test(simplified)) {
      return { valid: false, error: 'NOT must be followed by a filter label, not AND/OR' };
    }
    if (/X!/.test(simplified)) {
      return { valid: false, error: 'Missing AND/OR between filter label and NOT' };
    }
    if (/XX/.test(simplified)) {
      return { valid: false, error: 'Missing AND/OR between filter labels' };
    }

    return { valid: true };
  }

  /**
   * Evaluate custom logic expression like "F1 AND (F2 OR F3)" or "F1 AND NOT F2"
   */
  function evaluateCustomLogic(expression, filterResults) {
    try {
      // Replace filter labels with their boolean results
      let evalExpr = expression.toUpperCase();

      // Sort labels by length descending to avoid partial replacements (F10 before F1)
      const labels = Object.keys(filterResults).sort((a, b) => b.length - a.length);

      labels.forEach(label => {
        const regex = new RegExp('\\b' + label.toUpperCase() + '\\b', 'g');
        evalExpr = evalExpr.replace(regex, filterResults[label] ? 'true' : 'false');
      });

      // Replace AND/OR/NOT with JavaScript operators
      evalExpr = evalExpr.replace(/\bAND\b/g, '&&').replace(/\bOR\b/g, '||').replace(/\bNOT\b/g, '!');

      // Validate that only allowed characters remain
      if (!/^[truefalse&|!() ]+$/i.test(evalExpr)) {
        console.warn('Invalid custom logic expression after substitution:', evalExpr);
        return true;
      }

      // Evaluate the expression
      return Function('"use strict"; return (' + evalExpr + ')')();
    } catch (e) {
      console.warn('Error evaluating custom logic:', e);
      return true;
    }
  }

  /**
   * Legacy single filter check (for backwards compatibility)
   */
  function messageMatchesFilter(messageSegments, filter, fieldSeparator, componentSeparator, subcomponentSeparator) {
    return messageMatchesSingleFilter(messageSegments, filter, componentSeparator, subcomponentSeparator);
  }

  /**
   * Extract value from a parsed segment object
   */
  function extractValueFromSegment(segment, fieldNum, compNum, subcompNum, compSep, subcompSep) {
    let fieldValue;

    if (segment.segmentId === 'MSH') {
      if (fieldNum === 1) return segment.fieldSeparator;
      if (fieldNum === 2) return segment.fields[0] || '';
      const fieldIndex = fieldNum - 2;
      if (fieldIndex < 0 || fieldIndex >= segment.fields.length) return '';
      fieldValue = segment.fields[fieldIndex];
    } else {
      const fieldIndex = fieldNum - 1;
      if (fieldIndex < 0 || fieldIndex >= segment.fields.length) return '';
      fieldValue = segment.fields[fieldIndex];
    }

    return extractComponentValue(fieldValue, compNum, subcompNum, compSep, subcompSep);
  }

  /**
   * Parse a field reference like "FT1.13" or "PID.5.1" into components
   * Returns { segment, field, component, subcomponent } or null if invalid
   */
  function parseFieldReference(fieldRef) {
    if (!fieldRef || typeof fieldRef !== 'string') return null;

    const trimmed = fieldRef.trim().toUpperCase();
    const parts = trimmed.split('.');

    if (parts.length < 2 || parts.length > 4) return null;

    const segment = parts[0];
    const field = parseInt(parts[1], 10);

    if (!segment || isNaN(field) || field < 1) return null;

    const result = { segment, field };

    if (parts.length >= 3) {
      const component = parseInt(parts[2], 10);
      if (isNaN(component) || component < 1) return null;
      result.component = component;
    }

    if (parts.length === 4) {
      const subcomponent = parseInt(parts[3], 10);
      if (isNaN(subcomponent) || subcomponent < 1) return null;
      result.subcomponent = subcomponent;
    }

    return result;
  }

  /**
   * Parse HL7 content into structured messages for filtering
   */
  function parseMessagesForFiltering(content) {
    const lines = content.split(/\r\n|\n|\r/);
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
        // Save previous message
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
        // Parse segment fields
        let fields;
        if (segmentId === 'MSH') {
          const afterSep = trimmedLine.substring(4);
          fields = afterSep.split(fieldSeparator);
        } else {
          const afterId = trimmedLine.substring(3);
          if (afterId.startsWith(fieldSeparator)) {
            fields = afterId.substring(1).split(fieldSeparator);
          } else {
            fields = afterId.split(fieldSeparator);
          }
        }

        currentMessage.segments.push({
          segmentId,
          fields,
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
   * Extract all values for a specific field from HL7 content
   * Returns an array of { messageIndex, value } objects
   * Supports optional filtersConfig to only include matching messages
   * If fieldRef is empty, only returns filter results without field analysis
   */
  function extractFieldValues(content, fieldRef, filtersConfig) {
    // If no field specified, we're only filtering (no field analysis)
    const filterOnly = !fieldRef || !fieldRef.trim();

    let parsed = null;
    if (!filterOnly) {
      parsed = parseFieldReference(fieldRef);
      if (!parsed) return { error: 'Invalid field reference. Use format like PID.5, FT1.13, or MSH.9.1' };
    }

    // Parse all messages first
    const messages = parseMessagesForFiltering(content);
    const totalMessages = messages.length;

    // Apply filters if provided
    let filteredMessages = messages;
    let filteredCount = totalMessages;
    let hasValidFilters = false;
    let filterDescription = '';

    if (filtersConfig && filtersConfig.filters && filtersConfig.filters.length > 0) {
      // Validate all filter expressions
      const invalidFilters = [];
      filtersConfig.filters.forEach(f => {
        const parsed = parseFilterExpression(f.expression);
        if (!parsed) {
          invalidFilters.push(f.label);
        }
      });

      if (invalidFilters.length > 0) {
        return { error: `Invalid filter format for ${invalidFilters.join(', ')}. Use format like "PV1.2 = E", "PV1.2 != E", "PV1.2 contains E", or "PV1.2 exists"` };
      }

      // Validate custom logic expression if used
      if (filtersConfig.logic === 'custom') {
        if (!filtersConfig.expression || !filtersConfig.expression.trim()) {
          return { error: 'Please enter a custom logic expression (e.g., "F1 AND (F2 OR F3)")' };
        }

        // Validate the custom logic syntax
        const availableLabels = filtersConfig.filters.map(f => f.label);
        const validation = validateCustomLogic(filtersConfig.expression, availableLabels);
        if (!validation.valid) {
          return { error: `Invalid custom logic: ${validation.error}` };
        }
      }

      hasValidFilters = true;

      filteredMessages = messages.filter((msg) =>
        messageMatchesFilters(msg.segments, filtersConfig, msg.componentSeparator, msg.subcomponentSeparator)
      );
      filteredCount = filteredMessages.length;

      // Build filter description for display
      if (filtersConfig.filters.length === 1) {
        filterDescription = filtersConfig.filters[0].expression;
      } else {
        const filterLabels = filtersConfig.filters.map(f => `${f.label}: ${f.expression}`).join(', ');
        if (filtersConfig.logic === 'custom') {
          filterDescription = `${filterLabels} [Logic: ${filtersConfig.expression}]`;
        } else {
          filterDescription = `${filterLabels} [Logic: ${filtersConfig.logic}]`;
        }
      }
    }

    // Extract field values from filtered messages (only if a field is specified)
    const results = [];

    if (!filterOnly && parsed) {
      filteredMessages.forEach((msg, idx) => {
        // Find segments matching the target
        const matchingSegments = msg.segments.filter(s => s.segmentId === parsed.segment);

        if (matchingSegments.length === 0) {
          // Segment not found in this message - count as empty
          results.push({
            messageIndex: idx,
            value: ''
          });
        } else {
          // Extract value from each matching segment
          matchingSegments.forEach(segment => {
            const value = extractValueFromSegment(
              segment,
              parsed.field,
              parsed.component,
              parsed.subcomponent,
              msg.componentSeparator,
              msg.subcomponentSeparator
            );

            results.push({
              messageIndex: idx,
              value: value
            });
          });
        }
      });
    }

    // Build raw HL7 content from filtered messages for download/view
    let filteredHL7Content = '';
    if (hasValidFilters) {
      filteredHL7Content = filteredMessages.map(msg => {
        return msg.segments.map(seg => {
          if (seg.segmentId === 'MSH') {
            return seg.segmentId + seg.fieldSeparator + seg.fields.join(seg.fieldSeparator);
          } else {
            return seg.segmentId + seg.fieldSeparator + seg.fields.join(seg.fieldSeparator);
          }
        }).join('\r');
      }).join('\r\r\n');
    }

    return {
      results,
      totalMessages,
      filteredMessages: filteredCount,
      filterApplied: hasValidFilters,
      filterExpression: filterDescription,
      filtersConfig: hasValidFilters ? filtersConfig : null,
      filteredHL7Content: filteredHL7Content,
      filterOnly: filterOnly
    };
  }

  /**
   * Extract a specific field value from an HL7 line
   */
  function extractValueFromLine(line, segmentId, fieldNum, compNum, subcompNum, fieldSep, compSep, subcompSep) {
    let fields;

    if (segmentId === 'MSH') {
      // MSH is special - field 1 is the separator, field 2 is encoding chars
      if (fieldNum === 1) return fieldSep;
      if (fieldNum === 2) return line.substring(4, 8);

      // For other MSH fields, split after position 4 and offset by 2
      const afterSep = line.substring(4);
      fields = afterSep.split(fieldSep);
      // MSH.3 is at index 1 (after encoding chars at index 0)
      const fieldIndex = fieldNum - 2;
      if (fieldIndex < 0 || fieldIndex >= fields.length) return '';
      return extractComponentValue(fields[fieldIndex], compNum, subcompNum, compSep, subcompSep);
    } else {
      // Regular segment - split after segment ID
      const afterId = line.substring(3);
      if (afterId.startsWith(fieldSep)) {
        fields = afterId.substring(1).split(fieldSep);
      } else {
        fields = afterId.split(fieldSep);
      }

      const fieldIndex = fieldNum - 1;
      if (fieldIndex < 0 || fieldIndex >= fields.length) return '';
      return extractComponentValue(fields[fieldIndex], compNum, subcompNum, compSep, subcompSep);
    }
  }

  /**
   * Extract component/subcomponent value from a field value
   */
  function extractComponentValue(fieldValue, compNum, subcompNum, compSep, subcompSep) {
    if (!fieldValue) return '';

    // If no component specified, return the whole field
    if (!compNum) return fieldValue;

    const components = fieldValue.split(compSep);
    const compIndex = compNum - 1;
    if (compIndex < 0 || compIndex >= components.length) return '';

    const compValue = components[compIndex];

    // If no subcomponent specified, return the component
    if (!subcompNum) return compValue;

    const subcomponents = compValue.split(subcompSep);
    const subcompIndex = subcompNum - 1;
    if (subcompIndex < 0 || subcompIndex >= subcomponents.length) return '';

    return subcomponents[subcompIndex];
  }

  /**
   * Generate statistics from extracted field values
   */
  function generateStatistics(extractionResult) {
    if (extractionResult.error) {
      return { error: extractionResult.error };
    }

    const { results, totalMessages, filteredMessages, filterApplied, filterExpression, filterOnly } = extractionResult;
    const messageCount = filterApplied ? filteredMessages : totalMessages;

    // If filter only mode (no field to analyze), return simplified stats
    if (filterOnly) {
      return {
        totalMessages,
        filteredMessages: filterApplied ? filteredMessages : null,
        filterApplied,
        filterExpression,
        filterOnly: true,
        filteredHL7Content: extractionResult.filteredHL7Content || ''
      };
    }

    // Count distinct values
    const valueCounts = {};
    let messagesWithValue = 0;
    let messagesWithoutValue = 0;

    // Track which messages have been counted (for segments that appear multiple times)
    const messageHasValue = new Set();
    const messageHasNoValue = new Set();

    for (const item of results) {
      const value = item.value.trim();
      const displayValue = value || '(empty)';

      if (!valueCounts[displayValue]) {
        valueCounts[displayValue] = 0;
      }
      valueCounts[displayValue]++;

      if (value) {
        messageHasValue.add(item.messageIndex);
      } else {
        messageHasNoValue.add(item.messageIndex);
      }
    }

    // Messages with value = messages that have at least one non-empty value
    messagesWithValue = messageHasValue.size;
    // Messages without value = messages that only have empty values or no segment at all
    // Need to count messages that have the segment but only empty values
    const messagesWithOnlyEmpty = [...messageHasNoValue].filter(m => !messageHasValue.has(m)).length;
    // Messages without the segment at all
    const messagesWithSegment = new Set([...messageHasValue, ...messageHasNoValue]);
    const messagesWithoutSegment = messageCount - messagesWithSegment.size;
    messagesWithoutValue = messagesWithOnlyEmpty + messagesWithoutSegment;

    // Sort value counts by count (descending)
    const sortedValues = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));

    return {
      totalMessages,
      filteredMessages: filterApplied ? filteredMessages : null,
      filterApplied,
      filterExpression,
      messagesWithValue,
      messagesWithoutValue,
      totalOccurrences: results.length,
      distinctValues: sortedValues,
      segmentNotFound: results.length === 0 && !filterApplied,
      filteredHL7Content: extractionResult.filteredHL7Content || ''
    };
  }

  /**
   * Generate colors for pie chart segments
   */
  function generateColors(count) {
    const colors = [
      '#4fc1ff', '#4ec9b0', '#c586c0', '#dcdcaa', '#d7ba7d',
      '#f48771', '#ff6b6b', '#9cdcfe', '#b8d7a3', '#ce9178',
      '#89d185', '#e9a369', '#ffcc66', '#ff9ecd', '#7cc5ff',
      '#a8e6cf', '#ffd3b6', '#ffaaa5', '#dcedc1', '#ff8b94'
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  /**
   * Create an SVG pie chart
   */
  function createPieChart(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (stats.distinctValues.length === 0) {
      container.innerHTML = '<p class="stats-no-data">No data to display</p>';
      return;
    }

    // Filter out (empty) for pie chart if there are other values
    let chartData = stats.distinctValues;
    const hasNonEmpty = chartData.some(d => d.value !== '(empty)');
    if (hasNonEmpty && chartData.length > 1) {
      // Keep empty in the chart but maybe show separately
    }

    // Limit to top 15 values for readability, group rest as "Other"
    const maxSlices = 15;
    if (chartData.length > maxSlices) {
      const topValues = chartData.slice(0, maxSlices - 1);
      const otherValues = chartData.slice(maxSlices - 1);
      const otherCount = otherValues.reduce((sum, item) => sum + item.count, 0);
      chartData = [...topValues, { value: '(Other)', count: otherCount }];
    }

    const total = chartData.reduce((sum, item) => sum + item.count, 0);
    const colors = generateColors(chartData.length);

    // SVG dimensions
    const width = 400;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('stats-pie-svg');

    let currentAngle = -Math.PI / 2; // Start at top

    chartData.forEach((item, index) => {
      const sliceAngle = (item.count / total) * 2 * Math.PI;
      const endAngle = currentAngle + sliceAngle;

      // Calculate path
      const x1 = centerX + radius * Math.cos(currentAngle);
      const y1 = centerY + radius * Math.sin(currentAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', colors[index]);
      path.setAttribute('stroke', '#1e1e1e');
      path.setAttribute('stroke-width', '2');
      path.classList.add('stats-pie-slice');

      // Add tooltip data
      const percentage = ((item.count / total) * 100).toFixed(1);
      path.dataset.value = item.value;
      path.dataset.count = item.count;
      path.dataset.percentage = percentage;

      svg.appendChild(path);

      currentAngle = endAngle;
    });

    container.appendChild(svg);

    // Create legend
    const legend = document.createElement('div');
    legend.className = 'stats-pie-legend';

    chartData.forEach((item, index) => {
      const percentage = ((item.count / total) * 100).toFixed(1);
      const legendItem = document.createElement('div');
      legendItem.className = 'stats-legend-item';
      legendItem.innerHTML = `
        <span class="stats-legend-color" style="background-color: ${colors[index]}"></span>
        <span class="stats-legend-label">${escapeHtml(truncateValue(item.value, 30))}</span>
        <span class="stats-legend-value">${item.count} (${percentage}%)</span>
      `;
      legend.appendChild(legendItem);
    });

    container.appendChild(legend);

    // Add pie chart hover effects
    setupPieChartHover(svg);
  }

  /**
   * Setup hover effects for pie chart
   */
  function setupPieChartHover(svg) {
    const slices = svg.querySelectorAll('.stats-pie-slice');
    let tooltip = document.querySelector('.stats-pie-tooltip');

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'stats-pie-tooltip';
      document.body.appendChild(tooltip);
    }

    slices.forEach(slice => {
      slice.addEventListener('mouseenter', function(e) {
        this.style.transform = 'scale(1.03)';
        this.style.transformOrigin = 'center';

        tooltip.innerHTML = `
          <strong>${escapeHtml(this.dataset.value)}</strong><br>
          Count: ${this.dataset.count}<br>
          ${this.dataset.percentage}%
        `;
        tooltip.style.display = 'block';
      });

      slice.addEventListener('mousemove', function(e) {
        tooltip.style.left = (e.pageX + 10) + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
      });

      slice.addEventListener('mouseleave', function() {
        this.style.transform = '';
        tooltip.style.display = 'none';
      });
    });
  }

  /**
   * Render statistics to the stats container
   */
  function renderStatistics(stats, fieldRef, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (stats.error) {
      container.innerHTML = `<div class="stats-error">${escapeHtml(stats.error)}</div>`;
      return;
    }

    // Handle filter-only mode (no field to analyze)
    if (stats.filterOnly) {
      renderFilterOnlyView(stats, containerId);
      return;
    }

    if (stats.segmentNotFound) {
      container.innerHTML = `
        <div class="stats-error">
          No occurrences of field "${escapeHtml(fieldRef)}" found in the loaded content.
          <br><br>
          Make sure you've entered a valid field reference (e.g., PID.5, FT1.13, MSH.9.1).
        </div>
      `;
      return;
    }

    // Build filter info and actions if applied
    let filterInfoHtml = '';
    let filterActionsHtml = '';
    if (stats.filterApplied) {
      filterInfoHtml = `
        <div class="stats-filter-info">
          <span class="stats-filter-label">Filter Applied:</span>
          <span class="stats-filter-expression">${escapeHtml(stats.filterExpression)}</span>
          <span class="stats-filter-count">(${stats.filteredMessages} of ${stats.totalMessages} messages match)</span>
        </div>
      `;
      filterActionsHtml = `
        <div class="stats-filter-actions">
          <button type="button" class="stats-action-btn" id="downloadFilteredBtn">
            <span class="stats-action-icon">&#11015;</span>
            Download Filtered Messages (.hl7)
          </button>
          <button type="button" class="stats-action-btn" id="viewFilteredBtn">
            <span class="stats-action-icon">&#128065;</span>
            View Filtered Messages
          </button>
        </div>
      `;
    }

    // Determine the message count to display (filtered or total)
    const displayMessageCount = stats.filterApplied ? stats.filteredMessages : stats.totalMessages;

    // Build the stats HTML
    let html = `
      <div class="stats-header">
        <h2>Statistics for ${escapeHtml(fieldRef.toUpperCase())}</h2>
        ${filterInfoHtml}
        ${filterActionsHtml}
      </div>

      <div class="stats-summary">
        <div class="stats-summary-card">
          <div class="stats-summary-value">${stats.totalMessages}</div>
          <div class="stats-summary-label">Total Messages</div>
        </div>
        ${stats.filterApplied ? `
        <div class="stats-summary-card stats-card-filtered">
          <div class="stats-summary-value">${stats.filteredMessages}</div>
          <div class="stats-summary-label">Filtered Messages</div>
        </div>
        ` : ''}
        <div class="stats-summary-card stats-card-success">
          <div class="stats-summary-value">${stats.messagesWithValue}</div>
          <div class="stats-summary-label">With Value</div>
        </div>
        <div class="stats-summary-card stats-card-warning">
          <div class="stats-summary-value">${stats.messagesWithoutValue}</div>
          <div class="stats-summary-label">Without Value</div>
        </div>
        <div class="stats-summary-card">
          <div class="stats-summary-value">${stats.distinctValues.length}</div>
          <div class="stats-summary-label">Distinct Values</div>
        </div>
      </div>

      <div class="stats-content">
        <div class="stats-chart-section">
          <h3>Value Distribution</h3>
          <div id="statsPieChart" class="stats-pie-container"></div>
        </div>

        <div class="stats-table-section">
          <h3>Value Counts</h3>
          <div class="stats-table-wrapper">
            <table class="stats-table">
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
    `;

    const totalOccurrences = stats.distinctValues.reduce((sum, item) => sum + item.count, 0);

    stats.distinctValues.forEach(item => {
      const percentage = ((item.count / totalOccurrences) * 100).toFixed(1);
      const valueClass = item.value === '(empty)' ? 'stats-value-empty' : '';
      html += `
        <tr>
          <td class="stats-value-cell ${valueClass}">${escapeHtml(item.value)}</td>
          <td class="stats-count-cell">${item.count}</td>
          <td class="stats-percent-cell">${percentage}%</td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Add filtered messages viewer section if filter is applied
    if (stats.filterApplied) {
      html += `
        <div class="stats-filtered-viewer" id="filteredMessagesViewer" style="display: none;">
          <div class="stats-filtered-header">
            <h3>Filtered Messages (${stats.filteredMessages})</h3>
            <div class="stats-filtered-controls">
              <div class="view-toggle">
                <label class="toggle-option">
                  <input type="radio" name="filteredViewMode" value="collapsed">
                  <span class="toggle-btn">Tree View</span>
                </label>
                <label class="toggle-option">
                  <input type="radio" name="filteredViewMode" value="standard" checked>
                  <span class="toggle-btn">Textual View</span>
                </label>
              </div>
              <button type="button" class="stats-close-viewer-btn" id="closeFilteredViewerBtn">&#10005; Close</button>
            </div>
          </div>
          <div class="stats-filtered-content">
            <div class="hl7-container" id="filteredMessagesContainer"></div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Create the pie chart
    createPieChart(stats, 'statsPieChart');

    // Set up filtered messages functionality if filter is applied
    if (stats.filterApplied && stats.filteredHL7Content) {
      setupFilteredMessagesHandlers(stats.filteredHL7Content, stats.filteredMessages);
    }
  }

  /**
   * Render filter-only view (no field analysis)
   */
  function renderFilterOnlyView(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Build filter info
    let filterInfoHtml = '';
    if (stats.filterApplied) {
      filterInfoHtml = `
        <div class="stats-filter-info">
          <span class="stats-filter-label">Filter Applied:</span>
          <span class="stats-filter-expression">${escapeHtml(stats.filterExpression)}</span>
          <span class="stats-filter-count">(${stats.filteredMessages} of ${stats.totalMessages} messages match)</span>
        </div>
      `;
    }

    // Filter actions
    const filterActionsHtml = stats.filterApplied ? `
      <div class="stats-filter-actions">
        <button type="button" class="stats-action-btn" id="downloadFilteredBtn">
          <span class="stats-action-icon">&#11015;</span>
          Download Filtered Messages (.hl7)
        </button>
        <button type="button" class="stats-action-btn" id="viewFilteredBtn">
          <span class="stats-action-icon">&#128065;</span>
          View Filtered Messages
        </button>
      </div>
    ` : '';

    let html = `
      <div class="stats-header">
        <h2>Filtered Results</h2>
        ${filterInfoHtml}
        ${filterActionsHtml}
      </div>

      <div class="stats-summary stats-summary-compact">
        <div class="stats-summary-card">
          <div class="stats-summary-value">${stats.totalMessages}</div>
          <div class="stats-summary-label">Total Messages</div>
        </div>
        ${stats.filterApplied ? `
        <div class="stats-summary-card stats-card-filtered">
          <div class="stats-summary-value">${stats.filteredMessages}</div>
          <div class="stats-summary-label">Filtered Messages</div>
        </div>
        ` : ''}
      </div>

      <div class="stats-filter-only-hint">
        <p>Enter a field reference in "Field to Analyze" to see detailed statistics and visualizations.</p>
      </div>
    `;

    // Add filtered messages viewer section if filter is applied
    if (stats.filterApplied) {
      html += `
        <div class="stats-filtered-viewer" id="filteredMessagesViewer" style="display: none;">
          <div class="stats-filtered-header">
            <h3>Filtered Messages (${stats.filteredMessages})</h3>
            <div class="stats-filtered-controls">
              <div class="view-toggle">
                <label class="toggle-option">
                  <input type="radio" name="filteredViewMode" value="collapsed">
                  <span class="toggle-btn">Tree View</span>
                </label>
                <label class="toggle-option">
                  <input type="radio" name="filteredViewMode" value="standard" checked>
                  <span class="toggle-btn">Textual View</span>
                </label>
              </div>
              <button type="button" class="stats-close-viewer-btn" id="closeFilteredViewerBtn">&#10005; Close</button>
            </div>
          </div>
          <div class="stats-filtered-content">
            <div class="hl7-container" id="filteredMessagesContainer"></div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Set up filtered messages functionality if filter is applied
    if (stats.filterApplied && stats.filteredHL7Content) {
      setupFilteredMessagesHandlers(stats.filteredHL7Content, stats.filteredMessages);
    }
  }

  /**
   * Set up event handlers for filtered messages download and view
   */
  function setupFilteredMessagesHandlers(filteredHL7Content, messageCount) {
    const downloadBtn = document.getElementById('downloadFilteredBtn');
    const viewBtn = document.getElementById('viewFilteredBtn');
    const viewer = document.getElementById('filteredMessagesViewer');
    const closeBtn = document.getElementById('closeFilteredViewerBtn');
    const container = document.getElementById('filteredMessagesContainer');
    const viewModeRadios = document.querySelectorAll('input[name="filteredViewMode"]');

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function() {
        downloadFilteredMessages(filteredHL7Content);
      });
    }

    if (viewBtn && viewer && container) {
      viewBtn.addEventListener('click', function() {
        viewer.style.display = 'block';
        const viewMode = document.querySelector('input[name="filteredViewMode"]:checked').value;
        renderFilteredMessages(container, filteredHL7Content, viewMode);
        viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (closeBtn && viewer) {
      closeBtn.addEventListener('click', function() {
        viewer.style.display = 'none';
      });
    }

    if (viewModeRadios && container) {
      viewModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
          if (viewer.style.display !== 'none') {
            renderFilteredMessages(container, filteredHL7Content, this.value);
          }
        });
      });
    }

    // Set up tree click handler for the filtered messages container
    if (container) {
      container.addEventListener('click', function(e) {
        if (typeof HL7Parser !== 'undefined' && HL7Parser.handleTreeClick) {
          HL7Parser.handleTreeClick(e);
        }
      });
    }
  }

  /**
   * Download filtered messages as .hl7 file
   */
  function downloadFilteredMessages(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_messages_' + new Date().toISOString().slice(0, 10) + '.hl7';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Render filtered messages in the viewer
   */
  function renderFilteredMessages(container, content, viewMode) {
    if (typeof HL7Parser !== 'undefined' && HL7Parser.renderContent) {
      HL7Parser.renderContent(container, content, {
        viewMode: viewMode,
        hideEmptyFields: false,
        messagesPerBatch: 1000 // Show all messages
      });
    } else {
      container.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
    }
  }

  /**
   * Truncate long values for display
   */
  function truncateValue(value, maxLength) {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength - 3) + '...';
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
   * Main function to run statistics on content
   */
  function runStatistics(content, fieldRef, resultContainerId, filtersConfig) {
    if (!content || !content.trim()) {
      const container = document.getElementById(resultContainerId);
      if (container) {
        container.innerHTML = '<div class="stats-error">No content loaded. Please load HL7 data first.</div>';
      }
      return;
    }

    const extraction = extractFieldValues(content, fieldRef, filtersConfig);
    const stats = generateStatistics(extraction);
    renderStatistics(stats, fieldRef, resultContainerId);
  }

  // Public API
  return {
    parseFieldReference: parseFieldReference,
    extractFieldValues: extractFieldValues,
    generateStatistics: generateStatistics,
    renderStatistics: renderStatistics,
    runStatistics: runStatistics
  };

})();
