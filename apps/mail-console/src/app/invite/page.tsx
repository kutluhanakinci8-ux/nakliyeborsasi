"use client";

import { Suspense } from "react";
import { InviteAcceptForm } from "./InviteAcceptForm";

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-card">
            <p>Davet yükleniyor…</p>
          </div>
        </div>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
