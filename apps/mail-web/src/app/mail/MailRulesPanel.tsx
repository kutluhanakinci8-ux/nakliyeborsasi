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
  bodyContains: "",
  requireAttachment: false,
  minAttachmentBytes: null,
  maxAttachmentBytes: null,
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
  if (group.bodyContains?.trim()) {
    parts.push(`gövde: ${group.bodyContains.trim()}`);
  }
  if (group.requireAttachment) {
    parts.push("ek");
  }
  if (group.minAttachmentBytes != null) {
    parts.push(`ek≥${group.minAttachmentBytes}B`);
  }
  if (group.maxAttachmentBytes != null) {
    parts.push(`ek≤${group.maxAttachmentBytes}B`);
  }
  const inner = parts.length ? parts.join(", ") : "—";
  return group.matchAny ? `(${inner} — VEYA)` : `(${inner} — VE)`;
}

function formatConditionGroups(groups: MailInboxRuleConditionGroups): string {
  const between = groups.matchAnyBetweenGroups ? " VEYA " : " VE ";
  return groups.groups.map(groupSummary).join(between);
}

const MAX_CONDITION_GROUPS = 5;

function defaultConditionGroupSlots(): MailInboxRuleConditionGroup[] {
  return Array.from({ length: MAX_CONDITION_GROUPS }, () => emptyGroup());
}

function conditionGroupsFromRule(rule: MailInboxRule): MailInboxRuleConditionGroup[] {
  const slots = defaultConditionGroupSlots();
  const fromApi = rule.conditionGroups?.groups ?? [];
  for (let i = 0; i < Math.min(fromApi.length, MAX_CONDITION_GROUPS); i += 1) {
    const g = fromApi[i]!;
    slots[i] = {
      matchAny: g.matchAny,
      fromContains: g.fromContains ?? "",
      subjectContains: g.subjectContains ?? "",
      toContains: g.toContains ?? "",
      bodyContains: g.bodyContains ?? "",
      requireAttachment: Boolean(g.requireAttachment),
      minAttachmentBytes: g.minAttachmentBytes ?? null,
      maxAttachmentBytes: g.maxAttachmentBytes ?? null,
    };
  }
  return slots;
}

type Props = {
  accessToken: string;
};

function RuleToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="mail-posta-toggle">
      <input
        type="checkbox"
        className="mail-posta-toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="mail-posta-toggle-track" aria-hidden="true">
        <span className="mail-posta-toggle-thumb" />
      </span>
      <span className="mail-posta-toggle-text">
        <span className="mail-posta-toggle-label">{label}</span>
        {hint ? <span className="mail-posta-toggle-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

function ActionChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active ? "mail-rules-action-chip is-active" : "mail-rules-action-chip"
      }
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function MailRulesPanel({ accessToken }: Props) {
  const [rules, setRules] = useState<MailInboxRule[]>([]);
  const [folders, setFolders] = useState<MailCustomFolder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [conditionGroups, setConditionGroups] = useState<
    MailInboxRuleConditionGroup[]
  >(defaultConditionGroupSlots());

  async function reload() {
    const [rulesData, folderData] = await Promise.all([
      fetchInboxRules(accessToken),
      fetchCustomFolders(accessToken),
    ]);
    setRules(rulesData.rules);
    setFolders(folderData.folders);
  }

  useEffect(() => {
    void reload()
      .catch(() => setError("Kurallar yüklenemedi."))
      .finally(() => setInitialLoading(false));
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
        bodyContains: g.bodyContains?.trim() || null,
        requireAttachment: Boolean(g.requireAttachment),
        minAttachmentBytes:
          g.minAttachmentBytes != null ? Number(g.minAttachmentBytes) : null,
        maxAttachmentBytes:
          g.maxAttachmentBytes != null ? Number(g.maxAttachmentBytes) : null,
      }))
      .filter(
        (g) =>
          g.fromContains ||
          g.subjectContains ||
          g.toContains ||
          g.bodyContains ||
          g.requireAttachment ||
          g.minAttachmentBytes != null ||
          g.maxAttachmentBytes != null,
      );
    if (groups.length === 0) {
      return null;
    }
    return { matchAnyBetweenGroups, groups };
  }

  function resetForm() {
    setEditingRuleId(null);
    setName("");
    setFromContains("");
    setSubjectContains("");
    setToContains("");
    setRequireAttachment(false);
    setMatchAnyCondition(false);
    setUseConditionGroups(false);
    setMatchAnyBetweenGroups(false);
    setConditionGroups(defaultConditionGroupSlots());
    setActionStar(false);
    setActionArchive(false);
    setActionMarkRead(false);
    setActionTrash(false);
    setActionFolderId("");
  }

  function beginEdit(rule: MailInboxRule) {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setActionStar(rule.actionStar);
    setActionArchive(rule.actionArchive);
    setActionMarkRead(rule.actionMarkRead);
    setActionTrash(rule.actionTrash);
    setActionFolderId(rule.actionCustomFolderId ?? "");
    if (rule.conditionGroups) {
      setUseConditionGroups(true);
      setMatchAnyBetweenGroups(rule.conditionGroups.matchAnyBetweenGroups);
      setConditionGroups(conditionGroupsFromRule(rule));
      setFromContains("");
      setSubjectContains("");
      setToContains("");
      setRequireAttachment(false);
      setMatchAnyCondition(false);
    } else {
      setUseConditionGroups(false);
      setFromContains(rule.fromContains ?? "");
      setSubjectContains(rule.subjectContains ?? "");
      setToContains(rule.toContains ?? "");
      setRequireAttachment(rule.requireAttachment);
      setMatchAnyCondition(rule.matchAnyCondition);
      setConditionGroups(defaultConditionGroupSlots());
    }
    setError("");
    setInfo("");
  }

  async function onSubmit() {
    setError("");
    try {
      const groupsPayload = buildConditionGroupsPayload();
      const body = {
        name: name.trim(),
        fromContains: useConditionGroups
          ? null
          : fromContains.trim() || null,
        subjectContains: useConditionGroups
          ? null
          : subjectContains.trim() || null,
        toContains: useConditionGroups ? null : toContains.trim() || null,
        requireAttachment: useConditionGroups ? false : requireAttachment,
        matchAnyCondition: useConditionGroups ? false : matchAnyCondition,
        conditionGroups: useConditionGroups ? groupsPayload : null,
        actionStar,
        actionArchive,
        actionMarkRead,
        actionTrash,
        actionCustomFolderId: actionFolderId || null,
      };
      if (editingRuleId) {
        await updateInboxRule(accessToken, editingRuleId, body);
        setInfo("Kural güncellendi.");
      } else {
        await createInboxRule(accessToken, {
          ...body,
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
          matchAnyCondition: useConditionGroups
            ? undefined
            : matchAnyCondition,
          conditionGroups: groupsPayload,
        });
        setInfo("Kural eklendi.");
      }
      resetForm();
      await reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingRuleId
            ? "Kural güncellenemedi."
            : "Kural eklenemedi.",
      );
    }
  }

  if (initialLoading) {
    return (
      <div className="mail-rules-panel mail-rules-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-rules-panel mail-rules-panel--premium">
      <p className="mail-posta-intro">
        Yeni gelen postalar için sunucu kuralları. Üstten alta sırayla değerlendirilir;
        ilk eşleşen kural uygulanır.
      </p>
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {info}
        </p>
      ) : null}

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Mevcut kurallar</h3>
          <p className="mail-posta-card-desc">
            Sırayı değiştirmek için yukarı/aşağı kullanın.
          </p>
        </header>
      <ul className="mail-rules-list mail-rules-list--premium">
        {rules.length === 0 ? (
          <li className="mail-rules-empty">
            <span className="mail-rules-empty-icon" aria-hidden="true">⚡</span>
            Henüz kural yok.
          </li>
        ) : (
          rules.map((rule, index) => (
            <li
              key={rule.id}
              className={
                rule.enabled
                  ? "mail-rules-item mail-rules-item--premium"
                  : "mail-rules-item mail-rules-item--premium is-disabled"
              }
            >
              <div className="mail-rules-item-top">
              <div className="mail-rules-order">
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost mail-rules-order-btn"
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
                  className="mail-premium-btn mail-premium-btn--ghost mail-rules-order-btn"
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
              <div className="mail-rules-item-main">
              <div className="mail-rules-item-head">
                <strong className="mail-rules-item-name">{rule.name}</strong>
                <RuleToggle
                  checked={rule.enabled}
                  onChange={() =>
                    void updateInboxRule(accessToken, rule.id, {
                      enabled: !rule.enabled,
                    }).then(() => reload())
                  }
                  label="Aktif"
                />
              </div>
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
              </div>
              </div>
              <div className="mail-rules-actions mail-rules-actions--premium">
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost"
                  onClick={() => beginEdit(rule)}
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost"
                  onClick={() =>
                    void previewInboxRule(accessToken, rule.id).then(
                      ({ preview }) => {
                        const cap = preview.capped ? " (ilk 500 tarandı)" : "";
                        const sample = preview.samples
                          .map(
                            (s) =>
                              `“${s.subject}” (${s.matchedBecause || "—"})`,
                          )
                          .join("; ");
                        const counter = preview.nonMatchingSamples
                          .map(
                            (s) =>
                              `“${s.subject}” (${s.failedBecause || "—"})`,
                          )
                          .join("; ");
                        setInfo(
                          `Önizleme: ${preview.matchCount} eşleşme${cap}. Mantık: ${preview.matchLogicDescription}${sample ? ` — eşleşen: ${sample}` : ""}${counter ? ` — eşleşmeyen: ${counter}` : ""}`,
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
                  className="mail-premium-btn mail-premium-btn--ghost"
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
                  className="mail-premium-btn mail-premium-btn--danger-ghost"
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
      </section>

      <section className="mail-posta-card mail-rules-form-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">
            {editingRuleId ? "Kural düzenle" : "Yeni kural"}
          </h3>
          <p className="mail-posta-card-desc">
            Koşullar ve uygulanacak işlemleri tanımlayın.
          </p>
        </header>
        <div className="mail-rules-form-body">
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">Kural adı</span>
        <input
          className="mail-premium-field-input"
          placeholder="Örn. Destek talepleri"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <RuleToggle
        checked={useConditionGroups}
        onChange={setUseConditionGroups}
        label="Gelişmiş koşul grupları"
        hint="En fazla 5 grup; iç içe VE / VEYA mantığı."
      />
      {useConditionGroups ? (
        <div className="mail-rules-groups mail-rules-groups--premium">
          <RuleToggle
            checked={matchAnyBetweenGroups}
            onChange={setMatchAnyBetweenGroups}
            label="Gruplar arası VEYA"
            hint="Kapalıysa tüm gruplar sağlanmalı (VE)."
          />
          {conditionGroups.map((group, gi) => (
            <fieldset key={gi} className="mail-rules-group mail-rules-group--premium">
              <legend className="mail-rules-group-legend">Grup {gi + 1}</legend>
              <RuleToggle
                checked={group.matchAny}
                onChange={(on) => {
                  const next = [...conditionGroups];
                  next[gi] = { ...group, matchAny: on };
                  setConditionGroups(next);
                }}
                label="Bu grupta VEYA"
              />
              <label className="mail-premium-field">
                <span className="mail-premium-field-label">Gönderen</span>
                <input
                  className="mail-premium-field-input"
                  placeholder="| ile alternatif"
                  value={group.fromContains ?? ""}
                  onChange={(e) => {
                    const next = [...conditionGroups];
                    next[gi] = { ...group, fromContains: e.target.value };
                    setConditionGroups(next);
                  }}
                />
              </label>
              <label className="mail-premium-field">
                <span className="mail-premium-field-label">Konu</span>
                <input
                  className="mail-premium-field-input"
                  placeholder="| ile alternatif"
                  value={group.subjectContains ?? ""}
                  onChange={(e) => {
                    const next = [...conditionGroups];
                    next[gi] = { ...group, subjectContains: e.target.value };
                    setConditionGroups(next);
                  }}
                />
              </label>
              <label className="mail-premium-field">
                <span className="mail-premium-field-label">Alıcı (To)</span>
                <input
                  className="mail-premium-field-input"
                  placeholder="| ile alternatif"
                  value={group.toContains ?? ""}
                  onChange={(e) => {
                    const next = [...conditionGroups];
                    next[gi] = { ...group, toContains: e.target.value };
                    setConditionGroups(next);
                  }}
                />
              </label>
              <label className="mail-premium-field">
                <span className="mail-premium-field-label">Gövde</span>
                <input
                  className="mail-premium-field-input"
                  placeholder="Metin içerir (| alternatif)"
                  value={group.bodyContains ?? ""}
                  onChange={(e) => {
                    const next = [...conditionGroups];
                    next[gi] = { ...group, bodyContains: e.target.value };
                    setConditionGroups(next);
                  }}
                />
              </label>
              <div className="mail-rules-attach-row">
                <label className="mail-premium-field">
                  <span className="mail-premium-field-label">Min ek (byte)</span>
                  <input
                    type="number"
                    min={0}
                    className="mail-premium-field-input"
                    placeholder="Toplam"
                    value={group.minAttachmentBytes ?? ""}
                    onChange={(e) => {
                      const next = [...conditionGroups];
                      const raw = e.target.value.trim();
                      next[gi] = {
                        ...group,
                        minAttachmentBytes: raw === "" ? null : Number(raw),
                      };
                      setConditionGroups(next);
                    }}
                  />
                </label>
                <label className="mail-premium-field">
                  <span className="mail-premium-field-label">Max ek (byte)</span>
                  <input
                    type="number"
                    min={0}
                    className="mail-premium-field-input"
                    placeholder="Toplam"
                    value={group.maxAttachmentBytes ?? ""}
                    onChange={(e) => {
                      const next = [...conditionGroups];
                      const raw = e.target.value.trim();
                      next[gi] = {
                        ...group,
                        maxAttachmentBytes: raw === "" ? null : Number(raw),
                      };
                      setConditionGroups(next);
                    }}
                  />
                </label>
              </div>
              <RuleToggle
                checked={Boolean(group.requireAttachment)}
                onChange={(on) => {
                  const next = [...conditionGroups];
                  next[gi] = { ...group, requireAttachment: on };
                  setConditionGroups(next);
                }}
                label="Ek zorunlu"
              />
            </fieldset>
          ))}
        </div>
      ) : (
        <div className="mail-rules-simple-conditions">
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">Gönderen içerir</span>
            <input
              className="mail-premium-field-input"
              placeholder="destek|support"
              value={fromContains}
              onChange={(e) => setFromContains(e.target.value)}
            />
          </label>
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">Konu içerir</span>
            <input
              className="mail-premium-field-input"
              placeholder="| ile alternatif"
              value={subjectContains}
              onChange={(e) => setSubjectContains(e.target.value)}
            />
          </label>
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">Alıcı (To) içerir</span>
            <input
              className="mail-premium-field-input"
              placeholder="| ile alternatif"
              value={toContains}
              onChange={(e) => setToContains(e.target.value)}
            />
          </label>
          <RuleToggle
            checked={matchAnyCondition}
            onChange={setMatchAnyCondition}
            label="Koşullardan herhangi biri (VEYA)"
            hint="Varsayılan: tüm koşullar (VE)."
          />
          <RuleToggle
            checked={requireAttachment}
            onChange={setRequireAttachment}
            label="Yalnızca ekli postalar"
          />
        </div>
      )}

      <div className="mail-rules-actions-section">
        <span className="mail-premium-field-label">İşlemler</span>
        <div
          className="mail-rules-action-chips"
          role="group"
          aria-label="Kural işlemleri"
        >
          <ActionChip
            active={actionStar}
            label="Yıldızla"
            onClick={() => setActionStar(!actionStar)}
          />
          <ActionChip
            active={actionArchive}
            label="Arşivle"
            onClick={() => setActionArchive(!actionArchive)}
          />
          <ActionChip
            active={actionMarkRead}
            label="Okundu"
            onClick={() => setActionMarkRead(!actionMarkRead)}
          />
          <ActionChip
            active={actionTrash}
            label="Çöp"
            onClick={() => setActionTrash(!actionTrash)}
          />
        </div>
      </div>

      <label className="mail-premium-field">
        <span className="mail-premium-field-label">Özel klasör</span>
        <select
          className="mail-premium-field-input mail-premium-field-select"
          value={actionFolderId}
          onChange={(e) => setActionFolderId(e.target.value)}
        >
          <option value="">Klasör seçme</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </label>

      <div className="mail-rules-form-actions mail-rules-form-actions--premium">
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--primary"
          onClick={() => void onSubmit()}
        >
          {editingRuleId ? "Kaydet" : "Kural ekle"}
        </button>
        {editingRuleId ? (
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--ghost"
            onClick={() => resetForm()}
          >
            İptal
          </button>
        ) : null}
      </div>
        </div>
      </section>
    </div>
  );
}
