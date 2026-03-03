# Goals Review: Task Creation, Scheduling, Reminders & Alarms

This document reviews the app against these goals:

- **Create and schedule tasks**
- **Set reminders** to keep track of what you need to do
- **Plan ahead** to prioritize jobs and be productive
- **Scheduled tasks and reminders** should work **like alarms** and notify the user

---

## ✅ What’s Already There

### Create and schedule tasks
- **Create task:** Title, description, **priority** (low / medium / high / urgent), status, assignees, **deadline** (date-time), **reminder** (date-time).  
  *(Create task dialog + task detail edit.)*
- **Backend:** `Task` has `deadline`, `reminder_datetime`, `priority`; API supports create/update with these fields.
- **Views:** List, Kanban, and Calendar views; tasks can be ordered by `deadline` or `priority`.

### Set reminders
- **Reminder field:** Optional “Reminder” date-time when creating or editing a task.
- **Backend:** Celery Beat runs every minute; for tasks with `reminder_datetime <= now` it creates a **Reminder** notification (and similarly for **deadline**).
- **Recipient:** Assignee or creator gets the notification.

### Plan ahead / prioritize
- **Priority:** Shown and editable (create + task detail); list/kanban show priority badges; API supports `ordering=priority` or `ordering=deadline`.
- **Dashboard:** “My Tasks”, “Overdue”, “Upcoming Deadlines” (count), “Notifications”; “Overdue” and “My Tasks” link to filtered task list.
- **Task detail:** Edit priority, deadline, reminder; status history and comments support accountability.

### Notifications (alarm-like)
- **Delivery:** When a reminder or deadline fires, backend creates a `Notification` and pushes it over **Redis channel layer** to the user’s WebSocket.
- **Frontend:** Layout subscribes to `/ws/notifications/`; on message it adds to the notification list and calls **`playNotificationSound()`** (short beep).
- **In-app:** Bell icon with unread count; notifications list with title, message, link to task.

---

## ⚠️ Gaps for “Like Alarms”

1. **Sound is subtle**  
   Current sound is a short (0.2s), quiet (0.2 gain) sine beep. It’s easy to miss; alarms are usually more noticeable (e.g. longer or repeated).

2. **No notification when tab is in background**  
   If the user is in another tab or app, they only get the in-app sound and list update. There is **no use of the browser/OS Notification API**, so there’s no system pop-up or sound when the tab isn’t focused.

3. **“Upcoming Deadlines” doesn’t link to tasks**  
   The dashboard shows the count but the card doesn’t link to a task list (e.g. “View tasks by deadline”); “My Tasks” and “Overdue” do link.

4. **Copy could stress “alarm”**  
   Create-task reminder helper says “You’ll get a notification at this time.” It could explicitly say it will notify with a sound (and, if we add it, a browser notification) “like an alarm.”

---

## Summary

| Goal                         | Status | Notes |
|-----------------------------|--------|--------|
| Create and schedule tasks   | ✅ Met | Deadline + reminder date-time; priority; list/kanban/calendar. |
| Set reminders               | ✅ Met | Optional reminder per task; Celery creates notification at that time. |
| Plan ahead / prioritize     | ✅ Met | Priority, ordering, dashboard (overdue, upcoming count); “Upcoming Deadlines” links to tasks by deadline. |
| Notify like alarms          | ✅ Improved | In-app double-beep sound for reminder/deadline; browser/OS notification when tab is in background; copy says “like an alarm.” |

**Recent improvements:** Reminder and deadline notifications now use a stronger double-beep sound; when the tab is in background the browser can show a system notification (if the user grants permission); the “Upcoming Deadlines” card links to the task list ordered by deadline; and the create-task reminder copy says it will notify “like an alarm.”
