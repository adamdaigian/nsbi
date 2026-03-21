# Northstar — Design System

**Version:** 0.1.0  
**Status:** Draft  
**Last Updated:** March 2026  
**Reference implementations:** `reference/northstar-workbench.html`, `reference/northstar-data-browser.html`, `reference/northstar-concepts.html`

---

## Philosophy

Northstar's visual language is built around one idea: **the instrument**. The interface should feel like a precision tool for understanding your business — calm, legible, built for long focus sessions. Not a flashy dashboard. Not a wall of charts competing for attention. A surface that recedes so the data and the conversation come forward.

This means:

- Warmth over sterility. Neutrals carry a subtle warmth — never cold blue-gray, never clinical white. The palette sits between parchment and linen.
- Flatness over depth. Surfaces are distinguished by tone, not shadow. Elevation is communicated through border treatment, not drop shadows, except the faintest hover hint.
- Color is reserved for meaning. The only chromatic colors in the UI encode real semantic information — status, object type, data lineage. Everything else is tonal.
- Typography does the hierarchy work. Weight and size create structure. Color is not used to establish text hierarchy.
- Chat is first-class. The conversational thread is the primary workspace, not a bolt-on. Every visual decision supports readability of mixed prose-and-data output.

The closest reference points are BigQuery's workspace (clean, tool-like, stays out of the way) and Linear (warm precision, quiet confidence). For a BI product used by analysts and operators all day, this is exactly right — it reduces fatigue, signals trustworthiness, and lets the data speak.

---

## Theme Architecture

Northstar supports three themes: **Daylight**, **Dusk** (default), and **Midnight**. All components are built against CSS custom properties, allowing full theme switching with zero component changes.

The Dusk theme is the product default and defines the canonical aesthetic — warm linen tones that give the interface its distinctive character. Daylight is a clean white workspace for users who prefer high-contrast clarity. Midnight is a deep navy-black for low-light environments.

Theme selection is stored per-user and applied via a `data-theme` attribute on the root element:

```html
<html data-theme="dusk">      <!-- default — warm linen -->
<html data-theme="daylight">   <!-- clean white -->
<html data-theme="midnight">   <!-- night sky -->
```

---

## Color Tokens

All colors are defined as CSS custom properties on `:root` (Dusk) and overridden per-theme. Every component uses these tokens — no hardcoded hex values anywhere in the codebase.

### Dusk Theme (default)

#### Background surfaces

```css
--ground:     #F2F0EB;   /* Page background. Warm linen. The defining tone. */
--sidebar:    #ECEAE4;   /* Sidebar background. One step darker than ground. */
--nav-active: #E2E0D8;   /* Active nav item fill. Tonal shift only. */
--nav-hover:  #E8E6DF;   /* Nav hover state. Between default and active. */
--surface:    #FFFFFF;   /* Card, panel, and input surfaces. White floats on linen. */
--surface2:   #F8F7F3;   /* Inset surfaces: table headers, code blocks, toolbar backgrounds. */
```

#### Borders

```css
--border:     #E4E1D9;   /* Default border. Barely visible. Cards, dividers, inputs. */
--border2:    #D6D3CA;   /* Stronger border. Hover states, active inputs, focused elements. */
```

#### Text

```css
--ink:        #1C1917;   /* Primary text. Warm near-black. Headings, labels, active states. */
--ink2:       #6B6560;   /* Secondary text. Body copy, descriptions, agent prose. */
--ink3:       #A39D97;   /* Tertiary text. Timestamps, placeholders, muted labels. */
--ink4:       #C5BFB9;   /* Disabled text. Inactive elements, faded indicators. */
```

### Daylight Theme

A clean, high-contrast workspace. Pure white ground with warm-neutral grays — no blue cast. Feels like BigQuery or a modern cloud console, but keeps Northstar's warmth in the gray tones.

#### Background surfaces

```css
--ground:     #FFFFFF;   /* Pure white page background. */
--sidebar:    #F7F6F4;   /* Very light warm gray sidebar. No blue. */
--nav-active: #EBEAE7;   /* Active nav item. Warm gray. */
--nav-hover:  #F1F0ED;   /* Nav hover. Between sidebar and active. */
--surface:    #FFFFFF;   /* Cards and panels. Same as ground — borders do the work. */
--surface2:   #F7F6F4;   /* Inset surfaces. Matches sidebar tone. */
```

