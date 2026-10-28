import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_PHONE_DISPLAY,
  COMPANY_PHONE_TEL,
  SALES_EMAIL,
  SUPPORT_EMAIL,
} from "@/lib/marketingSite";
import { CONSOLE_URL } from "@/lib/marketingUrls";

export const metadata: Metadata = {
  title: "İletişim — Lerta Mail",
  description: "Lerta Mail destek, satış ve ürün erişim bilgileri.",
};

export default function ContactPage() {
  return (
    <MarketingPageShell narrow>
      <h1>İletişim</h1>
      <ul>
        <li>
          Telefon:{" "}
          <a href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE_DISPLAY}</a>
        </li>
        <li>Adres: {COMPANY_ADDRESS}</li>
        <li>
          Genel:{" "}
          <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
        </li>
        <li>
          Destek:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </li>
        <li>
          Kurumsal satış / Enterprise:{" "}
          <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
        </li>
        <li>
          Yönetim konsolu:{" "}
          <a href={CONSOLE_URL}>{CONSOLE_URL.replace(/^https?:\/\//, "")}</a>
        </li>
        <li>Webmail: posta.lerta.com.tr</li>
      </ul>
      <p style={{ color: "var(--muted)" }}>
        Yanıt süresi hedefi: destek için iş günü 24 saat; Enterprise için iş
        günü 8 saat (sözleşmeye bağlı). Acil kesinti bildirimi için /durum
        sayfasını kontrol edin.
      </p>
    </MarketingPageShell>
  );
}
