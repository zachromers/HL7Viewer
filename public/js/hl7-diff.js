// HL7 Viewer - Message Comparison Module
// Semantic diff between two HL7 messages. Everything runs in the browser;
// no content ever leaves the page.

const HL7Diff = (function() {
  'use strict';

  const STORAGE_KEY_VOLATILE = 'hl7viewer_diffVolatileRules';

  // ========================================
  // DEFAULT RULES
  // ========================================

  // Fields that routinely differ between two otherwise-equivalent messages.
  // A plain value difference here is demoted to "expected variance"; a
  // presence, shape, or malformed-data difference is still reported in full.
  const DEFAULT_VOLATILE_RULES = [
    'MSH.7',        // Date/Time of Message
    'MSH.10',       // Message Control ID
    'EVN.2',        // Recorded Date/Time
    'EVN.6',        // Event Occurred
    'PID.2',        // Patient ID
    'PID.3',        // Patient Identifier List
    'PID.4',        // Alternate Patient ID
    'PID.5',        // Patient Name
    'PID.7',        // Date/Time of Birth
    'PID.11',       // Patient Address
    'PID.13',       // Phone Number - Home
    'PID.14',       // Phone Number - Business
    'PID.18',       // Patient Account Number
    'PID.19',       // SSN Number
    'PV1.19',       // Visit Number
    'PV1.44',       // Admit Date/Time
    'PV1.45',       // Discharge Date/Time
    'PV2.8',        // Expected Admit Date/Time
    'PV2.9',        // Expected Discharge Date/Time
    'ORC.2',        // Placer Order Number
    'ORC.3',        // Filler Order Number
    'ORC.9',        // Date/Time of Transaction
    'ORC.15',       // Order Effective Date/Time
    'OBR.2',        // Placer Order Number
    'OBR.3',        // Filler Order Number
    'OBR.7',        // Observation Date/Time
    'OBR.8',        // Observation End Date/Time
    'OBR.14',       // Specimen Received Date/Time
    'OBR.22',       // Results Rpt/Status Chng Date/Time
    'OBX.14',       // Date/Time of the Observation
    'OBX.19',       // Date/Time of the Analysis
    'FT1.4',        // Transaction Date
    'FT1.5',        // Transaction Posting Date
    'GT1.3',        // Guarantor Name
    'GT1.5',        // Guarantor Address
    'GT1.6',        // Guarantor Phone Number - Home
    'GT1.12',       // Guarantor SSN
    'IN1.36',       // Policy Number
    'IN1.49',       // Insured's ID Number
    'IN2.2',        // Insured's SSN
    'SCH.26',       // Placer Order Number
    'MRG.1',        // Prior Patient Identifier List
    'MRG.5'         // Prior Patient Account Number
  ];

  // Differences here are promoted to high severity even when the values look
  // benign: they describe how the message was routed and typed, which is the
  // usual reason one message is accepted and another rejected.
  const CRITICAL_FIELDS = {
    'MSH.2': 'Encoding characters differ. A receiving system that expects one set of delimiters may fail to parse the other message at all.',
    'MSH.3': 'Sending application differs. The two messages likely came from different interfaces or configurations.',
    'MSH.4': 'Sending facility differs. The two messages likely came from different interfaces or configurations.',
    'MSH.5': 'Receiving application differs. The two messages were routed to different destinations.',
    'MSH.6': 'Receiving facility differs. The two messages were routed to different destinations.',
    'MSH.9': 'Message type / trigger event differs. The two messages are handled by different processing rules.',
    'MSH.11': 'Processing ID differs (e.g. production vs debug/training). Receivers often treat these differently.',
    'MSH.12': 'HL7 version differs. Field definitions and required elements may not match between versions.'
  };

  // ========================================
  // PARSING
  // ========================================

  function isSegmentLine(line, fieldSep) {
    if (!line || line.length < 3) return false;
    if (!/^[A-Z][A-Z0-9]{2}$/.test(line.substring(0, 3))) return false;
    if (line.substring(0, 3) === 'MSH') return line.length >= 4;
    return line.length === 3 || line[3] === fieldSep;
  }

  /**
   * Parse HL7 text into structured messages.
   * Mirrors the parsing used elsewhere in the app so field indexing (including
   * the MSH offset) behaves identically across pages.
   */
  function parseMessages(content) {
    const lines = content.split(/\r\n|\n|\r/);
    const messages = [];
    let currentMessage = null;
    let fieldSeparator = '|';
    let componentSeparator = '^';
    let repetitionSeparator = '~';
    let escapeCharacter = '\\';
    let subcomponentSeparator = '&';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const segmentId = trimmedLine.substring(0, 3);

      if (segmentId === 'MSH') {
        if (currentMessage) messages.push(currentMessage);

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

        currentMessage = {
          fieldSeparator: fieldSeparator,
          componentSeparator: componentSeparator,
          repetitionSeparator: repetitionSeparator,
          escapeCharacter: escapeCharacter,
          subcomponentSeparator: subcomponentSeparator,
          segments: []
        };
      }

      if (currentMessage && isSegmentLine(trimmedLine, fieldSeparator)) {
        let fields;
        if (segmentId === 'MSH') {
          fields = trimmedLine.substring(4).split(fieldSeparator);
        } else {
          const afterId = trimmedLine.substring(3);
          fields = afterId.startsWith(fieldSeparator)
            ? afterId.substring(1).split(fieldSeparator)
            : afterId.split(fieldSeparator);
        }

        currentMessage.segments.push({
          segmentId: segmentId,
          fields: fields,
          raw: trimmedLine
        });
      }
    }

    if (currentMessage) messages.push(currentMessage);
    return messages;
  }

  /**
   * Highest field number addressable in a segment, accounting for the MSH
   * offset (MSH.1 is the field separator, MSH.2 the encoding characters).
   */
  function maxFieldNumber(segment) {
    return segment.segmentId === 'MSH' ? segment.fields.length + 1 : segment.fields.length;
  }

  /**
   * Read a raw (still repetition-delimited) field value by HL7 field number.
   */
  function getRawField(message, segment, fieldNum) {
    if (segment.segmentId === 'MSH') {
      if (fieldNum === 1) return message.fieldSeparator;
      const idx = fieldNum - 2;
      if (idx < 0 || idx >= segment.fields.length) return '';
      return segment.fields[idx] || '';
    }
    const idx = fieldNum - 1;
    if (idx < 0 || idx >= segment.fields.length) return '';
    return segment.fields[idx] || '';
  }

  // ========================================
  // FIELD NAMING
  // ========================================

  function fieldLabel(segmentId, fieldNum, compNum, subNum) {
    const segInfo = (typeof HL7_SEGMENTS !== 'undefined') ? HL7_SEGMENTS[segmentId] : null;
    if (segmentId === 'MSH' && fieldNum === 1) return 'Field Separator';
    if (!segInfo) return '';

    const fieldDef = segInfo.fields ? segInfo.fields[fieldNum] : null;
    if (!fieldDef) return '';

    let label = fieldDef.name || '';
    if (compNum && fieldDef.components && fieldDef.components[compNum]) {
      label += ' › ' + fieldDef.components[compNum];
    } else if (compNum) {
      label += ' › Component ' + compNum;
    }
    if (subNum) {
      label += ' › Sub ' + subNum;
    }
    return label;
  }

  function segmentLabel(segmentId) {
    const segInfo = (typeof HL7_SEGMENTS !== 'undefined') ? HL7_SEGMENTS[segmentId] : null;
    return segInfo ? segInfo.name : 'Custom / Unknown Segment';
  }

  // ========================================
  // VALUE SIGNATURES
  // ========================================

  function isValidDatePart(s) {
    if (!/^\d{8}$/.test(s)) return false;
    const y = parseInt(s.substring(0, 4), 10);
    const m = parseInt(s.substring(4, 6), 10);
    const d = parseInt(s.substring(6, 8), 10);
    if (y < 1800 || y > 2200) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const daysInMonth = new Date(y, m, 0).getDate();
    return d <= daysInMonth;
  }

  /**
   * Classify a value's shape.
   *   cls  - broad class used for high-severity shape mismatches
   *   type - narrow type used for lower-severity format/precision notes
   */
  function signature(value) {
    const v = value;
    if (!v) return { cls: 'empty', type: 'empty', length: 0, label: 'empty' };

    const len = v.length;

    // HL7 timestamp forms: YYYYMMDD[HHMM[SS[.S+]]][+/-ZZZZ]
    const tsMatch = v.match(/^(\d{8})(\d{2}(?:\d{2}(?:\d{2})?)?)?(\.\d{1,4})?([+-]\d{4})?$/);
    if (tsMatch && isValidDatePart(tsMatch[1])) {
      if (tsMatch[2] || tsMatch[3] || tsMatch[4]) {
        const precision = 8 + (tsMatch[2] ? tsMatch[2].length : 0);
        return { cls: 'numeric', type: 'datetime', length: len, precision: precision, label: 'date/time' };
      }
      return { cls: 'numeric', type: 'date', length: len, precision: 8, label: 'date' };
    }

    // Anything else that is date-shaped but not a real calendar date falls
    // through to the generic checks and is reported by valueIssues().
    if (/^-?\d+$/.test(v)) return { cls: 'numeric', type: 'numeric', length: len, label: 'numeric' };
    if (/^-?\d*\.\d+$/.test(v)) return { cls: 'numeric', type: 'decimal', length: len, label: 'decimal' };
    if (/^[A-Za-z]+$/.test(v)) return { cls: 'alpha', type: 'alpha', length: len, label: 'alphabetic' };
    if (/^[A-Za-z0-9]+$/.test(v)) return { cls: 'alphanumeric', type: 'alphanumeric', length: len, label: 'alphanumeric' };
    if (/^[A-Za-z0-9 .,'\-\/()]+$/.test(v)) return { cls: 'text', type: 'text', length: len, label: 'text' };
    return { cls: 'text', type: 'symbolic', length: len, label: 'text with symbols' };
  }

  function describeSignature(sig) {
    if (sig.cls === 'empty') return 'empty';
    return sig.label + '(' + sig.length + ')';
  }

  // ========================================
  // DATA QUALITY CHECKS
  // ========================================

  /**
   * Problems that can make a receiver reject a message outright. Reported when
   * one message has an issue the other does not.
   */
  function valueIssues(value, message) {
    const issues = [];
    if (!value) return issues;

    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
      issues.push('contains control characters');
    }
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(value)) {
      issues.push('contains non-ASCII characters');
    }
    if (value !== value.trim()) {
      issues.push('has leading or trailing whitespace');
    }
    if (message && value.indexOf(message.fieldSeparator) !== -1) {
      issues.push('contains an unescaped field separator (' + message.fieldSeparator + ')');
    }
    // A lone escape character that does not open a valid escape sequence.
    if (message && message.escapeCharacter) {
      const esc = message.escapeCharacter;
      const escIdx = value.indexOf(esc);
      if (escIdx !== -1) {
        const rest = value.substring(escIdx + 1);
        const closes = rest.indexOf(esc);
        if (closes === -1) {
          issues.push('contains an unterminated escape sequence');
        }
      }
    }
    if (/^\d{8}$/.test(value) && !isValidDatePart(value)) {
      issues.push('looks like a date but is not a valid calendar date');
    }
    return issues;
  }

  // ========================================
  // RULE MATCHING
  // ========================================

  function loadVolatileRules() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VOLATILE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // Ignore malformed or unavailable storage and fall back to defaults.
    }
    return DEFAULT_VOLATILE_RULES.slice();
  }

  function saveVolatileRules(rules) {
    try {
      localStorage.setItem(STORAGE_KEY_VOLATILE, JSON.stringify(rules));
    } catch (e) {
      // Storage may be unavailable (private mode); rules still apply in-session.
    }
  }

  function resetVolatileRules() {
    try {
      localStorage.removeItem(STORAGE_KEY_VOLATILE);
    } catch (e) {
      // Nothing to do.
    }
    return DEFAULT_VOLATILE_RULES.slice();
  }

  /**
   * Normalize an address to its rule form: strip occurrence and repetition
   * indices so "PID.3[2].1" is matched by the rule "PID.3".
   */
  function ruleAddress(addr) {
    return addr.replace(/\[\d+\]/g, '');
  }

  function ruleMatches(rule, addr) {
    const r = rule.trim().toUpperCase();
    if (!r) return false;
    const a = ruleAddress(addr).toUpperCase();
    if (r === a) return true;
    // A rule matches any deeper address: "PID.5" matches "PID.5.1".
    if (a.indexOf(r + '.') === 0) return true;
    // Wildcard field number: "ZPD.*" matches every ZPD field.
    if (r.indexOf('*') !== -1) {
      const pattern = '^' + r.split('*').map(escapeRegExp).join('[^.]*') + '(\\..*)?$';
      try {
        return new RegExp(pattern).test(a);
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isVolatileAddress(addr, rules) {
    for (let i = 0; i < rules.length; i++) {
      if (ruleMatches(rules[i], addr)) return true;
    }
    return false;
  }

  function criticalNote(addr) {
    const base = ruleAddress(addr);
    if (CRITICAL_FIELDS[base]) return CRITICAL_FIELDS[base];
    const parts = base.split('.');
    if (parts.length > 2) {
      const fieldOnly = parts[0] + '.' + parts[1];
      if (CRITICAL_FIELDS[fieldOnly]) return CRITICAL_FIELDS[fieldOnly];
    }
    return null;
  }

  // ========================================
  // SEGMENT ALIGNMENT
  // ========================================

  /**
   * Pair up segments between the two messages.
   * Segments of the same ID are matched by Set ID (field 1) when both sides
   * supply one; otherwise by order of occurrence.
   */
  function alignSegments(msgA, msgB) {
    const byIdA = groupById(msgA);
    const byIdB = groupById(msgB);
    const allIds = [];
    const seen = {};

    // Preserve message order: A's segment order first, then anything only in B.
    (msgA ? msgA.segments : []).forEach(function(s) {
      if (!seen[s.segmentId]) { seen[s.segmentId] = true; allIds.push(s.segmentId); }
    });
    (msgB ? msgB.segments : []).forEach(function(s) {
      if (!seen[s.segmentId]) { seen[s.segmentId] = true; allIds.push(s.segmentId); }
    });

    const pairs = [];

    allIds.forEach(function(segId) {
      const listA = byIdA[segId] || [];
      const listB = byIdB[segId] || [];
      const usedB = {};

      // Pass 1: match on Set ID when both sides have a usable one.
      const setIdA = listA.map(function(s) { return setIdOf(msgA, s); });
      const setIdB = listB.map(function(s) { return setIdOf(msgB, s); });
      const matchA = new Array(listA.length).fill(-1);

      const bothHaveSetIds =
        setIdA.some(function(v) { return v !== ''; }) &&
        setIdB.some(function(v) { return v !== ''; });

      if (bothHaveSetIds) {
        for (let i = 0; i < listA.length; i++) {
          if (!setIdA[i]) continue;
          for (let j = 0; j < listB.length; j++) {
            if (usedB[j] || setIdB[j] !== setIdA[i]) continue;
            matchA[i] = j;
            usedB[j] = true;
            break;
          }
        }
      }

      // Pass 2: fill remaining slots in order.
      let nextB = 0;
      for (let i = 0; i < listA.length; i++) {
        if (matchA[i] !== -1) continue;
        while (nextB < listB.length && usedB[nextB]) nextB++;
        if (nextB < listB.length) {
          matchA[i] = nextB;
          usedB[nextB] = true;
          nextB++;
        }
      }

      let occurrence = 0;
      for (let i = 0; i < listA.length; i++) {
        pairs.push({
          segmentId: segId,
          occurrence: ++occurrence,
          a: listA[i],
          b: matchA[i] !== -1 ? listB[matchA[i]] : null
        });
      }
      for (let j = 0; j < listB.length; j++) {
        if (usedB[j]) continue;
        pairs.push({
          segmentId: segId,
          occurrence: ++occurrence,
          a: null,
          b: listB[j]
        });
      }
    });

    return pairs;
  }

  function groupById(msg) {
    const out = {};
    if (!msg) return out;
    msg.segments.forEach(function(s) {
      if (!out[s.segmentId]) out[s.segmentId] = [];
      out[s.segmentId].push(s);
    });
    return out;
  }

  function setIdOf(msg, segment) {
    if (!segment || segment.segmentId === 'MSH') return '';
    const v = (getRawField(msg, segment, 1) || '').trim();
    return /^\d+$/.test(v) ? v : '';
  }

  // ========================================
  // COMPARISON
  // ========================================

  const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, info: 3, none: 4 };

  /**
   * Compare two leaf values and produce a verdict.
   */
  function classifyLeaf(addr, rawA, rawB, ctx) {
    const a = rawA == null ? '' : rawA;
    const b = rawB == null ? '' : rawB;

    const issuesA = valueIssues(a, ctx.msgA);
    const issuesB = valueIssues(b, ctx.msgB);
    const onlyA = issuesA.filter(function(i) { return issuesB.indexOf(i) === -1; });
    const onlyB = issuesB.filter(function(i) { return issuesA.indexOf(i) === -1; });

    // Malformed data on one side only outranks everything else.
    if (onlyA.length || onlyB.length) {
      const side = onlyB.length ? 'B' : 'A';
      const list = onlyB.length ? onlyB : onlyA;
      return {
        kind: 'malformed',
        severity: 'high',
        side: side,
        detail: 'Message ' + side + ' ' + list.join('; ') + '.'
      };
    }

    if (a === b) return { kind: 'identical', severity: 'none' };

    const aT = a.trim();
    const bT = b.trim();

    if (!aT && !bT) return { kind: 'identical', severity: 'none' };

    if (!aT || !bT) {
      const side = aT ? 'A' : 'B';
      return {
        kind: 'presence',
        severity: 'high',
        side: side,
        detail: 'Populated in Message ' + side + ' only.'
      };
    }

    if (aT === bT) {
      return {
        kind: 'whitespace',
        severity: 'low',
        detail: 'Values match except for surrounding whitespace.'
      };
    }

    const sigA = signature(aT);
    const sigB = signature(bT);

    if (sigA.cls !== sigB.cls) {
      return {
        kind: 'shape',
        severity: 'high',
        sigA: sigA,
        sigB: sigB,
        detail: 'Message A is ' + describeSignature(sigA) + ', Message B is ' + describeSignature(sigB) + '.'
      };
    }

    if (sigA.type === 'datetime' || sigB.type === 'datetime' || sigA.type === 'date' || sigB.type === 'date') {
      if (sigA.type !== sigB.type || sigA.precision !== sigB.precision) {
        return {
          kind: 'precision',
          severity: 'medium',
          sigA: sigA,
          sigB: sigB,
          detail: 'Date/time precision differs: Message A is ' + describeSignature(sigA) +
                  ', Message B is ' + describeSignature(sigB) + '.'
        };
      }
    }

    if (sigA.type !== sigB.type) {
      return {
        kind: 'format',
        severity: 'low',
        sigA: sigA,
        sigB: sigB,
        detail: 'Same broad type but different format: ' + describeSignature(sigA) + ' vs ' + describeSignature(sigB) + '.'
      };
    }

    if (aT.toUpperCase() === bT.toUpperCase()) {
      return {
        kind: 'case',
        severity: 'low',
        detail: 'Values differ only by letter case.'
      };
    }

    if (sigA.cls === 'numeric' && aT.replace(/^[+-]?0+/, '') === bT.replace(/^[+-]?0+/, '')) {
      return {
        kind: 'format',
        severity: 'low',
        detail: 'Same number, different leading-zero padding.'
      };
    }

    if (ctx.isVolatile(addr)) {
      return {
        kind: 'volatile',
        severity: 'info',
        detail: 'Value differs, but this field is expected to vary between messages.'
      };
    }

    return { kind: 'value', severity: 'medium', detail: 'Values differ.' };
  }

  /**
   * Walk a single field on both sides, descending into repetitions,
   * components, and subcomponents only as deep as the data actually goes.
   */
  function compareField(ctx, segmentId, occurrence, fieldNum, rawA, rawB, rows) {
    const segTag = segmentId + '[' + occurrence + ']';
    const repSepA = ctx.msgA ? ctx.msgA.repetitionSeparator : '~';
    const repSepB = ctx.msgB ? ctx.msgB.repetitionSeparator : '~';

    const repsA = rawA ? rawA.split(repSepA) : [''];
    const repsB = rawB ? rawB.split(repSepB) : [''];
    const repCount = Math.max(repsA.length, repsB.length);

    for (let r = 0; r < repCount; r++) {
      const repA = repsA[r] != null ? repsA[r] : '';
      const repB = repsB[r] != null ? repsB[r] : '';
      const repTag = repCount > 1 ? '[' + (r + 1) + ']' : '';
      const fieldAddr = segTag + '.' + fieldNum + repTag;

      if (repA === repB) {
        addRow(ctx, rows, fieldAddr, segmentId, occurrence, fieldNum, null, null, repA, repB,
               { kind: 'identical', severity: 'none' });
        continue;
      }

      const compSepA = ctx.msgA ? ctx.msgA.componentSeparator : '^';
      const compSepB = ctx.msgB ? ctx.msgB.componentSeparator : '^';
      const hasComps = repA.indexOf(compSepA) !== -1 || repB.indexOf(compSepB) !== -1;

      if (!hasComps) {
        addRow(ctx, rows, fieldAddr, segmentId, occurrence, fieldNum, null, null, repA, repB,
               classifyLeaf(fieldAddr, repA, repB, ctx));
        continue;
      }

      const compsA = repA.split(compSepA);
      const compsB = repB.split(compSepB);
      const compCount = Math.max(compsA.length, compsB.length);

      for (let c = 0; c < compCount; c++) {
        const cA = compsA[c] != null ? compsA[c] : '';
        const cB = compsB[c] != null ? compsB[c] : '';
        const compNum = c + 1;
        const compAddr = fieldAddr + '.' + compNum;

        if (cA === cB) {
          addRow(ctx, rows, compAddr, segmentId, occurrence, fieldNum, compNum, null, cA, cB,
                 { kind: 'identical', severity: 'none' });
          continue;
        }

        const subSepA = ctx.msgA ? ctx.msgA.subcomponentSeparator : '&';
        const subSepB = ctx.msgB ? ctx.msgB.subcomponentSeparator : '&';
        const hasSubs = cA.indexOf(subSepA) !== -1 || cB.indexOf(subSepB) !== -1;

        if (!hasSubs) {
          addRow(ctx, rows, compAddr, segmentId, occurrence, fieldNum, compNum, null, cA, cB,
                 classifyLeaf(compAddr, cA, cB, ctx));
          continue;
        }

        const subsA = cA.split(subSepA);
        const subsB = cB.split(subSepB);
        const subCount = Math.max(subsA.length, subsB.length);

        for (let s = 0; s < subCount; s++) {
          const sA = subsA[s] != null ? subsA[s] : '';
          const sB = subsB[s] != null ? subsB[s] : '';
          const subNum = s + 1;
          const subAddr = compAddr + '.' + subNum;
          addRow(ctx, rows, subAddr, segmentId, occurrence, fieldNum, compNum, subNum, sA, sB,
                 classifyLeaf(subAddr, sA, sB, ctx));
        }
      }
    }
  }

  function addRow(ctx, rows, addr, segmentId, occurrence, fieldNum, compNum, subNum, valueA, valueB, verdict) {
    // Suppress rows that are empty on both sides and identical - they are just
    // padding created by unequal field counts.
    if (verdict.kind === 'identical' && !String(valueA).trim() && !String(valueB).trim()) {
      return;
    }

    // Promote routing/typing fields regardless of how the values compare.
    let note = null;
    if (verdict.severity !== 'none') {
      note = criticalNote(addr);
      if (note) {
        if (verdict.kind === 'volatile') verdict.kind = 'value';
        verdict.severity = 'high';
        verdict.critical = true;
      }
    }

    rows.push({
      address: addr,
      displayAddress: addr.replace(/\[1\]\./, '.'),
      segmentId: segmentId,
      occurrence: occurrence,
      fieldNum: fieldNum,
      compNum: compNum,
      subNum: subNum,
      label: fieldLabel(segmentId, fieldNum, compNum, subNum),
      valueA: valueA,
      valueB: valueB,
      kind: verdict.kind,
      severity: verdict.severity,
      side: verdict.side || null,
      detail: verdict.detail || '',
      critical: !!verdict.critical,
      note: note
    });
  }

  /**
   * Run the full comparison. Returns a result object; does no DOM work.
   */
  function compare(contentA, contentB, options) {
    const opts = options || {};
    const rules = opts.volatileRules || loadVolatileRules();

    const messagesA = parseMessages(contentA || '');
    const messagesB = parseMessages(contentB || '');

    if (messagesA.length === 0 || messagesB.length === 0) {
      return {
        error: 'Both sides need a parsable HL7 message (a segment block beginning with MSH).',
        missingA: messagesA.length === 0,
        missingB: messagesB.length === 0
      };
    }

    const msgA = messagesA[0];
    const msgB = messagesB[0];

    const ctx = {
      msgA: msgA,
      msgB: msgB,
      isVolatile: function(addr) { return isVolatileAddress(addr, rules); }
    };

    const pairs = alignSegments(msgA, msgB);
    const groups = [];
    const findings = [];

    // Message-level: segment inventory.
    const countsA = countSegments(msgA);
    const countsB = countSegments(msgB);
    const allSegIds = Object.keys(countsA).concat(Object.keys(countsB))
      .filter(function(v, i, arr) { return arr.indexOf(v) === i; });

    allSegIds.forEach(function(segId) {
      const ca = countsA[segId] || 0;
      const cb = countsB[segId] || 0;
      if (ca === cb) return;
      if (ca === 0 || cb === 0) {
        const side = ca > 0 ? 'A' : 'B';
        findings.push({
          severity: 'high',
          kind: 'segment-presence',
          address: segId,
          text: segId + ' (' + segmentLabel(segId) + ') is present in Message ' + side + ' only' +
                ((ca || cb) > 1 ? ' (' + (ca || cb) + ' occurrences)' : '') + '.'
        });
      } else {
        findings.push({
          severity: 'medium',
          kind: 'segment-count',
          address: segId,
          text: segId + ' occurs ' + ca + ' time' + (ca === 1 ? '' : 's') + ' in Message A but ' +
                cb + ' time' + (cb === 1 ? '' : 's') + ' in Message B.'
        });
      }
    });

    // Delimiters.
    if (msgA.componentSeparator !== msgB.componentSeparator ||
        msgA.fieldSeparator !== msgB.fieldSeparator ||
        msgA.subcomponentSeparator !== msgB.subcomponentSeparator ||
        msgA.repetitionSeparator !== msgB.repetitionSeparator) {
      findings.push({
        severity: 'high',
        kind: 'delimiters',
        address: 'MSH.1/MSH.2',
        text: 'The two messages use different delimiters (A: "' + msgA.fieldSeparator + msgA.componentSeparator +
              msgA.repetitionSeparator + msgA.escapeCharacter + msgA.subcomponentSeparator + '", B: "' +
              msgB.fieldSeparator + msgB.componentSeparator + msgB.repetitionSeparator +
              msgB.escapeCharacter + msgB.subcomponentSeparator + '").'
      });
    }

    // Field-level comparison, segment pair by segment pair.
    pairs.forEach(function(pair) {
      const rows = [];
      const segA = pair.a;
      const segB = pair.b;

      const maxA = segA ? maxFieldNumber(segA) : 0;
      const maxB = segB ? maxFieldNumber(segB) : 0;
      const maxField = Math.max(maxA, maxB);

      for (let f = 1; f <= maxField; f++) {
        const rawA = segA ? getRawField(msgA, segA, f) : '';
        const rawB = segB ? getRawField(msgB, segB, f) : '';
        if (!rawA && !rawB) continue;
        compareField(ctx, pair.segmentId, pair.occurrence, f, rawA, rawB, rows);
      }

      // Truncation: one side simply stops earlier than the other.
      if (segA && segB && maxA !== maxB) {
        const shorter = maxA < maxB ? 'A' : 'B';
        const longer = maxA < maxB ? 'B' : 'A';
        const tailPopulated = rows.some(function(r) {
          return r.kind === 'presence' && r.fieldNum > Math.min(maxA, maxB);
        });
        if (tailPopulated) {
          findings.push({
            severity: 'medium',
            kind: 'truncation',
            address: pair.segmentId + '[' + pair.occurrence + ']',
            text: pair.segmentId + ' in Message ' + shorter + ' ends at field ' + Math.min(maxA, maxB) +
                  ' while Message ' + longer + ' carries data through field ' + Math.max(maxA, maxB) + '.'
          });
        }
      }

      groups.push({
        segmentId: pair.segmentId,
        occurrence: pair.occurrence,
        label: segmentLabel(pair.segmentId),
        presentA: !!segA,
        presentB: !!segB,
        rows: rows
      });
    });

    // Roll field-level rows up into findings. A segment that exists on only
    // one side is already covered by its segment-level finding, so its fields
    // stay in the detail table rather than flooding the findings list.
    groups.forEach(function(g) {
      if (!g.presentA || !g.presentB) return;
      g.rows.forEach(function(row) {
        if (row.severity === 'none' || row.severity === 'info') return;
        findings.push({
          severity: row.severity,
          kind: row.kind,
          address: row.displayAddress,
          label: row.label,
          valueA: row.valueA,
          valueB: row.valueB,
          text: findingText(row),
          note: row.note
        });
      });
    });

    findings.sort(function(x, y) {
      const s = SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity];
      if (s !== 0) return s;
      return String(x.address).localeCompare(String(y.address));
    });

    // High/medium/low count the findings listed above the detail table so the
    // summary matches the list; expected and identical are row-level totals
    // with no finding of their own.
    const counts = { high: 0, medium: 0, low: 0, info: 0, identical: 0 };
    findings.forEach(function(f) {
      counts[f.severity]++;
    });
    groups.forEach(function(g) {
      g.rows.forEach(function(r) {
        if (r.severity === 'none') counts.identical++;
        else if (r.severity === 'info') counts.info++;
      });
    });

    return {
      error: null,
      messagesA: messagesA.length,
      messagesB: messagesB.length,
      groups: groups,
      findings: findings,
      counts: counts,
      rules: rules
    };
  }

  function countSegments(msg) {
    const out = {};
    msg.segments.forEach(function(s) {
      out[s.segmentId] = (out[s.segmentId] || 0) + 1;
    });
    return out;
  }

  function findingText(row) {
    const where = row.displayAddress + (row.label ? ' (' + row.label + ')' : '');
    switch (row.kind) {
      case 'presence':
        return where + ' is populated in Message ' + row.side + ' only — "' +
               (row.side === 'A' ? row.valueA : row.valueB) + '".';
      case 'shape':
        return where + ' changes type: ' + row.detail;
      case 'malformed':
        return where + ': ' + row.detail;
      case 'precision':
        return where + ': ' + row.detail;
      case 'format':
        return where + ': ' + row.detail;
      case 'case':
        return where + ': ' + row.detail;
      case 'whitespace':
        return where + ': ' + row.detail;
      default:
        return where + ' differs: "' + row.valueA + '" vs "' + row.valueB + '".';
    }
  }

  // ========================================
  // TEXT REPORT
  // ========================================

  function buildReport(result) {
    const lines = [];
    lines.push('HL7 Message Comparison');
    lines.push('======================');
    lines.push('');
    lines.push('Differences: ' + result.counts.high + ' high, ' + result.counts.medium + ' medium, ' +
               result.counts.low + ' low, ' + result.counts.info + ' expected variance, ' +
               result.counts.identical + ' identical.');
    lines.push('');

    const ranked = result.findings.filter(function(f) { return f.severity !== 'info'; });
    if (ranked.length === 0) {
      lines.push('No meaningful differences found.');
    } else {
      lines.push('Findings');
      lines.push('--------');
      ranked.forEach(function(f, i) {
        lines.push((i + 1) + '. [' + f.severity.toUpperCase() + '] ' + f.text);
        if (f.note) lines.push('     Note: ' + f.note);
      });
    }

    lines.push('');
    lines.push('Field Detail');
    lines.push('------------');
    result.groups.forEach(function(g) {
      const diffRows = g.rows.filter(function(r) { return r.severity !== 'none'; });
      if (diffRows.length === 0) return;
      lines.push('');
      lines.push(g.segmentId + '[' + g.occurrence + '] - ' + g.label +
                 (!g.presentA ? '  (Message B only)' : '') + (!g.presentB ? '  (Message A only)' : ''));
      diffRows.forEach(function(r) {
        lines.push('  ' + r.displayAddress + '  [' + r.kind + '/' + r.severity + ']' +
                   (r.label ? '  ' + r.label : ''));
        lines.push('    A: ' + (r.valueA || '(empty)'));
        lines.push('    B: ' + (r.valueB || '(empty)'));
      });
    });

    lines.push('');
    lines.push('Expected-variance rules in effect: ' + result.rules.join(', '));
    return lines.join('\n');
  }

  // ========================================
  // RENDERING
  // ========================================

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  const KIND_LABELS = {
    presence: 'Present in one only',
    shape: 'Type mismatch',
    malformed: 'Malformed data',
    precision: 'Precision change',
    structure: 'Structure',
    value: 'Value differs',
    format: 'Format',
    case: 'Case only',
    whitespace: 'Whitespace',
    volatile: 'Expected variance',
    identical: 'Identical',
    'segment-presence': 'Segment missing',
    'segment-count': 'Segment count',
    truncation: 'Truncated segment',
    delimiters: 'Delimiters'
  };

  /**
   * Highlight the differing middle of two strings by trimming the shared
   * prefix and suffix. Returns escaped HTML.
   */
  function highlightPair(a, b) {
    const sa = a == null ? '' : String(a);
    const sb = b == null ? '' : String(b);
    if (!sa || !sb || sa === sb) {
      return { a: escapeHtml(sa), b: escapeHtml(sb) };
    }

    let start = 0;
    const maxStart = Math.min(sa.length, sb.length);
    while (start < maxStart && sa[start] === sb[start]) start++;

    let end = 0;
    while (end < (Math.min(sa.length, sb.length) - start) &&
           sa[sa.length - 1 - end] === sb[sb.length - 1 - end]) end++;

    function wrap(s) {
      const head = s.substring(0, start);
      const mid = s.substring(start, s.length - end);
      const tail = s.substring(s.length - end);
      return escapeHtml(head) +
             (mid ? '<mark class="compare-mark">' + escapeHtml(mid) + '</mark>' : '') +
             escapeHtml(tail);
    }

    return { a: wrap(sa), b: wrap(sb) };
  }

  function valueCell(value, highlighted) {
    if (value == null || value === '') {
      return '<span class="compare-empty">(empty)</span>';
    }
    return highlighted;
  }

  /**
   * Render a completed comparison into a container element.
   */
  function render(result, container, viewOptions) {
    if (!container) return;
    const showIdentical = !!(viewOptions && viewOptions.showIdentical);

    if (result.error) {
      container.innerHTML = '<div class="compare-error">' + escapeHtml(result.error) + '</div>';
      return;
    }

    let html = '';

    html += '<div class="compare-summary">';
    html += summaryChip('high', result.counts.high, 'High');
    html += summaryChip('medium', result.counts.medium, 'Medium');
    html += summaryChip('low', result.counts.low, 'Low');
    html += summaryChip('info', result.counts.info, 'Expected');
    html += summaryChip('identical', result.counts.identical, 'Identical');
    html += '<div class="compare-summary-actions">' +
            '<button type="button" class="compare-action-btn" id="compareCopyBtn">Copy Report</button>' +
            '<button type="button" class="compare-action-btn" id="compareDownloadBtn">Download Report</button>' +
            '</div>';
    html += '</div>';

    if (result.messagesA > 1 || result.messagesB > 1) {
      html += '<div class="compare-note">Multiple messages detected (' +
              result.messagesA + ' in A, ' + result.messagesB +
              ' in B). Comparing the first message from each side.</div>';
    }

    // Findings
    const ranked = result.findings.filter(function(f) { return f.severity !== 'info'; });
    html += '<div class="compare-findings">';
    html += '<h3 class="compare-section-title">Findings</h3>';
    if (ranked.length === 0) {
      html += '<p class="compare-findings-empty">No meaningful differences found. ' +
              'Every difference between these messages falls under the expected-variance rules.</p>';
    } else {
      html += '<ol class="compare-findings-list">';
      ranked.forEach(function(f) {
        html += '<li class="compare-finding sev-' + f.severity + '">' +
                '<span class="compare-sev-badge sev-' + f.severity + '">' + f.severity + '</span>' +
                '<span class="compare-kind-badge">' + escapeHtml(KIND_LABELS[f.kind] || f.kind) + '</span>' +
                '<span class="compare-finding-text">' + escapeHtml(f.text) + '</span>' +
                (f.note ? '<span class="compare-finding-note">' + escapeHtml(f.note) + '</span>' : '') +
                '</li>';
      });
      html += '</ol>';
    }
    html += '</div>';

    // Field detail
    html += '<h3 class="compare-section-title">Field Detail</h3>';
    html += '<div class="compare-groups">';

    let renderedGroups = 0;
    result.groups.forEach(function(group) {
      const visibleRows = group.rows.filter(function(r) {
        return showIdentical || r.severity !== 'none';
      });
      const diffCount = group.rows.filter(function(r) { return r.severity !== 'none'; }).length;
      if (visibleRows.length === 0) return;
      renderedGroups++;

      let sideBadge = '';
      if (!group.presentA) sideBadge = '<span class="compare-side-badge b-only">Message B only</span>';
      else if (!group.presentB) sideBadge = '<span class="compare-side-badge a-only">Message A only</span>';

      html += '<section class="compare-group">';
      html += '<div class="compare-group-header">' +
              '<span class="compare-group-id">' + escapeHtml(group.segmentId) + '[' + group.occurrence + ']</span>' +
              '<span class="compare-group-name">' + escapeHtml(group.label) + '</span>' +
              sideBadge +
              '<span class="compare-group-count">' + diffCount + ' difference' + (diffCount === 1 ? '' : 's') + '</span>' +
              '</div>';

      html += '<table class="compare-table"><thead><tr>' +
              '<th class="col-addr">Field</th>' +
              '<th class="col-val">Message A</th>' +
              '<th class="col-val">Message B</th>' +
              '<th class="col-verdict">Difference</th>' +
              '</tr></thead><tbody>';

      const normalRows = visibleRows.filter(function(r) { return r.severity !== 'info'; });
      const infoRows = visibleRows.filter(function(r) { return r.severity === 'info'; });

      normalRows.forEach(function(row) { html += rowHtml(row); });

      html += '</tbody></table>';

      if (infoRows.length > 0) {
        html += '<details class="compare-expected">';
        html += '<summary>Expected variance (' + infoRows.length + ')</summary>';
        html += '<table class="compare-table compare-table-info"><tbody>';
        infoRows.forEach(function(row) { html += rowHtml(row); });
        html += '</tbody></table>';
        html += '</details>';
      }

      html += '</section>';
    });

    if (renderedGroups === 0) {
      html += '<p class="compare-findings-empty">No field-level differences to show.</p>';
    }

    html += '</div>';

    container.innerHTML = html;
    container._compareResult = result;
  }

  function rowHtml(row) {
    const hl = (row.kind === 'presence' || row.kind === 'identical')
      ? { a: escapeHtml(row.valueA), b: escapeHtml(row.valueB) }
      : highlightPair(row.valueA, row.valueB);

    const sevClass = row.severity === 'none' ? 'identical' : row.severity;

    // Only a plain value difference can be demoted by a rule. Presence, type,
    // and malformed-data differences are reported regardless of the rules, and
    // critical routing fields are never demoted - so offering the button there
    // would promise something it cannot deliver.
    const ruleCanApply = row.kind === 'value' && !row.critical;

    return '<tr class="compare-row sev-' + sevClass + ' kind-' + row.kind + '" data-address="' +
           escapeHtml(ruleAddress(row.displayAddress)) + '">' +
           '<td class="col-addr">' +
             '<span class="compare-addr">' + escapeHtml(row.displayAddress) + '</span>' +
             (row.label ? '<span class="compare-addr-label">' + escapeHtml(row.label) + '</span>' : '') +
           '</td>' +
           '<td class="col-val side-a">' + valueCell(row.valueA, hl.a) + '</td>' +
           '<td class="col-val side-b">' + valueCell(row.valueB, hl.b) + '</td>' +
           '<td class="col-verdict">' +
             (row.severity === 'none'
               ? '<span class="compare-kind-badge">Identical</span>'
               : '<span class="compare-kind-badge kind-' + row.kind + '">' +
                 escapeHtml(KIND_LABELS[row.kind] || row.kind) + '</span>' +
                 (row.detail ? '<span class="compare-verdict-detail">' + escapeHtml(row.detail) + '</span>' : '') +
                 (row.note ? '<span class="compare-verdict-note">' + escapeHtml(row.note) + '</span>' : '') +
                 (ruleCanApply
                   ? '<button type="button" class="compare-ignore-btn" ' +
                     'title="Treat this field as expected-to-vary">Expect variance</button>'
                   : '')) +
           '</td>' +
           '</tr>';
  }

  function summaryChip(kind, count, label) {
    return '<div class="compare-chip chip-' + kind + '">' +
           '<span class="compare-chip-count">' + count + '</span>' +
           '<span class="compare-chip-label">' + label + '</span>' +
           '</div>';
  }

  // Public API
  return {
    compare: compare,
    render: render,
    buildReport: buildReport,
    parseMessages: parseMessages,
    signature: signature,
    loadVolatileRules: loadVolatileRules,
    saveVolatileRules: saveVolatileRules,
    resetVolatileRules: resetVolatileRules,
    ruleAddress: ruleAddress,
    DEFAULT_VOLATILE_RULES: DEFAULT_VOLATILE_RULES
  };

})();
