// HL7 Viewer - Line End Utility
// Tokenizes HL7 text while preserving the exact bytes of every line terminator,
// so terminators can be inspected, changed per segment or in bulk, and written
// back out byte-for-byte.
//
// Every other parser in this project starts with content.split(/\r\n|\n|\r/)
// followed by line.trim(), which throws away both which terminator matched and
// any surrounding whitespace. Neither is recoverable, so this file carries its
// own tokenizer rather than reusing one.

const HL7LineEnd = (function() {
  'use strict';

  // Terminators are moved around as short tokens so a raw '\r' never has to be
  // written into an HTML attribute or an <option value>.
  const ENDING_TOKENS = ['CR', 'LF', 'CRLF'];

  const TOKEN_TO_ENDING = {
    CR: '\r',
    LF: '\n',
    CRLF: '\r\n',
    NONE: ''
  };

  const ENDING_TO_TOKEN = {
    '\r': 'CR',
    '\n': 'LF',
    '\r\n': 'CRLF',
    '': 'NONE'
  };

  const NONE_LABEL = 'none — end of file';

  // ========================================
  // TOKENIZING
  // ========================================

  /**
   * Split text into lines, keeping each line's terminator bytes alongside it.
   *
   * Invariant, for every possible input:
   *   tokenizeLines(t).map(l => l.text + l.ending).join('') === t
   *
   * Two details carry that invariant. CRLF has to be the first alternative in
   * the pattern, or a '\r\n' matches '\r' alone and leaves a phantom empty line
   * behind the '\n'. And the trailing push is conditional: when the text already
   * ends in a terminator, pos lands exactly on text.length and no empty final
   * row is invented. String.split gets both of these wrong.
   *
   * @param {string} text
   * @returns {Array<{text: string, ending: string}>} ending is '\r\n', '\r', '\n', or ''
   */
  function tokenizeLines(text) {
    const out = [];
    if (!text) return out;

    const RE = /\r\n|\r|\n/g;
    let pos = 0;
    let match;

    while ((match = RE.exec(text)) !== null) {
      out.push({ text: text.slice(pos, match.index), ending: match[0] });
      pos = match.index + match[0].length;
    }

    if (pos < text.length) {
      out.push({ text: text.slice(pos), ending: '' });
    }

    return out;
  }

  /**
   * Classify a line so messages can be split and junk can be labelled. Same
   * rule as the isSegmentLine copies in hl7-parser.js, stats.js and hl7-diff.js,
   * reshaped to return a kind. Classification runs on a trimmed copy so it
   * agrees with the rest of the app, but the caller keeps the untrimmed text.
   *
   * @param {string} text
   * @param {string} fieldSep current field separator, re-read from each MSH
   * @returns {'msh'|'segment'|'blank'|'junk'}
   */
  function classifyLine(text, fieldSep) {
    const trimmed = text.trim();
    if (!trimmed) return 'blank';

    const id = trimmed.substring(0, 3);
    if (!/^[A-Z][A-Z0-9]{2}$/.test(id)) return 'junk';

    if (id === 'MSH') {
      // 'MSH' with nothing after it has no field separator to trust.
      return trimmed.length >= 4 ? 'msh' : 'junk';
    }

    if (trimmed.length === 3 || trimmed[3] === fieldSep) return 'segment';
    return 'junk';
  }

  // ========================================
  // MODEL
  // ========================================

  /**
   * Build the editable model. Every physical line becomes its own row with its
   * own terminator, blanks and unrecognized lines included -- that is the only
   * shape in which serialize() is a true inverse of tokenizeLines(). Folding a
   * blank line into its neighbour would bury a terminator that no dropdown
   * governs, so "convert everything to CR" would leave stray bytes behind.
   *
   * @param {string} text raw source text
   * @param {'file'|'paste'} sourceKind
   */
  function buildModel(text, sourceKind) {
    const lines = tokenizeLines(text);
    const messages = [];

    let fieldSep = '|';
    let current = null;
    let messageNumber = 0;
    let segmentCount = 0;

    function startBlock(hasMsh) {
      const block = {
        hasMsh: hasMsh,
        label: hasMsh ? 'Message ' + (++messageNumber) : 'Before first MSH',
        msgEnding: '',
        segmentCount: 0,
        rows: []
      };
      messages.push(block);
      return block;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const kind = classifyLine(line.text, fieldSep);

      if (kind === 'msh') {
        // Encoding characters are re-read from every MSH, matching hl7-diff.js.
        const trimmed = line.text.trim();
        fieldSep = trimmed[3];
        current = startBlock(true);
      } else if (!current) {
        // Anything ahead of the first MSH becomes a block of its own. It is
        // still fully editable, but it is not a message, so it never receives
        // an end-of-message terminator.
        current = startBlock(false);
      }

      if (kind === 'msh' || kind === 'segment') {
        current.segmentCount++;
        segmentCount++;
      }

      current.rows.push({
        text: line.text,
        ending: line.ending,
        kind: kind
      });
    }

    const model = {
      messages: messages,
      rowCount: lines.length,
      segmentCount: segmentCount,
      messageCount: messageNumber,
      source: sourceKind === 'file' ? 'file' : 'paste',
      analysis: null
    };

    // The final row of the final block is the only place an empty terminator is
    // legitimate. It offers a "none" choice only when the file arrived without a
    // trailing terminator, so that state can be restored after a bulk change;
    // allowNone is fixed at parse time and never follows later edits.
    const lastBlock = messages[messages.length - 1];
    if (lastBlock) {
      const lastRow = lastBlock.rows[lastBlock.rows.length - 1];
      lastRow.isLastInFile = true;
      lastRow.allowNone = lastRow.ending === '';
    }

    model.analysis = analyzeEndings(model);
    return model;
  }

  /**
   * Tally the terminators in use. The final row's empty terminator is excluded
   * from the mix -- a file with no trailing newline is ordinary, and counting it
   * would flag almost every file as mixed. It is reported as noTrailing instead.
   *
   * @returns {{counts: Object, mixed: boolean, majority: string|null, noTrailing: boolean, total: number}}
   */
  function analyzeEndings(model) {
    const counts = { CR: 0, LF: 0, CRLF: 0 };
    let noTrailing = false;
    let total = 0;

    for (let m = 0; m < model.messages.length; m++) {
      const rows = model.messages[m].rows;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row.ending === '') {
          if (row.isLastInFile) noTrailing = true;
          continue;
        }
        const token = ENDING_TO_TOKEN[row.ending];
        if (token) {
          counts[token]++;
          total++;
        }
      }
    }

    const used = ENDING_TOKENS.filter(function(token) { return counts[token] > 0; });
    let majority = null;
    for (let i = 0; i < used.length; i++) {
      if (majority === null || counts[used[i]] > counts[majority]) majority = used[i];
    }

    return {
      counts: counts,
      mixed: used.length > 1,
      majority: majority,
      noTrailing: noTrailing,
      total: total
    };
  }

  // ========================================
  // BULK EDITS
  // ========================================

  /**
   * Set the terminator on every row of every message, whether or not it has
   * been rendered. Pure data, no DOM -- the caller syncs the handful of <select>
   * elements that are actually mounted.
   *
   * A final row with no terminator is included: the user chose that a bulk
   * conversion should terminate it like everything else. The "none" option stays
   * on that row so the choice can be undone individually.
   *
   * @returns {number} rows changed
   */
  function applyAllRowEndings(model, token) {
    const ending = decodeEnding(token);
    let changed = 0;

    for (let m = 0; m < model.messages.length; m++) {
      const rows = model.messages[m].rows;
      for (let r = 0; r < rows.length; r++) {
        if (rows[r].ending !== ending) {
          rows[r].ending = ending;
          changed++;
        }
      }
    }

    model.analysis = analyzeEndings(model);
    return changed;
  }

  /**
   * Replace the terminator of the last segment of every message, rather than
   * appending a second one after it. Where applyAllMessageEndings turns
   * seg<CR> into seg<CR><CRLF> and adds a line, this turns it into seg<CRLF>
   * and leaves the line count alone.
   *
   * The target is the last row classified as a segment, so trailing blank or
   * unrecognized lines inside a block keep the terminators their own dropdowns
   * govern. Blocks without an MSH are skipped -- they are not messages.
   *
   * Any end-of-message terminator already appended to the same message is
   * cleared. Leaving it would put a second terminator behind the one just
   * written, which is the doubling this operation exists to avoid.
   *
   * @returns {{targets: Array<{message: number, row: number}>, changed: number, cleared: number}}
   *   targets lists every row written to, so the caller can sync just those
   *   mounted <select> elements instead of all of them.
   */
  function applyAllLastSegmentEndings(model, token) {
    const ending = decodeEnding(token);
    const targets = [];
    let changed = 0;
    let cleared = 0;

    for (let m = 0; m < model.messages.length; m++) {
      const block = model.messages[m];
      if (!block.hasMsh) continue;

      let last = -1;
      for (let r = block.rows.length - 1; r >= 0; r--) {
        const kind = block.rows[r].kind;
        if (kind === 'msh' || kind === 'segment') {
          last = r;
          break;
        }
      }
      if (last === -1) continue;

      if (block.msgEnding !== '') {
        block.msgEnding = '';
        cleared++;
      }

      targets.push({ message: m, row: last });
      if (block.rows[last].ending !== ending) {
        block.rows[last].ending = ending;
        changed++;
      }
    }

    model.analysis = analyzeEndings(model);
    return { targets: targets, changed: changed, cleared: cleared };
  }

  /**
   * Set the end-of-message terminator on every message. Blocks without an MSH
   * are skipped -- they are not messages.
   *
   * @returns {number} messages changed
   */
  function applyAllMessageEndings(model, token) {
    const ending = decodeEnding(token);
    let changed = 0;

    for (let m = 0; m < model.messages.length; m++) {
      const block = model.messages[m];
      if (!block.hasMsh) continue;
      if (block.msgEnding !== ending) {
        block.msgEnding = ending;
        changed++;
      }
    }

    return changed;
  }

  // ========================================
  // SERIALIZING
  // ========================================

  /**
   * Produce the exact output bytes.
   *
   * The end-of-message terminator is appended on top of the last segment's own
   * terminator, so a message serializes as seg1<e1>...segN<eN><msgEnd>, and it
   * is appended after every message including the last. Because msgEnding
   * defaults to '', an untouched model reproduces its input byte for byte.
   */
  function serialize(model) {
    const out = [];

    for (let m = 0; m < model.messages.length; m++) {
      const block = model.messages[m];
      const rows = block.rows;
      for (let r = 0; r < rows.length; r++) {
        out.push(rows[r].text, rows[r].ending);
      }
      if (block.hasMsh && block.msgEnding) out.push(block.msgEnding);
    }

    return out.join('');
  }

  // ========================================
  // TOKEN HELPERS
  // ========================================

  function encodeEnding(ending) {
    const token = ENDING_TO_TOKEN[ending];
    return token || 'NONE';
  }

  function decodeEnding(token) {
    const ending = TOKEN_TO_ENDING[token];
    return ending === undefined ? '' : ending;
  }

  /** Human-readable name for status lines and banners. */
  function endingLabel(ending) {
    const token = encodeEnding(ending);
    return token === 'NONE' ? NONE_LABEL : token;
  }

  // ========================================
  // RENDERING
  // ========================================

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function selectHtml(className, dataAttrs, selectedToken, extraOption) {
    const parts = ['<select class="', className, '"', dataAttrs, '>'];

    if (extraOption) {
      parts.push('<option value="NONE"', selectedToken === 'NONE' ? ' selected' : '', '>(',
                 NONE_LABEL, ')</option>');
    }

    for (let i = 0; i < ENDING_TOKENS.length; i++) {
      const token = ENDING_TOKENS[i];
      parts.push('<option value="', token, '"', token === selectedToken ? ' selected' : '',
                 '>', token, '</option>');
    }

    parts.push('</select>');
    return parts.join('');
  }

  function messageEndSelectHtml(block, messageIndex) {
    const selected = encodeEnding(block.msgEnding);
    const parts = ['<select class="lineend-msg-select" data-msg="', messageIndex, '">'];
    parts.push('<option value="NONE"', selected === 'NONE' ? ' selected' : '', '>None</option>');
    for (let i = 0; i < ENDING_TOKENS.length; i++) {
      const token = ENDING_TOKENS[i];
      parts.push('<option value="', token, '"', token === selected ? ' selected' : '',
                 '>', token, '</option>');
    }
    parts.push('</select>');
    return parts.join('');
  }

  function rowHtml(row, messageIndex, rowIndex, displayNumber) {
    const parts = [];
    const kindClass = row.kind === 'blank' ? ' is-blank'
                    : row.kind === 'junk' ? ' is-junk' : '';

    parts.push('<div class="lineend-row', kindClass, '" data-msg="', messageIndex,
               '" data-row="', rowIndex, '">');
    parts.push('<span class="lineend-row-num">', displayNumber, '</span>');
    parts.push('<span class="lineend-row-text">', escapeHtml(row.text), '</span>');

    if (row.kind === 'blank') {
      parts.push('<span class="lineend-row-badge">blank</span>');
    } else if (row.kind === 'junk') {
      parts.push('<span class="lineend-row-badge">unrecognized</span>');
    }

    parts.push(selectHtml(
      'lineend-row-select',
      ' data-msg="' + messageIndex + '" data-row="' + rowIndex + '"',
      encodeEnding(row.ending),
      row.allowNone === true
    ));
    parts.push('</div>');

    return parts.join('');
  }

  function messageHtml(block, messageIndex) {
    const parts = ['<div class="lineend-message" data-msg="', messageIndex, '">'];

    parts.push('<div class="lineend-message-header">');
    parts.push('<span class="lineend-message-title">', escapeHtml(block.label), '</span>');
    parts.push('<span class="lineend-message-meta">', block.segmentCount, ' segment',
               block.segmentCount === 1 ? '' : 's', '</span>');
    if (block.hasMsh) {
      parts.push('<label class="lineend-message-end">End of message: ',
                 messageEndSelectHtml(block, messageIndex), '</label>');
    } else {
      parts.push('<span class="lineend-message-note">not a message &mdash; no end-of-message terminator</span>');
    }
    parts.push('</div>');

    for (let r = 0; r < block.rows.length; r++) {
      parts.push(rowHtml(block.rows[r], messageIndex, r, r + 1));
    }

    parts.push('</div>');
    return parts.join('');
  }

  /**
   * Append a batch of message blocks to the container in one DOM write.
   *
   * @returns {number} index of the next unrendered block
   */
  function renderMessages(container, model, startIndex, count) {
    const end = Math.min(startIndex + count, model.messages.length);
    if (startIndex >= end) return startIndex;

    const html = [];
    for (let m = startIndex; m < end; m++) {
      html.push(messageHtml(model.messages[m], m));
    }
    container.insertAdjacentHTML('beforeend', html.join(''));

    return end;
  }

  // ========================================
  // PUBLIC API
  // ========================================

  return {
    tokenizeLines: tokenizeLines,
    buildModel: buildModel,
    serialize: serialize,
    analyzeEndings: analyzeEndings,
    applyAllRowEndings: applyAllRowEndings,
    applyAllMessageEndings: applyAllMessageEndings,
    applyAllLastSegmentEndings: applyAllLastSegmentEndings,
    renderMessages: renderMessages,
    encodeEnding: encodeEnding,
    decodeEnding: decodeEnding,
    endingLabel: endingLabel,
    ENDING_TOKENS: ENDING_TOKENS
  };
})();