#### Borders

```css
--border:     #E3E1DD;   /* Default border. Warm neutral. */
--border2:    #D4D2CD;   /* Stronger border. */
```

#### Text

```css
--ink:        #1C1917;   /* Primary text. Same warm near-black as Dusk. */
--ink2:       #5C5753;   /* Secondary text. Warm mid-gray. */
--ink3:       #9A9590;   /* Tertiary text. */
--ink4:       #BDB8B3;   /* Disabled text. */
```

### Midnight Theme

Deep space. Not charcoal-gray dark mode — genuinely dark, with a subtle blue undertone that evokes a night sky. Stars optional.

#### Background surfaces

```css
--ground:     #0B0E14;   /* Deep navy-black. The night sky. */
--sidebar:    #0F1219;   /* Sidebar. Slightly lifted from the void. */
--nav-active: #1A1F2B;   /* Active nav item. Subtle blue-tinged lift. */
--nav-hover:  #141824;   /* Nav hover. Between sidebar and active. */
--surface:    #151A24;   /* Card and panel surfaces. Dark slate. */
--surface2:   #1A2030;   /* Inset surfaces. Code blocks, table headers. Hint of blue. */
```

#### Borders

```css
--border:     #232A38;   /* Default border. Barely visible against the dark. */
--border2:    #2E3749;   /* Stronger border. Hover states. */
```

#### Text

```css
--ink:        #E8ECF1;   /* Primary text. Soft white. Never pure #FFF — too harsh. */
--ink2:       #9BA3B0;   /* Secondary text. Cool mid-gray. */
--ink3:       #606A7A;   /* Tertiary text. */
--ink4:       #3D4656;   /* Disabled text. */
```

### Semantic — status colors

Shared across all three themes. Used exclusively for encoding meaning. Never for decoration.

```css
/* Green — complete, ready, success, connected */
--green:        #16A34A;
--green-bg:     #F0FDF4;   /* Daylight/Dusk */  →  #0D2818  /* Midnight */
--green-border: #BBF7D0;   /* Daylight/Dusk */  →  #1A4028  /* Midnight */

/* Amber — attention required, warning, in-progress */
--amber:        #D97706;
--amber-bg:     #FFFBEB;   /* Daylight/Dusk */  →  #291E0A  /* Midnight */
--amber-border: #FDE68A;   /* Daylight/Dusk */  →  #3D2E10  /* Midnight */

/* Red — error, exception, broken */
--red:          #DC2626;
--red-bg:       #FEF2F2;   /* Daylight/Dusk */  →  #2A1010  /* Midnight */
--red-border:   #FECACA;   /* Daylight/Dusk */  →  #3D1818  /* Midnight */

/* Blue — informational, SQL, views, links */
--blue:         #2563EB;
--blue-bg:      #EFF6FF;   /* Daylight/Dusk */  →  #0D1A2E  /* Midnight */
--blue-border:  #BFDBFE;   /* Daylight/Dusk */  →  #1A2E4A  /* Midnight */

/* Purple — data lineage, materialized views, table references */
--purple:       #7C3AED;
--purple-bg:    #F5F3FF;   /* Daylight/Dusk */  →  #1A1028  /* Midnight */
--purple-border:#DDD6FE;   /* Daylight/Dusk */  →  #2E1E48  /* Midnight */

/* Teal — metrics, semantic objects, definitions */
--teal:         #0D9488;
--teal-bg:      #F0FDFA;   /* Daylight/Dusk */  →  #0A2622  /* Midnight */
--teal-border:  #99F6E4;   /* Daylight/Dusk */  →  #143D36  /* Midnight */
```

### Accent color note

The six accent hues (green, amber, red, blue, purple, teal) are constant across all themes. Only their background and border tints change to work against the theme's ground color. In Daylight and Dusk themes, these are light-tinted pastels. In Midnight theme, they become deep-tinted darks of the same hue. The foreground accent color (`--green`, `--blue`, etc.) is bumped slightly brighter in Midnight for legibility — this is what makes badges, tags, and status indicators feel consistent regardless of theme.

### Color usage rules

