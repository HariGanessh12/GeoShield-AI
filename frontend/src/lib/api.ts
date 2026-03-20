const DEFAULT_API_BASE_URL = "https://geoshield-ai-2.onrender.com";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
