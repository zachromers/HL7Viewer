"""
Generates HL7_DATATYPES and HL7_SEGMENTS_COMPACT for public/js/hl7-fields.js
from the hl7inspector.com v2.5.1 JSON profile.
"""
import json
import re
from collections import defaultdict, OrderedDict

SRC = r'c:/Users/zachr/AppData/Local/Temp/hl7-251.json'
OUT_JS = r'c:/Users/zachr/Dev/HL7Viewer/public/js/hl7-fields.js'

# Datatypes that are effectively primitive (single scalar value).
PRIMITIVE_DATATYPES = {
    'ST', 'ID', 'IS', 'NM', 'DT', 'TM', 'TX', 'FT', 'SI', 'GTS',
    'DTM', 'varies', 'DLN'  # DLN handled separately below if needed
}

# Ordered set of shared/common composite datatypes we want to hoist into HL7_DATATYPES.
# Names must match the JSON dataTypes.parent codes exactly.
SHARED_DATATYPES = [
    'HD', 'TS', 'CE', 'CWE', 'CX', 'XPN', 'FN', 'XCN', 'XTN', 'XAD',
    'PL', 'PLN', 'EI', 'EIP', 'CQ', 'CP', 'MO', 'XON', 'FC', 'JCC',
    'DLN', 'CNE', 'ELD', 'MSG', 'PT', 'VID', 'PPN', 'NA', 'NDL',
    'DIN', 'DR', 'SPS', 'SPD', 'MOP', 'PIP', 'RCD', 'RFR', 'RI',
    'RMC', 'RP', 'SAD', 'SCV', 'SN', 'UVC', 'CD', 'CCP', 'CCD',
    'AUI', 'CSU', 'DDI', 'DLD', 'DTN', 'ICD', 'LA1', 'LA2', 'OCD',
    'OSD', 'OSP', 'PCF', 'PLN', 'PRL', 'PTA', 'QIP', 'QSC', 'RCP',
    'SCV', 'SRT', 'TQ', 'UB1', 'UB2', 'VH', 'WVI', 'WVS',
]

# HL7 v2.3 does not include some newer segments. Optional filter set for
# limiting output to true v2.3 segments (currently unused — we keep the
# full v2.5.1 set for broader coverage).
V23_ONLY = None

def clean_desc(s):
    s = (s or '').strip()
    # Strip trailing "deprecated as of ..." notes.
    s = re.sub(r'\s+deprecated as of[^,]*$', '', s, flags=re.IGNORECASE)
    return s.strip()

def load():
    with open(SRC, encoding='utf-8') as f:
        return json.load(f)

def build_datatype_index(data):
    """Return {parent -> [component_name_by_idx_1based, ...]}."""
    by_parent = defaultdict(dict)
    for entry in data['dataTypes']:
        dt = entry['dt']
        parent = dt['parent']
        try:
            idx = int(dt['idx'])
        except (ValueError, TypeError):
            continue
        by_parent[parent][idx] = clean_desc(dt.get('desc', ''))
    result = {}
    for parent, comps in by_parent.items():
        if not comps:
            continue
        max_i = max(comps.keys())
        result[parent] = [comps.get(i, '') for i in range(1, max_i + 1)]
    return result

def build_field_index(data):
    """Return {seg -> [ (seq, name, datatype, table), ... ] sorted by seq}."""
    by_seg = defaultdict(list)
    for entry in data['fields']:
        it = entry['item']
        try:
            seq = int(it['seq'])
        except (ValueError, TypeError):
            continue
        by_seg[it['seg']].append({
            'seq': seq,
            'name': clean_desc(it.get('name', '')),
            'datatype': it.get('datatype', '') or '',
        })
    for k in by_seg:
        by_seg[k].sort(key=lambda x: x['seq'])
    return by_seg

def is_primitive(dt, dt_index):
    if dt in PRIMITIVE_DATATYPES:
        return True
    comps = dt_index.get(dt)
    if not comps:
        # Unknown datatype - treat as primitive
        return True
    if len(comps) <= 1:
        return True
    return False

def js_string(s):
    """Emit a JavaScript-safe double-quoted string."""
    s = s.replace('\\', '\\\\').replace('"', '\\"')
    return '"' + s + '"'

def js_array_of_strings(strs):
    return '[' + ', '.join(js_string(s) for s in strs) + ']'

def emit_field(field, dt_index, shared_set):
    name = field['name']
    dt = field['datatype']
    if is_primitive(dt, dt_index):
        return js_string(name)
    if dt in shared_set:
        return '[' + js_string(name) + ', ' + js_string(dt) + ']'
    # Inline components
    comps = dt_index.get(dt, [])
    return '[' + js_string(name) + ', ' + js_array_of_strings(comps) + ']'

