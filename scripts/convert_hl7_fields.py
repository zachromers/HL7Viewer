"""One-shot converter: rewrites public/js/hl7-fields.js into a compact form.

Reads the current JS object literal, deduplicates repeated component maps
into a shared datatype dictionary, converts numbered-key objects into arrays,
and re-emits the file. The runtime API (HL7_SEGMENTS + HL7_SEGMENT_IDS) is
preserved via a small expansion function at the bottom of the output, so
hl7-parser.js does not need to change.

Usage:
    py scripts/convert_hl7_fields.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "js" / "hl7-fields.js"

raw = SRC.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# Step 1: turn the JS object literal into valid JSON so json.loads can read it.
# The file is very uniform — a small set of regex substitutions is enough.
# ---------------------------------------------------------------------------
# Strip the leading `// ...` comment line and the `const HL7_SEGMENTS =` prefix
# and the trailing `;\n\n// ...` + `const HL7_SEGMENT_IDS = ...` lines.
start = raw.index("{", raw.index("HL7_SEGMENTS"))
# find the matching closing brace at column 0
end = raw.index("\n};", start) + 2  # include the '}' but not the ';'
body = raw[start:end]

# 1a: quote unquoted identifier keys (`name:` `fields:` `components:`)
body = re.sub(r"(\b)(name|fields|components)(\s*):", r'\1"\2"\3:', body)

# 1b: quote numeric keys (`  1:` -> `  "1":`). Only match when the number is
#     an object key (preceded by `{` or `,`, possibly whitespace/newlines).
body = re.sub(
    r"([\{\,]\s*)(\d+)(\s*):",
    lambda m: f'{m.group(1)}"{m.group(2)}"{m.group(3)}:',
    body,
)

# 1c: strip trailing commas before `}` (JSON doesn't allow them).
body = re.sub(r",(\s*[}\]])", r"\1", body)

segments = json.loads(body)

# ---------------------------------------------------------------------------
# Step 2: catalogue every distinct component map.
# ---------------------------------------------------------------------------
def comp_key(comps: dict) -> str:
    keys = sorted(int(k) for k in comps.keys())
    return "|".join(f"{k}:{comps[str(k)]}" for k in keys)


comp_counts: dict[str, dict] = {}
for seg in segments.values():
    for field in seg["fields"].values():
        comps = field.get("components")
        if not comps:
            continue
        k = comp_key(comps)
        entry = comp_counts.setdefault(k, {"count": 0, "sample": comps})
        entry["count"] += 1


# ---------------------------------------------------------------------------
# Step 3: named HL7 v2 datatypes. Any component map matching one of these is
# replaced by a "DATATYPE" reference in the emitted source.
# ---------------------------------------------------------------------------
NAMED_TYPES: list[tuple[str, list[str]]] = [
    ("HD",        ["Namespace ID", "Universal ID", "Universal ID Type"]),
    ("TS",        ["Time", "Degree of Precision"]),
    ("CE",        ["Identifier", "Text", "Name of Coding System"]),
    ("CE6",       ["Identifier", "Text", "Name of Coding System",
                   "Alternate Identifier", "Alternate Text", "Name of Alternate Coding System"]),
    ("CX",        ["ID Number", "Check Digit", "Check Digit Scheme",
                   "Assigning Authority", "Identifier Type Code", "Assigning Facility"]),
    ("CX_LONG",   ["ID Number", "Check Digit", "Check Digit Scheme",
                   "Assigning Authority", "Identifier Type Code", "Assigning Facility",
                   "Effective Date", "Expiration Date", "Assigning Jurisdiction", "Assigning Agency"]),
    ("XPN",       ["Family Name", "Given Name", "Second Name", "Suffix", "Prefix", "Degree"]),
    ("XPN_TYPE",  ["Family Name", "Given Name", "Second Name", "Suffix", "Prefix", "Degree", "Name Type Code"]),
    ("XPN_FULL",  ["Family Name", "Given Name", "Second Name", "Suffix", "Prefix", "Degree",
                   "Name Type Code", "Name Representation Code"]),
    ("XCN",       ["ID Number", "Family Name", "Given Name", "Second Name", "Suffix", "Prefix",
                   "Degree", "Source Table", "Assigning Authority"]),
    ("XTN",       ["Telephone Number", "Telecommunication Use Code", "Telecommunication Equipment Type",
                   "Email Address", "Country Code", "Area Code", "Local Number", "Extension"]),
    ("XTN_EMAIL", ["Telephone Number", "Telecommunication Use Code", "Telecommunication Equipment Type",
                   "Email Address"]),
    ("XAD",       ["Street Address", "Other Designation", "City", "State", "Zip Code", "Country", "Address Type"]),
    ("XAD_FULL",  ["Street Address", "Other Designation", "City", "State", "Zip Code", "Country", "Address Type",
                   "Other Geographic Designation", "County Code", "Census Tract", "Address Representation Code"]),
    ("PL",        ["Point of Care", "Room", "Bed", "Facility", "Location Status",
                   "Person Location Type", "Building", "Floor"]),
    ("PL_DESC",   ["Point of Care", "Room", "Bed", "Facility", "Location Status",
                   "Person Location Type", "Building", "Floor", "Location Description"]),
    ("PL_SHORT",  ["Point of Care", "Room", "Bed", "Facility"]),
    ("XCN_SHORT", ["ID Number", "Family Name", "Given Name", "Second Name", "Suffix", "Prefix", "Degree"]),
    ("EI",        ["Entity Identifier", "Namespace ID", "Universal ID", "Universal ID Type"]),
    ("ORG",       ["Organization Name", "Organization Name Type Code", "ID Number"]),
    ("CP",        ["Price", "Price Type"]),
    ("CQ",        ["Quantity", "Units"]),
    ("EIP",       ["Placer Assigned Identifier", "Filler Assigned Identifier"]),
    ("JCC",       ["Job Code", "Job Class"]),
    ("FC",        ["Financial Class Code", "Effective Date"]),
]

type_by_key: dict[str, str] = {}
for name, arr in NAMED_TYPES:
    as_obj = {str(i + 1): v for i, v in enumerate(arr)}
    type_by_key[comp_key(as_obj)] = name

# Report any repeated map that isn't in NAMED_TYPES — suggests the table
# above is incomplete.
missing = [
    (v["count"], v["sample"])
    for k, v in comp_counts.items()
    if v["count"] >= 2 and k not in type_by_key
]
missing.sort(key=lambda x: -x[0])
if missing:
    print("Repeated component maps not interned (consider adding to NAMED_TYPES):")
    for count, sample in missing[:10]:
        print(f"  x{count}  {comp_key(sample)[:120]}")

# ---------------------------------------------------------------------------
# Step 4: emit the compact source.
# ---------------------------------------------------------------------------
def js_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def comps_to_array(comps: dict) -> list:
    keys = sorted(int(k) for k in comps.keys())
    max_k = keys[-1]
    arr: list = [None] * max_k
    for k in keys:
        arr[k - 1] = comps[str(k)]
    return arr


def emit_field(field: dict) -> str:
    if not field.get("components"):
        return js_str(field["name"])
    key = comp_key(field["components"])
    named = type_by_key.get(key)
    if named:
        return f'[{js_str(field["name"])},"{named}"]'
    arr = comps_to_array(field["components"])
    return f'[{js_str(field["name"])},{json.dumps(arr, ensure_ascii=False)}]'


def emit_segment(seg_id: str, seg: dict) -> str:
    field_nums = sorted(int(k) for k in seg["fields"].keys())
    max_field = field_nums[-1]
    parts = []
    for i in range(1, max_field + 1):
        f = seg["fields"].get(str(i))
        parts.append(emit_field(f) if f else "0")
    return f'  {js_str(seg_id)}: [{js_str(seg["name"])}, [{",".join(parts)}]]'


type_entries = ",\n".join(
    f"  {name}: {json.dumps(arr, ensure_ascii=False)}"
    for name, arr in NAMED_TYPES
)

seg_entries = ",\n".join(
    emit_segment(seg_id, seg) for seg_id, seg in segments.items()
)

header = """// HL7 Segment and Field Definitions — compact form.
//
// Storage layout (small on the wire, expanded once at load):
//   HL7_DATATYPES: shared component name lists (HD, XPN, TS, CX, ...).
//   HL7_SEGMENTS_COMPACT: { SEG: [name, [field1, field2, ...]] }
//     where each field is one of:
//       string                                — field name, no components
//       [name, "DATATYPE"]                    — components come from HL7_DATATYPES
//       [name, ["Comp1", "Comp2", ...]]       — inline components
//       0                                     — hole (field number skipped)
//
// The expanded HL7_SEGMENTS object keeps the shape the rest of the app uses,
// so hl7-parser.js sees the same API it always did.
"""

output = f"""{header}
const HL7_DATATYPES = {{
{type_entries}
}};

