"use client";

import { type ReactNode } from "react";
import { WebSessionProvider } from "../context/WebSessionProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <WebSessionProvider>{children}</WebSessionProvider>;
}
