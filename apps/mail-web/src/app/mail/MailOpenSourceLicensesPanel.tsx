"use client";

import { useMemo, useState } from "react";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  getOpenSourceLicenseById,
  listOpenSourceLicensesSorted,
  type OpenSourceLicenseEntry,
} from "@/lib/mailOpenSourceLicenses";

type Props = {
  onBackToHub?: () => void;
};

export function MailOpenSourceLicensesPanel({ onBackToHub }: Props) {
  const { t } = useMailLocale();
  const entries = useMemo(() => listOpenSourceLicensesSorted(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? getOpenSourceLicenseById(selectedId) : undefined;

  if (selected) {
    return (
      <LicenseDetail
        entry={selected}
        t={t}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="mail-oss-licenses">
      <p className="mail-settings-intro">{t("ossLicensesIntro")}</p>
      <ul className="mail-help-ios-group mail-oss-licenses-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="mail-help-ios-row"
              onClick={() => setSelectedId(entry.id)}
            >
              <span className="mail-help-ios-row-label">{entry.sortName}</span>
              <span className="mail-help-ios-row-accessory" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
      {onBackToHub ? (
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--ghost mail-oss-licenses-back-hub"
          onClick={onBackToHub}
        >
          {t("actionBack")}
        </button>
      ) : null}
    </div>
  );
}

function LicenseDetail({
  entry,
  t,
  onBack,
}: {
  entry: OpenSourceLicenseEntry;
  t: (key: string) => string;
  onBack: () => void;
}) {
  return (
    <div className="mail-oss-license-detail">
      <button type="button" className="mail-help-ios-back" onClick={onBack}>
        {t("ossLicensesBackToList")}
      </button>
      <h3 className="mail-oss-license-detail-title">{entry.sortName}</h3>
      <dl className="mail-oss-license-meta">
        <div>
          <dt>{t("ossLicensePackage")}</dt>
          <dd>{entry.packageName}</dd>
        </div>
        {entry.version ? (
          <div>
            <dt>{t("ossLicenseVersion")}</dt>
            <dd>{entry.version}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t("ossLicenseCopyright")}</dt>
          <dd>{entry.copyright}</dd>
        </div>
        <div>
          <dt>{t("ossLicenseShort")}</dt>
          <dd>{entry.licenseShort}</dd>
        </div>
        {entry.homepage ? (
          <div>
            <dt>{t("ossLicenseHomepage")}</dt>
            <dd>
              <a href={entry.homepage} target="_blank" rel="noopener noreferrer">
                {entry.homepage}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mail-oss-license-usage">{t(entry.usageNoteKey)}</p>
      <pre className="mail-oss-license-text">{entry.licenseText}</pre>
    </div>
  );
}
