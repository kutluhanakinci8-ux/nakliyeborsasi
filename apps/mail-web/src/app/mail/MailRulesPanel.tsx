"use client";

import { useEffect, useState } from "react";
import {
  applyInboxRuleToMailbox,
  createInboxRule,
  deleteInboxRule,
  fetchCustomFolders,
  fetchInboxRules,
  previewInboxRule,
  reorderInboxRules,
  updateInboxRule,
  type MailCustomFolder,
  type MailInboxRule,
  type MailInboxRuleConditionGroup,
  type MailInboxRuleConditionGroups,
} from "@/lib/mailApi";

const emptyGroup = (): MailInboxRuleConditionGroup => ({
  matchAny: false,
  fromContains: "",
  subjectContains: "",
  toContains: "",
  requireAttachment: false,
});

function groupSummary(group: MailInboxRuleConditionGroup): string {
  const parts: string[] = [];
  if (group.fromContains?.trim()) {
    parts.push(`gönderen: ${group.fromContains.trim()}`);
  }
  if (group.subjectContains?.trim()) {
    parts.push(`konu: ${group.subjectContains.trim()}`);
  }
  if (group.toContains?.trim()) {
    parts.push(`alıcı: ${group.toContains.trim()}`);
  }
  if (group.requireAttachment) {
    parts.push("ek");
  }
  const inner = parts.length ? parts.join(", ") : "—";
  return group.matchAny ? `(${inner} — VEYA)` : `(${inner} — VE)`;
}

