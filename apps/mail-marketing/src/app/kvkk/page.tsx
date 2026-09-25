import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { LEGAL_DISCLAIMER, SUPPORT_EMAIL } from "@/lib/marketingSite";
import { CONSOLE_URL } from "@/lib/marketingUrls";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma — Lerta Mail",
  description:
    "Lerta Mail kişisel verilerin işlenmesi, saklama ve KVKK hakları özet bilgilendirme.",
};

const privacyConsole = `${CONSOLE_URL.replace(/\/$/, "")}/privacy`;

export default function KvkkPage() {
  return (
    <MarketingPageShell narrow>
      <h1>KVKK Aydınlatma Metni (özet)</h1>
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, Lerta Mail
        kurumsal e-posta hizmeti sunan veri sorumlusu tarafından hazırlanmış
        özet bilgilendirme metnidir.
      </p>

      <h2>Veri sorumlusu ve iletişim</h2>
      <p>
        Talepleriniz için:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>

      <h2>İşlenen veri kategorileri</h2>
      <ul>
        <li>
          <strong>Hesap ve kimlik:</strong> ad, e-posta, organizasyon bilgisi,
          rol ve oturum kayıtları
        </li>
        <li>
          <strong>Posta meta verileri:</strong> gönderen/alıcı, konu, zaman,
          teslimat durumu (içerik yalnızca hizmetin ifası için saklanır)
        </li>
        <li>
          <strong>Faturalama:</strong> plan, ödeme sağlayıcı referansları,
          fatura iletişim bilgileri
        </li>
        <li>
          <strong>Teknik güvenlik:</strong> IP, cihaz/oturum günlükleri, abuse
          ve teslimat izleme kayıtları
        </li>
      </ul>

      <h2>İşleme amaçları ve hukuki sebepler</h2>
      <p>
        Hizmet sözleşmesinin kurulması ve ifası, meşru menfaat (güvenlik,
        kötüye kullanım önleme), hukuki yükümlülükler (muhasebe, talep
        yanıtlama) ve açık rıza gerektiren hallerde açık rıza.
      </p>

      <h2>Saklama ve konum</h2>
      <p>
        Veriler Türkiye&apos;de barındırılan sunucularda tutulur. Saklama
        süreleri hizmet türüne ve yasal zorunluluklara göre değişir; hesap
        silme talebi sonrası makul süre içinde silme veya anonimleştirme
        uygulanır.
      </p>

      <h2>Alıcılar ve aktarım</h2>
      <p>
        Ödeme kuruluşları (Stripe, iyzico), altyapı ve izleme sağlayıcıları
        yalnızca hizmetin ifası için; sözleşmesel veri işleme yükümlülükleri
        altında.
      </p>

      <h2>Haklarınız</h2>
      <p>
        KVKK md. 11 kapsamında erişim, düzeltme, silme, işlemeyi kısıtlama,
        itiraz ve şikâyet hakkı. Self-servis veri dışa aktarma ve hesap silme:{" "}
        <a href={privacyConsole}>yönetim konsolu — Gizlilik</a>.
      </p>

      <p style={{ color: "var(--muted)", fontSize: 14 }}>{LEGAL_DISCLAIMER}</p>
    </MarketingPageShell>
  );
}
