import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthUser } from "../services/authSession";

type Permission = "pos" | "staff-tools" | "admin";

export default function RoleGate({ permission, children }: { permission: Permission; children: ReactNode }) {
  const location = useLocation();
  const role = String(getAuthUser().role || "").toLowerCase();

  const unlockUntil = Number(sessionStorage.getItem("staffToolsUnlockUntil") || 0);
  // The unlock deadline is persisted as a wall-clock timestamp, so access must
  // be evaluated against the current time whenever the route renders.
  // eslint-disable-next-line react-hooks/purity
  const staffToolsUnlocked = unlockUntil > Date.now();
  const cashierUnlocked = role === "cashier" && staffToolsUnlocked;
  // Keep the verified Staff identity for inventory edits even when the
  // signed-in account is Admin. Inventory uses it to submit approval requests.
  if (unlockUntil > 0 && !staffToolsUnlocked) {
    sessionStorage.removeItem("staffToolsUnlockUntil");
    sessionStorage.removeItem("staffToolsUser");
    sessionStorage.removeItem("staffToolsToken");
  }

  const allowed = permission === "admin"
    ? role === "admin"
    : permission === "pos"
      ? ["cashier", "staff", "admin"].includes(role)
      : ["staff", "admin"].includes(role) || cashierUnlocked;

  const fallback = role === "admin" || role === "staff" ? "/admin/dashboard" : role === "cashier" ? "/pos" : "/login";
  return allowed ? <>{children}</> : <Navigate to={fallback} replace state={{ from: location.pathname }} />;
}
