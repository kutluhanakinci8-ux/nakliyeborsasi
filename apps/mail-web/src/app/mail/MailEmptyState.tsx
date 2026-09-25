type Variant = "inbox" | "sent" | "drafts" | "search" | "read" | "starred";

const COPY: Record<
  Variant,
  { title: string; body: string; tips?: string[] }
> = {
  inbox: {
    title: "Gelen kutusu boş",
    body: "Bu adrese gelen postalar burada listelenir. Pilot kutunuz dışarıdan test için kullanılabilir.",
    tips: [
      "Başka bir hesaptan kendinize test e-postası gönderin.",
      "Thunderbird veya telefon için: Ayarlar → IMAP bilgileri.",
      "Kurumsal domain: yonetim.lerta.com.tr üzerinden DNS doğrulayın.",
    ],
  },
  sent: {
    title: "Gönderilen yok",
    body: "Yazdığınız ve gönderdiğiniz mesajlar bu klasörde görünür.",
    tips: ["Yeni mesaj için sol üstteki Yaz düğmesini kullanın."],
  },
  drafts: {
    title: "Taslak yok",
    body: "Yaz ekranında Taslak kaydet ile yarım kalan mesajları saklayın.",
  },
  search: {
    title: "Sonuç bulunamadı",
    body: "Farklı anahtar kelime veya gelişmiş filtre deneyin.",
  },
  starred: {
    title: "Yıldızlı mesaj yok",
    body: "Önemli postaları yıldızlayın; burada tek listede görünür.",
    tips: [
      "Liste veya okuma panelindeki ☆ düğmesine tıklayın.",
      "Klavye: mesaj açıkken s tuşu.",
    ],
  },
  read: {
    title: "Mesaj seçin",
    body: "Listeden bir satıra tıklayın veya konuşma görünümünde bir zincir açın.",
    tips: [
      "Konuşma görünümü: liste üstündeki düğme ile aynı konudaki yanıtları gruplar.",
    ],
  },
};

export function MailEmptyState({ variant }: { variant: Variant }) {
  const content = COPY[variant];
  return (
    <div className="mail-empty-state" role="status">
      <div className="mail-empty-icon" aria-hidden="true">@</div>
      <h2 className="mail-empty-title">{content.title}</h2>
      <p className="mail-empty-body">{content.body}</p>
      {content.tips?.length ? (
        <ul className="mail-empty-tips">
          {content.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
      <p className="mail-empty-links">
        <a href="https://yonetim.lerta.com.tr" target="_blank" rel="noreferrer">
          Yönetim konsolu
        </a>
        {" · "}
        <a
          href="https://www.lerta.com.tr/sss"
          target="_blank"
          rel="noreferrer"
        >
          SSS
        </a>
      </p>
    </div>
  );
}
