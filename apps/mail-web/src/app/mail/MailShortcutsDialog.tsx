type Props = {
  onClose: () => void;
};

const ROWS = [
  { keys: "c", action: "Yeni mesaj (Yaz)" },
  { keys: "r", action: "Yanıtla (mesaj açıkken)" },
  { keys: "/", action: "Arama kutusuna odaklan" },
  { keys: "e", action: "Arşivle (mesaj açıkken)" },
  { keys: "#", action: "Çöpe taşı (mesaj açıkken)" },
  { keys: "u", action: "Okunmadı işaretle (mesaj açıkken)" },
  { keys: "f", action: "İlet (mesaj açıkken)" },
  { keys: "s", action: "Yıldızla / yıldızı kaldır (mesaj açıkken)" },
  { keys: "j / k", action: "Sonraki / önceki mesaj (liste)" },
  { keys: "Shift+tık", action: "Aralık seçimi (onay kutusu)" },
  { keys: "?", action: "Bu yardım penceresi" },
  { keys: "Esc", action: "Yaz penceresini / yardımı kapat" },
];

export function MailShortcutsDialog({ onClose }: Props) {
  return (
    <div
      className="compose-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="compose-dialog mail-shortcuts-dialog"
        role="dialog"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcuts-title">Klavye kısayolları</h2>
        <table className="mail-shortcuts-table">
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.keys}>
                <td><kbd>{row.keys}</kbd></td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="compose-actions">
          <button type="button" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
