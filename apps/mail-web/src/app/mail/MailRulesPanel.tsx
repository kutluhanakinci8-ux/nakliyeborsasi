"use client";

import { useEffect, useState } from "react";
import {
  createInboxRule,
  deleteInboxRule,
  fetchCustomFolders,
  fetchInboxRules,
  reorderInboxRules,
  updateInboxRule,
  type MailCustomFolder,
  type MailInboxRule,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailRulesPanel({ accessToken }: Props) {
  const [rules, setRules] = useState<MailInboxRule[]>([]);
  const [folders, setFolders] = useState<MailCustomFolder[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [fromContains, setFromContains] = useState("");
  const [subjectContains, setSubjectContains] = useState("");
  const [actionStar, setActionStar] = useState(false);
  const [actionArchive, setActionArchive] = useState(false);
  const [actionMarkRead, setActionMarkRead] = useState(false);
  const [actionTrash, setActionTrash] = useState(false);
  const [actionFolderId, setActionFolderId] = useState("");

  async function reload() {
    const [rulesData, folderData] = await Promise.all([
      fetchInboxRules(accessToken),
      fetchCustomFolders(accessToken),
    ]);
    setRules(rulesData.rules);
    setFolders(folderData.folders);
  }

  useEffect(() => {
    void reload().catch(() => setError("Kurallar yüklenemedi."));
  }, [accessToken]);

  async function onCreate() {
    setError("");
    try {
      await createInboxRule(accessToken, {
        name: name.trim(),
        fromContains: fromContains.trim() || undefined,
        subjectContains: subjectContains.trim() || undefined,
        actionStar,
        actionArchive,
        actionMarkRead,
        actionTrash,
        actionCustomFolderId: actionFolderId || null,
      });
      setName("");
      setFromContains("");
      setSubjectContains("");
      setActionStar(false);
      setActionArchive(false);
      setActionMarkRead(false);
      setActionTrash(false);
      setActionFolderId("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kural eklenemedi.");
    }
  }

  return (
    <div className="mail-rules-panel">
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        Yeni gelen postalar için sunucu kuralları (ilk eşleşen uygulanır).
      </p>
      {error ? <p className="login-error">{error}</p> : null}
      <ul className="mail-rules-list">
        {rules.length === 0 ? (
          <li className="mail-rules-empty">Henüz kural yok.</li>
        ) : (
          rules.map((rule, index) => (
            <li key={rule.id} className="mail-rules-item">
              <div className="mail-rules-order">
                <button
                  type="button"
                  disabled={index === 0}
                  title="Yukarı"
                  onClick={() => {
                    const ids = rules.map((r) => r.id);
                    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                    void reorderInboxRules(accessToken, ids).then(() =>
                      reload(),
                    );
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === rules.length - 1}
                  title="Aşağı"
                  onClick={() => {
                    const ids = rules.map((r) => r.id);
                    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                    void reorderInboxRules(accessToken, ids).then(() =>
                      reload(),
                    );
                  }}
                >
                  ↓
                </button>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() =>
                    void updateInboxRule(accessToken, rule.id, {
                      enabled: !rule.enabled,
                    }).then(() => reload())
                  }
                />
                <strong>{rule.name}</strong>
              </label>
              <div className="mail-rules-meta">
                {rule.fromContains ? `Gönderen: “${rule.fromContains}”` : null}
                {rule.fromContains && rule.subjectContains ? " · " : null}
                {rule.subjectContains
                  ? `Konu: “${rule.subjectContains}”`
                  : null}
              </div>
              <div className="mail-rules-meta">
                {rule.actionStar ? "★ Yıldızla" : null}
                {rule.actionStar && rule.actionCustomFolderId ? " · " : null}
                {rule.actionCustomFolderId
                  ? `Klasör: ${
                      folders.find((f) => f.id === rule.actionCustomFolderId)
                        ?.name ?? "—"
                    }`
                  : null}
                {rule.actionArchive ? " · Arşivle" : null}
                {rule.actionMarkRead ? " · Okundu" : null}
                {rule.actionTrash ? " · Çöp" : null}
              </div>
              <button
                type="button"
                className="mail-rules-delete"
                onClick={() =>
                  void deleteInboxRule(accessToken, rule.id).then(() =>
                    reload(),
                  )
                }
              >
                Sil
              </button>
            </li>
          ))
        )}
      </ul>
      <h3>Yeni kural</h3>
      <input
        placeholder="Kural adı"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Gönderen adresi içerir (isteğe bağlı)"
        value={fromContains}
        onChange={(e) => setFromContains(e.target.value)}
      />
      <input
        placeholder="Konu içerir (isteğe bağlı)"
        value={subjectContains}
        onChange={(e) => setSubjectContains(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={actionStar}
          onChange={(e) => setActionStar(e.target.checked)}
        />
        Yıldızla
      </label>
      <label>
        <input
          type="checkbox"
          checked={actionArchive}
          onChange={(e) => setActionArchive(e.target.checked)}
        />
        Arşivle
      </label>
      <label>
        <input
          type="checkbox"
          checked={actionMarkRead}
          onChange={(e) => setActionMarkRead(e.target.checked)}
        />
        Okundu işaretle
      </label>
      <label>
        <input
          type="checkbox"
          checked={actionTrash}
          onChange={(e) => setActionTrash(e.target.checked)}
        />
        Çöpe taşı
      </label>
      <select
        value={actionFolderId}
        onChange={(e) => setActionFolderId(e.target.value)}
      >
        <option value="">Klasör seçme</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      <button type="button" onClick={() => void onCreate()}>Kural ekle</button>
    </div>
  );
}
