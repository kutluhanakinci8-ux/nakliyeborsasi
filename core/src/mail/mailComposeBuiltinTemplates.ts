export type BuiltinMailComposeTemplate = {
  slug: string;
  name: string;
  subject: string;
  bodyText: string;
  /** Kurumsal HTML gövde (CTA vb.); webmail zengin editörde açılır. */
  bodyHtml?: string;
};

/** Tüm kurumlarda yazım ekranında görünen hazır posta şablonları. */
export const BUILTIN_MAIL_COMPOSE_TEMPLATES: BuiltinMailComposeTemplate[] = [
  {
    slug: "yuk-teklifi",
    name: "Yük teklifi",
    subject: "Nakliye teklifimiz",
    bodyText:
      "Merhaba,\n\nİlanınız / talebiniz için teklifimiz:\n• Rota: \n• Araç tipi: \n• Tonaj / palet: \n• Fiyat (KDV dahil/hariç): \n• Yükleme tarihi ve saati: \n• Boşaltma notu: \n\nDetayları görüşmek için yanıtlayabilirsiniz.\n\nSaygılarımızla,",
  },
  {
    slug: "teklif-kabul",
    name: "Teklif kabul / onay",
    subject: "Teklif onayı",
    bodyText:
      "Merhaba,\n\nTeklifinizi kabul ediyoruz. Operasyon için lütfen şunları paylaşır mısınız?\n• Yükleme adresi ve saat aralığı\n• İletişim kişisi ve telefon\n• Referans / ilan numarası (varsa)\n\nTeşekkürler,",
    bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#14151f;">Merhaba,</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#14151f;">Teklifinizi <strong>kabul ediyoruz</strong>. Operasyon için lütfen aşağıdaki bilgileri paylaşır mısınız?</p>
<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.65;color:#14151f;">
<li>Yükleme adresi ve saat aralığı</li>
<li>İletişim kişisi ve telefon</li>
<li>Referans / ilan numarası (varsa)</li>
</ul>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;">
<tr><td style="border-radius:10px;background-color:#4f46e5;">
<a href="https://posta.lerta.com.tr" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Operasyon bilgilerini gönder</a>
</td></tr></table>
<p style="margin:0;font-size:16px;line-height:1.65;color:#14151f;">Teşekkürler,</p>`,
  },
  {
    slug: "teklif-red",
    name: "Teklif uygun değil",
    subject: "Teklifiniz hakkında",
    bodyText:
      "Merhaba,\n\nTeklifiniz için teşekkür ederiz. Bu sefer mevcut planımız ve fiyat beklentimiz ile örtüşmediği için değerlendiremiyoruz.\n\nUygun bir yük olduğunda tekrar iletişime geçmek isteriz.\n\nİyi çalışmalar,",
  },
  {
    slug: "yukleme-randevu",
    name: "Yükleme randevusu",
    subject: "Yükleme randevusu",
    bodyText:
      "Merhaba,\n\nYükleme için önerilen randevu:\n• Tarih: \n• Saat: \n• Adres: \n• Araç plakası / şoför: \n\nOnayınızı veya alternatif saat önerinizi rica ederiz.",
  },
  {
    slug: "evrak-hatirlatma",
    name: "Evrak hatırlatma (CMR)",
    subject: "Evrak / CMR hatırlatması",
    bodyText:
      "Merhaba,\n\nSevkiyat tamamlandıysa CMR, irsaliye ve fatura evraklarını bu e-postaya ek olarak gönderebilir misiniz?\n\nReferans: \n\nİyi çalışmalar,",
  },
  {
    slug: "gecikme-bilgi",
    name: "Gecikme bilgilendirme",
    subject: "Sevkiyat güncellemesi",
    bodyText:
      "Merhaba,\n\nSevkiyatınızla ilgili güncelleme:\n\n• Durum: \n• Tahmini varış: \n• Gecikme nedeni (varsa): \n\nBilginize sunarız.",
  },
  {
    slug: "odeme-fatura",
    name: "Ödeme / fatura",
    subject: "Ödeme ve fatura bilgisi",
    bodyText:
      "Merhaba,\n\nÖdeme ve fatura süreci:\n• Fatura kesim tarihi: \n• Vade: \n• IBAN / ödeme yöntemi: \n• Eksik evrak: \n\nSorularınız için yanıtlayabilirsiniz.",
  },
  {
    slug: "tanisma",
    name: "Tanışma / iş birliği",
    subject: "İş birliği talebi",
    bodyText:
      "Merhaba,\n\nLerta Logistics üzerinden firmanızla nakliye iş birliği yapmak istiyoruz.\n\nKısaca hizmet alanlarımız: \n• Filo / bölgeler: \n\nUygun olduğunuzda kısa bir görüşme planlayabiliriz.\n\nSaygılarımızla,",
  },
];

export const BUILTIN_MAIL_COMPOSE_TEMPLATE_ID_PREFIX = "builtin:";

export function isBuiltinMailComposePresetId(presetId: string): boolean {
  return presetId.startsWith(BUILTIN_MAIL_COMPOSE_TEMPLATE_ID_PREFIX);
}

export function listBuiltinMailComposeTemplateDtos(): {
  id: string;
  kind: "template";
  name: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  isDefault: boolean;
  isSystem: true;
  updatedAt: string;
}[] {
  const updatedAt = "2026-01-01T00:00:00.000Z";
  return BUILTIN_MAIL_COMPOSE_TEMPLATES.map((row) => ({
    id: `${BUILTIN_MAIL_COMPOSE_TEMPLATE_ID_PREFIX}${row.slug}`,
    kind: "template" as const,
    name: row.name,
    subject: row.subject,
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml ?? null,
    isDefault: false,
    isSystem: true as const,
    updatedAt,
  }));
}
