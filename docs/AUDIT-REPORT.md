# TaskFlow — Comprehensive Audit Report

_Generated: May 21, 2026_

---

## 1. Project Purpose Summary

TaskFlow is an internal **Task & Communication Management Platform** for the Office of the Auditor (COA). It enables staff to manage operational tasks, assign responsibilities, communicate via real-time chat, track deadlines/reminders, and receive notifications. The platform enforces Role-Based Access Control (RBAC) with four built-in roles: Auditor, Supervisor, Support Staff, and Administrator.

---

## 2. Tech Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui pattern, Zustand, Axios |
| Backend    | Django 4.x, Django REST Framework, SimpleJWT, Django Channels, Celery      |
| Database   | PostgreSQL                                                                 |
| Real-time  | WebSockets via Django Channels + Redis                                     |
| Scheduling | Celery Beat (every-minute reminder checks)                                 |

---

## 3. Current Implementation Summary

### Backend (fully implemented)

- ✅ Custom `User` model with `Role` FK and full RBAC permission flags
- ✅ JWT authentication (login/refresh/blacklist) with username-or-email support
- ✅ Task CRUD: create, list (filter/search/order), retrieve, update, delete
- ✅ Task Comments and Links sub-resources
- ✅ Task Status History reconstructed from AuditLog
- ✅ Notifications module with WebSocket push via Django Channels
- ✅ Chat module: Channels (direct/group) + Messages + File Attachments
- ✅ Attachments module: task attachments with type/size validation
- ✅ Audit Logs: records create/update/delete/assign/status events
- ✅ Celery Beat scheduled task for reminder & deadline notifications
- ✅ Rate limiting on anonymous endpoints
- ✅ CORS + CSRF handling

### Frontend (mostly implemented)

- ✅ Login / Register pages with token auto-refresh
- ✅ Dashboard with stats (My Tasks, Overdue, Upcoming Deadlines, Notifications)
- ✅ Tasks page with List, Kanban Board, and Calendar views
- ✅ Task Detail page: status/priority, assignees, deadline, reminder, attachments (with preview), links, comments (real-time), status history timeline
- ✅ Chat page: channel list, message thread, file attachments, WebSocket real-time with auto-reconnect
- ✅ Notifications page: list with snooze/dismiss for alarm types
- ✅ Users page (admin): user table, approve/edit/delete, create user
- ✅ FSD (Feature-Sliced Design) folder structure
- ✅ Zustand for auth, notifications, alarms state
- ✅ Notification sound + browser notification API
- ✅ WebSocket notifications with alarm/snooze system

---

## 4. Completed Requirements (vs PRD)

| PRD Requirement                                  | Status |
| ------------------------------------------------ | ------ |
| RBAC (Auditor, Supervisor, Support Staff, Admin) | ✅     |
| JWT login with username/email + auto-refresh     | ✅     |
| Task entity with all required fields             | ✅     |
| Task CRUD with permission gates                  | ✅     |
| Task List / Kanban / Calendar views              | ✅     |
| My Tasks filter                                  | ✅     |
| Search & ordering                                | ✅     |
| Assignee tracking                                | ✅     |
| Deadline & reminder fields                       | ✅     |
| Reminder/deadline Celery job                     | ✅     |
| Overdue derived state                            | ✅     |
| Real-time notifications via WebSocket            | ✅     |
| Notification sound + browser alerts              | ✅     |
| Notification badge counter                       | ✅     |
| Dismissible notifications with snooze            | ✅     |
| Chat one-to-one and group channels               | ✅     |
| Real-time chat with WebSocket                    | ✅     |
| Chat file attachments                            | ✅     |
| Task attachments                                 | ✅     |
| Audit trail (create/update/delete/assign/status) | ✅     |
| WebSocket reconnect (chat)                       | ✅     |
| Token expiration handling                        | ✅     |
| FSD architecture                                 | ✅     |
| Zustand state management                         | ✅     |
| Centralized Axios with JWT interceptor           | ✅     |

---

## 5. Partially Completed Requirements

| PRD Requirement                                | Gap                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Task filters UI (role-based, status, priority) | Filters exist in backend but **no dropdown filter UI** on Tasks page                 |
| Assign to roles/groups                         | Only user assignment implemented; role assignment stored in DB but not exposed in UI |
| Status updates trigger real-time events        | Notifications sent but **no WebSocket broadcast for task status changes**            |
| Rate limiting                                  | Only on anon endpoints; no user-rate limiting on mutations                           |
| Pagination                                     | Backend paginates (page size 20) but **no pagination UI** in frontend                |
| Recent Activity on Dashboard                   | Stats shown but **no "Recent Activity" feed**                                        |

---

## 6. Missing Requirements

| PRD Requirement                         | Notes                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| Audit Logs frontend page                | API exists at `/api/audit-logs/` but **no frontend page**                               |
| Dark mode toggle                        | CSS variables are defined for dark mode but **no toggle UI**                            |
| Role management UI                      | Roles can only be managed via Django Admin                                              |
| Logout with server-side token blacklist | Frontend clears tokens but never calls a logout endpoint to blacklist the refresh token |

