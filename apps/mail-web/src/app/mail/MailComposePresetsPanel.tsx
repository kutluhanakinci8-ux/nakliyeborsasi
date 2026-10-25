"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  createComposePreset,
  deleteComposePreset,
  fetchComposePresets,
  updateComposePreset,
  type MailComposePreset,
} from "@/lib/mailApi";
import { mergeComposeTemplatesWithBuiltins } from "@/lib/mailComposePresets";

type Props = {
  accessToken: string;
};

type FormKind = "signature" | "template" | "campaign";

function PresetSection({
  title,
  description,
  children,
  muted,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={
        muted ? "mail-posta-card mail-posta-card--muted" : "mail-posta-card"
      }
    >
      <header className="mail-posta-card-head">
        <h3 className="mail-posta-card-title">{title}</h3>
        {description ? (
          <p className="mail-posta-card-desc">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function PresetEmpty({ label }: { label: string }) {
  return (
    <div className="mail-presets-empty" role="status">
      <span className="mail-presets-empty-icon" aria-hidden="true">✎</span>
      <p>{label}</p>
    </div>
  );
}

export function MailComposePresetsPanel({ accessToken }: Props) {
  const { t } = useMailLocale();
  const [signatures, setSignatures] = useState<MailComposePreset[]>([]);
  const [templates, setTemplates] = useState<MailComposePreset[]>([]);
  const [campaignTemplates, setCampaignTemplates] = useState<MailComposePreset[]>(
    [],
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formKind, setFormKind] = useState<FormKind>("signature");
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formBodyHtml, setFormBodyHtml] = useState("");
  const [formDefault, setFormDefault] = useState(false);

  const reload = useCallback(async () => {
    const data = await fetchComposePresets(accessToken);
    setSignatures(data.signatures);
    setTemplates(mergeComposeTemplatesWithBuiltins(data.templates));
    setCampaignTemplates(data.campaignTemplates ?? []);
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      try {
        await reload();
      } catch {
        setError(t("presetsErrLoad"));
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [reload]);

  async function onCreate() {
    setError("");
    setStatus("");
    if (!formName.trim() || !formBody.trim()) {
      setError(t("presetsErrNameBody"));
      return;
    }
    if (
      (formKind === "template" || formKind === "campaign") &&
      !formSubject.trim()
    ) {
      setError(t("presetsErrSubject"));
      return;
    }
    setLoading(true);
    try {
      await createComposePreset(accessToken, {
        kind: formKind,
        name: formName.trim(),
        subject:
          formKind === "template" || formKind === "campaign"
            ? formSubject.trim()
            : undefined,
        bodyText: formBody.trim(),
        bodyHtml: formBodyHtml.trim() ? formBodyHtml.trim() : undefined,
        isDefault: formKind === "signature" ? formDefault : undefined,
      });
      setFormName("");
      setFormSubject("");
      setFormBody("");
      setFormBodyHtml("");
      setFormDefault(false);
      await reload();
      setStatus(t("presetsCreated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGenericSave"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleDefault(preset: MailComposePreset) {
    setStatus("");
    try {
      await updateComposePreset(accessToken, preset.id, {
        isDefault: !preset.isDefault,
      });
      await reload();
      setStatus(t("presetsDefaultUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGenericUpdate"));
    }
  }

  async function onDelete(id: string) {
    setStatus("");
    try {
      await deleteComposePreset(accessToken, id);
      await reload();
      setStatus(t("presetsDeleted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("presetsErrDelete"));
    }
  }

  function renderList(
    items: MailComposePreset[],
    options: {
      showDefault: boolean;
      emptyLabel: string;
    },
  ) {
    if (items.length === 0) {
      return <PresetEmpty label={options.emptyLabel} />;
    }
    return (
      <ul className="mail-presets-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={
              item.isDefault
                ? "mail-presets-item is-default"
                : "mail-presets-item"
            }
          >
            <div className="mail-presets-item-main">
              <div className="mail-presets-item-head">
                <span className="mail-presets-item-name">{item.name}</span>
                {item.isSystem ? (
                  <span className="mail-presets-tag mail-presets-tag--system">
                    {t("presetsTagSystem")}
                  </span>
                ) : null}
                {options.showDefault && item.isDefault ? (
                  <span className="mail-accounts-badge">{t("presetsTagDefault")}</span>
                ) : null}
              </div>
              {(item.kind === "template" || item.kind === "campaign") &&
              item.subject ? (
                <span className="mail-presets-item-subject">{item.subject}</span>
              ) : null}
            </div>
            <div className="mail-presets-item-actions">
              {options.showDefault ? (
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost"
                  onClick={() => void toggleDefault(item)}
                >
                  {item.isDefault ? t("presetsUnsetDefault") : t("presetsSetDefault")}
                </button>
              ) : null}
              {item.isSystem ? null : (
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--danger-ghost"
                  onClick={() => void onDelete(item.id)}
                >
                  {t("actionDelete")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (initialLoading) {
    return (
      <div className="mail-presets-panel mail-presets-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  const systemTemplates = templates.filter((row) => row.isSystem);
  const orgTemplates = templates.filter((row) => !row.isSystem);

  return (
    <div className="mail-presets-panel mail-presets-panel--premium">
      <p className="mail-posta-intro">{t("presetsIntro")}</p>

      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {status}
        </p>
      ) : null}

      <PresetSection
        title={t("presetsSignaturesTitle")}
        description={t("presetsSignaturesDesc")}
      >
        {renderList(signatures, {
          showDefault: true,
          emptyLabel: t("presetsEmptySignatures"),
        })}
      </PresetSection>

      <PresetSection
        title={t("presetsTemplatesTitle")}
        description={t("presetsTemplatesDesc")}
      >
        {renderList(systemTemplates, {
          showDefault: false,
          emptyLabel: t("presetsEmptySystem"),
        })}
      </PresetSection>

      <PresetSection
        title={t("presetsOrgTitle")}
        description={t("presetsOrgDesc")}
        muted
      >
        {renderList(orgTemplates, {
          showDefault: false,
          emptyLabel: t("presetsEmptyOrg"),
        })}
      </PresetSection>

      <PresetSection
        title={t("presetsCampaignTitle")}
        description={t("presetsCampaignDesc")}
        muted
      >
        {renderList(campaignTemplates, {
          showDefault: false,
          emptyLabel: t("presetsEmptyCampaign"),
        })}
      </PresetSection>

      <PresetSection
        title={t("presetsNewTitle")}
        description={t("presetsNewDesc")}
      >
        <div className="mail-presets-form">
          <div className="mail-premium-field">
            <span className="mail-premium-field-label">{t("presetsKindLabel")}</span>
            <div
              className="mail-posta-chips mail-posta-chips--equal mail-presets-kind-chips"
              role="group"
              aria-label={t("presetsKindAria")}
            >
              {(
                [
                  { id: "signature" as FormKind, label: t("presetsKindSignature") },
                  { id: "template" as FormKind, label: t("presetsKindTemplate") },
                  { id: "campaign" as FormKind, label: t("presetsKindCampaign") },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={
                    formKind === opt.id
                      ? "mail-posta-chip is-active"
                      : "mail-posta-chip"
                  }
                  aria-pressed={formKind === opt.id}
                  onClick={() => setFormKind(opt.id)}
                >
                  <span className="mail-posta-chip-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="mail-premium-field">
            <span className="mail-premium-field-label">{t("presetsNameLabel")}</span>
            <input
              className="mail-premium-field-input"
              placeholder={t("presetsNamePlaceholder")}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </label>

          {formKind === "template" || formKind === "campaign" ? (
            <label className="mail-premium-field">
              <span className="mail-premium-field-label">{t("presetsSubjectLabel")}</span>
              <input
                className="mail-premium-field-input"
                placeholder={t("presetsSubjectPlaceholder")}
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              />
            </label>
          ) : null}

          <label className="mail-premium-field">
            <span className="mail-premium-field-label">{t("presetsBodyLabel")}</span>
            <textarea
              className="mail-premium-field-textarea"
              placeholder={t("presetsBodyPlaceholder")}
              rows={4}
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
            />
          </label>

          {formKind === "signature" ? (
            <label className="mail-premium-field">
              <span className="mail-premium-field-label">
                {t("presetsHtmlSigLabel")}
              </span>
              <textarea
                className="mail-premium-field-textarea mail-premium-field-textarea--mono"
                placeholder={t("presetsHtmlSigPlaceholder")}
                rows={5}
                value={formBodyHtml}
                onChange={(e) => setFormBodyHtml(e.target.value)}
              />
            </label>
          ) : null}

          {formKind === "template" || formKind === "campaign" ? (
            <label className="mail-premium-field">
              <span className="mail-premium-field-label">
                {t("presetsHtmlBodyLabel")}
              </span>
              <textarea
                className="mail-premium-field-textarea mail-premium-field-textarea--mono"
                placeholder={t("presetsHtmlBodyPlaceholder")}
                rows={5}
                value={formBodyHtml}
                onChange={(e) => setFormBodyHtml(e.target.value)}
              />
            </label>
          ) : null}

          {formKind === "signature" ? (
            <label className="mail-posta-toggle mail-presets-default-toggle">
              <input
                type="checkbox"
                className="mail-posta-toggle-input"
                checked={formDefault}
                onChange={(e) => setFormDefault(e.target.checked)}
              />
              <span className="mail-posta-toggle-track" aria-hidden="true">
                <span className="mail-posta-toggle-thumb" />
              </span>
              <span className="mail-posta-toggle-text">
                <span className="mail-posta-toggle-label">{t("presetsDefaultSig")}</span>
                <span className="mail-posta-toggle-hint">
                  {t("presetsDefaultSigHint")}
                </span>
              </span>
            </label>
          ) : null}

          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            disabled={loading}
            onClick={() => void onCreate()}
          >
            {loading ? t("actionSaving") : t("actionSave")}
          </button>
        </div>
      </PresetSection>
    </div>
  );
}
