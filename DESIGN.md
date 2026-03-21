# Design System — T3 Code

## Product Context

- **What this is:** A minimal, powerful web GUI for orchestrating autonomous coding agents (Codex, Claude, etc.) with real-time task coordination via Symphony.
- **Who it's for:** Developers and technical teams running AI agents for code generation, debugging, and automation tasks.
- **Space/industry:** Developer tools, AI orchestration, agent-first interfaces.
- **Project type:** Web application / Dashboard with real-time event streams.

---

## Aesthetic Direction

- **Direction:** Industrial-Utilitarian with Intentional Accents
- **Decoration level:** Intentional (subtle grid background, data visualization elements, status indicators)
- **Mood:** Professional, focused, data-literate. A tool you trust to run serious work. Clean lines, generous whitespace for scanning, clear visual hierarchy for task states. No decorative flair — every pixel earns its place.
- **Anti-inspiration:** Avoid glossy SaaS defaults, colorful feature grids, or "user-friendly" UI slop. We're designing for professionals who value clarity over aesthetics.

---

## Typography

**Font family philosophy:**

- **Display/Hero:** Geist — modern, friendly enough for headings but not playful. Commands attention without shouting.
- **Body/UI:** DM Sans (already in use) — proven workhorse for dense UI, excellent readability at small sizes, supports tabular numerals.
- **Data/Tables:** DM Sans with `tabular-nums` — maintains alignment in number columns, critical for metrics and task metadata.
- **Code/Terminal:** SF Mono (already in use) — system font, fast rendering, monospace discipline.

**Scale (modular 1.125x):**

- `2xs`: 11px (labels, small captions)
- `xs`: 12px (secondary text)
- `sm`: 14px (body copy, table cells)
- `base`: 16px (standard body)
- `lg`: 18px (secondary headings)
- `xl`: 20px (section headings)
- `2xl`: 24px (page titles)
- `3xl`: 32px (hero headings)

**Line height:**

- `tight`: 1.25 (headings)
- `normal`: 1.5 (body)
- `relaxed`: 1.75 (loose body, accessibility friendly)

**Font weights:**

- 400: Default (body)
- 500: Medium (labels, secondary headings)
- 600: Semibold (buttons, emphasis, primary headings)
- 700: Bold (rarely used, only for highest emphasis)

---

## Color

**Approach:** Restrained with semantic clarity (color is meaningful, not decorative)

**Palette:**

**Neutrals (cool grays):**

- `neutral-50`: #f9fafb (almost white, subtle backgrounds)
- `neutral-100`: #f3f4f6 (card backgrounds)
- `neutral-200`: #e5e7eb (borders, dividers)
- `neutral-300`: #d1d5db (disabled elements)
- `neutral-500`: #6b7280 (muted text)
- `neutral-700`: #374151 (primary text)
- `neutral-800`: #1f2937 (strong text)
- `neutral-900`: #111827 (darkest text)
- `neutral-950`: #030712 (near black)

**Semantic Colors:**

- **Primary (Action):** `oklch(0.488 0.217 264)` — purple-blue. Used for: active buttons, links, task selection, active states. Conveys intent and interactivity.
- **Success:** `#10b981` — emerald. Tasks completed, runs successful, healthy status.
- **Warning:** `#f59e0b` — amber. In-progress, pending, attention needed.
- **Error/Destructive:** `#ef4444` — red. Task failed, runtime errors, critical issues.
- **Info:** `#3b82f6` — blue. Informational alerts, metadata, contextual hints.

**Dark Mode Adjustments:**

- Shift primary from `oklch(0.488 0.217 264)` to `oklch(0.588 0.217 264)` (lighter for contrast on dark bg)
- Reduce saturation of semantic colors by 10–15% for dark mode (avoid eye strain)
- Backgrounds shift to near-black (`#030712` → `#0f172a` surface) with subtle white tint for cards

---

## Spacing

**Base unit:** 4px (flexible, allows 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px progressions)

**Density:** Comfortable (generous internal padding, readable gaps between elements)

**Scale:**

- `2xs`: 2px (hairline borders, minimal gaps)
- `xs`: 4px (tight internal padding)
- `sm`: 8px (standard internal padding, button padding)
- `md`: 12px (section spacing, card padding)
- `lg`: 16px (outer margins, spacing between major sections)
- `xl`: 24px (between page sections)
- `2xl`: 32px (large whitespace, breathing room)
- `3xl`: 48px (hero spacing, major sections)

**Key spacing rules:**

- **Cards/Boxes:** 12px padding internally (md unit)
- **Form inputs:** 10px vertical, 12px horizontal padding
- **Buttons:** 10px vertical, 16px horizontal padding (sm/md mix)
- **Section gaps:** 16–24px (lg–xl units)
- **Page margins:** 16px on mobile, 24px on tablet/desktop

