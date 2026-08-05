"""
Lightweight JS validator: convert the file to Python-parseable form via
regex and eval the compact object to make sure the structure is well-formed.
"""
import re

with open(r'c:/Users/zachr/Dev/HL7Viewer/public/js/hl7-fields.js', encoding='utf-8') as f:
    src = f.read()

def extract_block(name):
    m = re.search(r'const\s+' + name + r'\s*=\s*({[\s\S]*?});\s*\n', src)
    assert m, name + ' not found'
    return m.group(1)

dt_block = extract_block('HL7_DATATYPES')
seg_block = extract_block('HL7_SEGMENTS_COMPACT')

# Convert JS object with unquoted keys like "HD:" and "SEG:" to Python dict.
# Only unquoted keys before `:` at start of a line need conversion for datatypes.
def js_to_py(text):
    # Replace unquoted top-level keys: matches `  ABC: [` at start of value
    def sub(m):
        return m.group(1) + '"' + m.group(2) + '": '
    return re.sub(r'(\s)([A-Za-z_][A-Za-z0-9_]*):\s', sub, text)

dt_py = js_to_py(dt_block)
seg_py = js_to_py(seg_block)

# Python has no trailing-comma issue for arrays/dicts if we're careful, and
# there shouldn't be any. Try to eval.
dt = eval(dt_py, {'__builtins__': {}}, {})
segs = eval(seg_py, {'__builtins__': {}}, {})

print('Datatypes:', len(dt))
print('Segments:', len(segs))

# Spot-check
for code in ['MSH', 'PID', 'OBR', 'IN3', 'MFE', 'MFI', 'RXO', 'STF']:
    if code in segs:
        name, fields = segs[code]
        non_zero = sum(1 for f in fields if f != 0)
        print(f'{code}: {name!r} fields={len(fields)} (non-hole={non_zero})')
    else:
        print(f'{code}: MISSING')

# Verify each field reference points at a valid datatype
missing_dt = set()
for code, (name, fields) in segs.items():
    for i, f in enumerate(fields):
        if isinstance(f, list) and isinstance(f[1], str) and f[1] not in dt:
            missing_dt.add((code, i+1, f[1]))
if missing_dt:
    print('MISSING DATATYPES:', list(missing_dt)[:20])
else:
    print('All datatype references resolve.')

# Verify no empty strings for datatype component names
empty_names = 0
for k, comps in dt.items():
    for c in comps:
        if not c:
            empty_names += 1
if empty_names:
    print('WARN: empty datatype component names:', empty_names)

# Verify no empty field names
empty_fields = 0
for code, (name, fields) in segs.items():
    for f in fields:
        if isinstance(f, str) and not f:
            empty_fields += 1
        elif isinstance(f, list) and not f[0]:
            empty_fields += 1
print('Empty field names:', empty_fields)
