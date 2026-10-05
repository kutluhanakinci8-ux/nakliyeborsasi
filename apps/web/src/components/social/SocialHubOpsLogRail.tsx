"use client";

import { useMemo, useState } from "react";
import type { SocialHubOpsLogEntry } from "../../lib/socialHubConnectionsOpsLog";

type Props = {
  entries: SocialHubOpsLogEntry[];
  title?: string;
  className?: string;
};

function levelLabel(level: SocialHubOpsLogEntry["level"]): string {
  switch (level) {
    case "error":
      return "Hata";
    case "warn":
      return "Uyarı";
    default:
      return "Bilgi";
  }
}

export function SocialHubOpsLogRail({
  entries,
  title = "Operasyon günlüğü",
  className = "",
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const counts = useMemo(() => {
    let warn = 0;
    let err = 0;
    for (const e of entries) {
      if (e.level === "warn") {
        warn += 1;
      }
      if (e.level === "error") {
        err += 1;
      }
    }
    return { warn, err, total: entries.length };
  }, [entries]);

  return (
    <aside
      className={`social-hub-ops-log-rail ${mobileOpen ? "social-hub-ops-log-rail--open" : ""} ${className}`.trim()}
      aria-label={title}
    >
      <div className="social-hub-ops-log-rail-head">
        <div>
          <h3 className="social-hub-ops-log-rail-title">{title}</h3>
          <p className="social-hub-ops-log-rail-sub">
            Teknik notlar ve uyarılar — günlük operasyon için.
          </p>
        </div>
        <div className="social-hub-ops-log-rail-badges">
          {counts.err > 0 ? (
            <span className="social-hub-ops-log-count social-hub-ops-log-count--error">
              {counts.err} hata
            </span>
          ) : null}
          {counts.warn > 0 ? (
            <span className="social-hub-ops-log-count social-hub-ops-log-count--warn">
              {counts.warn} uyarı
            </span>
          ) : null}
          <button
            type="button"
            className="social-hub-ops-log-mobile-toggle"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? "Gizle" : "Göster"}
          </button>
        </div>
      </div>
      <div className="social-hub-ops-log-stream" role="log" aria-live="polite">
        {entries.length === 0 ? (
          <p className="social-hub-ops-log-empty">
            Kayıt yok — kanallar sade görünüyor.
          </p>
        ) : (
          <ul className="social-hub-ops-log-list">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`social-hub-ops-log-item social-hub-ops-log-item--${entry.level}`}
              >
                <div className="social-hub-ops-log-item-meta">
                  <span className="social-hub-ops-log-level">
                    {levelLabel(entry.level)}
                  </span>
                  {entry.channel ? (
                    <span className="social-hub-ops-log-channel">{entry.channel}</span>
                  ) : null}
                </div>
                <p className="social-hub-ops-log-message">{entry.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
