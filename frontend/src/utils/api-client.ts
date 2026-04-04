import { clearSession, getToken } from "@/utils/auth";

const DEFAULT_API_BASE_URL = "https://geoshield-ai-2.onrender.com";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
export const appPath = (path: string) => `${BASE_PATH}${path}`;

type ApiOptions = RequestInit & { authenticated?: boolean };

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { authenticated = true, headers, ...rest } = options;
  const requestHeaders = new Headers(headers || {});

  if (!requestHeaders.has("Content-Type") && rest.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = getToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), { ...rest, headers: requestHeaders });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = appPath("/");
    throw new Error("Unauthorized");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string"
      ? payload
      : payload?.error?.message || payload?.error || payload?.message || "Request failed";
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    const envelope = payload as { success: boolean; data: T; error?: { message?: string } | null };
    if (!envelope.success) {
      throw new Error(envelope.error?.message || "Request failed");
    }
    return envelope.data;
  }

  return payload as T;
}
