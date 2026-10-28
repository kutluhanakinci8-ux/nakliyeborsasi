import {
  MarketingLegalPage,
  legalMetadata,
} from "@/components/MarketingLegalPage";

export const metadata = legalMetadata(
  "Ticari markalar — Lerta",
  "Lerta adı, logosu ve marka kullanım kuralları (özet).",
);

export default function TrademarkPage() {
  return (
    <MarketingLegalPage
      title="Ticari markalar"
      description=""
      heading="Ticari markalar"
    >
      <p>
        <strong>Lerta</strong>, kanatlı zarf logosu ve ilişkili görsel kimlik
        Lerta&apos;ya aittir. Yazılı izin olmadan ticari marka olarak
        kullanılamaz.
      </p>
      <p>
        Basın ve iş ortakları için logo talepleri:{" "}
        <a href="mailto:info@lerta.com.tr">info@lerta.com.tr</a>
      </p>
    </MarketingLegalPage>
  );
}
