"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchInboxPreferences,
  updateInboxPreferences,
  type MailAfterMessageAction,
  type MailDefaultReplyMode,
  type MailInboxPreferences,
  type MailRemoteImagesPolicy,
  type MailReplyQuoteMode,
  type MailSwipePrimaryAction,
  type UndoSendSeconds,
} from "@/lib/mailApi";
import { pickMailPostaPreferences } from "@/lib/mailPostaPrefs";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
  threadView: boolean;
  onThreadViewChange: (enabled: boolean) => void;
  onPreferencesSaved?: (prefs: MailInboxPreferences) => void;
  onOpenDisplay?: () => void;
};

type PostaForm = ReturnType<typeof pickMailPostaPreferences>;

function PostaSection({
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
        muted
          ? "mail-posta-card mail-posta-card--muted"
          : "mail-posta-card"
      }
    >
      <header className="mail-posta-card-head">
        <h3 className="mail-posta-card-title">{title}</h3>
        {description ? (
          <p className="mail-posta-card-desc">{description}</p>
        ) : null}
      </header>
      <div className="mail-posta-card-body">{children}</div>
    </section>
  );
}

function PostaRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mail-posta-row">
      <div className="mail-posta-row-label">
        <span className="mail-posta-row-title">{label}</span>
        {hint ? <span className="mail-posta-row-hint">{hint}</span> : null}
      </div>
      <div className="mail-posta-row-control">{children}</div>
    </div>
  );
}