1. **Never use semantic colors for decoration.** Green means "success" or "connected." It does not mean "this looks nice here."
2. **Never use color to create text hierarchy.** Use `--ink`, `--ink2`, `--ink3` for hierarchy. Color on text is reserved for semantic badges and typed references only.
3. **Backgrounds always pair with their border.** A green background (`--green-bg`) always has a green border (`--green-border`). Never mix semantic families.
4. **The sidebar never uses `--surface`.** Cards and panels are `--surface`. The sidebar and page ground are warm/cool tones respectively. This separation is load-bearing for the spatial hierarchy.
5. **In Midnight theme, avoid pure white.** Primary text is `--ink` (#E8ECF1), never `#FFFFFF`. Pure white creates glare against dark backgrounds.

---

## Typography

### Font families

```css
--font: 'Geist', system-ui, sans-serif;
--mono: 'Geist Mono', monospace;
```

**Geist** is the primary typeface. Precise, neutral, and technical without feeling cold. It renders exceptionally well at small sizes — critical for a data-dense BI product. Load from Google Fonts or self-host for production.

**Geist Mono** is used for: SQL code, table and column names, metric identifiers, timestamps in the feed, data values in result tables, and any content that benefits from fixed-width rendering.

### Type scale

| Role | Size | Weight | Color | Usage |
|---|---|---|---|---|
| Page heading | 18px | 600 | `--ink` | Metric detail title, rare |
| Section heading | 13.5px | 600 | `--ink` | Panel headers, section titles |
| Body | 13px | 400 | `--ink2` | Agent prose, descriptions |
| Label | 13px | 500 | `--ink` | Nav items (active), card titles |
| Small | 12px | 400 | `--ink2` | Thread messages, feed previews |
| Caption | 11.5px | 400 | `--ink2` | SQL code, table names, attribution |
| Micro | 11px | 400 | `--ink3` | Timestamps, badges, column types |
| Section label | 10.5px | 500 | `--ink3` | Uppercase section dividers, 0.04em tracking |
| Tiny | 9.5px | 600 | varies | Status badges, tag labels |
| Mono body | 12px | 400 | `--ink2` | SQL in editor, code blocks |
| Mono small | 11.5px | 400 | `--ink2` | Table/column names in schema tree |
| Mono micro | 11px | 400 | `--ink3` | Result metadata, row counts |

### Typography rules

1. **Two weights dominate: 400 and 500.** Weight 600 is reserved for section headings, the logo wordmark, and metric titles. Never use 700.
2. **Line height is 1.5 for UI elements, 1.65 for prose.** Agent prose output and interpretation blocks use 1.65 for readability. Everything else uses 1.5. SQL code uses 1.7–1.8 for scanability.
3. **Letter spacing is default everywhere** except the logo (`-0.02em`) and section labels (`+0.04em` uppercase).
4. **Monospace for data, sans for everything else.** Table names, column names, SQL, row counts, file sizes, and timestamps all render in `--mono`. Prose, labels, and navigation use `--font`.

---

## Spacing

Northstar uses a base-4 spacing scale. All padding, margin, and gap values should be multiples of 4px.

```
4px   — micro gap (icon-to-label, badge internals, tag padding)
5px   — tight gap (nav item padding, small button padding)
6px   — element gap (between inline items, pill padding)
8px   — small gap (sidebar padding, tree row padding, card gap)
10px  — panel gap (table detail padding, context strip)
12px  — medium gap (schema panel padding, toolbar padding)
14px  — feed item padding, column padding
16px  — standard gap (thread padding, input wrap padding)
20px  — page padding (topbar horizontal, thread side padding)
24px  — section gap (metric detail body, detail padding)
28px  — large section (metric inner padding)
```

---

## Layout

### Shell structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  Sidebar (192–200px)  │  Main (flex: 1)                             │
│                       │  ┌────────────────────────────────────────┐  │
│  Logo                 │  │  Topbar (44px) — tabs + actions        │  │
│  ─────                │  ├────────────────────────────────────────┤  │
│  Nav items            │  │                                        │  │
│                       │  │  Body (flex: 1)                        │  │
│  [spacer]             │  │  ┌─────────┬──────────────┬─────────┐  │  │
│                       │  │  │ Schema  │  Workspace   │ Feed /  │  │  │
│  Settings             │  │  │ (264px) │  (flex: 1)   │ Context │  │  │
│  User profile         │  │  │         │              │ (280px) │  │  │
│                       │  │  └─────────┴──────────────┴─────────┘  │  │
└──────────────────────────────────────────────────────────────────────┘
```

### Sidebar

- **Width:** 192–200px fixed, never collapses in desktop view
- **Background:** `--sidebar`
- **Border:** 1px solid `--border` on the right edge only
- **Padding:** 12px 8px
- **Nav items:** ~36px height, 6px 8px padding, 9px gap between icon and label, border-radius `--radius-sm`
- **Logo:** 24×24px mark (bg: `--ink`, radius: 6px) + 14px/600 wordmark
- **Section labels:** 10.5px/500, uppercase, `--ink3`, 0.04em tracking
- **User profile:** pinned to bottom, above Settings, separated by 1px `--border`

### Topbar

- **Height:** 44px fixed
- **Background:** `--ground` (matches page — no elevation)
- **Border:** 1px solid `--border` on bottom only
- **Contains:** tab row (scrollable) + right-side action buttons
- **Tabs:** 12–12.5px, with 2px `--ink` bottom indicator on active tab
- **Tab close buttons:** opacity: 0 at rest, 1 on tab hover

### Three-column workspace (Workbench layout)

- **Schema panel (left):** 264px, collapsible to 0px with CSS transition
- **Workspace (center):** flex: 1, contains tabbed panes (Thread, SQL Editor, Metric, History)
- **Feed panel (right):** 280px, collapsible, shows activity log

### Two-column workspace (Data Browser layout)

- **Schema panel (left):** 280px, collapsible, includes table detail slide-in
- **Workspace (right):** flex: 1, contains Thread, Editor, and History views

---

## Components

### Navigation item

The sidebar's primary interactive element.

```css
padding: 6px 8px; border-radius: var(--radius-sm);
font-size: 13px; color: var(--ink2);
/* hover */  background: var(--nav-hover); color: var(--ink);
/* active */ background: var(--nav-active); color: var(--ink); font-weight: 500;
```

Icon: 15×15px SVG, `currentColor`, to the left of the label.

### Tab bar

Horizontal tab row in the topbar. Tabs represent open contexts (threads, queries, metrics).

**Tab anatomy:**
```
[colored dot] [label text] [close ×]
```

- Dots encode type: `--ink3` for threads, `--blue` for SQL, `--teal` for metrics
- Active tab: 2px `--ink` bottom border, font-weight 500
- Close button fades in on hover

### Thread message

The core unit of the conversational workspace.

**User message:**
```css
background: var(--surface); border: 1px solid var(--border);
border-radius: var(--radius); padding: 8px–14px;
font-size: 13px; color: var(--ink); max-width: 480px;
```

**Agent prose:**
```css
font-size: 12.5px–13px; color: var(--ink2); line-height: 1.65;
/* strong tags */ color: var(--ink); font-weight: 500–600;
```

**Attribution line:** Small avatar (20–22px circle) + sender name (11.5px/500) + timestamp (10.5px `--ink3`).

### SQL block

Rendered in the thread or as a standalone editor pane.

**In-thread (compact pill):**
```css
padding: 6px 10px; border-radius: var(--radius-sm);
border: 1px solid var(--border); background: var(--surface2);
/* hover */ border-color: var(--border2); background: var(--surface);
```

**In-thread (expanded block):**
```css
/* header */ padding: 7px 12px; background: var(--surface2); border-bottom: 1px solid var(--border);
/* body */   padding: 12px 14px; font-family: var(--mono); font-size: 11.5px–12px; line-height: 1.7–1.8;
```

**Syntax coloring:**
```css
.kw   { color: var(--ink); font-weight: 500; }    /* keywords: SELECT, FROM, WHERE */
.fn   { color: var(--blue); }                      /* functions: COUNT, SUM, DATE_TRUNC */
.str  { color: var(--green); }                     /* strings and literals */
.cmt  { color: var(--ink3); font-style: italic; }  /* comments */
.tref { color: var(--purple); }                    /* table references */
```

### Result table

Inline data results rendered as HTML tables.

```css
/* header row */
th { font-size: 10px; color: var(--ink3); font-weight: 500; background: var(--surface2);
     padding: 5px 10px; border-bottom: 1px solid var(--border); }
/* data cells */
td { font-size: 11px; color: var(--ink2); padding: 5px 10px; font-family: var(--mono);
     border-bottom: 1px solid var(--border); }
/* label cells */
td.label { font-family: var(--font); color: var(--ink); font-size: 11.5px; }
/* numeric cells */
td.num { text-align: right; color: var(--ink); font-weight: 500; }
/* hover row */
tr:hover td { background: var(--surface2); }
```

### Insight callout

Semantic callout blocks in thread output. Type determines color family.

```css
/* base */ padding: 9px 11px; border-radius: var(--radius); display: flex; gap: 9px;
/* warn */  background: var(--amber-bg);  border: 1px solid var(--amber-border);
/* info */  background: var(--blue-bg);   border: 1px solid var(--blue-border);
/* flag */  background: var(--red-bg);    border: 1px solid var(--red-border);
/* good */  background: var(--green-bg);  border: 1px solid var(--green-border);
```

Icon: 13px SVG in the semantic color. Text: 12px/1.55, `--ink2`, with `strong` in `--ink`.

### Status badge / tag

Small inline pill for encoding type or status.

```css
font-size: 9–9.5px; font-weight: 500–600; padding: 1px 5px;
border-radius: 3px; text-transform: uppercase; letter-spacing: 0.03–0.04em;
```

Always uses the full semantic triple: `background: var(--X-bg); color: var(--X); border: 1px solid var(--X-border);`

**Standard tag families:**
- Query: `--surface2` / `--ink3` / `--border` (neutral)
- OK: green family
- Error: red family
- Running: amber family
- Insight: blue family
- Table ref: purple family
- Metric: teal family

### Schema tree row

Used in the left panel to browse databases, schemas, tables, and columns.

**Database row:** 12px/500 mono, `--ink`, with 16×16px icon badge and chevron
**Schema row:** 11.5px mono, `--ink2`, indented 26px
**Table row:** 11.5px mono, `--ink2`, indented 36px, with type badge (TBL/VIEW/MAT/METRIC)

**Type badges:**
```css
.tt-tbl    { background: var(--surface2); color: var(--ink3); border: 1px solid var(--border); }
.tt-view   { background: var(--blue-bg);  color: var(--blue);  border: 1px solid var(--blue-border); }
.tt-mat    { background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple-border); }
.tt-metric { background: var(--teal-bg);  color: var(--teal);  border: 1px solid var(--teal-border); }
```

### Table detail panel

Slides in over the schema panel from the right. Contains metadata, column definitions, and action buttons.

- **Stats row:** grid of label/value pairs (Rows, Size, Updated)
- **Column list:** `col-name` in mono, `col-type` in mono/`--ink3`, key icon in `--amber`
- **Action buttons:** standard outline button + CTA (filled `--ink` background)

### Primary button (CTA)

```css
background: var(--ink); color: var(--ground); border-color: var(--ink);
/* hover */ opacity: 0.88;
```

### Outline button

```css
padding: 4px 9px; border-radius: var(--radius-sm);
border: 1px solid var(--border); background: var(--surface);
font-size: 11.5px; color: var(--ink2);
/* hover */ background: var(--surface2); border-color: var(--border2); color: var(--ink);
```

### Text input / textarea

```css
background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
padding: 6px 8px; font-size: 13px; color: var(--ink);
/* focus */ border-color: var(--border2);
/* placeholder */ color: var(--ink3);
```

### Send button

```css
width: 27–28px; height: 27–28px; border-radius: var(--radius-sm);
background: var(--ink); color: var(--ground);
/* hover */ opacity: 0.85;
```

---

## Interaction patterns

### Hover reveals
Secondary action buttons (card actions, table row actions, tab close) are `opacity: 0` at rest and `opacity: 1` on parent hover. Transition: `opacity 0.1–0.12s`.

### Panel transitions
Schema panel, table detail, and feed panel use CSS transitions:
```css
transition: width 0.18s ease, min-width 0.18s ease, opacity 0.18s ease;
/* or for slide-in panels: */
transform: translateX(100%); transition: transform 0.18s ease;
```

### Loading state (spinner)
```css
width: 10–12px; height: 10–12px; border-radius: 50%;
border: 1.5px solid var(--border2);
border-top-color: var(--ink2);
animation: spin 1s linear infinite;
```

### Typing cursor
```css
content: '|'; animation: blink 1s step-end infinite;
color: var(--ink); font-weight: 300;
```

### Thinking indicator
```css
display: flex; align-items: center; gap: 8px;
padding: 7px 10px; border: 1px solid var(--border);
border-radius: var(--radius-sm); background: var(--surface2);
font-size: 11.5px; color: var(--ink3); font-style: italic;
```

### Live pulse dot
```css
width: 5px; height: 5px; border-radius: 50%; background: var(--green);
animation: pulse-live 2s ease-in-out infinite;
@keyframes pulse-live { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
```

---

## Iconography

All icons are inline SVG. No icon library dependency.

**Spec:**
- ViewBox: `0 0 16 16` (nav icons) or `0 0 12 12` / `0 0 14 14` (UI icons)
- Stroke-width: 1.3–1.5 (varies by size context)
- Style: outline/stroke only — no filled icons except the logo mark, status dots, and play buttons
- Color: `currentColor` — icons inherit text color from parent

**Nav icon set:**

| Section | Icon description |
|---|---|
| Home | Small house with chimney |
| Data | Stacked cylinders (database) |
| Metrics | Bar chart or trending line |
| Threads | Chat bubble |
| Library | Document with lines |
| Settings | Gear / circle with spokes |

---

## Border radius

```css
--radius-sm: 5px;   /* Buttons, badges, nav items, pills, tags */
--radius:    8px;   /* Cards, panels, inputs, SQL blocks, insight callouts */
--radius-lg: 12px;  /* Modal containers, large cards (future) */
```

The logo mark uses 6px. Data table cells use 0px (no radius). Status dots are 50% (circular).

---

## Scrollbar styling

All scrollable areas use a minimal custom scrollbar:

```css
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
```

---

## What this system does not include (yet)

- **Modal / dialog** — needed for new thread creation, confirmation flows. Planned for Phase 2.
- **Toast / notification** — query completion alerts, error messages. Planned for Phase 2.
- **Tooltip** — icon labels, truncated text expansion. Planned for Phase 2.
- **Empty states** — zero-data columns, new workspace, onboarding. Planned for Phase 2.
- **Charts / visualizations** — embedded chart components in thread output. Planned for Phase 3.
- **Mobile / responsive** — Northstar is desktop-first. Mobile adaptation is Phase 4+.

These will be added to this document as each phase is specced and built.

---

## Tailwind config mapping

When the Next.js project is scaffolded, `tailwind.config.ts` should map these tokens:

```typescript
theme: {
  extend: {
    colors: {
      ground:  'var(--ground)',
      sidebar: 'var(--sidebar)',
      surface: {
        DEFAULT: 'var(--surface)',
        2:       'var(--surface2)',
      },
      border: {
        DEFAULT: 'var(--border)',
        2:       'var(--border2)',
      },
      ink: {
        DEFAULT: 'var(--ink)',
        2:       'var(--ink2)',
        3:       'var(--ink3)',
        4:       'var(--ink4)',
      },
      nav: {
        active: 'var(--nav-active)',
        hover:  'var(--nav-hover)',
      },
      status: {
        green:          '#16A34A',
        'green-bg':     'var(--green-bg)',
        'green-border': 'var(--green-border)',
        amber:          '#D97706',
        'amber-bg':     'var(--amber-bg)',
        'amber-border': 'var(--amber-border)',
        red:            '#DC2626',
        'red-bg':       'var(--red-bg)',
        'red-border':   'var(--red-border)',
        blue:           '#2563EB',
        'blue-bg':      'var(--blue-bg)',
        'blue-border':  'var(--blue-border)',
        purple:         '#7C3AED',
        'purple-bg':    'var(--purple-bg)',
        'purple-border':'var(--purple-border)',
        teal:           '#0D9488',
        'teal-bg':      'var(--teal-bg)',
        'teal-border':  'var(--teal-border)',
      }
    },
    fontFamily: {
      sans: ['Geist', 'system-ui', 'sans-serif'],
      mono: ['Geist Mono', 'monospace'],
    },
    borderRadius: {
      sm:      '5px',
      DEFAULT: '8px',
      lg:      '12px',
    },
  }
}
```

---

*This document is the visual source of truth for Northstar. The reference implementations in `reference/` are the runnable versions of this spec — open them in a browser alongside development work to verify fidelity.*
