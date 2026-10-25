"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  onClose: () => void;
};

const ROW_KEYS = [
  { keys: "c", actionKey: "shortcutCompose" },
  { keys: "r", actionKey: "shortcutReply" },
  { keys: "a", actionKey: "shortcutReplyAll" },
  { keys: "z", actionKey: "shortcutSnooze" },
  { keys: "/", actionKey: "shortcutSearch" },
  { keys: "e", actionKey: "shortcutArchive" },
  { keys: "#", actionKey: "shortcutTrash" },
  { keys: "u", actionKey: "shortcutUnread" },
  { keys: "f", actionKey: "shortcutForward" },
  { keys: "s", actionKey: "shortcutStar" },
  { keys: "j / k", actionKey: "shortcutListNav" },
  { keys: "Shift+click", actionKey: "shortcutRangeSelect" },
  { keys: "?", actionKey: "shortcutHelp" },
  { keys: "Esc", actionKey: "shortcutEscape" },
] as const;

export function MailShortcutsDialog({ onClose }: Props) {
  const { t } = useMailLocale();

  return (
    <div className="compose-overlay" role="presentation" onClick={onClose}>
      <div
        className="compose-dialog mail-shortcuts-dialog"
        role="dialog"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shortcuts-title">{t("shortcutsTitle")}</h2>
        <table className="mail-shortcuts-table">
          <tbody>
            {ROW_KEYS.map((row) => (
              <tr key={row.keys}>
                <td>
                  <kbd>{row.keys}</kbd>
                </td>
                <td>{t(row.actionKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="compose-actions">
          <button type="button" onClick={onClose}>{t("shortcutsClose")}</button>
        </div>
      </div>
    </div>
  );
}
