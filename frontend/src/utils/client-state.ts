"use client";

import { useSyncExternalStore } from "react";
import { getSessionUser } from "@/utils/auth";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("focus", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("focus", handler);
  };
}

export function useIsHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function useSessionUser() {
  return useSyncExternalStore(
    subscribe,
    () => getSessionUser(),
    () => null,
  );
}

export function useThemePreference() {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem("geoshield_theme") === "light";
    },
    () => false,
  );
}
