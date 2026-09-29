export type MessagingQuickReplyTemplate = {
  id: string;
  labelTr: string;
  bodyText: string;
  scope: "system" | "organization";
};

const SYSTEM_QUICK_REPLIES: MessagingQuickReplyTemplate[] = [
  {
    id: "sys-available",
    labelTr: "Araç uygun",
    bodyText:
      "Merhaba, belirttiğiniz yükleme için araç uygunluğumuz var. Detayları paylaşabilir misiniz?",
    scope: "system",
  },
  {
    id: "sys-price-net",
    labelTr: "Fiyat net değil",
    bodyText:
      "Merhaba, teklifinizi aldık. Lütfen **net fiyat** ve **ödeme vadesini** yazılı olarak paylaşır mısınız?",
    scope: "system",
  },
  {
    id: "sys-docs",
    labelTr: "Evrak talebi",
    bodyText:
      "Yükleme öncesi CMR, sigorta ve araç ruhsatı kopyasını paylaşmanızı rica ederiz.",
    scope: "system",
  },
  {
    id: "sys-loading-time",
    labelTr: "Yükleme saati",
    bodyText:
      "Yükleme saat aralığını ve rampa/depo adresini teyit edebilir misiniz?",
    scope: "system",
  },
  {
    id: "sys-accept",
    labelTr: "Teklif kabul",
    bodyText:
      "Teklifinizi **kabul ediyoruz**. Operasyon ekibimiz kısa süre içinde iletişime geçecek.",
    scope: "system",
  },
  {
    id: "sys-decline",
    labelTr: "Uygun değil",
    bodyText:
      "Teşekkürler; bu seferlik rota/tarih uygunluğumuz yok. İleride tekrar yazabilirsiniz.",
    scope: "system",
  },
  {
    id: "sys-counter",
    labelTr: "Karşı teklif",
    bodyText:
      "Karşı teklifimiz: … (tutar ve para birimi). Onayınızı bekliyoruz.",
    scope: "system",
  },
  {
    id: "sys-tracking",
    labelTr: "Konum paylaşımı",
    bodyText:
      "Araç yola çıktı. Tahmini varış ve canlı konum bilgisini paylaşacağız.",
    scope: "system",
  },
  {
    id: "sys-delay",
    labelTr: "Gecikme bildirimi",
    bodyText:
      "Bilginize: yükleme/boşaltmada **gecikme** yaşanıyor. Yeni ETA: …",
    scope: "system",
  },
  {
    id: "sys-thanks",
    labelTr: "Teşekkür",
    bodyText:
      "İş birliğiniz için teşekkür ederiz. İyi çalışmalar dileriz.",
    scope: "system",
  },
];

export function listMessagingQuickReplies(
  organizationExtras: MessagingQuickReplyTemplate[] = [],
): MessagingQuickReplyTemplate[] {
  return [...SYSTEM_QUICK_REPLIES, ...organizationExtras].slice(0, 20);
}
