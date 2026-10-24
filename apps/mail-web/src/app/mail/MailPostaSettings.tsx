"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

type Props = {
  accessToken: string;
  threadView: boolean;
  onThreadViewChange: (enabled: boolean) => void;
  onPreferencesSaved?: (prefs: MailInboxPreferences) => void;
  onOpenDisplay?: () => void;
};

const UNDO_OPTIONS: { value: UndoSendSeconds; label: string }[] = [
  { value: 0, label: "Kapalı" },
  { value: 5, label: "5 sn" },
  { value: 10, label: "10 sn" },
  { value: 20, label: "20 sn" },
  { value: 30, label: "30 sn" },
];

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
        error instanceof Error ? error.message : "Tercihler yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

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
      setStatus("Kaydedildi — tercihleriniz bu kurumsal posta kutusunda geçerli.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="mail-posta-settings mail-posta-settings--premium">
        <div className="mail-posta-skeleton" aria-busy="true" aria-label="Yükleniyor">
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
        Kurumsal posta davranışınız: gönderim, yanıt ve gelen kutusu akışı. Görünüm
        için{" "}
        {onOpenDisplay ? (
          <button
            type="button"
            className="mail-posta-intro-link"
            onClick={onOpenDisplay}
          >
            Ekran ve görünüm
          </button>
        ) : (
          <strong>Ekran ve görünüm</strong>
        )}
        .
      </p>

      <PostaSection
        title="Gönderme ve yanıtlama"
        description="Gönderim gecikmesi ve varsayılan yanıt düğmesi."
      >
        <PostaRow
          label="Geri al gönder"
          hint="Kapalı = anında gönder. 5 sn kurumsal varsayılan."
        >
          <ChipGroup
            value={form.undoSendSeconds}
            layout="wrap"
            options={UNDO_OPTIONS}
            onChange={(v) =>
              setForm((f) => ({ ...f, undoSendSeconds: v as UndoSendSeconds }))
            }
          />
        </PostaRow>
        <PostaRow label="Varsayılan yanıt" hint="Okuma panelindeki birincil düğme.">
          <ChipGroup<MailDefaultReplyMode>
            value={form.defaultReplyMode}
            layout="pair"
            options={[
              { value: "reply", label: "Yanıtla" },
              { value: "reply_all", label: "Yanıtla tümü" },
            ]}
            onChange={(id) => setForm((f) => ({ ...f, defaultReplyMode: id }))}
          />
        </PostaRow>
      </PostaSection>

      <PostaSection
        title="Okuma ve güvenlik"
        description="HTML postada uzak içerik ve konuşma listesi."
      >
        <PostaRow label="Uzak resimler" hint="Gizlilik ve takip pikselleri.">
          <ChipGroup<MailRemoteImagesPolicy>
            value={form.remoteImagesPolicy}
            layout="equal"
            options={[
              { value: "show", label: "Göster" },
              { value: "ask", label: "Önce sor" },
              { value: "hide", label: "Gizle" },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, remoteImagesPolicy: v }))}
          />
        </PostaRow>
        <PostaToggle
          checked={threadView}
          label="Konuşma görünümü"
          hint="Aynı konudaki mesajları tek zincirde göster."
          onChange={(enabled) => {
            onThreadViewChange(enabled);
            setForm((f) => ({ ...f, threadViewEnabled: enabled }));
          }}
        />
        <PostaRow
          label="Arşiv veya silme sonrası"
          hint="Mesajı taşıdıktan sonra nereye gidilsin?"
        >
          <ChipGroup<MailAfterMessageAction>
            value={form.afterMessageAction}
            layout="equal"
            options={[
              { value: "list", label: "Liste" },
              { value: "next", label: "Sonraki" },
              { value: "previous", label: "Önceki" },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, afterMessageAction: v }))}
          />
        </PostaRow>
      </PostaSection>

      <PostaSection
        title="Onaylar ve hareketler"
        description="Yanlışlıkla silmeyi önleyin; mobil kaydırma tercihi."
      >
        <PostaToggle
          checked={form.confirmPermanentDelete}
          label="Kalıcı silmeden önce onay"
          onChange={(v) => setForm((f) => ({ ...f, confirmPermanentDelete: v }))}
        />
        <PostaToggle
          checked={form.confirmBulkDelete}
          label="Toplu kalıcı silmeden önce onay"
          onChange={(v) => setForm((f) => ({ ...f, confirmBulkDelete: v }))}
        />
        <PostaRow label="Kaydırma aksiyonu" hint="Mobil liste — yakında tam eşleme.">
          <ChipGroup<MailSwipePrimaryAction>
            value={form.swipePrimaryAction}
            layout="equal"
            options={[
              { value: "archive", label: "Arşiv" },
              { value: "delete", label: "Çöp" },
              { value: "read", label: "Okundu" },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, swipePrimaryAction: v }))}
          />
        </PostaRow>
      </PostaSection>

      <PostaSection
        title="Gelişmiş"
        description="Kademeli açılan kurumsal özellikler."
        muted
      >
        <PostaToggle
          checked={form.focusedInboxEnabled}
          label="Odaklı gelen kutusu"
          hint="Gelen kutusunda Önemli / Diğer sekmeleri (yıldız, okunmamış, bülten filtresi)."
          onChange={(v) => setForm((f) => ({ ...f, focusedInboxEnabled: v }))}
        />
        <PostaRow
          label="Yanıt alıntısı"
          hint="Yanıt gönderildiğinde önceki mesajın alıntısı (sunucu)."
        >
          <ChipGroup<MailReplyQuoteMode>
            value={form.replyQuoteMode}
            layout="equal"
            options={[
              { value: "full", label: "Tam" },
              { value: "trimmed", label: "Kısa" },
              { value: "none", label: "Yok" },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, replyQuoteMode: v }))}
          />
        </PostaRow>
      </PostaSection>

      <footer className="mail-posta-footer">
        {status ? (
          <p
            className={
              status.startsWith("Kaydedildi")
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
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </footer>
    </div>
  );
}
