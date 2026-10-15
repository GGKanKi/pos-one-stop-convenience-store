# User Onboarding and Operational Flows Documentation

## Login, Signup, and Staff ID Setup Process

The Login and Signup pages serve as the primary authentication gateway for the One-Convenience Store system, ensuring only authorized personnel can access the platform. The interface uses role-based routing for streamlined access.

### Signup Flow (for Staff)
1. Users create accounts via **Signup** page (`src/pages/Public/Signup.tsx`).
2. Calls `backend/api/register.php`, creating user with **role='staff'** (no staff_id initially).
3. Redirects to Login page.

### Login Flow
1. **Login** page (`src/pages/Public/Login.tsx`) → `backend/api/login.php`.
2. Returns `role`, `hasStaffId` (checks staff_ids table).
3. Routes:
   - **Admin** (`role='admin'`, pre-seeded `admin@gmail.com`): `/admin/dashboard`.
   - **Staff** + staff_id: `/LoginId` (clock-in page).
   - **Staff** - no staff_id: `/setstaffid` (setup required).

### SetStaffId Process (New Staff Setup)
**Purpose:** Assign unique 6-alphanum staff_id + avatar to new staff users (one-time).

1. **Triggered:** First login for new staff (no staff_id in DB).
2. **UI** (`src/pages/Staff/SetStaffId.tsx`):
   - Auto-populates email from login state.
   - 6-input PIN-style form (alphanum, auto-advance).
   - Avatar picker (4 options).
3. **Submit** → POST `backend/api/setstaffid.php`:
   - Validates: staff role/email exists, staff_id unique/not duplicate, avatar allowed.
   - Inserts `staff_ids` table: `user_id`, `staff_id` (unique), `avatar`.
   - Transaction-protected.
4. **Success:** Alert + redirect `/POS`.
5. **Future logins:** Now `hasStaffId=true` → `/LoginId` (clock-in).

**Note:** staff_id uniqueness enforced DB-side, prevents reuse.

This ensures staff identification before operational access, separating admin from staff securely.

## Cash Register (Cashier Float Setup - UI Stub)
**Purpose:** Record starting cash drawer amount before shift (denominations → total fund).

**Flow (`src/pages/Staff/CashRegister.tsx`, `/cashregister`):**
1. **Triggered:** From POS header "Cashier Out" button.
2. **UI:** Inputs for counts (Php1000 to Php1), auto-subtotals, grand total.
3. **Confirm:** localStorage/nav? → `/logoutid` (end shift?).
4. **Status:** Client-side only, **no backend**. Future: Save float to DB/transactions.

**Note:** Completes shift cycle: LoginId (clock-in) → POS → CashRegister (close drawer) → LogoutId.

## Forgot Password and Reset Process (UI Stubs)
- **Forgot Password** (`src/pages/Public/ForgotPassword.tsx`, `/forgot-password`): Form for email input to send reset link. **No backend integration yet** (placeholder UI).
- **Reset Password** (`src/pages/Public/ResetPassword.tsx`, `/reset-password`): Form for new password confirmation. **Static simulation** – client-side validation, fake success, auto-redirect to login after 3s. **No backend API**.

## Notes
- Admin account pre-created via `backend/config/seeder.php`.
- POS static demo; needs product/transaction APIs.
- Future: Full backend for cash register, POS sales, forgot/reset.

**Corrections applied:** Grammar, clarity, code alignment, all requested flows (auth + SetStaffId + CashRegister).
