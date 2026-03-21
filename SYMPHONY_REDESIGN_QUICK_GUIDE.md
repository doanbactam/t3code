# Symphony Redesign - Quick Visual Guide

## 📱 Layout Comparison

### BEFORE (Sidebar Design)

```
┌─────────────────────────────────┬─────────────────┐
│      Kanban Board               │  Task Details   │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐      │  (28rem fixed)  │
│  │ T │ │ Q │ │ R │ │ D │      │                 │
│  │ A │ │ U │ │ U │ │ O │      │  Overview       │
│  │ S │ │ E │ │ N │ │ N │      │  Runs           │
│  │ K │ │ U │ │ N │ │ E │      │  Actions        │
│  │   │ │ E │ │ I │ │   │      │                 │
│  │ 1 │ │ D │ │ N │ │ 5 │      │  [Edit] [Delete]│
│  │ 2 │ │ 3 │ │ 4 │ │   │      │                 │
│  │ 7 │ │   │ │   │ │   │      │                 │
│  └───┘ └───┘ └───┘ └───┘      │                 │
│                                 │                 │
└─────────────────────────────────┴─────────────────┘
     XL screens: Sidebar always visible
     Mobile: Sheet overlay slides in from right
```

### AFTER (Modal Design)

```
┌──────────────────────────────────────────────┐
│          Kanban Board (Full Width)            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│  │ T │ │ Q │ │ R │ │ D │ │ F │ │ R │       │
│  │ A │ │ U │ │ U │ │ O │ │ A │ │ E │       │
│  │ S │ │ E │ │ N │ │ N │ │ I │ │ V │       │
│  │ K │ │ U │ │ N │ │ E │ │ L │ │ I │       │
│  │ 1 │ │ E │ │ I │ │ 5 │ │ E │ │ E │       │
│  │ 2 │ │ D │ │ N │ │ 6 │ │ D │ │ W │       │
│  │ 7 │ │ 3 │ │ 4 │ │   │ │   │ │   │       │
│  │   │ │   │ │   │ │   │ │   │ │   │       │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘       │
│                                              │
└──────────────────────────────────────────────┘

     Click any card → Modal appears:

         ┌──────────────────────┐
         │  Task Title      ✕   │
         │  Task description...  │
         │                      │
         │ [State] [Priority]   │
         │                      │
         │ Overview │ Runs │... │
         ├──────────────────────┤
         │ Metadata display     │
         │ State: Running       │
         │ Priority: High       │
         │ Created: Mar 21      │
         │                      │
         │ [Edit Task]          │
         │ [Delete Task]        │
         └──────────────────────┘

     Click X, Esc, or outside → Modal closes
     Board continues full-width
```

---

## 🖱️ User Interactions

### Scenario 1: View Task Details

```
1. User scans Kanban board
2. Sees task card they're interested in
3. Clicks the card
4. Modal dialog appears with full details
5. Reads overview, metadata, description
6. Closes modal (X button, Esc key, click outside)
7. Back to full Kanban board
```

### Scenario 2: Retry Failed Task

```
1. User clicks failed task card
2. Modal opens showing failure details
3. User clicks "Actions" tab
4. User clicks "Retry Task" button
5. Modal stays open (doesn't close automatically)
6. User can watch progress in "Runs" tab
7. New attempt appears in run history
8. User closes modal when satisfied
```

### Scenario 3: Move Task to Queue

```
1. User clicks backlog task
2. Modal opens
3. Switches to "Actions" tab
4. Clicks "Move to Queued" button
5. Task moves in database, event broadcasts
6. Orchestrator picks up task
7. User can watch runs appear
8. Closes modal
```

---

## 📊 Tab Structure

### Overview Tab

```
┌────────────────────────────────┐
│ Title: Ship symphony UI redesign│
│ Desc: Full-screen modal dialog  │
│                                │
│ Task Info Section:             │
│  • State: Running              │
│  • Priority: High              │
│  • Created: Mar 21, 2:15pm     │
│  • Updated: Mar 21, 3:20pm     │
│                                │
│ Description Section:           │
│ [Full task description shown]   │
│                                │
│ Labels Section:                │
│ [frontend] [urgent] [feature]  │
│                                │
│ Run Count: 3 runs              │
└────────────────────────────────┘
```

### Runs Tab

```
┌────────────────────────────────┐
│ Run History:                   │
│ • Attempt #3 [completed] ←─ ✓  │
│   started: Mar 21 3:15pm       │
│ • Attempt #2 [failed] ✗        │
│   Error: Task timeout          │
│ • Attempt #1 [running]         │
│   started: Mar 21 2:15pm       │
│                                │
│ Run Output:                    │
│ [Status Badge] [Timing] [Tokens]
│ 🟢 completed | 5min 32s        │
│ Prompt tokens: 2,140           │
│ Completion tokens: 1,823       │
│ Total tokens: 3,963            │
│                                │
│ Prompt:                        │
│ [Markdown rendered prompt]     │
│                                │
│ Output/Error:                  │
│ [Agent response or error msg]  │
└────────────────────────────────┘
```

### Actions Tab

```
┌────────────────────────────────┐
│ Task Actions                   │
│                                │
│ Move to state:                 │
│ [Backlog] [Queued] [Running]   │
│ [Review]  [Done]   [Failed]    │
│                                │
│ Execution:                     │
│ [Stop Task]  ← enabled if run  │
│ [Retry Task] ← enabled if fail │
│                                │
│ Management:                    │
│ [✏ Edit Task]                  │
│ [🗑 Delete Task]               │
│                                │
│ Status: Ready                  │
└────────────────────────────────┘
```

---

## ✨ Key Improvements

| Aspect              | Before               | After                 |
| ------------------- | -------------------- | --------------------- |
| **Board Space**     | 50% (28rem sidebar)  | 100% (full width)     |
| **Card Visibility** | Fewer cards per row  | More cards visible    |
| **Drag Space**      | Cramped (half width) | Spacious (full width) |
| **Mobile**          | Overlay (jarring)    | Modal (native)        |
| **Focus**           | Sidebar + board      | Just modal (focused)  |
| **Close**           | Manual button        | Esc/click outside     |
| **Code**            | Sidebar state logic  | Simple open/close     |

---

## 🎯 When Dialog Appears

- ✅ Click on any task card
- ✅ Task has non-null values
- ✅ User wants to see full details
- ✅ User wants to execute actions

## When Dialog Closes

- ✅ Click X button in header
- ✅ Press Escape key
- ✅ Click outside modal (backdrop)
- ✅ Browser back button
- ✅ Select another task (replaces content)
- ✅ Delete current task (auto-closes)

---

## 🚀 Migration Notes

**For Users:**

- No training needed - modal is standard UI pattern
- More comfortable experience on all devices
- Keyboard shortcuts work (Esc to close)

**For Developers:**

- Removed: `sidebarOpen` state management
- Removed: XL breakpoint sidebar logic
- Added: Dialog component and tab state
- Net: ~60 lines removed, cleaner code

---

## ✅ Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (full modal)

---

**Status:** Ready for production deployment.
