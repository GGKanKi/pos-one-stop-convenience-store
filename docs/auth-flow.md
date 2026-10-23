# User Onboarding and Operational Flows Documentation

## Login and Staff Shift Flow

The Login and Signup pages serve as the primary authentication gateway for the One-Convenience Store system, ensuring only authorized personnel can access the platform. The interface uses role-based routing for streamlined access.

### Signup Flow (for Staff)
1. Users create accounts via **Signup** page (`src/pages/Public/Signup.tsx`).
2. Calls `backend/api/register.php`, creating the account with **role='cashier'**.
3. Redirects to Login page.

### Roles and Access
- **Cashier** accounts go to the cash register and POS. The POS route is their only dashboard area. The POS's **Inventory Monitoring (For Staff Only)** button checks a Staff account password; successful verification grants access to Dashboard and Inventory for 30 minutes in that browser tab.
- **Staff** accounts can open Dashboard and Inventory, and can also use POS.
- **Admin** accounts retain access to all admin pages. Public signups cannot assign themselves Staff or Admin. For this small team, assign or change an employee role directly in the database, for example: `UPDATE users SET role = 'staff' WHERE email = 'employee@example.com';` Use `cashier` to return the account to cashier access. Never change an admin account with this query.
- Migration `013_add_cashier_role.sql` converts existing `staff` accounts to `cashier` and preserves `admin@gmail.com` as Admin.
- Staff product additions and edits (including price, cost, stock, expiry, and threshold changes) are saved as pending requests. Admins review them from **Inventory Approvals**; access is restricted to Admin accounts. Approval applies the change and records the Admin in the inventory audit. Cashier sales and sale voids continue to adjust stock immediately as normal operations.
- Migration `014_create_inventory_change_requests.sql` creates the approval queue table.
- Migration `015_create_auth_sessions.sql` creates the hashed bearer-session store required by login, Staff verification, and protected inventory APIs. Apply migrations with `php backend/config/migrate.php` before using the updated login flow.

### Login Flow
1. The Login page (`src/pages/Public/Login.tsx`) sends credentials to `backend/api/login.php`.
2. Successful login returns an opaque 12-hour bearer token. The backend stores only its SHA-256 hash in `auth_sessions`; protected inventory APIs derive the acting user and role from this token.
3. Admin and Staff users go to `/admin/dashboard`; Cashiers go to `/cashregister` to enter the starting cash float.
4. Confirming the cash float opens `/pos`. When POS loads, it sends the signed-in user's ID to `backend/api/clockin.php` to start the shift. Returning to POS during an already open shift reuses that attendance record.
5. Staff password verification also creates a Staff bearer session used for inventory change requests. The backend derives the requester from that session; it does not accept a client-supplied Staff ID as proof of identity.
## Cash Register (Cashier Float Setup - UI Stub)
**Purpose:** Enter the starting cash drawer amount before the shift.

**Flow (`src/pages/Staff/CashRegister.tsx`, `/cashregister`):**
1. Staff arrive here after login.
2. The UI accepts denomination counts and calculates the total fund.
3. Confirm navigates to `/pos`; POS then triggers clock-in.
4. From POS, the Cashier Out button opens the same page in closing-count mode; confirming calls `backend/api/clockout.php`, clears the signed-in browser state, and returns to `/login`. The cash count itself is currently client-side only and is not saved to the backend.
## Forgot Password and Reset Process
- **Forgot Password** (`src/pages/Public/ForgotPassword.tsx`, `/forgot-password`) sends the email to `backend/api/requestpasswordreset.php`. Existing accounts receive a one-hour, single-use reset link; the response does not reveal whether an email is registered.
- **Reset Password** (`src/pages/Public/ResetPassword.tsx`, `/reset-password?token=...`) submits the new password to `backend/api/resetpassword.php`. Passwords must contain at least eight characters. A successful reset invalidates all outstanding reset tokens for that account.
- Run `php backend/config/migrate.php` to create the `password_reset_tokens` table. The migration is applied in the current Laragon database. On Windows, the reset endpoint sends through Laragon Mailpit at `127.0.0.1:1025`; open `http://127.0.0.1:8025` to read captured reset emails. Set `APP_URL` if the frontend is not at `http://localhost:5173`. For production, configure a real mail transport and set `PASSWORD_RESET_FROM` (and optionally `SMTP_HOST` / `SMTP_PORT`).
## Notes
- Admin account pre-created via `backend/config/seeder.php`.
- POS static demo; needs product/transaction APIs.
- Future: Full backend for cash register and POS sales.

**Current flow:** Cashier and Staff login, role-based dashboard/inventory access, POS attendance, cashier out, and email-based password reset.
