import { LegalPageLayout } from "../../components/LegalPageLayout";
import { PLATFORM_PRIMARY_CONTACT_EMAIL } from "../../lib/platformBranding";

const TOC = [
  { id: "genel", label: "Genel" },
  { id: "facebook-meta", label: "Facebook / Meta bağlantısı" },
  { id: "talep", label: "Silme talebi" },
  { id: "sure", label: "Süre ve onay" },
] as const;

export default function VeriSilmePage() {
  const contact = PLATFORM_PRIMARY_CONTACT_EMAIL;

  return (
    <LegalPageLayout
      title="Kullanıcı Verilerinin Silinmesi"
      lead="Lerta platformu ve Meta (Facebook, Instagram, WhatsApp) entegrasyonları üzerinden işlenen verilerin silinmesi için talimatlar."
      breadcrumbLabel="Veri silme"
      toc={TOC}
    >
      <p className="legal-intro">
        Bu sayfa, Meta uygulama geliştirici gereksinimleri ve 6698 sayılı KVKK kapsamında
        kişisel verilerinizin silinmesini nasıl talep edebileceğinizi açıklar.
      </p>

      <h2 id="genel">1. Genel</h2>
      <p>
        Lerta hesabınız, mesajlaşma kayıtları, sosyal medya bağlantı jetonları ve işlem
        logları; hizmet sunumu ve güvenlik amacıyla saklanabilir. Verilerinizin silinmesini
        istediğinizde aşağıdaki kanallardan bize ulaşın.
      </p>

      <h2 id="facebook-meta">2. Facebook / Meta bağlantısı</h2>
      <p>
        <strong>Lerta Social Hub</strong> uygulamasını Facebook hesabınıza bağladıysanız:
      </p>
      <ul>
        <li>
          Lerta içinde <strong>Hesap → Sosyal medya → Bağlantılar</strong> bölümünden ilgili
          kanalı <strong>Bağlantıyı kaldır</strong> ile koparabilirsiniz.
        </li>
        <li>
          Facebook tarafında: <strong>Ayarlar → Uygulamalar ve web siteleri</strong> altında
          <strong> Lerta Social Hub</strong> uygulamasını kaldırarak erişimi iptal edebilirsiniz.
        </li>
      </ul>
      <p>
        Bağlantı kaldırıldığında sunucudaki OAuth jetonları silinir veya devre dışı bırakılır;
        yasal saklama süreleri geçerli loglar ayrıca değerlendirilir.
      </p>

      <h2 id="talep">3. Silme talebi</h2>
      <p>
        Tam hesap veya veri silme talebi için kayıtlı e-posta adresinizden şu adrese yazın:{" "}
        <a href={`mailto:${contact}?subject=Lerta%20veri%20silme%20talebi`}>{contact}</a>
      </p>
      <p>
        Konu satırında <strong>“Veri silme talebi”</strong> yazın; mesajda firma adı, Lerta
        hesap e-postanız ve (varsa) bağlı Meta sayfa / WhatsApp numarası bilgisini belirtin.
      </p>

      <h2 id="sure">4. Süre ve onay</h2>
      <p>
        Talepler kimlik doğrulaması sonrası en geç <strong>30 gün</strong> içinde
        değerlendirilir. Sonuç e-posta ile bildirilir. KVKK kapsamındaki diğer haklar için{" "}
        <a href="/kisisel-verilerin-korunmasi">Kişisel Verilerin Korunması</a> sayfasına bakın.
      </p>
    </LegalPageLayout>
  );
}
