# HL7 Viewer

A browser-based web application for parsing, visualizing, and analyzing HL7 medical data messages and JSON files. All data processing happens entirely client-side — no data ever leaves your browser.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (for running the server)

### Installation

```bash
git clone https://github.com/zachromers/HL7Viewer.git
cd HL7Viewer
npm install
```

### Running

```bash
npm start
```

The application will be available at `http://localhost:3003/HL7/`.

### Running Locally (No Server)

You can also open `public/index.html` directly in a browser — no server required. This is the recommended approach when working with Protected Health Information (PHI), as it guarantees no network communication occurs.

## Features

### Data Input

- **Drag & Drop** — Drop `.hl7`, `.json`, or `.txt` files onto the drop zone. Multiple files are supported and will be concatenated.
- **File Browser** — Select files using a standard file picker.
- **Paste Text** — Paste raw HL7 or JSON content into the text area and click "Load Content" (or press `Ctrl+Enter`).
- **Auto-Detection** — The application automatically detects whether content is HL7 or JSON and renders accordingly.

### HL7 Viewer

Two rendering modes are available, toggled from the menu bar:

**Tree View**
- Hierarchical, collapsible structure: Messages > Segments > Fields > Components > Subcomponents.
- Each message displays its type and patient name with a segment count badge.
- Click the toggle arrow to expand/collapse any level.

**Textual View**
- Inline HL7 format with syntax highlighting.
- Each line represents a segment with color-coded segment IDs, field separators, components, and subcomponents.

Both modes include:
- **Hover Tooltips** — Hover over any element to see its HL7 field definition (e.g., "PID.5 - Patient Name").
- **Segment Color-Coding** — Each segment type has a distinct color (MSH=cyan, PID=teal, PV1=magenta, OBX=yellow, DG1=red-orange, AL1=red, and many more).
- **Hide Empty Fields** — Toggle to filter out fields with no data.
- **Batch Loading** — Messages load in configurable batches (20, 50, or 100) with a "Load More" button for large files.

### JSON Viewer

JSON content is auto-detected and rendered with:
- Syntax highlighting (keys=blue, strings=orange, numbers=green, booleans=blue, null=italic).
- Tree View (collapsible) and Standard View (formatted) modes.
- **Right-click context menu** to copy JSON paths in Python style (`root['key'][0]`), Java style (`root.getJSONObject("key")`), or PostgreSQL operator style (`key -> 0`), and to open **field statistics** for the clicked field.

### JSON Field Statistics

Built for the case where one JSON blob holds many records of the same kind &mdash; a FHIR
`Bundle` of two hundred `ServiceRequest`s, say &mdash; and you want to know how those records
populate one field, then find the specific record you care about.

Right-click any key or value in the JSON viewer and choose **View field statistics**. The
Statistics page switches to a JSON-specific view analyzing that field across every record.

**How the scope is worked out.** The path you right-click is concrete: clicking the code in the
fourth order gives `root['entry'][3]['resource']['code']['coding'][0]['code']`, which names one
value in one order. To say anything about the other orders, every array index in that path is
turned into a wildcard:

```
root['entry'][*]['resource']['code']['coding'][*]['code']
```

The **first `[*]` is the record collection** &mdash; its elements are the things being compared,
and everything after it is the field being measured. So the example above compares every entry in
the bundle, and within each one reads every `coding`. A record with two codings contributes two
occurrences, which is why occurrences and records are counted separately throughout.

The path is shown as a row of clickable chips. Click any index to **pin** it back to that one
element, or release it to `[*]` to compare across all of them. Pinning the outer index moves the
record collection inward &mdash; pin `entry` and you are instead comparing the codings within that
single order. The chip marking the current collection is highlighted.

**What is reported**

- Summary cards: records in scope, records carrying a value (with percentage), records missing the
  field entirely, total occurrences, and distinct values.
- Pie chart of the value distribution, weighted by occurrence (top 15 values).
- Value table: each distinct value with its occurrence count, the number of records holding it, and
  what share of records that is. Coded values also show the `system` and `display` sitting beside
  them in their `Coding` element, since a bare code like `ADMS` means little on its own.
- **Values per record** &mdash; how often the field repeats within a single record, which is how you
  spot a field that is usually single but occasionally repeats.
- **Value types** &mdash; shown when more than one JSON type appears, which normally points at
  inconsistent source data.
- **Coding systems** &mdash; which terminologies the values are drawn from.
- **Reference targets** &mdash; for values shaped like `ResourceType/id`, a breakdown by resource type.
- **Date range** &mdash; earliest and latest, for values matching a FHIR `date`, `dateTime`, or
  `instant`. Partial dates (`2026`, `2026-04`) are widened to the start of their period for ordering.
- **Numeric summary** &mdash; min, max, and mean.
- **Resource types in scope** &mdash; what the records being compared actually are, which matters in a
  mixed `Bundle`.

A field whose every occurrence is unique is called out as identifying records rather than grouping
them. Values are analyzed across the whole document, not just the batch currently rendered in the
viewer.