---

## 7. Bugs Found

### Backend Bugs

#### BUG-001 — DELETE Permission Not Enforced by Role

**File:** `backend/tasks/permissions.py` → `TaskPermissions.has_permission()`  
**Severity:** Medium-High (Security)  
**Description:** The `has_permission` method returns `True` for ALL DELETE requests without checking the user's `can_delete_tasks` role permission. Any authenticated user can _attempt_ any delete (though `has_object_permission` limits it to the task creator). This violates the RBAC model — the role permission flag `can_delete_tasks` is ignored.  
**Fix:** Change `return True` for DELETE to `return user_has_perm(request.user, "can_delete_tasks")`.

#### BUG-002 — Reminder Notifications Miss M2M Assignees

**File:** `backend/tasks/reminders.py`  
**Severity:** Medium (Functional)  
**Description:** `process_reminders_and_deadlines()` only sends reminder/deadline notifications to `task.assigned_to` (FK) or `task.created_by`. The M2M `task.assignees` are never notified. Since the UI primarily uses M2M assignees (`assignees.set()`), many users never receive reminders.  
**Fix:** Iterate over `task.assignees.all()` and send notifications to each.

#### BUG-003 — `user_can_see_all_tasks` Overly Restrictive

**File:** `backend/tasks/permissions.py`  
**Severity:** Low-Medium  
**Description:** `user_can_see_all_tasks` returns `True` only for `is_superuser`, not for `is_staff` users or those with an Administrator role. Staff/Admin users still only see their own tasks.  
**Fix:** Also return `True` for `is_staff` users or users whose role has all relevant permissions.

### Frontend Bugs

#### BUG-004 — `canComment` Excludes `assigned_to` Users

**File:** `frontend/src/pages/task-detail/TaskDetailPage.tsx`  
**Severity:** Medium (Functional)  
**Description:** `canComment` only checks `task.assignees.includes(user.id)` but not `task.assigned_to === user.id`. Users assigned via the FK field (not M2M) cannot post comments.  
**Fix:** Add `|| task.assigned_to === user.id` to the check.

#### BUG-005 — Chat Attachment URL Construction Broken

**File:** `frontend/src/pages/chat/ChatPage.tsx` → `getChatAttachmentUrl()`  
**Severity:** Low-Medium  
**Description:** The function prepends `/media/` to the file path, but the serialized `file` URL already contains the full `/media/chat_attachments/...` path, resulting in doubled `/media/media/` paths for file attachments in chat.  
**Fix:** Use the file path directly when it starts with `/media/`.

#### BUG-006 — `window.confirm` for Delete on Users Page

**File:** `frontend/src/pages/users/UsersPage.tsx`  
**Severity:** Low (UX)  
**Description:** Uses native `window.confirm()` which blocks the main thread, has inconsistent styling, and cannot be styled to match the application design.  
**Fix:** Replace with a proper `ConfirmDialog` component.

---

## 8. Risks & Security Concerns

| Issue                                     | Severity | Notes                                                                  |
| ----------------------------------------- | -------- | ---------------------------------------------------------------------- |
| DELETE permission bypass                  | Medium   | Any authenticated user can attempt deletes (mitigated at object level) |
| No logout endpoint called                 | Low      | Refresh token not blacklisted on frontend logout                       |
| Chat WebSocket unauthenticated            | Low      | Chat WS doesn't verify channel membership at WS level (only REST does) |
| `entrypoint.shhh` file in repo            | Low      | Probable typo; leftover file that shouldn't be committed               |
| No server-side rate limiting on mutations | Low      | Only anonymous endpoints throttled                                     |

---

## 9. Recommended Improvements

### High Priority

1. ✅ Fix BUG-001: DELETE permission check in `TaskPermissions`
2. ✅ Fix BUG-002: Send reminders to all M2M assignees
3. ✅ Fix BUG-004: `canComment` should include `assigned_to` check
4. Add **task filter UI** (status, priority dropdowns) to Tasks page
5. Add **toast/feedback system** for all mutation operations
6. Add **pagination controls** to the Tasks list
7. Add **Recent Activity** section to Dashboard

### Medium Priority

8. Add **Audit Logs** frontend page
9. Fix BUG-005: Chat attachment URL
10. Replace `window.confirm` with `ConfirmDialog`
11. Add **dark mode toggle**
12. Implement **logout endpoint** to blacklist refresh token

### Low Priority

13. Add **Role Management** page (list/edit roles)
14. Add **assign to role** functionality in task creation
15. Add **WebSocket task update** broadcasts for status changes
16. Clean up `entrypoint.shhh` file

---

## 10. Suggested Implementation Order

1. Backend bug fixes (permissions, reminders) — no breaking changes
2. Frontend bug fixes (canComment, chat URL)
3. Toast system — foundational for all user feedback
4. Task filter UI — most requested feature
5. Recent Activity section on Dashboard
6. Pagination controls
7. ConfirmDialog component
8. Dark mode toggle
9. Audit Logs page
10. Logout endpoint + blacklist

---

_Audit completed by: GitHub Copilot (Claude Sonnet 4.6)_
