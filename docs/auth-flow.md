# User Onboarding and Operational Flows Documentation

## Login and Staff Shift Flow

The Login and Signup pages serve as the primary authentication gateway for the One-Convenience Store system, ensuring only authorized personnel can access the platform. The interface uses role-based routing for streamlined access.

### Signup Flow (for Staff)
1. Users create accounts via **Signup** page (`src/pages/Public/Signup.tsx`).
2. Calls `backend/api/register.php`, creating user with **role='staff'** (no staff_id initially).
3. Redirects to Login page.

### Login Flow
1. The Login page (`src/pages/Public/Login.tsx`) sends credentials to `backend/api/login.php`.
2. Admin users go to `/admin/dashboard`.
3. Staff users go to `/cashregister` to enter the starting cash float.
4. Confirming the cash float opens `/pos`. When POS loads, it sends the signed-in user's ID to `backend/api/clockin.php` to start the shift. Returning to POS during an already open shift reuses that attendance record.
## Cash Register (Cashier Float Setup - UI Stub)
**Purpose:** Enter the starting cash drawer amount before the shift.

**Flow (`src/pages/Staff/CashRegister.tsx`, `/cashregister`):**
1. Staff arrive here after login.
2. The UI accepts denomination counts and calculates the total fund.
3. Confirm navigates to `/pos`; POS then triggers clock-in.
4. From POS, the Cashier Out button opens the same page in closing-count mode; confirming calls `backend/api/clockout.php`, clears the signed-in browser state, and returns to `/login`. The cash count itself is currently client-side only and is not saved to the backend.
## Forgot Password and Reset Process (UI Stubs)
- **Forgot Password** (`src/pages/Public/ForgotPassword.tsx`, `/forgot-password`): Form for email input to send reset link. **No backend integration yet** (placeholder UI).
- **Reset Password** (`src/pages/Public/ResetPassword.tsx`, `/reset-password`): Form for new password confirmation. **Static simulation** – client-side validation, fake success, auto-redirect to login after 3s. **No backend API**.

## Notes
- Admin account pre-created via `backend/config/seeder.php`.
- POS static demo; needs product/transaction APIs.
- Future: Full backend for cash register, POS sales, forgot/reset.

**Current flow:** Staff login, cash-register setup, POS attendance, and cashier out.
