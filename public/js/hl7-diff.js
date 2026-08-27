// HL7 Viewer - Message Comparison Module
// Structural diff between two HL7 messages. Everything runs in the browser;
// no content ever leaves the page.
//
// This compares the SHAPE of two messages, never their values. Two fields
// holding "M" and "F" are both all-caps alphabetic of length 1, so they are
// not a difference. What counts as a difference is a field present in one
// message and not the other, a value that changes type (numeric vs
// alphanumeric), a change in letter-case pattern or numeric padding, a
// date/time precision change, malformed data, and anything structural at the
// segment level.

const HL7Diff = (function() {
  'use strict';

  // A plain value difference is normally ignored. These two fields are the
  // exception: a different message type or HL7 version means the two messages
  // are not structurally the same kind of message at all.
  const STRUCTURAL_IDENTITY_FIELDS = {
    'MSH.9': 'Message type / trigger event differs. These are structurally different messages, handled by different processing rules.',
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

  // Names that mean a field carries a date or time.
  const DATE_NAME_PATTERN = /\b(date|time|datetime|dob)\b/i;

  /**
   * How a field's date handling is decided:
   *   'declared' - the HL7 spec names this field as a date or time.
   *   'assumed'  - the spec describes no such segment (a custom Z-segment), so
   *                there is no name to consult and a timestamp-shaped digit
   *                run is taken as a date. Reported as a possible date, since
   *                the reading rests on the digit count alone.
   *   null       - a spec-defined field that is not a date; digit runs here
   *                stay numeric, so account numbers and record IDs are never
   *                mistaken for dates.
   */
  function timestampMode(segmentId, fieldNum, compNum) {
    const segInfo = (typeof HL7_SEGMENTS !== 'undefined') ? HL7_SEGMENTS[segmentId] : null;
    if (!segInfo || !segInfo.fields) return 'assumed';
    const fieldDef = segInfo.fields[fieldNum];
    if (!fieldDef) return null;
    if (compNum && fieldDef.components && fieldDef.components[compNum] &&
        DATE_NAME_PATTERN.test(fieldDef.components[compNum])) {
      return 'declared';
    }
    return DATE_NAME_PATTERN.test(fieldDef.name || '') ? 'declared' : null;
  }

  function isTimestampField(segmentId, fieldNum, compNum) {
    return timestampMode(segmentId, fieldNum, compNum) !== null;
  }

  /** Strip occurrence and repetition indices: "PID.3[2].1" -> "PID.3.1". */
  function ruleAddress(addr) {
    return addr.replace(/\[\d+\]/g, '');
  }

  function identityNote(addr) {
    const base = ruleAddress(addr);
    if (STRUCTURAL_IDENTITY_FIELDS[base]) return STRUCTURAL_IDENTITY_FIELDS[base];
    const parts = base.split('.');
    if (parts.length > 2) {
      const fieldOnly = parts[0] + '.' + parts[1];
      if (STRUCTURAL_IDENTITY_FIELDS[fieldOnly]) return STRUCTURAL_IDENTITY_FIELDS[fieldOnly];
    }
    return null;
  }

  // ========================================
  // VALUE SIGNATURES
  // ========================================

  /**
   * Letter-case pattern, so "M" and "F" match but "SMITH" and "Smith" do not.
   * Values with no letters have no case pattern.
   */
  function caseClass(v) {
    if (!/[A-Za-z]/.test(v)) return 'none';
    const upper = v === v.toUpperCase();
    const lower = v === v.toLowerCase();
    if (upper) return 'upper';
    if (lower) return 'lower';
    return 'mixed';
  }

  const CASE_LABELS = {
    upper: 'all upper case',
    lower: 'all lower case',
    mixed: 'mixed case',
    none: 'no letters'
  };

  /**
   * Classify a value's shape.
   *   cls  - broad class used for high-severity type mismatches
   *   type - narrow type used for lower-severity format/precision notes
   */
  function signature(value, tsMode) {
    const v = value;
    if (!v) return { cls: 'empty', type: 'empty', length: 0, caseClass: 'none', label: 'empty' };

    const len = v.length;
    const cc = caseClass(v);

    // HL7 timestamp forms: YYYYMMDD[HHMM[SS[.S+]]][+/-ZZZZ]
    // Matched by structure, not by calendar validity - whether the digits form
    // a real date is not this tool's business. Only attempted for fields the
    // spec declares as date/time, so numeric identifiers stay numeric.
    const tsMatch = tsMode
      ? v.match(/^(\d{8})(\d{2}(?:\d{2}(?:\d{2})?)?)?(\.\d{1,4})?([+-]\d{4})?$/)
      : null;
    if (tsMatch) {
      const assumed = tsMode === 'assumed';
      if (tsMatch[2] || tsMatch[3] || tsMatch[4]) {
        const precision = 8 + (tsMatch[2] ? tsMatch[2].length : 0);
        return { cls: 'numeric', type: 'datetime', length: len, precision: precision,
                 caseClass: cc, label: 'date/time', assumed: assumed };
      }
      return { cls: 'numeric', type: 'date', length: len, precision: 8,
               caseClass: cc, label: 'date', assumed: assumed };
    }

    if (/^-?\d+$/.test(v)) return { cls: 'numeric', type: 'numeric', length: len, caseClass: cc, label: 'numeric' };
    if (/^-?\d*\.\d+$/.test(v)) return { cls: 'numeric', type: 'decimal', length: len, caseClass: cc, label: 'decimal' };
    if (/^[A-Za-z]+$/.test(v)) return { cls: 'alpha', type: 'alpha', length: len, caseClass: cc, label: 'alphabetic' };
    if (/^[A-Za-z0-9]+$/.test(v)) return { cls: 'alphanumeric', type: 'alphanumeric', length: len, caseClass: cc, label: 'alphanumeric' };
    if (/^[A-Za-z0-9 .,'\-\/()]+$/.test(v)) return { cls: 'text', type: 'text', length: len, caseClass: cc, label: 'text' };
    return { cls: 'text', type: 'symbolic', length: len, caseClass: cc, label: 'text with symbols' };
  }

  function isTimestampSig(sig) {
    return !!sig && (sig.type === 'date' || sig.type === 'datetime');
  }

  function describeSignature(sig) {
    if (sig.cls === 'empty') return 'empty';
    const label = (sig.assumed && isTimestampSig(sig)) ? 'possible ' + sig.label : sig.label;
    return label + '(' + sig.length + ')';
  }

  /** Caveat appended when a date reading rests on the digit count alone. */
  function assumedDateNote(sigA, sigB) {
    const assumed = (sigA && sigA.assumed && isTimestampSig(sigA)) ||
                    (sigB && sigB.assumed && isTimestampSig(sigB));
    if (!assumed) return '';
    return ' This field is not described by the HL7 spec, so the date reading is ' +
           'assumed from the number of digits and may not be a date at all.';
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
        if (rest.indexOf(esc) === -1) {
          issues.push('contains an unterminated escape sequence');
        }
      }
    }
    return issues;
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
  // SEGMENT SHAPE PROFILES
  // ========================================
  //
  // A surplus repetition (message B has four DG1s, A has two) has no
  // counterpart to compare against field by field. It can still be checked
  // against the shape the OTHER message's segments of that type establish:
  // every DG1 in A tells us what a DG1 is supposed to look like.

  /** Stable key for a leaf inside a segment, independent of how deep the data goes. */
  function leafKey(fieldNum, compNum, subNum) {
    return fieldNum + '.' + (compNum || 1) + '.' + (subNum || 1);
  }

  /**
   * Walk every leaf of a segment at a fixed field/component/subcomponent
   * depth so the same address means the same thing across segments.
   */
  function walkSegmentLeaves(msg, segment, cb) {
    const maxF = maxFieldNumber(segment);
    for (let f = 1; f <= maxF; f++) {
      const raw = getRawField(msg, segment, f);
      // Repetitions are data volume, not shape - profile the first only.
      const rep = (raw ? raw.split(msg.repetitionSeparator)[0] : '') || '';
      const comps = rep.split(msg.componentSeparator);
      for (let c = 0; c < comps.length; c++) {
        const subs = (comps[c] || '').split(msg.subcomponentSeparator);
        for (let s = 0; s < subs.length; s++) {
          cb(leafKey(f, c + 1, s + 1), (subs[s] || '').trim(), f, c + 1, s + 1);
        }
      }
    }
  }

  /**
   * Summarize how a set of same-type segments populate and shape each leaf.
   */
  function buildSegmentProfile(msg, segments) {
    const profile = { total: segments.length, leaves: {} };
    segments.forEach(function(seg) {
      walkSegmentLeaves(msg, seg, function(key, value, f, c) {
        if (!profile.leaves[key]) profile.leaves[key] = { populated: 0, classes: {}, values: [] };
        const leaf = profile.leaves[key];
        if (value) {
          leaf.populated++;
          leaf.classes[signature(value, timestampMode(seg.segmentId, f, c)).cls] = true;
          // Keep the distinct values so the results can show what a finding
          // was actually measured against.
          if (leaf.values.indexOf(value) === -1 && leaf.values.length < 12) {
            leaf.values.push(value);
          }
        }
      });
    });
    return profile;
  }

  function classListOf(entry) {
    return Object.keys(entry.classes).join(' or ');
  }

  /** The sibling values behind a profile finding, for display. */
  function referenceValues(entry) {
    if (!entry || entry.values.length === 0) return '';
    const vals = entry.values;
    if (vals.length <= 3) return vals.join('  |  ');
    return vals.slice(0, 3).join('  |  ') + '  |  +' + (vals.length - 3) + ' more';
  }

  /**
   * Compare a segment that has no counterpart against the profile its
   * same-type siblings establish in the other message.
   */
  function compareSegmentToProfile(ctx, segment, profile, pair, ownSide, otherSide, rows) {
    const msg = ownSide === 'A' ? ctx.msgA : ctx.msgB;
    const segId = pair.segmentId;
    const plural = profile.total === 1 ? '' : 's';
    const others = profile.total + ' ' + segId + ' segment' + plural + ' in Message ' + otherSide;

    walkSegmentLeaves(msg, segment, function(key, value, f, c, s) {
      const addr = segId + '[' + pair.occurrence + '].' + f +
                   (c > 1 || s > 1 ? '.' + c : '') + (s > 1 ? '.' + s : '');
      const entry = profile.leaves[key];
      // There is no direct counterpart, so the opposite column shows the
      // sibling values this leaf was actually measured against.
      const ref = referenceValues(entry);
      const valA = ownSide === 'A' ? value : ref;
      const valB = ownSide === 'A' ? ref : value;
      const verdicts = [];

      // Malformed data is judged from the value alone, and stacks with
      // whatever the profile comparison finds.
      const issues = valueIssues(value, msg);
      if (issues.length) {
        verdicts.push({
          kind: 'malformed',
          severity: 'high',
          detail: 'Message ' + ownSide + ' ' + issues.join('; ') + '.'
        });
      }

      if (!value) {
        // Empty here, but every sibling in the other message populates it.
        if (entry && entry.populated === profile.total && profile.total > 0) {
          verdicts.push({
            kind: 'profile-missing',
            severity: 'medium',
            detail: 'Empty here, but populated in all ' + others + '.'
          });
        }
      } else if (!entry || entry.populated === 0) {
        // Populated here, but never populated in any sibling.
        verdicts.push({
          kind: 'profile-extra',
          severity: 'medium',
          detail: 'Populated here, but empty in all ' + others + '.'
        });
      } else {
        const sig = signature(value, timestampMode(segId, f, c));
        const cls = sig.cls;
        if (!entry.classes[cls]) {
          verdicts.push({
            kind: 'shape',
            severity: 'high',
            detail: 'This value is ' + describeSignature(sig) +
                    ', but the ' + others + (profile.total === 1 ? ' uses ' : ' use ') +
                    classListOf(entry) + ' here.' + assumedDateNote(sig, null)
          });
        } else if (verdicts.length === 0) {
          verdicts.push({
            kind: 'unmatched',
            severity: 'none',
            detail: 'Consistent with the ' + others + '.'
          });
        }
      }

      if (verdicts.length === 0) return;
      verdicts.forEach(function(v) {
        v.profiled = true;
        v.refSide = otherSide;
      });
      addRow(rows, addr, segId, pair.occurrence, f, c > 1 || s > 1 ? c : null, s > 1 ? s : null,
             valA, valB, verdicts);
    });
  }

  // ========================================
  // COMPARISON
  // ========================================

  const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

  function worstSeverity(verdicts) {
    let worst = 'none';
    verdicts.forEach(function(v) {
      if (SEVERITY_ORDER[v.severity] < SEVERITY_ORDER[worst]) worst = v.severity;
    });
    return worst;
  }

  /**
   * Compare two leaf values and produce every verdict that applies.
   * A field can be wrong in more than one way at once - a value can carry
   * malformed data AND change type - so checks accumulate rather than
   * stopping at the first match. Only the shape-family checks stay mutually
   * exclusive, since once the broad type differs the finer comparisons
   * (precision, case, padding) just describe the same difference again.
   */
  function classifyLeaf(addr, rawA, rawB, ctx, segmentId, fieldNum, compNum) {
    const tsMode = timestampMode(segmentId, fieldNum, compNum);
    const a = rawA == null ? '' : rawA;
    const b = rawB == null ? '' : rawB;
    const verdicts = [];

    // Data quality, judged per side so problems in both are both reported.
    const issuesA = valueIssues(a, ctx.msgA);
    const issuesB = valueIssues(b, ctx.msgB);
    const onlyA = issuesA.filter(function(i) { return issuesB.indexOf(i) === -1; });
    const onlyB = issuesB.filter(function(i) { return issuesA.indexOf(i) === -1; });

    if (onlyA.length) {
      verdicts.push({
        kind: 'malformed', severity: 'high', side: 'A',
        detail: 'Message A ' + onlyA.join('; ') + '.'
      });
    }
    if (onlyB.length) {
      verdicts.push({
        kind: 'malformed', severity: 'high', side: 'B',
        detail: 'Message B ' + onlyB.join('; ') + '.'
      });
    }

    const aT = a.trim();
    const bT = b.trim();

    if (a === b || (!aT && !bT)) {
      if (verdicts.length === 0) verdicts.push({ kind: 'identical', severity: 'none' });
      return verdicts;
    }

    if (!aT || !bT) {
      const side = aT ? 'A' : 'B';
      verdicts.push({
        kind: 'presence', severity: 'high', side: side,
        detail: 'Populated in Message ' + side + ' only.'
      });
      return verdicts;
    }

    if (aT === bT) {
      // Only reachable when the whitespace difference was not already
      // reported as a data-quality issue above.
      if (verdicts.length === 0) {
        verdicts.push({
          kind: 'whitespace', severity: 'low',
          detail: 'Values match except for surrounding whitespace.'
        });
      }
      return verdicts;
    }

    const sigA = signature(aT, tsMode);
    const sigB = signature(bT, tsMode);

    if (sigA.cls !== sigB.cls) {
      verdicts.push({
        kind: 'shape', severity: 'high', sigA: sigA, sigB: sigB,
        detail: 'Message A is ' + describeSignature(sigA) + ', Message B is ' +
                describeSignature(sigB) + '.' + assumedDateNote(sigA, sigB)
      });
      return verdicts;
    }

    const aIsTimestamp = sigA.type === 'date' || sigA.type === 'datetime';
    const bIsTimestamp = sigB.type === 'date' || sigB.type === 'datetime';

    if (aIsTimestamp && bIsTimestamp && sigA.precision !== sigB.precision) {
      verdicts.push({
        kind: 'precision', severity: 'medium', sigA: sigA, sigB: sigB,
        detail: 'Date/time precision differs: Message A carries ' + sigA.precision +
                ' digits (' + describeSignature(sigA) + '), Message B carries ' +
                sigB.precision + ' digits (' + describeSignature(sigB) + ').' +
                assumedDateNote(sigA, sigB)
      });
      return verdicts;
    }

    if (sigA.type !== sigB.type) {
      verdicts.push({
        kind: 'format', severity: 'low', sigA: sigA, sigB: sigB,
        detail: 'Same broad type but different format: ' + describeSignature(sigA) + ' vs ' +
                describeSignature(sigB) + '.' + assumedDateNote(sigA, sigB)
      });
      return verdicts;
    }

    if (aT.toUpperCase() === bT.toUpperCase()) {
      verdicts.push({ kind: 'case', severity: 'low', detail: 'Same text, different letter case.' });
      return verdicts;
    }

    if (sigA.caseClass !== sigB.caseClass) {
      verdicts.push({
        kind: 'case', severity: 'low',
        detail: 'Letter case pattern differs: Message A is ' + CASE_LABELS[sigA.caseClass] +
                ', Message B is ' + CASE_LABELS[sigB.caseClass] + '.'
      });
      return verdicts;
    }

    if (sigA.cls === 'numeric' && aT.replace(/^[+-]?0+/, '') === bT.replace(/^[+-]?0+/, '')) {
      verdicts.push({
        kind: 'format', severity: 'low',
        detail: 'Same number, different leading-zero padding.'
      });
      return verdicts;
    }

    const note = identityNote(addr);
    if (note) {
      verdicts.push({ kind: 'identity', severity: 'high', detail: 'Values differ.', note: note });
      return verdicts;
    }

    // Same shape, different value - deliberately not a difference.
    if (verdicts.length === 0) verdicts.push({ kind: 'sameshape', severity: 'none' });
    return verdicts;
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
        addRow(rows, fieldAddr, segmentId, occurrence, fieldNum, null, null, repA, repB,
               { kind: 'identical', severity: 'none' });
        continue;
      }

      const compSepA = ctx.msgA ? ctx.msgA.componentSeparator : '^';
      const compSepB = ctx.msgB ? ctx.msgB.componentSeparator : '^';
      const hasComps = repA.indexOf(compSepA) !== -1 || repB.indexOf(compSepB) !== -1;

      if (!hasComps) {
        addRow(rows, fieldAddr, segmentId, occurrence, fieldNum, null, null, repA, repB,
               classifyLeaf(fieldAddr, repA, repB, ctx, segmentId, fieldNum, null));
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
          addRow(rows, compAddr, segmentId, occurrence, fieldNum, compNum, null, cA, cB,
                 { kind: 'identical', severity: 'none' });
          continue;
        }

        const subSepA = ctx.msgA ? ctx.msgA.subcomponentSeparator : '&';
        const subSepB = ctx.msgB ? ctx.msgB.subcomponentSeparator : '&';
        const hasSubs = cA.indexOf(subSepA) !== -1 || cB.indexOf(subSepB) !== -1;

        if (!hasSubs) {
          addRow(rows, compAddr, segmentId, occurrence, fieldNum, compNum, null, cA, cB,
                 classifyLeaf(compAddr, cA, cB, ctx, segmentId, fieldNum, compNum));
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
          addRow(rows, subAddr, segmentId, occurrence, fieldNum, compNum, subNum, sA, sB,
                 classifyLeaf(subAddr, sA, sB, ctx, segmentId, fieldNum, compNum));
        }
      }
    }
  }

  function addRow(rows, addr, segmentId, occurrence, fieldNum, compNum, subNum, valueA, valueB, verdicts) {
    const list = Array.isArray(verdicts) ? verdicts : [verdicts];
    if (list.length === 0) return;

    const severity = worstSeverity(list);

    // Suppress rows that are empty on both sides - they are just padding
    // created by unequal field counts.
    if (severity === 'none' && !String(valueA).trim() && !String(valueB).trim()) {
      return;
    }

    // The most severe verdict drives the row's styling and grouping.
    const primary = list.reduce(function(best, v) {
      return SEVERITY_ORDER[v.severity] < SEVERITY_ORDER[best.severity] ? v : best;
    }, list[0]);
    const withRef = list.filter(function(v) { return v.refSide; })[0];

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
      verdicts: list,
      kind: primary.kind,
      severity: severity,
      side: primary.side || null,
      detail: primary.detail || '',
      note: primary.note || null,
      profiled: list.some(function(v) { return v.profiled; }),
      refSide: withRef ? withRef.refSide : null
    });
  }

  /**
   * Run the full comparison. Returns a result object; does no DOM work.
   */
  function compare(contentA, contentB) {
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
    const ctx = { msgA: msgA, msgB: msgB };

    const pairs = alignSegments(msgA, msgB);
    const groups = [];
    const structure = [];

    // Message-level: delimiters.
    if (msgA.componentSeparator !== msgB.componentSeparator ||
        msgA.fieldSeparator !== msgB.fieldSeparator ||
        msgA.subcomponentSeparator !== msgB.subcomponentSeparator ||
        msgA.repetitionSeparator !== msgB.repetitionSeparator) {
      structure.push({
        severity: 'high',
        kind: 'delimiters',
        text: 'The two messages use different delimiters (A: "' + msgA.fieldSeparator + msgA.componentSeparator +
              msgA.repetitionSeparator + msgA.escapeCharacter + msgA.subcomponentSeparator + '", B: "' +
              msgB.fieldSeparator + msgB.componentSeparator + msgB.repetitionSeparator +
              msgB.escapeCharacter + msgB.subcomponentSeparator + '").'
      });
    }

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
        structure.push({
          severity: 'high',
          kind: 'segment-presence',
          text: segId + ' (' + segmentLabel(segId) + ') is present in Message ' + side + ' only' +
                ((ca || cb) > 1 ? ' (' + (ca || cb) + ' occurrences)' : '') + '.'
        });
      } else {
        structure.push({
          severity: 'medium',
          kind: 'segment-count',
          text: segId + ' occurs ' + ca + ' time' + (ca === 1 ? '' : 's') + ' in Message A but ' +
                cb + ' time' + (cb === 1 ? '' : 's') + ' in Message B.'
        });
      }
    });

    // Same-type segments in each message, used to profile surplus repetitions.
    const byIdA = groupById(msgA);
    const byIdB = groupById(msgB);
    const profileCache = {};

    function profileFor(side, segmentId) {
      const cacheKey = side + ':' + segmentId;
      if (!(cacheKey in profileCache)) {
        const msg = side === 'A' ? msgA : msgB;
        const segs = (side === 'A' ? byIdA : byIdB)[segmentId] || [];
        profileCache[cacheKey] = segs.length ? buildSegmentProfile(msg, segs) : null;
      }
      return profileCache[cacheKey];
    }

    // Field-level comparison, segment pair by segment pair.
    pairs.forEach(function(pair) {
      const rows = [];
      const segA = pair.a;
      const segB = pair.b;

      // A surplus repetition of a segment type the other message also carries:
      // compare it against the shape those siblings establish rather than
      // against an absent counterpart.
      if (!segA !== !segB) {
        const ownSide = segA ? 'A' : 'B';
        const otherSide = segA ? 'B' : 'A';
        const profile = profileFor(otherSide, pair.segmentId);
        if (profile && profile.total > 0) {
          compareSegmentToProfile(ctx, segA || segB, profile, pair, ownSide, otherSide, rows);
          groups.push({
            segmentId: pair.segmentId,
            occurrence: pair.occurrence,
            label: segmentLabel(pair.segmentId),
            presentA: !!segA,
            presentB: !!segB,
            unmatched: true,
            profiled: true,
            profileTotal: profile.total,
            otherSide: otherSide,
            rows: rows
          });
          return;
        }
      }

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
          return r.fieldNum > Math.min(maxA, maxB) &&
                 r.verdicts.some(function(v) { return v.kind === 'presence'; });
        });
        if (tailPopulated) {
          structure.push({
            severity: 'medium',
            kind: 'truncation',
            text: pair.segmentId + '[' + pair.occurrence + '] in Message ' + shorter + ' ends at field ' +
                  Math.min(maxA, maxB) + ' while Message ' + longer + ' carries data through field ' +
                  Math.max(maxA, maxB) + '.'
          });
        }
      }

      // A segment with no counterpart has nothing to compare against, so every
      // populated field in it would otherwise be reported as "present in one
      // only". That is just the segment itself restated once per field, and
      // the segment-level finding above already says it. Keep the rows so the
      // extra segment's contents can still be inspected under "Show Unflagged
      // Fields", but stop them counting as differences.
      // Malformed data is the exception: it is judged from the value alone,
      // needs no counterpart, and would sink a message on its own - so those
      // rows keep their severity.
      const unmatchedSegment = !segA || !segB;
      if (unmatchedSegment) {
        const missingSide = segA ? 'B' : 'A';
        rows.forEach(function(r) {
          if (r.kind === 'malformed') return;
          r.kind = 'unmatched';
          r.severity = 'none';
          r.side = null;
          r.detail = 'This segment has no counterpart in Message ' + missingSide + '.';
        });
      }

      groups.push({
        segmentId: pair.segmentId,
        occurrence: pair.occurrence,
        label: segmentLabel(pair.segmentId),
        presentA: !!segA,
        presentB: !!segB,
        unmatched: unmatchedSegment,
        rows: rows
      });
    });

    structure.sort(function(x, y) {
      return SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity];
    });

    const counts = { high: 0, medium: 0, low: 0, unflagged: 0 };
    structure.forEach(function(s) { counts[s.severity]++; });
    groups.forEach(function(g) {
      g.rows.forEach(function(r) {
        r.verdicts.forEach(function(v) {
          if (v.severity === 'none') counts.unflagged++;
          else counts[v.severity]++;
        });
      });
    });

    return {
      error: null,
      messagesA: messagesA.length,
      messagesB: messagesB.length,
      groups: groups,
      structure: structure,
      counts: counts
    };
  }

  function countSegments(msg) {
    const out = {};
    msg.segments.forEach(function(s) {
      out[s.segmentId] = (out[s.segmentId] || 0) + 1;
    });
    return out;
  }

  // ========================================
  // TEXT REPORT
  // ========================================

  function buildReport(result) {
    const lines = [];
    lines.push('HL7 Message Comparison');
    lines.push('======================');
    lines.push('');
    lines.push('Structural differences only - fields that differ in value but share');
    lines.push('the same shape are not reported.');
    lines.push('');
    lines.push(result.counts.high + ' high, ' + result.counts.medium + ' medium, ' +
               result.counts.low + ' low, ' + result.counts.unflagged + ' unflagged.');
    lines.push('');

    if (result.structure.length > 0) {
      lines.push('Message Structure');
      lines.push('-----------------');
      result.structure.forEach(function(s) {
        lines.push('  [' + s.severity.toUpperCase() + '] ' + s.text);
      });
      lines.push('');
    }

    lines.push('Findings');
    lines.push('--------');

    let any = false;
    result.groups.forEach(function(g) {
      const diffRows = g.rows.filter(function(r) { return r.severity !== 'none'; });
      if (diffRows.length === 0) return;
      any = true;
      lines.push('');
      lines.push(g.segmentId + '[' + g.occurrence + '] - ' + g.label +
                 (!g.presentA ? '  (Message B only)' : '') + (!g.presentB ? '  (Message A only)' : ''));
      diffRows.forEach(function(r) {
        lines.push('  ' + r.displayAddress + (r.label ? '  ' + r.label : ''));
        lines.push('    A: ' + (r.valueA || '(empty)'));
        lines.push('    B: ' + (r.valueB || '(empty)'));
        r.verdicts.forEach(function(v) {
          if (v.severity === 'none') return;
          lines.push('    [' + v.kind + '/' + v.severity + '] ' + (v.detail || ''));
          if (v.note) lines.push('      Note: ' + v.note);
        });
      });
    });

    if (!any && result.structure.length === 0) {
      lines.push('');
      lines.push('No structural differences found. The two messages have the same shape.');
    }

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
    identity: 'Message identity',
    format: 'Format',
    case: 'Letter case',
    whitespace: 'Whitespace',
    identical: 'Identical',
    sameshape: 'Same shape',
    unmatched: 'No counterpart',
    'profile-extra': 'Extra field',
    'profile-missing': 'Missing field',
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
    const showUnflagged = !!(viewOptions && viewOptions.showUnflagged);
    const collapsed = (viewOptions && viewOptions.collapsedGroups) || {};

    if (result.error) {
      container.innerHTML = '<div class="compare-error">' + escapeHtml(result.error) + '</div>';
      return;
    }

    let html = '';

    html += '<div class="compare-summary">';
    html += summaryChip('high', result.counts.high, 'High');
    html += summaryChip('medium', result.counts.medium, 'Medium');
    html += summaryChip('low', result.counts.low, 'Low');
    html += summaryChip('unflagged', result.counts.unflagged, 'Unflagged');
    html += '<div class="compare-summary-actions">' +
            '<button type="button" class="compare-action-btn" id="compareExpandAllBtn">Expand All</button>' +
            '<button type="button" class="compare-action-btn" id="compareCollapseAllBtn">Collapse All</button>' +
            '<button type="button" class="compare-action-btn" id="compareCopyBtn">Copy Report</button>' +
            '<button type="button" class="compare-action-btn" id="compareDownloadBtn">Download Report</button>' +
            '</div>';
    html += '</div>';

    if (result.messagesA > 1 || result.messagesB > 1) {
      html += '<div class="compare-note">Multiple messages detected (' +
              result.messagesA + ' in A, ' + result.messagesB +
              ' in B). Comparing the first message from each side.</div>';
    }

    html += '<h3 class="compare-section-title">Findings</h3>';

    if (result.structure.length > 0) {
      html += '<ul class="compare-structure">';
      result.structure.forEach(function(s) {
        html += '<li class="compare-structure-item sev-' + s.severity + '">' +
                '<span class="compare-sev-badge sev-' + s.severity + '">' + s.severity + '</span>' +
                '<span class="compare-kind-badge">' + escapeHtml(KIND_LABELS[s.kind] || s.kind) + '</span>' +
                '<span class="compare-structure-text">' + escapeHtml(s.text) + '</span>' +
                '</li>';
      });
      html += '</ul>';
    }

    html += '<div class="compare-groups">';

    let renderedGroups = 0;
    let flaggedTotal = 0;
    result.groups.forEach(function(group) {
      const visibleRows = group.rows.filter(function(r) {
        return showUnflagged || r.severity !== 'none';
      });
      const diffCount = group.rows.filter(function(r) { return r.severity !== 'none'; }).length;
      flaggedTotal += diffCount;
      if (visibleRows.length === 0) return;
      renderedGroups++;

      let sideBadge = '';
      if (!group.presentA) sideBadge = '<span class="compare-side-badge b-only">Message B only</span>';
      else if (!group.presentB) sideBadge = '<span class="compare-side-badge a-only">Message A only</span>';

      if (group.profiled) {
        sideBadge += '<span class="compare-group-note">checked against the ' + group.profileTotal + ' ' +
                     escapeHtml(group.segmentId) + ' segment' + (group.profileTotal === 1 ? '' : 's') +
                     ' in Message ' + group.otherSide + '</span>';
      }

      const groupKey = group.segmentId + '[' + group.occurrence + ']';
      const isCollapsed = collapsed[groupKey] === true;

      html += '<section class="compare-group' + (isCollapsed ? ' collapsed' : '') +
              '" data-group="' + escapeHtml(groupKey) + '">';
      html += '<div class="compare-group-header" role="button" tabindex="0" aria-expanded="' +
              (isCollapsed ? 'false' : 'true') + '">' +
              '<span class="compare-group-toggle">' + (isCollapsed ? '▶' : '▼') + '</span>' +
              '<span class="compare-group-id">' + escapeHtml(group.segmentId) + '[' + group.occurrence + ']</span>' +
              '<span class="compare-group-name">' + escapeHtml(group.label) + '</span>' +
              sideBadge +
              '<span class="compare-group-count">' +
              (group.unmatched && !group.profiled
                ? (diffCount > 0
                    ? diffCount + ' data issue' + (diffCount === 1 ? '' : 's')
                    : visibleRows.length + ' field' + (visibleRows.length === 1 ? '' : 's') + ', no counterpart to compare')
                : diffCount + ' difference' + (diffCount === 1 ? '' : 's')) +
              '</span>' +
              '</div>';

      html += '<div class="compare-group-body">';
      html += '<table class="compare-table"><thead><tr>' +
              '<th class="col-addr">Field</th>' +
              '<th class="col-val">Message A</th>' +
              '<th class="col-val">Message B</th>' +
              '<th class="col-verdict">Difference</th>' +
              '</tr></thead><tbody>';

      visibleRows.forEach(function(row) { html += rowHtml(row); });

      html += '</tbody></table>';
      html += '</div>';
      html += '</section>';
    });

    if (renderedGroups === 0) {
      if (flaggedTotal === 0 && result.structure.length === 0) {
        html += '<p class="compare-findings-empty">No structural differences found. ' +
                'The two messages have the same shape &mdash; only their values differ.</p>';
      } else {
        html += '<p class="compare-findings-empty">No field-level differences to show.</p>';
      }
    }

    html += '</div>';

    container.innerHTML = html;
    container._compareResult = result;
  }

  function rowHtml(row) {
    // Character-level highlighting only makes sense for a one-to-one
    // comparison. A profiled row's opposite column holds reference values from
    // sibling segments, not a counterpart, so leave it plain.
    const hl = (row.kind === 'presence' || row.kind === 'identical' || row.profiled)
      ? { a: escapeHtml(row.valueA), b: escapeHtml(row.valueB) }
      : highlightPair(row.valueA, row.valueB);

    const sevClass = row.severity === 'none' ? 'unflagged' : row.severity;

    const refTitle = ' title="Reference values taken from the other message&#39;s segments of this type"';
    const aRef = row.refSide === 'A';
    const bRef = row.refSide === 'B';

    return '<tr class="compare-row sev-' + sevClass + ' kind-' + row.kind + '">' +
           '<td class="col-addr">' +
             '<span class="compare-addr">' + escapeHtml(row.displayAddress) + '</span>' +
             (row.label ? '<span class="compare-addr-label">' + escapeHtml(row.label) + '</span>' : '') +
           '</td>' +
           '<td class="col-val side-a' + (aRef ? ' compare-ref' : '') + '"' + (aRef ? refTitle : '') + '>' +
             valueCell(row.valueA, hl.a) + '</td>' +
           '<td class="col-val side-b' + (bRef ? ' compare-ref' : '') + '"' + (bRef ? refTitle : '') + '>' +
             valueCell(row.valueB, hl.b) + '</td>' +
           '<td class="col-verdict">' +
             row.verdicts.map(function(v) {
               return '<div class="compare-verdict">' +
                 '<span class="compare-kind-badge kind-' + v.kind + '">' +
                 escapeHtml(KIND_LABELS[v.kind] || v.kind) + '</span>' +
                 (v.detail ? '<span class="compare-verdict-detail">' + escapeHtml(v.detail) + '</span>' : '') +
                 (v.note ? '<span class="compare-verdict-note">' + escapeHtml(v.note) + '</span>' : '') +
                 '</div>';
             }).join('') +
           '</td>' +
           '</tr>';
  }

  /** Expand or collapse one segment section. */
  function setGroupCollapsed(section, isCollapsed) {
    if (!section) return;
    section.classList.toggle('collapsed', isCollapsed);
    const toggle = section.querySelector('.compare-group-toggle');
    if (toggle) toggle.innerHTML = isCollapsed ? '▶' : '▼';
    const header = section.querySelector('.compare-group-header');
    if (header) header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  }

  /** Click handler for segment headers; safe to attach once to the container. */
  function handleGroupToggle(e) {
    const header = e.target.closest('.compare-group-header');
    if (!header) return false;
    const section = header.closest('.compare-group');
    if (!section) return false;
    setGroupCollapsed(section, !section.classList.contains('collapsed'));
    return true;
  }

  function setAllGroups(container, expand) {
    if (!container) return;
    container.querySelectorAll('.compare-group').forEach(function(section) {
      setGroupCollapsed(section, !expand);
    });
  }

  /** Snapshot which sections are collapsed, so a re-render can restore them. */
  function getCollapsedGroups(container) {
    const out = {};
    if (!container) return out;
    container.querySelectorAll('.compare-group.collapsed').forEach(function(section) {
      const key = section.getAttribute('data-group');
      if (key) out[key] = true;
    });
    return out;
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
    isTimestampField: isTimestampField,
    timestampMode: timestampMode,
    handleGroupToggle: handleGroupToggle,
    setAllGroups: setAllGroups,
    getCollapsedGroups: getCollapsedGroups
  };

})();
