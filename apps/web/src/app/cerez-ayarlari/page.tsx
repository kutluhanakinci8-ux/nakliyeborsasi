import { LegalPageLayout } from "../../components/LegalPageLayout";
import { CookieSettingsClient } from "./CookieSettingsClient";

const TOC = [
  { id: "tercih-paneli", label: "Tercih paneli" },
  { id: "cerez-nedir", label: "Çerez nedir?" },
  { id: "kategoriler", label: "Çerez kategorileri" },
  { id: "saklama", label: "Saklama süreleri" },
  { id: "ucuncu-taraf", label: "Üçüncü taraf hizmetler" },
  { id: "haklar", label: "Haklarınız" },
] as const;

export default function CerezAyarlariPage() {
  return (
    <LegalPageLayout
      eyebrow="Yasal"
      title="Çerez Ayarları"
      lead="Oturum, dil, analitik ve pazarlama çerezlerine ilişkin bilgilendirme metni ve tercih paneli — TR · UA · EU koridoru."
      breadcrumbLabel="Çerez Ayarları"
      toc={TOC}
      tocNote="Tercihler demo ortamında tarayıcınızda saklanır. Canlı ortamda güncel aydınlatma metni geçerlidir."
    >
      <p className="legal-intro">
        Bu sayfa, <strong>6698 sayılı KVKK</strong> ve ilgili mevzuat çerçevesinde çerez kullanımına ilişkin
        bilgilendirme sunar. Aşağıdaki panelden isteğe bağlı kategorileri yönetebilir; metnin tamamını
        içindekiler menüsünden gezinebilirsiniz.
      </p>

      <h2 id="tercih-paneli">1. Tercih paneli</h2>
      <p>
        Zorunlu çerezler platformun güvenli çalışması için devredilemez. Analitik ve pazarlama
        kategorileri varsayılan olarak kapalıdır; seçimlerinizi kaydettiğinizde tarayıcınızda saklanır.
      </p>
      <CookieSettingsClient />

      <h2 id="cerez-nedir">2. Çerez nedir?</h2>
      <p>
        Çerezler, ziyaret ettiğiniz web sitesi tarafından cihazınıza kaydedilen küçük metin dosyalarıdır.
        Oturumunuzun sürdürülmesi, güvenlik kontrolleri, dil tercihinizin hatırlanması ve — açık rızanız
        halinde — kullanım istatistiklerinin toplanması için kullanılabilir.
      </p>
      <p>
        Nakliye Borsası; yük arama, ihale, mesajlaşma ve güven modüllerinde kesintisiz deneyim için sınırlı
        ve amaca yönelik çerezler kullanır. Koridor odağımız <strong>TR · UA · EU</strong> hatlarıdır; veri
        işleme süreçleri bu coğrafyadaki mevzuata uygun tasarlanır.
      </p>

      <h2 id="kategoriler">3. Çerez kategorileri</h2>
      <p>
        <strong>Zorunlu:</strong> Kimlik doğrulama, CSRF koruması, oturum süresi ve temel güvenlik. Bu
        çerezler olmadan platform güvenli şekilde çalışamaz.
        <br />
        <strong>İşlevsel:</strong> Dil (TR/EN), arayüz yoğunluğu ve son açılan modül gibi tercihler.
        <br />
        <strong>Analitik:</strong> Anonim sayfa görüntüleme, hata oranı ve performans ölçümü (açık rıza ile).
        <br />
        <strong>Pazarlama:</strong> Kampanya etkinliği ve duyuru dönüşümü (varsayılan kapalı; açık rıza ile).
      </p>
      <p>
        <a href="#tercih-paneli">Tercih paneline</a> dönerek analitik ve pazarlama kategorilerini istediğiniz
        zaman güncelleyebilirsiniz.
      </p>

      <h2 id="saklama">4. Saklama süreleri</h2>
      <p>
        Oturum çerezleri tarayıcıyı kapattığınızda veya belirli bir süre hareketsizlik sonrası silinir.
        Tercih çerezleri en fazla <strong>12 ay</strong> saklanır; süre dolduğunda yeniden onay istenebilir.
        Güvenlik günlükleri mevzuat gereği daha uzun süre arşivlenebilir (kişisel veri minimizasyonu ile).
      </p>

      <h2 id="ucuncu-taraf">5. Üçüncü taraf hizmetler</h2>
      <p>
        Harita, analitik veya iletişim entegrasyonları devreye alındığında ilgili sağlayıcıların çerezleri
        yalnızca sözleşmesel güvenceler ve aydınlatma metni kapsamında kullanılır. Üçüncü taraf listesi
        canlı ortamda bu bölümde güncellenir.
      </p>

      <h2 id="haklar">6. Haklarınız</h2>
      <p>
        KVKK kapsamında erişim, düzeltme, silme ve itiraz haklarınız saklıdır. Çerez tercihlerinizle ilgili
        talepleriniz için{" "}
        <a href="/iletisim">İletişim</a> formunu veya{" "}
        <a href="/kisisel-verilerin-korunmasi">Kişisel Verilerin Korunması</a> sayfasındaki kanalları
        kullanabilirsiniz.
      </p>
    </LegalPageLayout>
  );
}
