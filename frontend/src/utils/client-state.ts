"use client";

import { useEffect, useState } from "react";
import { getSessionUser, type SessionUser } from "@/utils/auth";

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

function useMountedState() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return mounted;
}

export function useIsHydrated() {
  return useMountedState();
}

export function useSessionUser() {
  const mounted = useMountedState();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!mounted) return;

    const sync = () => setUser(getSessionUser());
    const frame = requestAnimationFrame(sync);
    const unsubscribe = subscribe(sync);

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [mounted]);

  return mounted ? user : null;
}

export function useThemePreference() {
  const mounted = useMountedState();
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    const sync = () => {
      setIsLight(localStorage.getItem("geoshield_theme") === "light");
    };
    const frame = requestAnimationFrame(sync);
    const unsubscribe = subscribe(sync);

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [mounted]);

  return mounted ? isLight : false;
}