def emit_segment(seg, seg_name, fields, dt_index, shared_set):
    # Sequence starts at 1; insert 0 for any gap
    parts = []
    expected = 1
    for f in fields:
        while f['seq'] > expected:
            parts.append('0')
            expected += 1
        parts.append(emit_field(f, dt_index, shared_set))
        expected += 1
    return js_string(seg) + ': [' + js_string(seg_name) + ', [' + ','.join(parts) + ']]'

def emit_datatypes(dt_index, shared_set):
    lines = []
    for name in shared_set:
        if name not in dt_index:
            continue
        comps = dt_index[name]
        lines.append('  ' + name + ': ' + js_array_of_strings(comps))
    return '{\n' + ',\n'.join(lines) + '\n}'

def main():
    data = load()
    dt_index = build_datatype_index(data)
    field_index = build_field_index(data)

    # Only keep shared datatypes that actually exist in dt_index
    shared_set = [dt for dt in SHARED_DATATYPES if dt in dt_index]
    # Also drop shared datatypes that are used by 0 or 1 fields (not worth sharing).
    usage = defaultdict(int)
    for seg, fields in field_index.items():
        for f in fields:
            usage[f['datatype']] += 1
    shared_set = [dt for dt in shared_set if usage[dt] >= 2]
    shared_set_lookup = set(shared_set)

    # Build ordered segment list from data['segments']
    segments = []
    for entry in data['segments']:
        s = entry['seg']
        code = s['seg']
        name = clean_desc(s.get('name', code))
        # Strip trailing " 1" that sometimes appears in inspector data
        name = re.sub(r'\s+\d+$', '', name)
        fields = field_index.get(code, [])
        if not fields:
            continue
        segments.append((code, name, fields))

    # Emit compact form
    seg_lines = []
    for code, name, fields in segments:
        seg_lines.append('  ' + emit_segment(code, name, fields, dt_index, shared_set_lookup))

    dt_block = emit_datatypes(dt_index, shared_set)
    seg_block = '{\n' + ',\n'.join(seg_lines) + '\n}'

    js = '''// HL7 Segment and Field Definitions - compact form.
//
// Generated from the hl7inspector.com HL7 v2.5.1 profile
// (https://www.hl7inspector.com/profiles/hl7-251.json), which is a
// backwards-compatible superset of HL7 v2.3.
//
// Storage layout (small on the wire, expanded once at load):
//   HL7_DATATYPES: shared component name lists (HD, XPN, TS, CX, ...).
//   HL7_SEGMENTS_COMPACT: { SEG: [name, [field1, field2, ...]] }
//     where each field is one of:
//       string                                - field name, no components
//       [name, "DATATYPE"]                    - components come from HL7_DATATYPES
//       [name, ["Comp1", "Comp2", ...]]       - inline components
//       0                                     - hole (field number skipped)
//
// The expanded HL7_SEGMENTS object keeps the shape the rest of the app uses,
// so hl7-parser.js sees the same API it always did.

const HL7_DATATYPES = ''' + dt_block + ''';

const HL7_SEGMENTS_COMPACT = ''' + seg_block + ''';

const HL7_SEGMENTS = (() => {
  const out = {};
  for (const segId in HL7_SEGMENTS_COMPACT) {
    const [segName, fieldsArr] = HL7_SEGMENTS_COMPACT[segId];
    const fields = {};
    for (let i = 0; i < fieldsArr.length; i++) {
      const f = fieldsArr[i];
      if (!f) continue;
      const fieldNum = i + 1;
      if (typeof f === 'string') {
        fields[fieldNum] = { name: f };
      } else {
        const [fieldName, compsRef] = f;
        const compsArr = typeof compsRef === 'string' ? HL7_DATATYPES[compsRef] : compsRef;
        const components = {};
        for (let j = 0; j < compsArr.length; j++) {
          if (compsArr[j] != null) components[j + 1] = compsArr[j];
        }
        fields[fieldNum] = { name: fieldName, components };
      }
    }
    out[segId] = { name: segName, fields };
  }
  return out;
})();

// List of known HL7 segment identifiers for detection
const HL7_SEGMENT_IDS = Object.keys(HL7_SEGMENTS);
'''

    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)

    print('Segments emitted:', len(segments))
    print('Shared datatypes:', len(shared_set))
    print('Wrote', OUT_JS)

if __name__ == '__main__':
    main()