**Finding a specific record.** Click any row in the value table to list the records holding that
value. Each is labelled with its `resourceType/id`, its position in the collection, a description
drawn from `code`, `type`, or `category`, and chips for `status`, `intent`, date, subject, and
identifier &mdash; enough to recognise the admit order among two hundred lab orders. Two buttons
jump back into the viewer: **View field** goes to that record's copy of the analyzed field, **View
record** goes to the record itself. Either way the JSON tree expands down to the target, scrolls to
it, and highlights it. Further batches are loaded automatically if the record sits past the end of
what the viewer has rendered.

The value table lists the 1,000 most common values; anything beyond that is summarized in a note.
Object-valued fields are rendered by meaning rather than as raw JSON &mdash; a `CodeableConcept`
reads as its text and code, a `Reference` as its target and display, a `Quantity` as its value and
unit, a `Period` as its bounds.

### HL7 Statistics & Filtering

Switch to the **Statistics** page with HL7 data loaded to analyze it:

**Filters**
- Create one or more filters using the format: `FIELD OPERATOR VALUE`
- Supported operators:
  | Operator | Description | Example |
  |----------|-------------|---------|
  | `=` | Equals (exact match) | `PV1.2 = E` |
  | `!=` | Not equals | `PV1.2 != I` |
  | `contains` | Contains substring | `PV1.3 contains ER` |
  | `!contains` | Does not contain | `PV1.3 !contains ICU` |
  | `exists` | Field has a value | `PID.5 exists` |
  | `!exists` | Field is empty/missing | `PV1.44 !exists` |
- Combine multiple filters with **AND**, **OR**, or **Custom** logic (e.g., `F1 AND (F2 OR F3)`).
- All comparisons are case-insensitive.

**Field References**
- `SEGMENT.FIELD` — e.g., `PID.5`
- `SEGMENT.FIELD.COMPONENT` — e.g., `PID.5.1`
- `SEGMENT.FIELD.COMPONENT.SUBCOMPONENT` — e.g., `PID.3.4.1`

**Results**
- Summary cards: Total Messages, Filtered Messages, With Value, Without Value, Distinct Values.
- Interactive pie chart (top 15 values; remaining grouped as "Other").
- Value frequency table with count and percentage.
- View filtered messages in a separate viewer panel.
- Download filtered messages as a `.hl7` file.

### Message Comparison

Switch to the **Compare** page to diff two HL7 messages and work out why one was accepted and another rejected.

Paste or drop a message into each pane, then click **Compare Messages**. The comparison aligns the two messages segment by segment (matching repeated segments on their Set ID where present, otherwise in order) and walks every field, repetition, component, and subcomponent.

**This compares shape, not values.** Two fields holding `M` and `F` are both single-character all-caps alphabetic, so they are not reported as a difference &mdash; and neither are different patient names, IDs, room numbers, or timestamps, as long as they share a shape. That keeps the results focused on structural problems rather than on the fact that you used two different test patients.

What *is* reported:

| Difference | Meaning | Severity |
|------------|---------|----------|
| Present in one only | Populated in one message, empty or absent in the other | High |
| Type mismatch | The value changes class &mdash; e.g. numeric in one message, alphanumeric in the other | High |
| Malformed data | Control characters, non-ASCII, stray whitespace, or unterminated escape sequences on one side only | High |
| Message identity | `MSH.9` message type / trigger event or `MSH.12` version differs, meaning the two messages are not the same kind of message | High |
| Precision change | One side carries more date/time precision than the other (e.g. `20240115` vs `20240115103000`) | Medium |
| Letter case | Same text in different case, or a different case pattern (`SMITH` vs `Smith`) | Low |
| Format | Same type, different formatting &mdash; e.g. leading-zero padding (`00123` vs `123`) | Low |

A field can be wrong in more than one way at once &mdash; a value can carry malformed data *and* change type &mdash; and every applicable finding is listed against that field, each with its own severity. Data quality is judged per side, so problems in both messages are both reported. The shape checks (type, precision, case, padding) are the exception: once the broad type differs, the finer ones would only restate the same difference, so the first that applies is the one reported.

**Dates.** Digit strings are read as dates only in fields the HL7 spec table declares as date/time &mdash; `PID.7` (Date/Time of Birth), `PV1.44` (Admit Date/Time), `DG1.5` (Diagnosis Date/Time), and so on. In those fields a value matching the HL7 timestamp shape (8, 10, 12, or 14 digits, with optional fractional seconds and UTC offset) is a timestamp, and a difference in how many digits each side carries is reported as a precision change.

Recognition is structural, never calendar-validated: whether the digits form a real date is not checked, so `08272026` and `082620261234` compare as 8-digit and 12-digit timestamps whatever the field order. Everywhere else in a spec-defined segment a digit run is just a number, so an 8-digit account number compared against a 12-digit one reports nothing.

