import { LegalPageLayout } from "../../components/LegalPageLayout";
import { PLATFORM_PRIMARY_CONTACT_EMAIL } from "../../lib/platformBranding";

const TOC = [
  { id: "genel", label: "Genel hükümler" },
  { id: "tanimlar", label: "Tanımlar" },
  { id: "uyelik", label: "Üyelik ve hesap güvenliği" },
  { id: "platform", label: "Platform hizmetleri" },
  { id: "ilan-sorumluluk", label: "İlan, teklif ve işlem kayıtları" },
  { id: "ucret", label: "Ücretler ve faturalandırma" },
  { id: "fikri-mulkiyet", label: "Fikri mülkiyet" },
  { id: "sorumluluk", label: "Sorumluluk sınırı" },
  { id: "fesih", label: "Askıya alma ve fesih" },
  { id: "uyusmazlik", label: "Uyuşmazlık çözümü" },
  { id: "degisiklik", label: "Metin güncellemeleri" },
] as const;

export default function KullanimKosullariPage() {
  return (
    <LegalPageLayout
      title="Kullanım Koşullarımız"
      lead="Lerta Logistics web platformu ve modüllerini (yük arama, ihale, mesajlaşma, güven ve entegrasyon) kullanırken taraflar arasında geçerli olan çerçeve hükümler."
      breadcrumbLabel="Kullanım Koşullarımız"
      toc={TOC}
    >
      <p className="legal-intro">
        İşbu Kullanım Koşulları, platforma erişen veya üye olan gerçek ve tüzel kişiler ile
        hizmet sağlayıcı arasındaki ilişkiyi düzenler. Platformu kullanarak bu koşulları
        okuduğunuzu ve kabul ettiğinizi beyan edersiniz.
      </p>

      <h2 id="genel">1. Genel hükümler</h2>
      <p>
        Lerta Logistics; taşıyıcı, nakliyeci, forwarder ve yük sahibi tarafların ilan, teklif
        ve iletişim süreçlerini dijital ortamda yürütmesine aracılık eden bir yazılım
        platformudur. Platform aracı nakliyeci değildir; taraflar arasındaki taşıma sözleşmesinin
        tarafı olmaz.
      </p>
      <p>
        Koridor odağımız Türkiye, Ukrayna ve Avrupa Birliği hatlarıdır. Bölgesel mevzuat,
        gümrük ve sigorta yükümlülükleri kullanıcıların sorumluluğundadır.
      </p>

      <h2 id="tanimlar">2. Tanımlar</h2>
      <p>
        <strong>Platform:</strong> Lerta Logistics web uygulaması, API’leri ve ilişkili arayüzler.
        <br />
        <strong>Kullanıcı / Üye:</strong> Hesap oluşturan veya demo erişimi kullanan gerçek veya
        tüzel kişi.
        <br />
        <strong>İlan:</strong> Yük veya kapasite bilgisinin platformda yayımlanması.
        <br />
        <strong>İhale:</strong> Belirli süre ve kurallarla teklif toplama süreci.
        <br />
        <strong>Güven profili:</strong> Değerlendirme ve doğrulama verilerinden oluşan özet skor.
      </p>

      <h2 id="uyelik">3. Üyelik ve hesap güvenliği</h2>
      <p>
        Kayıt sırasında verilen firma unvanı, vergi/kimlik bilgileri ve iletişim verilerinin
        doğru ve güncel olması zorunludur. Hesap bilgilerinin üçüncü kişilerle paylaşılması
        yasaktır; yetkisiz erişimden doğan zararlardan kullanıcı sorumludur.
      </p>
      <p>
        Şüpheli oturum, kötüye kullanım veya mevzuata aykırı faaliyet tespitinde hesap geçici
        olarak askıya alınabilir.
      </p>

      <h2 id="platform">4. Platform hizmetleri</h2>
      <p>
        Marketplace modülü ilan arama ve listeleme; ihale modülü teklif toplama; mesajlaşma modülü
        taraflar arası yazışma; güven modülü değerlendirme ve profil; entegrasyon modülü harici
        sistem bağlantıları sunar. Özellik kapsamı ön sürümde değişebilir.
      </p>
      <p>
        Planlı bakım ve güvenlik güncellemeleri için hizmete ara verilebilir; mümkün olduğunca
        önceden duyuru yapılır.
      </p>

      <h2 id="ilan-sorumluluk">5. İlan, teklif ve işlem kayıtları</h2>
      <p>
        İlan içeriği (rota, ağırlık, ekipman, fiyat, zaman penceresi) yayımlayan tarafın
        sorumluluğundadır. Yanıltıcı, eksik veya güncel olmayan ilanlar kaldırılabilir.
      </p>
      <p>
        İhale ve mesaj trafiği platform kayıtlarına tabidir. Anlaşmazlık halinde zaman damgalı
        kayıtlar delil niteliğinde değerlendirilebilir; nihai hukuki sonuç tarafların sözleşmesine
        bağlıdır.
      </p>

      <h2 id="ucret">6. Ücretler ve faturalandırma</h2>
      <p>
        Abonelik, işlem başına ücret veya modül bazlı fiyatlandırma güncel tarife tablosunda
        yayımlanır. Ön sürümde ücret alınmayabilir; canlı ortam geçişinde en az 30 gün önce
        bilgilendirme yapılır.
      </p>

      <h2 id="fikri-mulkiyet">7. Fikri mülkiyet</h2>
      <p>
        Platform arayüzü, markası, yazılım kodu ve tasarım unsurları hizmet sağlayıcıya aittir.
        İzinsiz kopyalama, tersine mühendislik ve otomatik veri çekme (scraping) yasaktır.
      </p>

      <h2 id="sorumluluk">8. Sorumluluk sınırı</h2>
      <p>
        Platform “olduğu gibi” sunulur. Dolaylı zarar, kar kaybı veya taşıma gecikmesinden
        doğan talepler, kanunun izin verdiği ölçüde hizmet sağlayıcının kontrolü dışındaki
        olaylarla sınırlıdır. Zorunlu tüketici hakları saklıdır.
      </p>

      <h2 id="fesih">9. Askıya alma ve fesih</h2>
      <p>
        Kullanıcı hesabını kapatabilir; açık ihale veya borç durumunda kapanış koşulları ayrıca
        uygulanır. Hizmet sağlayıcı, koşullara aykırılık halinde erişimi sonlandırma hakkını
        saklı tutar.
      </p>

      <h2 id="uyusmazlik">10. Uyuşmazlık çözümü</h2>
      <p>
        Uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır. Tüketici sıfatı bulunan
        kullanıcılar için yetkili tüketici hakem heyetleri ve mahkemeleri saklıdır; diğer
        hallerde İstanbul (Merkez) mahkemeleri ve icra daireleri yetkilidir.
      </p>

      <h2 id="degisiklik">11. Metin güncellemeleri</h2>
      <p>
        Koşullar güncellendiğinde sürüm numarası ve yürürlük tarihi bu sayfada yayımlanır.
        Önemli değişiklikler e-posta veya platform bildirimi ile duyurulur. Güncelleme sonrası
        platformu kullanmaya devam etmeniz yeni metni kabul ettiğiniz anlamına gelir.
      </p>
      <p>
        Sorularınız için{" "}
        <a href={`mailto:${PLATFORM_PRIMARY_CONTACT_EMAIL}`}>
          {PLATFORM_PRIMARY_CONTACT_EMAIL}
        </a>{" "}
        veya{" "}
        <a href="/iletisim">iletişim formu</a> üzerinden bize ulaşabilirsiniz.
      </p>
    </LegalPageLayout>
  );
}
