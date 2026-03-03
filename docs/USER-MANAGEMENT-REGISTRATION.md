# User management: self-registration and admin approval

## What’s implemented

- **Public registration**  
Anyone can create an account at `/register` (username, email, password, optional first/last name). No login required.
- **Pending until approved**  
New users are created with `is_active=False`. They cannot sign in until an admin activates the account.  
Django’s auth rejects inactive users at login; the API returns a clear message: *"Account pending approval. Please wait for an administrator to activate your account."*
- **Admin approval**  
Admins (staff, superuser, or users with **can_manage_users**) can:
  - Open **User management** and see **All** / **Pending** (inactive) users.
  - Use **Approve** to set `is_active=True` (user can then sign in).
  - Use **Edit** to set role, name, email, and active state.
- **Optional: turn off registration**  
Set `REGISTRATION_OPEN=false` in the backend environment (e.g. in `docker-compose` or `.env`).  
`POST /api/auth/register/` will then respond with 403 and *"Registration is currently closed."*

---

## Suggestions for later


| Feature                               | Description                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email verification**                | Require a confirmation link by email before creating the account (or before activation). Needs an email backend and a token/expiry flow.                                                                               |
| **Default role for approved users**   | When an admin approves, optionally assign a default role (e.g. “Auditor”) so the user has permissions as soon as they log in.                                                                                          |
| **Notify admins on new registration** | On `POST /register/`, create an in-app notification for admins (e.g. “New user X requested access”) or send an email.                                                                                                  |
| **Notify user when approved**         | When an admin sets `is_active=True`, send an email (“Your account has been activated”) or an in-app notification (user would need to be able to see something before login, e.g. a “pending” page that checks status). |
| **Reject / delete pending**           | Allow admins to reject or delete a pending user instead of approving (e.g. delete user or set a “rejected” flag and hide from list).                                                                                   |
| **Throttling**                        | Registration is throttled with the anonymous rate (e.g. 5/min). Adjust in `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]` or use a custom throttle class on `RegisterView` if you want different limits.                    |


---

## API summary


| Endpoint                | Method | Auth                            | Description                                                                                        |
| ----------------------- | ------ | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/api/auth/register/`   | POST   | No                              | Create account (is_active=False). Body: username, email, password, first_name?, last_name?.        |
| `/api/auth/login/`      | POST   | No                              | Returns JWT or error; if user exists but is_active=False, returns *"Account pending approval..."*. |
| `/api/auth/users/`      | GET    | Yes                             | List users. Staff/can_manage_users can use `?is_active=true` or `?is_active=false`.                |
| `/api/auth/users/<id>/` | PATCH  | Yes (staff or can_manage_users) | Update user (role, is_active, name, email).                                                        |