---

## Layout

**Approach:** Grid-disciplined with intentional breathing room

**Grid:**

- Mobile (< 640px): 1 column, 16px gutter
- Tablet (640px–1024px): 2–3 columns, 16px gutter
- Desktop (≥ 1024px): 12-column grid, 20px gutter
- **Max content width:** 1440px (ensures readability, prevents eye travel)

**Border Radius (hierarchical):**

- `sm`: 4px (small components, minimal rounding)
- `md`: 6px (form inputs, smaller cards)
- `lg`: 8px (standard cards, panels, buttons)
- `xl`: 12px (modals, larger containers)
- `full`: 9999px (pills, avatars, badges)

**Alignment philosophy:**

- **Kanban board columns:** 320px wide on desktop (tight but readable)
- **Task cards:** Full column width, consistent 12px padding
- **Sidebar:** Fixed 280px width, scrollable content
- **Main content:** Flex-grow (expands to fill available space)

---

## Motion

**Approach:** Minimal-functional (transitions aid comprehension, no decorative animations)

**Easing:**

- `enter`: `cubic-bezier(0.16, 1, 0.3, 1)` — snappy, feels responsive
- `exit`: `cubic-bezier(0.7, 0, 0.84, 0)` — smooth out
- `move`: `cubic-bezier(0.4, 0, 0.2, 1)` — natural, balanced

**Duration:**

- `micro`: 50ms (hover states, quick feedback)
- `short`: 150ms (enter animations, state changes)
- `medium`: 250ms (panel open/close, modal entry)
- `long`: 350ms (page transitions, large animations)

**When to animate:**

- ✅ Button hovers (background, shadow)
- ✅ Route transitions (fade + subtle slide)
- ✅ Task card drag-and-drop (smooth movement)
- ✅ Kanban column reorder (translate only)
- ✅ Expanding/collapsing panels (max-height or scale-y)
- ✅ Loading spinners (rotation, skeleton pulse)
- ❌ Decorative backgrounds, parallax, or marquee text
- ❌ Multiple simultaneous animations (performance killer)
- ❌ Animations during heavy data loads (blocks thread)

**Symphony Dashboard Specifics:**

- **Task card flip/expand:** 200ms, `enter` easing
- **Kanban column drag:** instant visual feedback, smooth 150ms settle
- **Run history appears:** 150ms fade-in
- **Status badge change:** 100ms color transition

---

## Components

### Buttons

- **Primary (CTA):** solid primary color, white text, 10px vertical / 16px horizontal padding, `lg` radius
- **Secondary:** neutral-200 background, neutral-800 text, same padding/radius
- **Ghost/Outline:** transparent bg, primary text, 1px primary border
- **Small/Compact:** 8px vertical / 12px horizontal padding (for sidebar, dense UIs)
- **Disabled state:** 30% opacity, no hover effect
- **Hover:** Slight shadow lift (0 2px 8px rgba(0,0,0,0.1)), background darkens by 5–10%

### Cards

- **Background:** white (light mode), card color (dark mode)
- **Border:** 1px neutral-200 (light), 1px neutral-800 (dark)
- **Padding:** 12px md (internal spacing rule)
- **Border radius:** `lg` (8px standard, `xl` for emphasized cards)
- **Shadow:** `0 1px 3px rgba(0,0,0,0.08)` (subtle, always present)
- **Hover (if interactive):** 0 4px 12px rgba(0,0,0,0.12), border shifts to primary

### Form Inputs

- **Padding:** 10px vertical / 12px horizontal
- **Border:** 1px neutral-300, radius `md` (6px)
- **Background:** neutral-50
- **Focus:** 1px primary border, ring primary with 0.1 opacity
- **Placeholder:** neutral-500, 50% opacity
- **Error state:** red border, light red background

### Task Cards (Symphony-specific)

- **Default:** white card, 1px neutral-200 border, 12px padding
- **Selected:** 2px primary border (left accent bar alternativey), background: primary with 5% opacity
- **Task state badges:**
  - `backlog`: gray neutral-300
  - `queued`: blue (info)
  - `running`: amber (warning), pulse animation
  - `review`: purple (primary)
  - `done`: emerald (success)
  - `failed`: red (error)
- **Metadata row:** smaller text (xs size), neutral-500 color, `tabular-nums` for alignment

### Kanban Columns

- **Background:** transparent or subtle neutral-50
- **Header:** 12px padding, medium (500 weight) semibold text
- **Height:** full viewport minus header (scrollable content)
- **Drag state:** 2px dashed primary border around active column
- **Empty state:** centered text, "No tasks here", neutral-400 color

