"use client";

import { AppChrome } from "./app-chrome";

export default function ClientAppChrome({ children }: { children: React.ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
