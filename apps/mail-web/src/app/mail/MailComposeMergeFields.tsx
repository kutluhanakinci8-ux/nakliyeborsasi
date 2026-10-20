"use client";

import { MERGE_FIELD_TOKENS } from "@/lib/mailComposeHtmlBlocks";

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
  return (
    <div className="compose-merge-panel">
      <button type="button" className="compose-chip-btn" onClick={onToggleOpen}>
        {open ? "Kişiselleştirme gizle" : "Kişiselleştirme alanları"}
      </button>
      {open ? (
        <div className="compose-merge-fields">
          <label className="compose-field-label" htmlFor={`${idPrefix}-merge-musteri`}>
            Müşteri adı ({"{{musteri_adi}}"})
          </label>
          <input
            id={`${idPrefix}-merge-musteri`}
            className="compose-input"
            value={musteriAdi}
            onChange={(e) => onMusteriAdiChange(e.target.value)}
            placeholder="Örn. Ahmet Yılmaz"
          />
          <label className="compose-field-label" htmlFor={`${idPrefix}-merge-ref`}>
            Referans ({"{{referans}}"})
          </label>
          <input
            id={`${idPrefix}-merge-ref`}
            className="compose-input"
            value={referans}
            onChange={(e) => onReferansChange(e.target.value)}
            placeholder="Örn. REF-2026-042"
          />
          <div className="compose-merge-tokens">
            {MERGE_FIELD_TOKENS.map((row) => (
              <button
                key={row.token}
                type="button"
                className="compose-chip-btn"
                title={row.label}
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
