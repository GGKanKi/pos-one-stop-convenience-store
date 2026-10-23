export type AuthUser = {
  id?: number | string;
  role?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: unknown;
};

const LEGACY_FALLBACK_DISABLED = "authSessionEnded";

function readUser(value: string | null): AuthUser {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Prefer per-tab credentials so an Admin tab and POS tab can use different
// accounts without replacing each other's role or authentication token.
export function getAuthUser(): AuthUser {
  const tabUser = sessionStorage.getItem("user");
  if (tabUser) return readUser(tabUser);
  if (sessionStorage.getItem(LEGACY_FALLBACK_DISABLED) === "1") return {};
  return readUser(localStorage.getItem("user"));
}

export function getActiveStaffUser(): AuthUser {
  if (Number(sessionStorage.getItem("staffToolsUnlockUntil") || 0) > Date.now()) {
    const verifiedStaff = readUser(sessionStorage.getItem("staffToolsUser"));
    if (verifiedStaff.role === "staff" && verifiedStaff.id) return verifiedStaff;
  }
  const signedInUser = getAuthUser();
  return signedInUser.role === "staff" ? signedInUser : {};
}

export function getActiveStaffAuthToken(): string {
  if (Number(sessionStorage.getItem("staffToolsUnlockUntil") || 0) > Date.now()) {
    const verifiedStaff = readUser(sessionStorage.getItem("staffToolsUser"));
    if (verifiedStaff.role === "staff" && verifiedStaff.id) {
      return sessionStorage.getItem("staffToolsToken") || getAuthToken();
    }
  }
  return getAuthToken();
}

export function getAuthToken(): string {
  if (sessionStorage.getItem("authToken") !== null) return sessionStorage.getItem("authToken") || "";
  return sessionStorage.getItem(LEGACY_FALLBACK_DISABLED) === "1"
    ? ""
    : localStorage.getItem("authToken") || "";
}

export function setAuthSession(user: AuthUser, token?: string): void {
  sessionStorage.removeItem(LEGACY_FALLBACK_DISABLED);
  sessionStorage.setItem("user", JSON.stringify(user));
  if (user.id !== undefined && user.id !== null) {
    sessionStorage.setItem("userId", String(user.id));
  }
  // An empty tab token is intentional: do not fall back to another account's
  // legacy localStorage token when this login response has no token.
  sessionStorage.setItem("authToken", token || "");
}

export function clearAuthSession(): void {
  ["user", "userId", "authToken", "staff_id", "pending_clock_in"].forEach((key) => {
    sessionStorage.removeItem(key);
  });
  sessionStorage.setItem(LEGACY_FALLBACK_DISABLED, "1");
  sessionStorage.removeItem("staffToolsUnlockUntil");
  sessionStorage.removeItem("staffToolsUser");
  sessionStorage.removeItem("staffToolsToken");
}

export function getAuthUserId(): string | number | null {
  const user = getAuthUser();
  return user.id ?? (sessionStorage.getItem("authSessionEnded") === "1" ? null : localStorage.getItem("userId"));
}