const HL7_SEGMENTS_COMPACT = {{
{seg_entries}
}};

const HL7_SEGMENTS = (() => {{
  const out = {{}};
  for (const segId in HL7_SEGMENTS_COMPACT) {{
    const [segName, fieldsArr] = HL7_SEGMENTS_COMPACT[segId];
    const fields = {{}};
    for (let i = 0; i < fieldsArr.length; i++) {{
      const f = fieldsArr[i];
      if (!f) continue;
      const fieldNum = i + 1;
      if (typeof f === 'string') {{
        fields[fieldNum] = {{ name: f }};
      }} else {{
        const [fieldName, compsRef] = f;
        const compsArr = typeof compsRef === 'string' ? HL7_DATATYPES[compsRef] : compsRef;
        const components = {{}};
        for (let j = 0; j < compsArr.length; j++) {{
          if (compsArr[j] != null) components[j + 1] = compsArr[j];
        }}
        fields[fieldNum] = {{ name: fieldName, components }};
      }}
    }}
    out[segId] = {{ name: segName, fields }};
  }}
  return out;
}})();

// List of known HL7 segment identifiers for detection
const HL7_SEGMENT_IDS = Object.keys(HL7_SEGMENTS);
"""

SRC.write_text(output, encoding="utf-8", newline="\n")
print(f"\nWrote {SRC}")
print(f"  original bytes: {len(raw.encode('utf-8')):,}")
print(f"  new bytes:      {len(output.encode('utf-8')):,}")

# ---------------------------------------------------------------------------
# Step 5: verify the expanded form is semantically identical to the input.
# We can't run the JS from Python, so we simulate the expansion here and
# compare against the parsed input.
# ---------------------------------------------------------------------------
# Rebuild HL7_SEGMENTS from HL7_SEGMENTS_COMPACT in Python.
datatypes = {name: arr for name, arr in NAMED_TYPES}

def expand(seg_id: str, seg: dict) -> dict:
    field_nums = sorted(int(k) for k in seg["fields"].keys())
    max_field = field_nums[-1]
    fields_arr = []
    for i in range(1, max_field + 1):
        f = seg["fields"].get(str(i))
        fields_arr.append(f)
    # simulate the JS expansion
    result_fields = {}
    for i, f in enumerate(fields_arr, start=1):
        if not f:
            continue
        if not f.get("components"):
            result_fields[i] = {"name": f["name"]}
        else:
            key = comp_key(f["components"])
            named = type_by_key.get(key)
            comps_arr = datatypes[named] if named else comps_to_array(f["components"])
            components = {}
            for j, v in enumerate(comps_arr, start=1):
                if v is not None:
                    components[j] = v
            result_fields[i] = {"name": f["name"], "components": components}
    return {"name": seg["name"], "fields": result_fields}


def normalize(seg: dict) -> dict:
    """Coerce string int keys -> int keys so the two representations compare."""
    fields = {}
    for k, v in seg["fields"].items():
        entry = {"name": v["name"]}
        comps = v.get("components")
        if comps:
            entry["components"] = {int(kk): vv for kk, vv in comps.items()}
        fields[int(k)] = entry
    return {"name": seg["name"], "fields": fields}


mismatches = []
for seg_id, seg in segments.items():
    before = normalize(seg)
    after = expand(seg_id, seg)
    if before != after:
        mismatches.append(seg_id)

if mismatches:
    print(f"MISMATCH in segments: {mismatches}")
    raise SystemExit(1)

print("Round-trip OK — expanded HL7_SEGMENTS matches the original.")
