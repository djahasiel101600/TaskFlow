# TaskKanbanView — UI/UX improvement suggestions

## Already in good shape
- Clear column headers with counts; drag-over state on columns; priority and overdue cues on cards; empty-state CTA; horizontal scroll on small screens.

---

## 1. Accessibility
- **Column regions**: Give each column a `role="region"` and `aria-label` (e.g. "Pending, 3 tasks") so screen readers know the layout.
- **Cards**: Use a focusable control to open the task (e.g. `<Link>` or `role="button"` with `tabIndex={0}` and Enter/Space). Right now the card is `draggable` and `onClick`; keyboard users can’t focus and open the card. Prefer `<Link to={...}>` wrapping the card content (or the whole card) so keyboard and "Open in new tab" work.
- **Drag and drop**: Add `aria-grabbed` / live region when moving a task, or at least ensure the card has `aria-label` with task title so it’s announced.

**Implemented**: Column `aria-label` and `role="region"`; card wrapped in `Link` for keyboard and right-click.

---

## 2. Drag feedback
- **While dragging**: Reduce opacity of the source card (e.g. `opacity-50`) so it’s clear which card is being moved. Optionally set a custom drag image.
- **Drop target**: When `isDragOver`, add a clearer “drop here” cue: e.g. a dashed border and/or a small “Drop here” strip at the bottom of the column so the drop zone is obvious.

**Implemented**: Source card gets `opacity-50` during drag; column shows a “Drop here” strip when dragging over it.

---

## 3. Column identity
- **Status accent**: Give each column header a small accent (e.g. left border or dot) by status: Pending (muted), Ongoing (primary), Finished (success/green), Cancelled (muted). Helps scanning.
- **Emphasize active columns**: Slightly mute “Finished” and “Cancelled” (e.g. opacity or background) so “Pending” and “Ongoing” stand out.

---

## 4. Cards
- **Title tooltip**: When the title is truncated (`line-clamp-2`), show the full title on hover (`title={t.title}` or a proper tooltip component).
- **Hover lift**: Add a small translate on hover (e.g. `hover:-translate-y-0.5`) for a light “lift” effect.
- **Consistent radius**: Use `rounded-lg` on cards to match the rest of the app if the design system uses it elsewhere.

**Implemented**: `title={t.title}` on the title element; optional hover lift.

---

## 5. Empty state & add task
- **Empty column**: Add a short line like “Drag tasks here” in the empty state so drag-and-drop is discoverable.
- **Add task button**: When the column has tasks, the bottom “Add task” could be slightly more visible (e.g. border or icon-only on mobile to save space).

**Implemented**: “Drag tasks here” in empty state.

---

## 6. Layout & scroll
- **Scroll hint**: When the board overflows horizontally, add a fade or shadow on the right edge (e.g. a gradient overlay) to suggest more content.
- **Scroll snap**: Use `scroll-snap-type: x mandatory` and `scroll-snap-align: start` on columns so horizontal scroll snaps column-by-column on touch devices.
- **Padding**: Ensure the last column has enough padding at the end (e.g. `pr-4` on the scroll container or padding on the last column).

---

## 7. After drop
- **Success feedback**: After a successful status update, show a short toast (“Task moved to Ongoing”) or an inline checkmark so the user knows the action succeeded.
- **Optimistic update**: Update the local state immediately when dropping, then revert if the API fails, so the board feels instant.

---

## 8. Performance (if needed later)
- If columns can have many tasks (e.g. 50+), consider virtualizing the card list per column (e.g. `react-window`) so only visible cards are rendered.

---

## Summary of implemented changes (in component)
- Column `role="region"` and `aria-label` with status and count.
- Card content wrapped in `Link` for keyboard and “Open in new tab”.
- Dragging source card: `opacity-50` (track `draggingTaskId`).
- Drop zone: when `isDragOver`, show a “Drop here” strip at the bottom of the column.
- Title: `title={t.title}` for tooltip when truncated.
- Empty state: “Drag tasks here” line added.