### Status Indicators

- **Dot badge:** 8px circle, semantic colors, left-aligned in cards/rows
- **Text badge:** 16px height, 6px horizontal padding, `full` radius, semibold text, semantic backgrounds
- **Pulse animation (active/running):** background pulses between color and 70% opacity, 2s cycle

### Metrics Display

- **Metric card:** Card component with centered layout
- **Large number:** `2xl` size, 600 weight, primary color
- **Label:** `xs` size, 500 weight, neutral-500 color
- **Trend arrow:** small icon (↑↓), semantic color (success/error)
- **Background:** subtle gradient (color 3% opacity), provides context without clutter

---

## Safe Choices (Category Baselines)

1. **Utilitarian typeface pairing** — Geist + DM Sans matches developer tool conventions. No decorative or playful fonts.
2. **Muted color palette with high-saturation semantic colors** — Developers expect clarity. Neutrals dominate; colors carry meaning only.
3. **Restrained motion** — Animations serve comprehension (state transitions, feedback), not entertainment.
4. **Left sidebar navigation + main content area** — Standard app layout. Predictable, efficient.
5. **Data-first layout** — No wasted space, no big hero images. Tables, lists, metrics pack information.

---

## Risks (Where T3 Code Stands Out)

### Risk 1: Industrial Aesthetic Over Friendly SaaS Default

- **What:** Using cool grays, minimal decoration, and system fonts instead of the industry-standard "friendly" blue + rounded buttons + emoji approach.
- **Why it works:** Developers don't want "friendly." They want trustworthy. This signals: this tool is serious, it's built by people who respect your time, it will run your agent tasks reliably.
- **What you gain:** Brand clarity, developer trust, visual coherence across the platform.
- **What it costs:** Less approachable for non-technical users (acceptable tradeoff for the target audience).

### Risk 2: Purple-Blue Primary Instead of Safe Blues

- **What:** Using `oklch(0.488 0.217 264)` (purple-blue) as the primary color instead of the ubiquitous SaaS blue (#3b82f6).
- **Why it works:** Purple is emerging in AI/agent tools (signals "smart," "forward-thinking"). Blue is now a cliché. Purple + cool grays read as sophisticated without being flashy.
- **What you gain:** Visual differentiation, modern (but not trendy) feel, memorable brand color.
- **What it costs:** Less familiar than blue (minor learning curve for users).

### Risk 3: Kanban Board as the Central Metaphor

- **What:** Structuring Symphony around a Kanban board (backlog → queued → running → review → done) instead of a linear task list or timeline.
- **Why it works:** Kanban is the mental model for task orchestration. It's visual, it scales to many tasks, and it maps directly to task states. Developers already think this way.
- **What you gain:** Natural task management UX, room for future drag-and-drop interactions, visual feedback on bottlenecks.
- **What it costs:** Requires careful implementation to avoid clutter (mitigation: fixed column widths, scrollable cards, collapsible columns).

---

## Implementation Priorities

### Phase 1 (Quick Wins)

1. Update Symphony dashboard card styling (borders, padding, shadows per spec)
2. Implement task state badges with semantic colors and pulse animation
3. Add metric cards to Metrics component with large numbers, labels, trend indicators
4. Ensure all text uses correct font sizes, weights, and colors per scale

### Phase 2 (Interaction & Feedback)

1. Implement hover states on task cards (shadow, border color)
2. Add motion to Kanban board (card flip/expand 200ms, `enter` easing)
3. Implement loading skeleton pulses in run history
4. Add toast notifications with semantic colors and smooth entry

### Phase 3 (Polish & Refinement)

1. Responsive layout: stack columns on tablet, single column on mobile
2. Dark mode: test all colors, adjust saturation per spec
3. Accessibility: ensure all interactions have keyboard alternatives
4. Performance: lazy-load run history, virtual scroll for long task lists

---

## Decisions Log

| Date       | Decision                         | Rationale                                                                            |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| 2026-03-21 | Industrial-Utilitarian aesthetic | Developer audience demands clarity and professionalism over friendliness             |
| 2026-03-21 | Purple-blue primary color        | Differentiates from SaaS blue cliché, signals AI/agent sophistication                |
| 2026-03-21 | DM Sans body + Geist display     | Proven readability at small sizes, modern but not trendy, supports tabular alignment |
| 2026-03-21 | Kanban board as central metaphor | Maps to task state machine, natural mental model for orchestration                   |
| 2026-03-21 | Minimal motion (functional only) | Respects developer time, performance-conscious approach                              |
| 2026-03-21 | Restrained color palette         | High-saturation semantic colors (success/warning/error), neutrals as defaults        |
