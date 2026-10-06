import type { Metadata } from "next";
import { Suspense } from "react";
import { EkolojikCommunicationsHubClient } from "../../../components/ekolojik/EkolojikCommunicationsHubClient";

export const metadata: Metadata = {
  title: "Ekolojik Posta & Mesaj | Marketim",
  description:
    "Kurumsal posta, müşteri mesajları ve sosyal kanallar — Lerta/NB iletişim paritesi.",
};

export default function EkolojikPostaVeMesajPage() {
  return (
    <Suspense fallback={<p className="module-hint">Yükleniyor…</p>}>
      <EkolojikCommunicationsHubClient />
    </Suspense>
  );
}
