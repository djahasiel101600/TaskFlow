# Task view / edit / update / delete — roles and owners inspection

## Current behavior (summary)

**Visibility (implemented):** A task is visible only to its **creator** and to users **assigned** to it (`assigned_to` or in `assignees`). Only **superusers** can see all tasks; staff and `can_view_tasks` no longer grant “see all”.

**Operations:** The **creator** of a task can always **edit** and **delete** it. Other users who can see the task (assignees) can only **view** and **comment** unless their role has `can_edit_tasks` / `can_delete_tasks` (e.g. admins).

### Backend (Django)

| Action | Permission / rule | Where |
|--------|-------------------|--------|
| **List tasks** | Authenticated + `can_view_tasks`. Queryset: **only tasks where user is creator, assigned_to, or in assignees**. Superuser sees all. | `tasks/views.py` `_visible_tasks()`, `tasks/permissions.py` `user_can_see_all_tasks` (superuser only) |
| **View one task** | Same visibility: creator or assignee (or superuser). | `TaskDetailView.get_queryset`, `user_can_view_task()` |
| **Create task** | `can_create_tasks` (role). Creator set to `request.user`. | `TaskPermissions.has_permission` POST, `perform_create` |
| **Update task (PATCH/PUT)** | Creator can always edit; others need `can_edit_tasks` and must be able to view task. | `TaskPermissions.has_object_permission` |
| **Delete task** | Creator can always delete; others need `can_delete_tasks` and must be able to view task. | `TaskPermissions.has_object_permission` |
| **Comment** | Must be able to view task and be creator or in assignees. | `TaskCommentListCreateView.perform_create` + `user_can_view_task` |
| **Links (add/delete)** | Must be able to view task. No separate “edit” check. | `TaskLinkListCreateView`, `TaskLinkDetailView.check_object_permissions` |
| **Attachments** | List/view: if user can view task. Create: task creator or `can_edit_tasks`. Delete: task creator, uploader, or `can_edit_tasks`. | `attachments/views.py`, `attachments/permissions.py` |

**Roles (from `create_roles`):**

- **Auditor**: `can_view_tasks`, `can_create_tasks`, `can_edit_tasks` (no delete, no assign).
- **Supervisor**: view, create, edit, assign, change status, chat.
- **Support Staff**: view, create, edit, chat.
- **Administrator**: all, including `can_delete_tasks`, `can_manage_users`.

**Edit/delete:** Creator can always edit and delete their own task. Others need `can_edit_tasks` / `can_delete_tasks` to edit/delete tasks they can see (e.g. as assignees).

### Frontend

| Location | Behavior |
|----------|----------|
| **Tasks list page** | “New task” button always shown. No check for `can_create_tasks`. |
| **Task list view** | No per-row edit/delete; only link to task detail. |
| **Kanban** | “Add task” per column and in empty state always shown. No `can_create_tasks` check. |
| **Task detail page** | `canEdit` = `role_detail?.can_edit_tasks ?? isAdmin`, `canDelete` = `role_detail?.can_delete_tasks ?? isAdmin`, `canAssign` = `role_detail?.can_assign_tasks ?? isAdmin`. Edit/delete/assign UI hidden when false. `canComment` = user is creator or in assignees (matches backend). |
| **Create task dialog** | Shown by list/kanban; assignee picker gated by `can_assign_tasks`. No gate on opening the dialog (so 403 on submit if no `can_create_tasks`). |

**Auth:** Login returns `UserSerializer` (includes `role_detail`). Refresh only returns tokens; frontend keeps existing `user` so `role_detail` remains.

---

## Gaps and inconsistencies

1. **Create task**
   - Backend requires `can_create_tasks` for POST.
   - Frontend shows “New task” and “Add task” to everyone. Users without permission get 403 on submit.
   - **Recommendation:** Hide “New task” and Kanban “Add task” when the user does not have `can_create_tasks` (using `user?.role_detail?.can_create_tasks` or equivalent).

2. **Edit/delete are role-only**
   - Today: only role flags (`can_edit_tasks`, `can_delete_tasks`) matter; ownership does not.
   - If you want “creator can always edit/delete own task” or “assignees can edit”, that is not implemented.
   - **Recommendation (optional):** Add owner/assignee-based rules (see below).

3. **`can_change_task_status`**
   - Role has the flag; backend never checks it. Any PATCH that can update the task can change status (governed only by `can_edit_tasks`).
   - **Recommendation (optional):** In `TaskDetailView.perform_update` (or a serializer/service), reject status changes unless `user_has_perm(user, "can_change_task_status")` (or allow when `can_edit_tasks` for backward compatibility).

