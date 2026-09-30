// JSON / FHIR Field Statistics
// Given a JSON path picked out of the viewer, work out which repeated records
// that path sits inside, then report how those records populate the field.
//
// The path the user right-clicks is concrete — ['entry'][3]['resource']['code']
// ['coding'][0]['code'] names one value in one order. To say anything about the
// other 199 orders, the array indices in that path are turned into wildcards.
// The outermost wildcard array is the "record collection": its elements are the
// things being compared, and everything after it is the field being measured.

const JSONStats = (function() {
  'use strict';

  // Longest rendered form of a value before it is elided.
  const MAX_LABEL = 140;
  // Records listed in one page of the drill-down.
  const DRILL_PAGE = 200;
  // Rows in the value table. A field that is unique per record would otherwise
  // produce one row per record, which is neither readable nor cheap to render.
  const MAX_TABLE_ROWS = 1000;

  // ========================================
  // PATH HANDLING
  // ========================================

  /**
   * Parse a Python-style path ("['entry'][3]['status']") into segments.
   * Returns null if the whole string is not accounted for, so a malformed
   * path is rejected rather than silently analysed as a shorter one.
   */
  function parsePath(pathStr) {
    if (typeof pathStr !== 'string') return null;
    const re = /\['([^']+)'\]|\[(\d+)\]/g;
    const segments = [];
    let match;
    let consumed = 0;

    while ((match = re.exec(pathStr)) !== null) {
      if (match.index !== consumed) return null;
      consumed = re.lastIndex;
      if (match[1] !== undefined) {
        segments.push({ type: 'key', value: match[1] });
      } else {
        segments.push({ type: 'index', value: parseInt(match[2], 10), wildcard: true });
      }
    }

    if (consumed !== pathStr.length || segments.length === 0) return null;
    return segments;
  }

  function formatSegments(segments) {
    return segments.map(function(seg) {
      if (seg.type === 'key') return "['" + seg.value + "']";
      return seg.wildcard ? '[*]' : '[' + seg.value + ']';
    }).join('');
  }

  function cloneSegments(segments) {
    return segments.map(function(seg) {
      return seg.type === 'key'
        ? { type: 'key', value: seg.value }
        : { type: 'index', value: seg.value, wildcard: !!seg.wildcard };
    });
  }

  /** The array whose elements are the records: the first wildcard index. */
  function findAnchorIndex(segments) {
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].type === 'index' && segments[i].wildcard) return i;
    }
    return -1;
  }

  /** A short human name for the field, e.g. "code" or "coding[].code". */
  function fieldLabelOf(segments) {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].type === 'key') {
        const trailing = segments.length - 1 - i;
        return segments[i].value + '[]'.repeat(trailing);
      }
    }
    return 'value';
  }

  // ========================================
  // TRAVERSAL
  // ========================================

  /**
   * Walk `segments` from `value`, pushing every reachable endpoint into `out`.
   * A wildcard index fans out across the whole array; a missing key or a
   * type that cannot be walked simply yields nothing for that branch.
   */
  function collect(value, segments, i, path, parent, key, out) {
    if (i >= segments.length) {
      out.push({ path: path, value: value, parent: parent, key: key });
      return;
    }

    const seg = segments[i];

    if (seg.type === 'key') {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return;
      if (!Object.prototype.hasOwnProperty.call(value, seg.value)) return;
      collect(value[seg.value], segments, i + 1,
              path + "['" + seg.value + "']", value, seg.value, out);
      return;
    }

    if (!Array.isArray(value)) return;

    if (seg.wildcard) {
      for (let k = 0; k < value.length; k++) {
        collect(value[k], segments, i + 1, path + '[' + k + ']', value, k, out);
      }
    } else if (seg.value >= 0 && seg.value < value.length) {
      collect(value[seg.value], segments, i + 1,
              path + '[' + seg.value + ']', value, seg.value, out);
    }
  }

  // ========================================
  // VALUE PRESENTATION
  // ========================================

  function typeOf(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /** Stable identity used to group equal values together. */
  function valueKeyOf(value) {
    const t = typeOf(value);
    if (t === 'null') return '\u0000null';
    if (t === 'undefined') return '\u0000undefined';
    if (t === 'string') return value === '' ? '\u0000empty' : 's:' + value;
    if (t === 'object' || t === 'array') return 'j:' + JSON.stringify(value);
    return t.charAt(0) + ':' + String(value);
  }

  function truncate(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + '…';
  }

  /** Text of a CodeableConcept / Coding / plain string, if one can be found. */
  function conceptText(node) {
    if (node === null || typeof node !== 'object') return null;
    if (typeof node.text === 'string' && node.text) return node.text;
    const coding = Array.isArray(node.coding) ? node.coding[0] : null;
    if (coding && typeof coding === 'object') {
      if (typeof coding.display === 'string' && coding.display) return coding.display;
      if (typeof coding.code === 'string' && coding.code) return coding.code;
    }
    if (typeof node.display === 'string' && node.display) return node.display;
    if (typeof node.code === 'string' && node.code) return node.code;
    return null;
  }

  /**
   * How a value reads in the table. FHIR wraps most meaning in small objects,
   * so a raw JSON dump of a CodeableConcept is far less useful than its text.
   */
  function displayLabelOf(value) {
    const t = typeOf(value);

    if (t === 'null') return 'null';
    if (t === 'undefined') return '(absent)';
    if (t === 'string') return value === '' ? '(empty string)' : truncate(value, MAX_LABEL);
    if (t === 'number' || t === 'boolean') return String(value);

    if (t === 'array') {
      if (value.length === 0) return '(empty array)';
      return truncate(JSON.stringify(value), MAX_LABEL);
    }

    // Reference
    if (typeof value.reference === 'string') {
      return value.display
        ? truncate(value.reference + ' — ' + value.display, MAX_LABEL)
        : truncate(value.reference, MAX_LABEL);
    }
    // Quantity
    if (typeof value.value === 'number' && (value.unit || value.code)) {
      return truncate(value.value + ' ' + (value.unit || value.code), MAX_LABEL);
    }
    // Period
    if (value.start || value.end) {
      return truncate((value.start || '…') + ' → ' + (value.end || '…'), MAX_LABEL);
    }
    // Identifier
    if (typeof value.value === 'string' && (value.system || value.type)) {
      return truncate(value.value, MAX_LABEL);
    }

    const text = conceptText(value);
    if (text) {
      const coding = Array.isArray(value.coding) ? value.coding[0] : value;
      const code = coding && typeof coding === 'object' ? coding.code : null;
      return truncate(code && code !== text ? text + ' (' + code + ')' : text, MAX_LABEL);
    }

    return truncate(JSON.stringify(value), MAX_LABEL);
  }

  // FHIR date / dateTime / instant, per the spec's regex shapes.
  const FHIR_DATE_RE =
    /^(\d{4})(-\d{2})?(-\d{2})?(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
  const REFERENCE_RE = /^([A-Za-z]+)\/([A-Za-z0-9\-.]{1,64})$/;

  function parseFhirDate(text) {
    if (typeof text !== 'string') return null;
    const m = FHIR_DATE_RE.exec(text);
    if (!m) return null;
    // Widen partial dates to the start of their period so they can be ordered.
    let iso = text;
    if (!m[2]) iso = m[1] + '-01-01';
    else if (!m[3]) iso = m[1] + m[2] + '-01';
    if (!m[4]) iso += 'T00:00:00Z';
    else if (!m[7]) iso += 'Z';
    const ms = Date.parse(iso);
    return isNaN(ms) ? null : ms;
  }

  // ========================================
  // RECORD DESCRIPTION
  // ========================================

  /** The resource a record carries: Bundle entries wrap theirs in `.resource`. */
  function resourceOf(record) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
    if (record.resource && typeof record.resource === 'object' && !Array.isArray(record.resource)) {
      return record.resource;
    }
    return record;
  }

  /**
   * Enough about a record to recognise it in a list — which is the whole point
   * of the drill-down: finding the admit order among two hundred orders.
   */
  function describeRecord(rec) {
    const res = resourceOf(rec.value);
    const chips = [];

    let title = 'Item ' + (rec.arrayIndex + 1);
    if (res) {
      if (typeof res.resourceType === 'string') {
        title = res.resourceType + (typeof res.id === 'string' ? '/' + res.id : '');
      } else if (typeof res.id === 'string') {
        title = 'id ' + res.id;
      }
    }

    if (!res) return { title: title, subtitle: displayLabelOf(rec.value), chips: chips };

    const subtitle = conceptText(res.code) || conceptText(res.type) ||
                     conceptText(res.medicationCodeableConcept) ||
                     conceptText(res.service) || conceptText(res.category) ||
                     (Array.isArray(res.category) ? conceptText(res.category[0]) : null) ||
                     null;

    ['status', 'intent', 'priority', 'class'].forEach(function(k) {
      const v = res[k];
      if (typeof v === 'string' && v) chips.push({ label: k, value: v });
      else if (v && typeof v === 'object') {
        const t = conceptText(v);
        if (t) chips.push({ label: k, value: t });
      }
    });

    ['authoredOn', 'occurrenceDateTime', 'effectiveDateTime', 'date', 'recordedDate',
     'issued', 'start'].forEach(function(k) {
      if (chips.some(function(c) { return c.label === 'when'; })) return;
      if (typeof res[k] === 'string' && res[k]) chips.push({ label: 'when', value: res[k] });
    });

    ['subject', 'patient', 'encounter', 'requester'].forEach(function(k) {
      const ref = res[k];
      if (ref && typeof ref === 'object' && typeof ref.reference === 'string') {
        chips.push({ label: k, value: ref.display ? ref.reference + ' (' + ref.display + ')' : ref.reference });
      }
    });

    if (Array.isArray(res.identifier) && res.identifier[0] && res.identifier[0].value) {
      chips.push({ label: 'identifier', value: String(res.identifier[0].value) });
    }

    return { title: title, subtitle: subtitle, chips: chips.slice(0, 6) };
  }

  // ========================================
  // ANALYSIS
  // ========================================

  /**
   * @param {*} root - the parsed JSON document
   * @param {Array} segments - path segments, indices flagged wildcard or not
   */
  function analyze(root, segments) {
    const anchorIdx = findAnchorIndex(segments);
    const records = [];
    let collectionPath;

    if (anchorIdx === -1) {
      // No wildcard left in the path: the document itself is the only record.
      records.push({ index: 0, arrayIndex: 0, path: '', value: root });
      collectionPath = null;
    } else {
      const prefix = segments.slice(0, anchorIdx);
      const holders = [];
      if (prefix.length === 0) {
        holders.push({ path: '', value: root });
      } else {
        collect(root, prefix, 0, '', null, null, holders);
      }
      holders.forEach(function(holder) {
        if (!Array.isArray(holder.value)) return;
        holder.value.forEach(function(item, k) {
          records.push({
            index: records.length,
            arrayIndex: k,
            path: holder.path + '[' + k + ']',
            value: item
          });
        });
      });
      collectionPath = formatSegments(prefix) + '[*]';
    }

    const relSegments = anchorIdx === -1 ? segments : segments.slice(anchorIdx + 1);

    // Group occurrences by value.
    const valueMap = new Map();
    let totalOccurrences = 0;
    let recordsWithValue = 0;
    const multiplicity = new Map();
    const typeCounts = new Map();
    const systemCounts = new Map();
    const referenceCounts = new Map();
    const resourceTypeCounts = new Map();
    const dateTimes = [];
    const numbers = [];

    records.forEach(function(rec) {
      const occurrences = [];
      if (relSegments.length === 0) {
        occurrences.push({ path: rec.path, value: rec.value, parent: null, key: null });
      } else {
        collect(rec.value, relSegments, 0, rec.path, null, null, occurrences);
      }
      rec.occurrences = occurrences;

      const res = resourceOf(rec.value);
      const rt = res && typeof res.resourceType === 'string' ? res.resourceType : '(none)';
      resourceTypeCounts.set(rt, (resourceTypeCounts.get(rt) || 0) + 1);

      const n = occurrences.length;
      multiplicity.set(n, (multiplicity.get(n) || 0) + 1);
      if (n > 0) recordsWithValue++;
      totalOccurrences += n;

      occurrences.forEach(function(occ) {
        const key = valueKeyOf(occ.value);
        let bucket = valueMap.get(key);
        if (!bucket) {
          bucket = {
            key: key,
            label: displayLabelOf(occ.value),
            raw: occ.value,
            type: typeOf(occ.value),
            count: 0,
            recordSet: new Set(),
            occurrences: [],
            systems: new Set(),
            displays: new Set()
          };
          valueMap.set(key, bucket);
        }
        bucket.count++;
        bucket.recordSet.add(rec.index);
        bucket.occurrences.push({ recordIndex: rec.index, path: occ.path });

        // A bare code means little without the system and display that sit
        // beside it in the same Coding element.
        if (occ.parent && typeof occ.parent === 'object' && !Array.isArray(occ.parent)) {
          if (typeof occ.parent.system === 'string' && occ.parent.system) {
            bucket.systems.add(occ.parent.system);
            systemCounts.set(occ.parent.system, (systemCounts.get(occ.parent.system) || 0) + 1);
          }
          if (typeof occ.parent.display === 'string' && occ.parent.display) {
            bucket.displays.add(occ.parent.display);
          }
        }

        const t = typeOf(occ.value);
        typeCounts.set(t, (typeCounts.get(t) || 0) + 1);

        if (t === 'number') numbers.push(occ.value);
        if (t === 'string') {
          const ms = parseFhirDate(occ.value);
          if (ms !== null) dateTimes.push({ ms: ms, text: occ.value });
          const refMatch = REFERENCE_RE.exec(occ.value);
          if (refMatch) {
            referenceCounts.set(refMatch[1], (referenceCounts.get(refMatch[1]) || 0) + 1);
          }
        } else if (t === 'object' && typeof occ.value.reference === 'string') {
          const refMatch = REFERENCE_RE.exec(occ.value.reference);
          if (refMatch) {
            referenceCounts.set(refMatch[1], (referenceCounts.get(refMatch[1]) || 0) + 1);
          }
        }
      });
    });

    const distinctValues = Array.from(valueMap.values()).sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    distinctValues.forEach(function(b) { b.recordCount = b.recordSet.size; });

    let dateRange = null;
    if (dateTimes.length > 0) {
      let min = dateTimes[0];
      let max = dateTimes[0];
      dateTimes.forEach(function(d) {
        if (d.ms < min.ms) min = d;
        if (d.ms > max.ms) max = d;
      });
      dateRange = { count: dateTimes.length, min: min.text, max: max.text };
    }

    let numericSummary = null;
    if (numbers.length > 0) {
      let sum = 0;
      let min = numbers[0];
      let max = numbers[0];
      numbers.forEach(function(v) {
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
      });
      numericSummary = { count: numbers.length, min: min, max: max, mean: sum / numbers.length };
    }

    return {
      segments: segments,
      relSegments: relSegments,
      anchorIdx: anchorIdx,
      collectionPath: collectionPath,
      fieldLabel: fieldLabelOf(segments),
      relPath: relSegments.length ? formatSegments(relSegments) : '(the record itself)',
      fullPath: formatSegments(segments),
      records: records,
      recordCount: records.length,
      recordsWithValue: recordsWithValue,
      recordsMissing: records.length - recordsWithValue,
      totalOccurrences: totalOccurrences,
      distinctValues: distinctValues,
      multiplicity: multiplicity,
      typeCounts: typeCounts,
      systemCounts: systemCounts,
      referenceCounts: referenceCounts,
      resourceTypeCounts: resourceTypeCounts,
      dateRange: dateRange,
      numericSummary: numericSummary
    };
  }

  // ========================================
  // RENDERING
  // ========================================

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text === undefined || text === null ? '' : String(text);
    return div.innerHTML;
  }

  // escapeHtml is enough for text content but leaves quotes intact, so a JSON
  // key holding a double quote would break out of an attribute. Paths and
  // titles go into attributes, so they get this instead.
  function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pct(part, whole) {
    if (!whole) return '0.0';
    return ((part / whole) * 100).toFixed(1);
  }

  function sortedEntries(map) {
    return Array.from(map.entries()).sort(function(a, b) { return b[1] - a[1]; });
  }

  function pathChipsHtml(segments, anchorIdx) {
    const parts = segments.map(function(seg, i) {
      if (seg.type === 'key') {
        return '<span class="jstats-path-key">' + escapeHtml(seg.value) + '</span>';
      }
      const isAnchor = i === anchorIdx;
      const cls = 'jstats-chip' + (seg.wildcard ? ' jstats-chip-wild' : '') +
                  (isAnchor ? ' jstats-chip-anchor' : '');
      const title = seg.wildcard
        ? 'Every element (click to pin to index ' + seg.value + ')'
        : 'Index ' + seg.value + ' only (click to compare every element)';
      return '<button type="button" class="' + cls + '" data-seg-index="' + i +
             '" title="' + escapeAttr(title) + '">' +
             (seg.wildcard ? '[*]' : '[' + seg.value + ']') + '</button>';
    });
    return parts.join('<span class="jstats-path-sep">.</span>');
  }

  function insightsHtml(a) {
    const panels = [];

    if (a.recordCount > 0) {
      const rows = [];
      sortedEntries(a.multiplicity).sort(function(x, y) { return x[0] - y[0]; })
        .forEach(function(entry) {
          const label = entry[0] === 0 ? 'no value' :
                        entry[0] === 1 ? '1 value' : entry[0] + ' values';
          rows.push('<tr><td>' + label + '</td><td>' + entry[1] + '</td><td>' +
                    pct(entry[1], a.recordCount) + '%</td></tr>');
        });
      panels.push({
        title: 'Values per record',
        note: 'How often the field repeats within a single record.',
        body: '<table class="jstats-mini-table"><thead><tr><th>Cardinality</th>' +
              '<th>Records</th><th>%</th></tr></thead><tbody>' + rows.join('') +
              '</tbody></table>'
      });
    }

    if (a.typeCounts.size > 1 || (a.typeCounts.size === 1 && !a.typeCounts.has('string'))) {
      const rows = sortedEntries(a.typeCounts).map(function(e) {
        return '<tr><td><code>' + escapeHtml(e[0]) + '</code></td><td>' + e[1] +
               '</td><td>' + pct(e[1], a.totalOccurrences) + '%</td></tr>';
      });
      panels.push({
        title: 'Value types',
        note: a.typeCounts.size > 1
          ? 'More than one JSON type appears here, which usually points at inconsistent source data.'
          : 'The JSON type carried by this field.',
        body: '<table class="jstats-mini-table"><thead><tr><th>Type</th><th>Occurrences</th>' +
              '<th>%</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>'
      });
    }

    if (a.systemCounts.size > 0) {
      const rows = sortedEntries(a.systemCounts).map(function(e) {
        return '<tr><td><code>' + escapeHtml(e[0]) + '</code></td><td>' + e[1] + '</td></tr>';
      });
      panels.push({
        title: 'Coding systems',
        note: 'Taken from the <code>system</code> sitting beside each value in its Coding element.',
        body: '<table class="jstats-mini-table"><thead><tr><th>System</th>' +
              '<th>Occurrences</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>'
      });
    }

    if (a.referenceCounts.size > 0) {
      const rows = sortedEntries(a.referenceCounts).map(function(e) {
        return '<tr><td><code>' + escapeHtml(e[0]) + '</code></td><td>' + e[1] + '</td></tr>';
      });
      panels.push({
        title: 'Reference targets',
        note: 'Resource types named by values shaped like <code>ResourceType/id</code>.',
        body: '<table class="jstats-mini-table"><thead><tr><th>Resource type</th>' +
              '<th>Occurrences</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>'
      });
    }

    if (a.dateRange) {
      panels.push({
        title: 'Date range',
        note: a.dateRange.count + ' of ' + a.totalOccurrences +
              ' occurrences parse as a FHIR date, dateTime, or instant.',
        body: '<dl class="jstats-defs">' +
              '<dt>Earliest</dt><dd><code>' + escapeHtml(a.dateRange.min) + '</code></dd>' +
              '<dt>Latest</dt><dd><code>' + escapeHtml(a.dateRange.max) + '</code></dd></dl>'
      });
    }

    if (a.numericSummary) {
      const n = a.numericSummary;
      panels.push({
        title: 'Numeric summary',
        note: n.count + ' numeric occurrence' + (n.count === 1 ? '' : 's') + '.',
        body: '<dl class="jstats-defs">' +
              '<dt>Min</dt><dd>' + n.min + '</dd>' +
              '<dt>Max</dt><dd>' + n.max + '</dd>' +
              '<dt>Mean</dt><dd>' + n.mean.toFixed(3).replace(/\.?0+$/, '') + '</dd></dl>'
      });
    }

    if (a.resourceTypeCounts.size > 1 ||
        (a.resourceTypeCounts.size === 1 && !a.resourceTypeCounts.has('(none)'))) {
      const rows = sortedEntries(a.resourceTypeCounts).map(function(e) {
        return '<tr><td><code>' + escapeHtml(e[0]) + '</code></td><td>' + e[1] +
               '</td><td>' + pct(e[1], a.recordCount) + '%</td></tr>';
      });
      panels.push({
        title: 'Resource types in scope',
        note: 'What the records being compared actually are.',
        body: '<table class="jstats-mini-table"><thead><tr><th>resourceType</th>' +
              '<th>Records</th><th>%</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>'
      });
    }

    if (panels.length === 0) return '';

    return '<div class="jstats-insights">' + panels.map(function(p) {
      return '<section class="jstats-insight">' +
             '<h3>' + p.title + '</h3>' +
             '<p class="jstats-insight-note">' + p.note + '</p>' +
             p.body + '</section>';
    }).join('') + '</div>';
  }

  function valueTableHtml(a) {
    if (a.distinctValues.length === 0) {
      return '<p class="jstats-empty">No occurrences of this field were found in any record.</p>';
    }

    const shown = a.distinctValues.slice(0, MAX_TABLE_ROWS);
    const rows = shown.map(function(b, i) {
      const extras = [];
      if (b.displays.size > 0) {
        extras.push('display: ' + escapeHtml(truncate(Array.from(b.displays).join(' | '), 90)));
      }
      if (b.systems.size > 0) {
        extras.push('system: ' + escapeHtml(truncate(Array.from(b.systems).join(' | '), 90)));
      }
      const extraHtml = extras.length
        ? '<div class="jstats-value-extra">' + extras.join(' &middot; ') + '</div>' : '';
      const emptyish = b.type === 'null' || b.key === '\u0000empty';

      return '<tr class="jstats-value-row" data-value-index="' + i + '" tabindex="0">' +
             '<td class="jstats-value-cell' + (emptyish ? ' jstats-value-emptyish' : '') + '">' +
             '<span class="jstats-value-text">' + escapeHtml(b.label) + '</span>' + extraHtml +
             '</td>' +
             '<td class="jstats-num">' + b.count + '</td>' +
             '<td class="jstats-num">' + b.recordCount + '</td>' +
             '<td class="jstats-num">' + pct(b.recordCount, a.recordCount) + '%</td>' +
             '<td class="jstats-go"><span class="jstats-go-hint">Show records &rsaquo;</span></td>' +
             '</tr>';
    });

    const omitted = a.distinctValues.length - shown.length;
    const footer = omitted > 0
      ? '<p class="jstats-table-note">Showing the ' + MAX_TABLE_ROWS +
        ' most common values; ' + omitted + ' rarer value' + (omitted === 1 ? '' : 's') +
        ' are not listed. Pin an index in the path above to narrow the scope.</p>'
      : '';

    return '<div class="stats-table-wrapper"><table class="stats-table jstats-table">' +
           '<thead><tr><th>Value</th><th>Occurrences</th><th>Records</th>' +
           '<th>% of records</th><th></th></tr></thead>' +
           '<tbody>' + rows.join('') + '</tbody></table></div>' + footer;
  }

  /**
   * Render the analysis into `container`.
   * @param {Object} handlers
   *   - onReveal(path): jump the viewer to this JSON path
   *   - onSegmentsChange(segments): re-run with a different wildcard layout
   */
  function render(container, a, handlers) {
    handlers = handlers || {};

    const scopeHtml = a.collectionPath
      ? 'Comparing <strong>' + a.recordCount + '</strong> record' +
        (a.recordCount === 1 ? '' : 's') + ' at <code>' + escapeHtml(a.collectionPath) + '</code>'
      : 'This path crosses no array, so the whole document counts as a single record. ' +
        'Un-pin an index below to compare across a collection.';

    const discriminator = a.recordsWithValue > 1 &&
                          a.distinctValues.length === a.totalOccurrences;

    let html =
      '<div class="jstats">' +
      '<header class="jstats-header">' +
        '<div class="jstats-title-row">' +
          '<h2>Field statistics: <code>' + escapeHtml(a.fieldLabel) + '</code></h2>' +
          '<button type="button" class="jstats-back-btn" data-reveal-path="' +
            escapeAttr(a.sourcePath || a.fullPath) + '">&lsaquo; Back to this field in the JSON</button>' +
        '</div>' +
        '<div class="jstats-path" id="jsonStatsPath">' +
          '<span class="jstats-path-label">Path:</span> ' +
          '<span class="jstats-path-root">root</span>' +
          '<span class="jstats-path-sep">.</span>' +
          pathChipsHtml(a.segments, a.anchorIdx) +
        '</div>' +
        '<p class="jstats-path-hint">Click any index to pin it to that one element, or release it ' +
          'back to <code>[*]</code> to compare across all of them. The first <code>[*]</code> ' +
          'marks the collection whose elements are counted as records.</p>' +
        '<p class="jstats-scope">' + scopeHtml + '</p>' +
      '</header>' +

      '<div class="stats-summary">' +
        '<div class="stats-summary-card"><div class="stats-summary-value">' + a.recordCount +
          '</div><div class="stats-summary-label">Records in Scope</div></div>' +
        '<div class="stats-summary-card stats-card-success"><div class="stats-summary-value">' +
          a.recordsWithValue + '</div><div class="stats-summary-label">With Value (' +
          pct(a.recordsWithValue, a.recordCount) + '%)</div></div>' +
        '<div class="stats-summary-card stats-card-warning"><div class="stats-summary-value">' +
          a.recordsMissing + '</div><div class="stats-summary-label">Missing Field</div></div>' +
        '<div class="stats-summary-card"><div class="stats-summary-value">' + a.totalOccurrences +
          '</div><div class="stats-summary-label">Total Occurrences</div></div>' +
        '<div class="stats-summary-card"><div class="stats-summary-value">' +
          a.distinctValues.length + '</div><div class="stats-summary-label">Distinct Values</div></div>' +
      '</div>';

    if (discriminator) {
      html += '<p class="jstats-note">Every occurrence of this field holds a different value, ' +
              'so it identifies records rather than grouping them.</p>';
    }

    html +=
      '<div class="stats-content">' +
        '<div class="stats-chart-section"><h3>Value Distribution ' +
          '<span class="jstats-h3-note">by occurrence</span></h3>' +
          '<div id="jsonStatsPieChart" class="stats-pie-container"></div></div>' +
        '<div class="stats-table-section"><h3>Value Counts</h3>' +
          valueTableHtml(a) + '</div>' +
      '</div>' +
      insightsHtml(a) +
      '<div class="jstats-drill" id="jsonStatsDrill"></div>' +
      '</div>';

    container.innerHTML = html;

    if (a.distinctValues.length > 0 && typeof HL7Stats !== 'undefined' && HL7Stats.createPieChart) {
      HL7Stats.createPieChart({
        distinctValues: a.distinctValues.map(function(b) {
          return { value: b.label, count: b.count };
        })
      }, 'jsonStatsPieChart');
    }

    wireEvents(container, a, handlers);
  }

  function wireEvents(container, a, handlers) {
    // Bind to the .jstats root rather than to `container`: render() rebuilds
    // the root every time, so listeners cannot stack up across re-renders the
    // way they would on the long-lived container element.
    const root = container.querySelector('.jstats');
    if (!root) return;

    // Index chips toggle between "every element" and "this one element".
    const pathBar = container.querySelector('#jsonStatsPath');
    if (pathBar && handlers.onSegmentsChange) {
      pathBar.addEventListener('click', function(e) {
        const chip = e.target.closest('.jstats-chip');
        if (!chip) return;
        const i = parseInt(chip.dataset.segIndex, 10);
        const next = cloneSegments(a.segments);
        next[i].wildcard = !next[i].wildcard;
        handlers.onSegmentsChange(next);
      });
    }

    // Any button carrying a path jumps the viewer there.
    root.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-reveal-path]');
      if (!btn || !handlers.onReveal) return;
      handlers.onReveal(btn.dataset.revealPath);
    });

    const table = container.querySelector('.jstats-table');
    const drill = container.querySelector('#jsonStatsDrill');
    if (!table || !drill) return;

    function openDrill(index) {
      table.querySelectorAll('.jstats-value-row').forEach(function(r) {
        r.classList.toggle('jstats-value-row-active',
                           parseInt(r.dataset.valueIndex, 10) === index);
      });
      renderDrill(drill, a, index, handlers);
      drill.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    table.addEventListener('click', function(e) {
      const row = e.target.closest('.jstats-value-row');
      if (!row) return;
      openDrill(parseInt(row.dataset.valueIndex, 10));
    });
    table.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.jstats-value-row');
      if (!row) return;
      e.preventDefault();
      openDrill(parseInt(row.dataset.valueIndex, 10));
    });
  }

  function renderDrill(drill, a, valueIndex, handlers, shown) {
    const bucket = a.distinctValues[valueIndex];
    if (!bucket) return;

    const limit = shown || DRILL_PAGE;
    const occurrences = bucket.occurrences;
    const slice = occurrences.slice(0, limit);

    const items = slice.map(function(occ) {
      const rec = a.records[occ.recordIndex];
      const d = describeRecord(rec);
      const chips = d.chips.map(function(c) {
        return '<span class="jstats-record-chip"><span class="jstats-chip-key">' +
               escapeHtml(c.label) + '</span>' + escapeHtml(truncate(c.value, 60)) + '</span>';
      }).join('');

      return '<li class="jstats-record">' +
        '<div class="jstats-record-main">' +
          '<div class="jstats-record-head">' +
            '<span class="jstats-record-title">' + escapeHtml(d.title) + '</span>' +
            '<span class="jstats-record-pos">Item ' + (rec.arrayIndex + 1) + '</span>' +
          '</div>' +
          (d.subtitle ? '<div class="jstats-record-sub">' + escapeHtml(truncate(d.subtitle, 120)) +
                        '</div>' : '') +
          (chips ? '<div class="jstats-record-chips">' + chips + '</div>' : '') +
          '<code class="jstats-record-path">root' + escapeHtml(occ.path) + '</code>' +
        '</div>' +
        '<div class="jstats-record-actions">' +
          '<button type="button" class="jstats-reveal-btn" data-reveal-path="' +
            escapeAttr(occ.path) + '">View field</button>' +
          (rec.path ? '<button type="button" class="jstats-reveal-btn jstats-reveal-secondary" ' +
            'data-reveal-path="' + escapeAttr(rec.path) + '">View record</button>' : '') +
        '</div>' +
      '</li>';
    }).join('');

    const more = occurrences.length > slice.length
      ? '<button type="button" class="jstats-more-btn" id="jsonStatsDrillMore">Show ' +
        Math.min(DRILL_PAGE, occurrences.length - slice.length) + ' more of ' +
        occurrences.length + '</button>'
      : '';

    drill.innerHTML =
      '<div class="jstats-drill-inner">' +
        '<div class="jstats-drill-header">' +
          '<h3>' + escapeHtml(a.fieldLabel) + ' = <span class="jstats-drill-value">' +
            escapeHtml(bucket.label) + '</span></h3>' +
          '<span class="jstats-drill-count">' + bucket.recordCount + ' record' +
            (bucket.recordCount === 1 ? '' : 's') +
            (bucket.count !== bucket.recordCount ? ', ' + bucket.count + ' occurrences' : '') +
          '</span>' +
          '<button type="button" class="jstats-drill-close" id="jsonStatsDrillClose">&#10005; Close</button>' +
        '</div>' +
        '<ul class="jstats-record-list">' + items + '</ul>' +
        more +
      '</div>';

    const closeBtn = drill.querySelector('#jsonStatsDrillClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        drill.innerHTML = '';
        const rows = drill.closest('.jstats').querySelectorAll('.jstats-value-row');
        rows.forEach(function(r) { r.classList.remove('jstats-value-row-active'); });
      });
    }

    const moreBtn = drill.querySelector('#jsonStatsDrillMore');
    if (moreBtn) {
      moreBtn.addEventListener('click', function() {
        renderDrill(drill, a, valueIndex, handlers, limit + DRILL_PAGE);
      });
    }
  }

  // Public API
  return {
    parsePath: parsePath,
    formatSegments: formatSegments,
    cloneSegments: cloneSegments,
    analyze: analyze,
    render: render,
    describeRecord: describeRecord
  };

})();
