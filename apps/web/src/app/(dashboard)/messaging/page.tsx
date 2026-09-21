import { Suspense } from "react";
import { MessagingPageClient } from "./MessagingPageClient";

export default function MessagingPage() {
  return (
    <Suspense fallback={<div className="loading-screen">Yükleniyor…</div>}>
      <MessagingPageClient />
    </Suspense>
  );
}
