"use client";

import { type ReactNode } from "react";
import { ChunkLoadRecovery } from "../components/ChunkLoadRecovery";
import { WebSessionProvider } from "../context/WebSessionProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WebSessionProvider>
      <ChunkLoadRecovery />
      {children}
    </WebSessionProvider>
  );
}
