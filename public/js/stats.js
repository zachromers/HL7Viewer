// HL7 Viewer - Statistics Module
// Handles field-based statistics generation and visualization

const HL7Stats = (function() {
  'use strict';

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
   * Extract all values for a specific field from HL7 content
   * Returns an array of { messageIndex, value } objects
   */
  function extractFieldValues(content, fieldRef) {
    const parsed = parseFieldReference(fieldRef);
    if (!parsed) return { error: 'Invalid field reference. Use format like PID.5, FT1.13, or MSH.9.1' };

    const lines = content.split(/\r\n|\n|\r/);
    const results = [];
    let currentMessageIndex = -1;
    let fieldSeparator = '|';
    let componentSeparator = '^';
    let subcomponentSeparator = '&';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const segmentId = trimmedLine.substring(0, 3);

      // Track message boundaries
      if (segmentId === 'MSH') {
        currentMessageIndex++;
        // Parse encoding characters
        if (trimmedLine.length > 3) {
          fieldSeparator = trimmedLine[3];
        }
        if (trimmedLine.length > 7) {
          const encodingChars = trimmedLine.substring(4, 8);
          componentSeparator = encodingChars[0] || '^';
          subcomponentSeparator = encodingChars[3] || '&';
        }
      }

      // Check if this line matches the target segment
      if (segmentId === parsed.segment) {
        const value = extractValueFromLine(
          trimmedLine,
          segmentId,
          parsed.field,
          parsed.component,
          parsed.subcomponent,
          fieldSeparator,
          componentSeparator,
          subcomponentSeparator
        );

        results.push({
          messageIndex: currentMessageIndex,
          value: value
        });
      }
    }

    return { results, totalMessages: currentMessageIndex + 1 };
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

    const { results, totalMessages } = extractionResult;

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
    const messagesWithoutSegment = totalMessages - messagesWithSegment.size;
    messagesWithoutValue = messagesWithOnlyEmpty + messagesWithoutSegment;

    // Sort value counts by count (descending)
    const sortedValues = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));

    return {
      totalMessages,
      messagesWithValue,
      messagesWithoutValue,
      totalOccurrences: results.length,
      distinctValues: sortedValues,
      segmentNotFound: results.length === 0
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

    // Build the stats HTML
    let html = `
      <div class="stats-header">
        <h2>Statistics for ${escapeHtml(fieldRef.toUpperCase())}</h2>
      </div>

      <div class="stats-summary">
        <div class="stats-summary-card">
          <div class="stats-summary-value">${stats.totalMessages}</div>
          <div class="stats-summary-label">Total Messages</div>
        </div>
        <div class="stats-summary-card stats-card-success">
          <div class="stats-summary-value">${stats.messagesWithValue}</div>
          <div class="stats-summary-label">Messages with Value</div>
        </div>
        <div class="stats-summary-card stats-card-warning">
          <div class="stats-summary-value">${stats.messagesWithoutValue}</div>
          <div class="stats-summary-label">Messages without Value</div>
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

    container.innerHTML = html;

    // Create the pie chart
    createPieChart(stats, 'statsPieChart');
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
  function runStatistics(content, fieldRef, resultContainerId) {
    if (!content || !content.trim()) {
      const container = document.getElementById(resultContainerId);
      if (container) {
        container.innerHTML = '<div class="stats-error">No content loaded. Please load HL7 data first.</div>';
      }
      return;
    }

    const extraction = extractFieldValues(content, fieldRef);
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
