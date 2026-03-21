# Claude's Guide to T3 Code

## Design System

**Always read [DESIGN.md](./DESIGN.md) before making any visual or UI decisions.**

All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

### Quick Reference

- **Primary color:** `oklch(0.488 0.217 264)` (purple-blue) — for buttons, links, active states
- **Semantic colors:** success (#10b981), warning (#f59e0b), error (#ef4444), info (#3b82f6)
- **Fonts:** Geist (display), DM Sans (body/UI), SF Mono (code)
- **Spacing base:** 4px unit. Common: 8px (xs), 12px (md), 16px (lg), 24px (xl)
- **Border radius:** 6px (md), 8px (lg), 12px (xl)
- **Motion:** Minimal, functional only. Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for enter, 150–250ms duration
- **Layout:** 12-column grid (desktop), max width 1440px, fixed 280px sidebar, 320px Kanban columns

### When building features:

1. Check DESIGN.md typography scale (11px–32px sizes)
2. Use semantic colors: don't make up custom colors
3. Apply spacing in 4px multiples
4. Motion: only for state transitions and feedback (no decorative animations)
5. Components: reference the Cards, Buttons, Forms sections in DESIGN.md

## Project Structure

See [AGENTS.md](./AGENTS.md) for full project architecture, Codex integration, and Symphony orchestration details.

## Symphony Dashboard

Symphony manages autonomous agent task orchestration. Task state flow:

- **backlog** → **queued** → **running** → **review** → **done** (or **failed**)

Key components:

- `SymphonyDashboard.tsx` — Main layout, task event handling
- `SymphonyBoard.tsx` — Kanban board view
- `SymphonyTaskCard.tsx` — Individual task card (design: card component + task-specific styling)
- `SymphonyMetrics.tsx` — Metrics display (design: metric cards with large numbers)
- `SymphonyRunHistory.tsx` — Run execution history

When styling Symphony components, respect the Kanban column widths (320px), task card padding (12px), and state badge colors (semantic from DESIGN.md).
