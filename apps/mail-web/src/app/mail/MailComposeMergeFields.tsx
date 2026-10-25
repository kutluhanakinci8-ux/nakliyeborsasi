"use client";

import { MERGE_FIELD_TOKENS } from "@/lib/mailComposeHtmlBlocks";
import { MERGE_FIELD_TOKEN_LABEL_KEYS } from "@/lib/mailWebLocaleI18nComposeHelp";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  musteriAdi: string;
  referans: string;
  onMusteriAdiChange: (value: string) => void;
  onReferansChange: (value: string) => void;
  onInsertToken: (token: string) => void;
  idPrefix?: string;
};

export function MailComposeMergeFields({
  open,
  onToggleOpen,
  musteriAdi,
  referans,
  onMusteriAdiChange,
  onReferansChange,
  onInsertToken,
  idPrefix = "compose",
}: Props) {
  const { t } = useMailLocale();

  return (
    <div className="compose-merge-panel">
      <button type="button" className="compose-chip-btn" onClick={onToggleOpen}>
        {open ? t("mergeToggleHide") : t("mergeToggleShow")}
      </button>
      {open ? (
        <div className="compose-merge-fields">
          <label className="compose-field-label" htmlFor={`${idPrefix}-merge-musteri`}>
            {t("mergeCustomerLabel")}
          </label>
          <input
            id={`${idPrefix}-merge-musteri`}
            className="compose-input"
            value={musteriAdi}
            onChange={(e) => onMusteriAdiChange(e.target.value)}
            placeholder={t("mergeCustomerPlaceholder")}
          />
          <label className="compose-field-label" htmlFor={`${idPrefix}-merge-ref`}>
            {t("mergeRefLabel")}
          </label>
          <input
            id={`${idPrefix}-merge-ref`}
            className="compose-input"
            value={referans}
            onChange={(e) => onReferansChange(e.target.value)}
            placeholder={t("mergeRefPlaceholder")}
          />
          <div className="compose-merge-tokens">
            {MERGE_FIELD_TOKENS.map((row) => (
              <button
                key={row.token}
                type="button"
                className="compose-chip-btn"
                title={t(MERGE_FIELD_TOKEN_LABEL_KEYS[row.token] ?? row.token)}
                onClick={() => onInsertToken(row.token)}
              >
                {row.token}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
