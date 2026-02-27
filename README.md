# TaskFlow — COA Task & Communication Management

Internal Task & Communication Management Platform for the Office of the Auditor (COA): manage tasks, assignments, real-time chat, and notifications.

## Tech Stack

- **Frontend:** Vite + React + TypeScript + TailwindCSS + shadcn/ui + Zustand + Axios (Feature-Sliced Design)
- **Backend:** Django + Django REST Framework + JWT + WebSockets (Django Channels)

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
python manage.py migrate
python manage.py create_roles
python manage.py createsuperuser
python manage.py runserver
```

- API: http://127.0.0.1:8000/
- Admin: http://127.0.0.1:8000/admin/ (create users and assign roles here). Users created via `createsuperuser` are automatically given the **Administrator** role so they can manage users and assign roles.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173/
- Login with the superuser (or any user created in admin). Assign a **Role** to users so they have permissions (e.g. view/create/edit tasks, assign, chat).

## Project Structure

### Frontend (FSD)

- `src/app` — App setup, router, global styles
- `src/pages` — Route-level pages (Dashboard, Tasks, Chat, Notifications)
- `src/widgets` — Composite blocks (Layout, Task list/kanban/calendar views)
- `src/features` — User actions (auth login, create task)
- `src/entities` — Domain models (task types)
- `src/shared` — UI components, API client, stores, utils

### Backend

- `config` — Django settings, URLs, ASGI
- `users` — Custom User + Role, JWT auth, user/role APIs
- `tasks` — Task CRUD, filters, permissions, audit signal
- `notifications` — Notifications API
- `chat` — Channels, messages, WebSocket consumer
- `attachments` — File uploads for tasks
- `audit_logs` — Audit trail API

## UI/UX Standards (from PRD)

- **Simplicity** — Clear navigation, minimal clicks for common actions
- **Speed** — Instant feedback, pagination for large lists
- **Auditability** — Status and assignment visible; audit trail in backend
- **Clear accountability** — Assignee and creator shown on tasks
- **Real-time** — WebSockets for notifications and chat (backend ready; frontend can be extended with WS client)

## Features

- **Auth:** Login (username/email + password), JWT access + refresh, token refresh on 401
- **Tasks:** List / Kanban / Calendar views, create/edit/delete (permission-based), assign, status, priority, deadline, overdue indicator
- **Dashboard:** My tasks summary, overdue, upcoming deadlines, recent notifications
- **Notifications:** List, mark read, link to task
- **Chat:** Channels list, messages, send message (REST; WebSocket consumer in backend for future real-time)

## Environment

- **Backend:** Optional `DEBUG`, `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS` (defaults work for local dev).
- **Frontend:** Optional `VITE_API_URL` (default `''` uses Vite proxy to backend). Proxy in `vite.config.ts` sends `/api` and `/media` to `http://127.0.0.1:8000`.

### Reminders & deadlines (Celery + Redis)

Task reminders (`reminder_datetime`) and deadline notifications are sent by a **Celery** periodic task that runs every minute. **Redis** is used as the broker and result backend.

1. **Install and run Redis** (if not already running):
   - Windows: [Redis for Windows](https://github.com/microsoftarchive/redis/releases) or WSL; or use a cloud Redis (e.g. Upstash, Redis Cloud).
   - Linux/macOS: `redis-server` or `sudo systemctl start redis`.
   - Default connection: `redis://localhost:6379/0`. Set `REDIS_URL` or `CELERY_BROKER_URL` in `backend/.env` if different.

2. **Install backend deps** (includes `celery[redis]`, `redis`):
   ```bash
   cd backend && pip install -r requirements.txt
   ```

3. **Run Celery worker** (processes the reminder/deadline task):
   ```bash
   cd backend
   celery -A config worker -l info
   ```

4. **Run Celery Beat** (schedules the task every minute):
   ```bash
   cd backend
   celery -A config beat -l info
   ```

You can run worker and beat in two terminals, or run both in one with:
`celery -A config worker -B -l info` (worker + embedded beat; fine for dev).

On **Windows**, the config forces the `solo` worker pool to avoid prefork handle errors; use the same commands.



**Run Celery (and Redis) in Docker**

From the project root, with `backend/.env` containing your DB and other settings:

```bash
docker compose up -d redis celery celery-beat
```

- **redis** — Redis server (broker and channel layer).
- **celery** — Worker; runs `tasks.check_reminders_and_deadlines` when Beat sends it.
- **celery-beat** — Scheduler; sends the task every minute.

Compose overrides `REDIS_URL` / `CELERY_BROKER_URL` so the containers use the `redis` service. To run only Redis and keep Celery on the host: `docker compose up -d redis`.

When a task’s `reminder_datetime` or `deadline` is in the past, the next run of the periodic task creates a notification for the assignee (or creator). The management command `python manage.py check_reminders_and_deadlines` still works for manual or cron-based runs; with Celery, Beat replaces the need for cron.

## PRD verification

See **[PRD-Verification.md](./PRD-Verification.md)** for a requirement-by-requirement check against the Project Requirements Document and a list of partial gaps (e.g. reminder/deadline scheduled triggers, chat file attachments, sound alerts).

## License

Internal use — Office of the Auditor (COA).
