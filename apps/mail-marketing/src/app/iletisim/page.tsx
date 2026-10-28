import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactInquiryForm } from "@/components/ContactInquiryForm";
import { MarketingPageShell } from "@/components/MarketingPageShell";

export const metadata: Metadata = {
  title: "İletişim — Lerta",
  description:
    "Satış, teknik destek ve faturalama için iletişim formu; telefon ve e-posta kanalları.",
};

export default function ContactPage() {
  return (
    <MarketingPageShell
      contentClassName="platform-content--product-vitrin platform-content--support-docs"
    >
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <Link href="/destek">Destek</Link>
        <span aria-hidden="true">/</span>
        <span>İletişim</span>
      </nav>

      <h1 className="section-title section-title--lg">İletişim</h1>
      <p className="pricing-lead">
        Konuya göre yönlendirilmiş e-posta formu. Yanıt hedefi: teknik ve fatura için 1 iş günü;
        Enterprise sözleşmesine göre öncelikli destek — <Link href="/sla">SLA özeti</Link>.
      </p>

      <Suspense fallback={<p className="pricing-lead">Form yükleniyor…</p>}>
        <ContactInquiryForm />
      </Suspense>
    </MarketingPageShell>
  );
}
