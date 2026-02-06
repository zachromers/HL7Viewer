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
- **Right-click context menu** to copy JSON paths in Python style (`root['key'][0]`) or Java style (`root.getJSONObject("key")`).

### Statistics & Filtering

Switch to the **Statistics** page to analyze loaded HL7 data:

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

### HL7 Segment Definitions

The application includes comprehensive field definitions for 30+ HL7 segment types, including:

MSH, EVN, PID, PD1, NK1, PV1, PV2, ORC, OBR, OBX, DG1, AL1, IN1, IN2, GT1, NTE, RXA, RXR, SCH, FT1, PR1, SPM, and more.

Each definition includes field names, component names, and subcomponent names — all surfaced via hover tooltips.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Load content from the text area |
| `Escape` | Close any open modal |
| Double-click input area | Toggle input area visibility after content is loaded |

## Settings

All settings persist across sessions via LocalStorage:

| Setting | Options | Default |
|---------|---------|---------|
| View Mode | Tree View / Textual View | Tree View |
| Hide Empty Fields | On / Off | Off |
| Batch Size | 20 / 50 / 100 | 20 |

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
    │   ├── main.css       # Layout, theming, and global styles
    │   └── viewer.css     # Viewer-specific styles and syntax colors
    └── js/
        ├── app.js         # Main application logic, rendering, and UI
        ├── hl7-parser.js  # HL7/JSON parsing and content detection
        ├── hl7-fields.js  # HL7 segment/field/component definitions
        └── stats.js       # Statistics, filtering, and chart generation
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