function formatConditionGroups(groups: MailInboxRuleConditionGroups): string {
  const between = groups.matchAnyBetweenGroups ? " VEYA " : " VE ";
  return groups.groups.map(groupSummary).join(between);
}

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
  const [toContains, setToContains] = useState("");
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [matchAnyCondition, setMatchAnyCondition] = useState(false);
  const [actionStar, setActionStar] = useState(false);
  const [info, setInfo] = useState("");
  const [actionArchive, setActionArchive] = useState(false);
  const [actionMarkRead, setActionMarkRead] = useState(false);
  const [actionTrash, setActionTrash] = useState(false);
  const [actionFolderId, setActionFolderId] = useState("");
  const [useConditionGroups, setUseConditionGroups] = useState(false);
  const [matchAnyBetweenGroups, setMatchAnyBetweenGroups] = useState(false);
  const [conditionGroups, setConditionGroups] = useState<
    MailInboxRuleConditionGroup[]
  >([emptyGroup(), emptyGroup()]);

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

  function buildConditionGroupsPayload(): MailInboxRuleConditionGroups | null {
    if (!useConditionGroups) {
      return null;
    }
    const groups = conditionGroups
      .map((g) => ({
        matchAny: g.matchAny,
        fromContains: g.fromContains?.trim() || null,
        subjectContains: g.subjectContains?.trim() || null,
        toContains: g.toContains?.trim() || null,
        requireAttachment: Boolean(g.requireAttachment),
      }))
      .filter(
        (g) =>
          g.fromContains ||
          g.subjectContains ||
          g.toContains ||
          g.requireAttachment,
      );
    if (groups.length === 0) {
      return null;
    }
    return { matchAnyBetweenGroups, groups };
  }

  async function onCreate() {
    setError("");
    try {
      const groupsPayload = buildConditionGroupsPayload();
      await createInboxRule(accessToken, {
        name: name.trim(),
        fromContains: useConditionGroups
          ? undefined
          : fromContains.trim() || undefined,
        subjectContains: useConditionGroups
          ? undefined
          : subjectContains.trim() || undefined,
        toContains: useConditionGroups
          ? undefined
          : toContains.trim() || undefined,
        requireAttachment: useConditionGroups ? undefined : requireAttachment,
        matchAnyCondition: useConditionGroups ? undefined : matchAnyCondition,
        conditionGroups: groupsPayload,
        actionStar,
        actionArchive,
        actionMarkRead,
        actionTrash,
        actionCustomFolderId: actionFolderId || null,
      });
      setName("");
      setFromContains("");
      setSubjectContains("");
      setToContains("");
      setRequireAttachment(false);
      setMatchAnyCondition(false);
      setUseConditionGroups(false);
      setMatchAnyBetweenGroups(false);
      setConditionGroups([emptyGroup(), emptyGroup()]);
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
      {info ? <p style={{ fontSize: "0.9rem" }}>{info}</p> : null}
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
                {rule.toContains ? ` · Alıcı: “${rule.toContains}”` : null}
                {rule.requireAttachment ? " · Ek var" : null}
                {rule.matchAnyCondition ? " · Koşul: VEYA" : null}
                {rule.conditionGroups
                  ? ` · Gruplar: ${formatConditionGroups(rule.conditionGroups)}`
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
              <div className="mail-rules-actions">
                <button
                  type="button"
                  onClick={() =>
                    void previewInboxRule(accessToken, rule.id).then(
                      ({ preview }) => {
                        const cap = preview.capped ? " (ilk 500 tarandı)" : "";
                        const sample = preview.samples
                          .map((s) => s.subject)
                          .join("; ");
                        setInfo(
                          `Önizleme: ${preview.matchCount} eşleşme${cap}${sample ? ` — örnek: ${sample}` : ""}`,
                        );
                      },
                      () => setError("Önizleme başarısız."),
                    )
                  }
                >
                  Önizle
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void applyInboxRuleToMailbox(accessToken, rule.id).then(
                      (r) => {
                        setInfo(`${r.applied} mesaja uygulandı (en fazla 100).`);
                      },
                      (err: unknown) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Uygulanamadı.",
                        );
                      },
                    )
                  }
                >
                  Gelen kutusuna uygula
                </button>
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
              </div>
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
      <label>
        <input
          type="checkbox"
          checked={useConditionGroups}
          onChange={(e) => setUseConditionGroups(e.target.checked)}
        />
        Gelişmiş koşul grupları (en fazla 2 grup)
      </label>
      {useConditionGroups ? (
        <div className="mail-rules-groups">
          <label>
            <input
              type="checkbox"
              checked={matchAnyBetweenGroups}
              onChange={(e) => setMatchAnyBetweenGroups(e.target.checked)}
            />
            Gruplar arası VEYA (kapalı = tüm gruplar sağlanmalı)
          </label>
          {conditionGroups.map((group, gi) => (
            <fieldset key={gi} className="mail-rules-group">
              <legend>Grup {gi + 1}</legend>
              <label>
                <input
                  type="checkbox"
                  checked={group.matchAny}
                  onChange={(e) => {
                    const next = [...conditionGroups];
                    next[gi] = { ...group, matchAny: e.target.checked };
                    setConditionGroups(next);
                  }}
                />
                Bu grupta VEYA
              </label>
              <input
                placeholder="Gönderen (| alternatif)"
                value={group.fromContains ?? ""}
                onChange={(e) => {
                  const next = [...conditionGroups];
                  next[gi] = { ...group, fromContains: e.target.value };
                  setConditionGroups(next);
                }}
              />
              <input
                placeholder="Konu (| alternatif)"
                value={group.subjectContains ?? ""}
                onChange={(e) => {
                  const next = [...conditionGroups];
                  next[gi] = { ...group, subjectContains: e.target.value };
                  setConditionGroups(next);
                }}
              />
              <input
                placeholder="Alıcı (| alternatif)"
                value={group.toContains ?? ""}
                onChange={(e) => {
                  const next = [...conditionGroups];
                  next[gi] = { ...group, toContains: e.target.value };
                  setConditionGroups(next);
                }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(group.requireAttachment)}
                  onChange={(e) => {
                    const next = [...conditionGroups];
                    next[gi] = {
                      ...group,
                      requireAttachment: e.target.checked,
                    };
                    setConditionGroups(next);
                  }}
                />
                Ek zorunlu
              </label>
            </fieldset>
          ))}
        </div>
      ) : (
        <>
          <input
            placeholder="Gönderen içerir (| ile alternatif: destek|support)"
            value={fromContains}
            onChange={(e) => setFromContains(e.target.value)}
          />
          <input
            placeholder="Konu içerir (| ile alternatif)"
            value={subjectContains}
            onChange={(e) => setSubjectContains(e.target.value)}
          />
          <input
            placeholder="Alıcı (To) içerir (| ile alternatif)"
            value={toContains}
            onChange={(e) => setToContains(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={matchAnyCondition}
              onChange={(e) => setMatchAnyCondition(e.target.checked)}
            />
            Koşullardan herhangi biri (VEYA) — varsayılan: tümü (VE)
          </label>
          <label>
            <input
              type="checkbox"
              checked={requireAttachment}
              onChange={(e) => setRequireAttachment(e.target.checked)}
            />
            Yalnızca ekli postalar
          </label>
        </>
      )}
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