4. **403 on create/edit/delete**
   - Frontend may show a generic error. Users without permission don’t get a clear “You don’t have permission to…” message.
   - **Recommendation:** On 403 from tasks/attachments APIs, show a short, specific message (e.g. “You don’t have permission to create tasks” or “to edit this task”).

5. **Per-task permission in API**
   - Frontend infers edit/delete from global role only. Backend could expose per-task flags so the UI can show “you can edit this one” vs “you can only view”.
   - **Recommendation (optional):** Add to task payload (or a dedicated endpoint) fields like `can_edit`, `can_delete` computed from role + ownership so the UI stays in sync with backend rules.

---

## Suggested implementations

### 1. Gate “New task” and “Add task” on `can_create_tasks` (high impact, small change)

- **Tasks list page:** Only show the “New task” button if `user?.role_detail?.can_create_tasks ?? user?.is_staff ?? user?.is_superuser`.
- **Kanban:** Pass a prop e.g. `canAddTask={user?.role_detail?.can_create_tasks ?? ...}` and only show “Add task” buttons when true.
- **Create task dialog:** Can stay openable from elsewhere (e.g. deep link); submit will still 403 if no permission. Optionally hide or disable the main entry points above so most users never hit 403.

### 2. (Optional) Owner/assignee-based edit and delete

If you want “creator can always edit/delete own task” or “assignees can edit”:

**Backend**

- In `tasks/permissions.py`, extend `TaskPermissions.has_object_permission`:
  - **Edit:** Allow if `user_has_perm(request.user, "can_edit_tasks")` **or** `obj.created_by_id == request.user.id` **or** (if you want) `request.user.id in obj.assignees.values_list('id', flat=True)`.
  - **Delete:** Allow if `user_has_perm(request.user, "can_delete_tasks")` **or** `obj.created_by_id == request.user.id` (optional: restrict delete to creator-only).
- Adjust so role permission still allows edit/delete for “any visible task” when the role has the flag; owner/assignee adds an extra path.

**Frontend**

- Compute `canEdit` / `canDelete` per task using both role and ownership, e.g.:
  - `canEdit = (role_detail?.can_edit_tasks ?? isAdmin) || task.created_by === user?.id || (task.assignees ?? []).includes(user?.id)`
  - `canDelete = (role_detail?.can_delete_tasks ?? isAdmin) || task.created_by === user?.id`
- Alternatively, if backend adds `can_edit` / `can_delete` on the task, use those.

### 3. (Optional) Enforce `can_change_task_status` on status updates

- In `TaskDetailView.perform_update`, when `validated_data.get("status")` is present and different from current:
  - Allow only if `user_has_perm(request.user, "can_change_task_status")` or `user_has_perm(request.user, "can_edit_tasks")` (if you want edit to imply status change).
- Return 403 with a clear message if the user is not allowed to change status.

### 4. Friendlier 403 handling in the UI

- In the API client or in the create/edit/delete handlers:
  - On response status 403, show a toast or inline message such as: “You don’t have permission to create tasks” / “to edit this task” / “to delete this task”.
- Optionally parse a backend message if you add one (e.g. `detail` or `message` in the JSON body).

### 5. (Optional) Per-task `can_edit` / `can_delete` in API

- In `TaskSerializer`, add read-only fields, e.g.:
  - `can_edit` = computed from current user (role + ownership rules same as backend permission).
  - `can_delete` = same idea.
- Frontend uses `task.can_edit` / `task.can_delete` for detail page and, if you add row actions, for list/kanban. Keeps UI aligned with backend after any permission change.

---

## Checklist (what to implement)

| Item | Priority | Notes |
|------|----------|--------|
| Hide “New task” when user lacks `can_create_tasks` | High | TasksListPage + pass user/flag to header. |
| Hide Kanban “Add task” when user lacks `can_create_tasks` | High | TaskKanbanView: prop or use auth store. |
| Show clear message on 403 for create/edit/delete | Medium | API client or task/attachment handlers. |
| Owner/assignee-based edit (and optionally delete) | Low | Backend permissions + frontend canEdit/canDelete. |
| Enforce `can_change_task_status` on PATCH | Low | Backend only; optional. |
| Per-task `can_edit` / `can_delete` in API | Low | Serializer + frontend use. |

If you tell me which of these you want (e.g. “do 1 and 2 and 4”), I can outline or apply the exact code changes next.
