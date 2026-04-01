export type UserRole = "worker" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  persona?: string;
  zone?: string;
};

const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USER_KEY = "user";

function safeDecodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function decodeToken(token: string): SessionUser | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(safeDecodeBase64Url(payload)) as SessionUser;
  } catch {
    return null;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;

  const cached = localStorage.getItem(USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as SessionUser;
    } catch {
      localStorage.removeItem(USER_KEY);
    }
  }

  const token = getToken();
  if (!token) return null;

  const user = decodeToken(token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, user.role);
  }
  return user;
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, user.role);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}
