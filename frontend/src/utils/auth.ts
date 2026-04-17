export type UserRole = "worker" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  personaType?: string;
  zone?: string;
};

const ROLE_KEY = "role";
const USER_KEY = "user";

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;

  const cached = localStorage.getItem(USER_KEY);
  if (!cached) return null;

  try {
    return JSON.parse(cached) as SessionUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    return null;
  }
}

export function saveSession(user: SessionUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLE_KEY, user.role);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}
