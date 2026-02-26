# Project Requirements Document (PRD)

## Task & Communication Management System

Client: Office of the Auditor (COA)  
Primary Users: Auditors, Supervisors, Support Staff  
Tech Stack: Vite + React + TypeScript + TailwindCSS + shadcn/ui +
Zustand + Axios  
Backend: Django + Django REST Framework + JWT + WebSockets (Django
Channels)

---

## 1. Purpose of the System

The system will serve as an internal Task & Communication Management
Platform for the Office of the Auditor (COA), enabling staff to:

- Manage operational and administrative tasks
- Assign responsibilities across roles
- Communicate in real-time
- Track deadlines, reminders, and statuses
- Receive notifications and alerts

The application must prioritize:

- Simplicity
- Speed
- Auditability
- Clear accountability
- Real-time updates

---

## 2. User Roles & Permissions

### 2.1 Roles

The system will support role-based access control (RBAC).

Initial Roles:

- Auditor
- Supervisor
- Support Staff
- Administrator

Roles must be extensible for future COA needs.

---

### 2.2 Permission Model

Each role will have configurable permissions.

Capabilities:

- View Tasks
- Create Tasks
- Edit Tasks
- Delete Tasks (permission-restricted)
- Assign Tasks
- Change Task Status
- Access Chat
- Manage Users (Admin only)

Permissions must be enforced both at the frontend (UI gating) and
backend (authoritative security).

---

## 3. Core Features

### 3.1 Authentication & Security

Backend: JWT Authentication

Requirements:

- Login via username/email + password
- Access Token + Refresh Token flow
- Token auto-refresh mechanism
- Secure storage strategy
- Role-aware session handling
- Logout invalidation

Security Considerations:

- Password hashing
- Rate limiting
- CSRF protection where applicable
- Permission validation at API level

---

### 3.2 Task Management Module

Central feature of the system.

#### Task Entity Structure

Each task must include:

- id
- title
- description
- created_by
- assigned_to
- priority (Low / Medium / High / Urgent)
- status (Pending / Ongoing / Finished / Cancelled)
- deadline
- reminder_datetime
- attachments
- created_at
- updated_at

---

#### Task Functionalities

Users must be able to:

- Create tasks
- Edit tasks
- Delete tasks (restricted)
- Assign tasks
- Update task status
- Add attachments
- Set deadlines & reminders

---

#### Task Views

UI must support:

- List View
- Kanban Board
- Calendar View
- My Tasks Filter
- Role-based Filtering
- Search & Sorting

---

### 3.3 Task Assignment Logic

Assignment must support:

- Assign to individual users
- Assign to roles/groups
- Reassignment tracking
- Assignment history (audit trail)

---

### 3.4 Task Status System

Statuses:

- Pending
- Ongoing
- Finished
- Cancelled
- Overdue (derived state)

Rules:

- Deadline breach → Overdue indicator
- Status updates trigger real-time events

---

### 3.5 Reminder & Deadline System

Behavior:

- Reminder triggers notification
- Deadline triggers alert
- Overdue triggers persistent warning

---

### 3.6 Notifications System

Notification Types:

- Task Assigned
- Task Updated
- Reminder Triggered
- Deadline Reached
- Chat Message Received

Notification Behavior:

- Real-time delivery (WebSockets)
- Sound alerts
- Visual badge counters
- Dismissible UI
- Notification history

---

### 3.7 Real-Time Chat Module

Chat Features:

- One-to-one chat
- Group chat / Channels
- Message timestamps
- File attachments
- Real-time delivery

Message Entity:

- id
- sender
- channel / recipient
- content
- attachments
- timestamp

---

### 3.8 Attachments Handling

Applicable to Tasks and Chat.

Requirements:

- File upload API
- Secure storage
- Size limits
- Allowed file types

---

### 3.9 Dashboard / Home Screen

Must display:

- My Tasks Summary
- Overdue Tasks
- Upcoming Deadlines
- Recent Activity
- Notifications

---

### 3.10 Activity & Audit Trail

System must record:

- Task creation
- Task edits
- Status changes
- Assignments
- Deletions

---

## 4. Real-Time Architecture

Technology: WebSockets via Django Channels

Used for:

- Notifications
- Task updates
- Chat messages

---

## 5. Frontend Architecture -- Feature-Sliced Design (FSD)

The frontend must strictly follow FSD.

Layer Structure:

src/ ├── app/ ├── pages/ ├── widgets/ ├── features/ ├── entities/ ├──
shared/

Rules:

- No business logic in shared/ui
- Features orchestrate behavior
- Entities represent domain models
- Pages compose widgets & features

---

## 6. State Management

Library: Zustand

Used for:

- Auth state
- Notifications
- Chat state
- UI state

---

## 7. API Communication

Library: Axios

Requirements:

- Centralized Axios instance
- JWT interceptor
- Error handling strategy

---

## 8. Backend Architecture

Django + DRF Modules:

- Users / Roles
- Tasks
- Notifications
- Chat
- Attachments
- Audit Logs

Authentication: JWT-based

WebSockets: Django Channels

---

## 9. Non-Functional Requirements

### Performance

- Instant UI updates
- Pagination for large datasets

### Security

- Role-based enforcement
- Input validation
- File upload protection

### Usability

- Minimal clicks for common actions
- Clear visual status indicators

### Reliability

- Graceful WebSocket reconnect
- Token expiration handling

---

## 10. Future Enhancements

- Task templates
- Recurring tasks
- Email notifications
- Analytics & reports
- Dark mode
- Presence indicators

---

## 11. Success Criteria

System is successful when:

- Staff can manage tasks easily
- Assignments are clear and traceable
- Deadlines are not missed
- Communication is centralized
- UI feels fast and responsive