function ChipGroup<T extends string | number>({
  value,
  options,
  onChange,
  layout = "equal",
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  layout?: "equal" | "wrap" | "pair";
}) {
  return (
    <div
      className={
        layout === "wrap"
          ? "mail-posta-chips mail-posta-chips--wrap"
          : layout === "pair"
            ? "mail-posta-chips mail-posta-chips--pair"
            : "mail-posta-chips mail-posta-chips--equal"
      }
      role="group"
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          disabled={option.disabled}
          className={
            value === option.value
              ? "mail-posta-chip is-active"
              : "mail-posta-chip"
          }
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <span className="mail-posta-chip-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function PostaToggle({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={
        disabled ? "mail-posta-toggle mail-posta-toggle--disabled" : "mail-posta-toggle"
      }
    >
      <input
        type="checkbox"
        className="mail-posta-toggle-input"
        checked={checked}
        disabled={disabled}
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

export function MailPostaSettings({
  accessToken,
  threadView,
  onThreadViewChange,
  onPreferencesSaved,
  onOpenDisplay,
}: Props) {
  const { t } = useMailLocale();
  const undoOptions = useMemo(
    () =>
      [
        { value: 0 as UndoSendSeconds, label: t("postaUndoOff") },
        { value: 5 as UndoSendSeconds, label: "5 sn" },
        { value: 10 as UndoSendSeconds, label: "10 sn" },
        { value: 20 as UndoSendSeconds, label: "20 sn" },
        { value: 30 as UndoSendSeconds, label: "30 sn" },
      ] satisfies { value: UndoSendSeconds; label: string }[],
    [t],
  );
  const [form, setForm] = useState<PostaForm>(pickMailPostaPreferences(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const onThreadViewChangeRef = useRef(onThreadViewChange);
  const onPreferencesSavedRef = useRef(onPreferencesSaved);
  onThreadViewChangeRef.current = onThreadViewChange;
  onPreferencesSavedRef.current = onPreferencesSaved;

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const data = await fetchInboxPreferences(accessToken);
      const picked = pickMailPostaPreferences(data.preferences);
      setForm(picked);
      onThreadViewChangeRef.current(picked.threadViewEnabled);
      onPreferencesSavedRef.current?.(data.preferences);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : t("postaLoadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const result = await updateInboxPreferences(accessToken, {
        ...form,
        threadViewEnabled: threadView,
      });
      const picked = pickMailPostaPreferences(result.preferences);
      setForm(picked);
      onThreadViewChange(picked.threadViewEnabled);
      onPreferencesSaved?.(result.preferences);
      setStatus(t("postaSavedDetail"));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : t("displayDensitySaveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="mail-posta-settings mail-posta-settings--premium">
        <div
          className="mail-posta-skeleton"
          aria-busy="true"
          aria-label={t("postaLoadingAria")}
        >
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-posta-settings mail-posta-settings--premium">
      <p className="mail-posta-intro">
        {t("postaIntro")}{" "}
        {onOpenDisplay ? (
          <button
            type="button"
            className="mail-posta-intro-link"
            onClick={onOpenDisplay}
          >
            {t("postaIntroDisplayLink")}
          </button>
        ) : (
          <strong>{t("postaIntroDisplayLink")}</strong>
        )}
        .
      </p>

      <PostaSection
        title={t("postaSendSectionTitle")}
        description={t("postaSendSectionDesc")}
      >
        <PostaRow label={t("postaUndoLabel")} hint={t("postaUndoHint")}>
          <ChipGroup
            value={form.undoSendSeconds}
            layout="wrap"
            options={undoOptions}
            onChange={(v) =>
              setForm((f) => ({ ...f, undoSendSeconds: v as UndoSendSeconds }))
            }
          />
        </PostaRow>
        <PostaRow
          label={t("postaDefaultReplyLabel")}
          hint={t("postaDefaultReplyHint")}
        >
          <ChipGroup<MailDefaultReplyMode>
            value={form.defaultReplyMode}
            layout="pair"
            options={[
              { value: "reply", label: t("replyAction") },
              { value: "reply_all", label: t("postaReplyAllShort") },
            ]}
            onChange={(id) => setForm((f) => ({ ...f, defaultReplyMode: id }))}
          />
        </PostaRow>
      </PostaSection>

      <PostaSection
        title={t("postaReadSectionTitle")}
        description={t("postaReadSectionDesc")}
      >
        <PostaRow
          label={t("postaRemoteImagesLabel")}
          hint={t("postaRemoteImagesHint")}
        >
          <ChipGroup<MailRemoteImagesPolicy>
            value={form.remoteImagesPolicy}
            layout="equal"
            options={[
              { value: "show", label: t("postaRemoteShow") },
              { value: "ask", label: t("postaRemoteAsk") },
              { value: "hide", label: t("postaRemoteHide") },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, remoteImagesPolicy: v }))}
          />
        </PostaRow>
        <PostaToggle
          checked={threadView}
          label={t("postaThreadViewLabel")}
          hint={t("postaThreadViewHint")}
          onChange={(enabled) => {
            onThreadViewChange(enabled);
            setForm((f) => ({ ...f, threadViewEnabled: enabled }));
          }}
        />
        <PostaRow
          label={t("postaAfterActionLabel")}
          hint={t("postaAfterActionHint")}
        >
          <ChipGroup<MailAfterMessageAction>
            value={form.afterMessageAction}
            layout="equal"
            options={[
              { value: "list", label: t("postaAfterList") },
              { value: "next", label: t("postaAfterNext") },
              { value: "previous", label: t("postaAfterPrevious") },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, afterMessageAction: v }))}
          />
        </PostaRow>
      </PostaSection>

      <PostaSection
        title={t("postaConfirmSectionTitle")}
        description={t("postaConfirmSectionDesc")}
      >
        <PostaToggle
          checked={form.confirmPermanentDelete}
          label={t("postaConfirmPermanent")}
          onChange={(v) => setForm((f) => ({ ...f, confirmPermanentDelete: v }))}
        />
        <PostaToggle
          checked={form.confirmBulkDelete}
          label={t("postaConfirmBulk")}
          onChange={(v) => setForm((f) => ({ ...f, confirmBulkDelete: v }))}
        />
        <PostaRow label={t("postaSwipeLabel")} hint={t("postaSwipeHint")}>
          <ChipGroup<MailSwipePrimaryAction>
            value={form.swipePrimaryAction}
            layout="equal"
            options={[
              { value: "archive", label: t("postaSwipeArchive") },
              { value: "delete", label: t("postaSwipeTrash") },
              { value: "read", label: t("postaSwipeRead") },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, swipePrimaryAction: v }))}
          />
        </PostaRow>
      </PostaSection>

      <PostaSection
        title={t("postaAdvancedTitle")}
        description={t("postaAdvancedDesc")}
        muted
      >
        <PostaToggle
          checked={form.focusedInboxEnabled}
          label={t("postaFocusedInbox")}
          hint={t("postaFocusedInboxHint")}
          onChange={(v) => setForm((f) => ({ ...f, focusedInboxEnabled: v }))}
        />
        <PostaToggle
          checked={form.inboxSmartSortEnabled}
          label={t("postaSmartSort")}
          hint={t("postaSmartSortHint")}
          onChange={(v) => setForm((f) => ({ ...f, inboxSmartSortEnabled: v }))}
        />
        <PostaRow label={t("postaQuoteLabel")} hint={t("postaQuoteHint")}>
          <ChipGroup<MailReplyQuoteMode>
            value={form.replyQuoteMode}
            layout="equal"
            options={[
              { value: "full", label: t("postaQuoteFull") },
              { value: "trimmed", label: t("postaQuoteTrimmed") },
              { value: "none", label: t("postaQuoteNone") },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, replyQuoteMode: v }))}
          />
        </PostaRow>
      </PostaSection>

      <footer className="mail-posta-footer">
        {status ? (
          <p
            className={
              status.startsWith(t("postaSaved").replace(/\.$/, "")) ||
              status === t("postaSavedDetail")
                ? "mail-posta-status mail-posta-status--ok"
                : "mail-posta-status mail-posta-status--err"
            }
            role="status"
          >
            {status}
          </p>
        ) : null}
        <div className="mail-posta-footer-actions">
          <button
            type="button"
            className="mail-posta-save"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? t("actionSaving") : t("actionSave")}
          </button>
        </div>
      </footer>
    </div>
  );
}
