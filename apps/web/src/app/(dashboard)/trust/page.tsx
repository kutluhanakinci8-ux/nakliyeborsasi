import { Suspense } from "react";
import { TrustPageClient } from "./TrustPageClient";

export default function TrustPage() {
  return (
    <Suspense fallback={<div className="loading-screen">Yükleniyor…</div>}>
      <TrustPageClient />
    </Suspense>
  );
}