Custom Z-segments are the exception: the spec describes no field names for them, so there is nothing to consult and timestamp detection falls back to structure. A date precision difference inside a Z-segment is therefore reported &mdash; at the cost that a Z-segment identifier of differing digit length is too. Because that reading rests on the digit count alone, those findings say **possible date** rather than date, and add: *"This field is not described by the HL7 spec, so the date reading is assumed from the number of digits and may not be a date at all."* Findings in spec-defined date fields carry no such caveat.

Message-level differences are listed above the field detail: segments present in only one message (including custom Z-segments), segment count mismatches, mismatched delimiters, and segments truncated relative to their counterpart.

**Repeated segments.** When one message carries more repetitions of a segment than the other (say two `DG1` segments versus four), the mismatch is reported once as a segment count difference, not once per field of every surplus segment.

The surplus segments are still checked. Having no counterpart of their own, they are compared against the shape the *other* message's segments of that type establish &mdash; every `DG1` in Message A shows what a `DG1` is supposed to look like. Within a surplus segment this reports:

- a field whose value type does not match what the other message's segments of that type use (High)
- a field left empty that every one of them populates (Medium)
- a field populated that none of them populate (Medium)
- malformed data, which is judged from the value alone (High)

For these findings the opposite column shows the values from the sibling segments the check was measured against, rather than an empty counterpart &mdash; so a date-typed field flagged in `DG1[4]` displays the dates the other message's `DG1` segments actually carry. That column is tinted and marks distinct values with `|`.

A surplus segment that looks like its siblings reports nothing beyond the count difference. This applies only when the other message has at least one segment of that type; a segment type absent entirely is covered by the segment-missing finding instead. Matched repetitions are compared field by field as normal.

**Results**

- Summary chips: high, medium, low, and unflagged counts.
- **Findings** grouped by segment, showing both values side by side with the differing characters highlighted, plus a plain-language explanation of each difference.
- Each segment section collapses by clicking its header (or focusing it and pressing <kbd>Enter</kbd>). All sections start expanded; **Expand All** / **Collapse All** operate on every section at once. Collapsed sections stay collapsed when the view refreshes, and reset when a new comparison is run.
- **Show Unflagged Fields** (menu bar) reveals fields that are identical, or that differ only in value while sharing a shape.
- **Copy Report** / **Download Report** produce a plain-text summary. The download is generated in-browser via a blob &mdash; nothing is uploaded.


### HL7 Segment Definitions

The application includes comprehensive field definitions for 30+ HL7 segment types, including:

MSH, EVN, PID, PD1, NK1, PV1, PV2, ORC, OBR, OBX, DG1, AL1, IN1, IN2, GT1, NTE, RXA, RXR, SCH, FT1, PR1, SPM, and more.

Each definition includes field names, component names, and subcomponent names — all surfaced via hover tooltips.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Load content from the text area |
| `Escape` | Close any open modal, or the JSON context menu |
| Double-click input area | Toggle input area visibility after content is loaded |

## Settings

All settings persist across sessions via LocalStorage:

| Setting | Options | Default |
|---------|---------|---------|
| View Mode | Tree View / Textual View | Tree View |
| Hide Empty Fields | On / Off | Off |
| Batch Size | 20 / 50 / 100 | 20 |
| Show Unflagged Fields (Compare) | On / Off | Off |

## Project Structure

```
HL7Viewer/
├── server.js              # Express server (port 3003, base path /HL7)
├── package.json
├── .gitignore
└── public/
    ├── index.html         # Main application page
    ├── HL7Favicon.png     # Favicon
    ├── css/
    │   ├── main.css        # Layout, theming, and global styles
    │   ├── viewer.css      # Viewer-specific styles and syntax colors
    │   ├── compare.css     # Compare page styles
    │   ├── lineend.css     # Line End Utility styles
    │   └── json-stats.css  # JSON field statistics page styles
    └── js/
        ├── app.js          # Main application logic, rendering, and UI
        ├── hl7-parser.js   # HL7/JSON parsing, rendering, and path reveal
        ├── hl7-fields.js   # HL7 segment/field/component definitions
        ├── stats.js        # HL7 statistics, filtering, and chart generation
        ├── json-stats.js   # JSON/FHIR field statistics engine and rendering
        ├── hl7-diff.js     # Message comparison engine and rendering
        └── hl7-lineend.js  # Line ending detection and conversion
```

## Tech Stack

- **Frontend** — Vanilla JavaScript, HTML5, CSS3 (no frameworks)
- **Backend** — Node.js with Express (static file serving only)
- **Theming** — Light and dark themes via `prefers-color-scheme` media query

## Privacy & Security

- All parsing and rendering happens in the browser. The server only serves static files.
- No cookies, analytics, or external API calls.
- LocalStorage is used only for UI settings (view mode, batch size, hide empty fields).
- For PHI, run the application locally by opening `public/index.html` directly in a browser.

## License

This application is provided as-is for educational and entertainment purposes. See the in-app disclaimer for details.
