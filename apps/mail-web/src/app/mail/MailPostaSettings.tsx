"use client";

import { useCallback, useEffect, useState } from "react";
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
  { value: 0, label: "Kapalı (anında gönder)" },
  { value: 5, label: "5 saniye" },
  { value: 10, label: "10 saniye" },
  { value: 20, label: "20 saniye" },
  { value: 30, label: "30 saniye" },
];

type PostaForm = ReturnType<typeof pickMailPostaPreferences>;

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInboxPreferences(accessToken);
      const picked = pickMailPostaPreferences(data.preferences);
      setForm(picked);
      onThreadViewChange(picked.threadViewEnabled);
      onPreferencesSaved?.(data.preferences);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Tercihler yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, onPreferencesSaved, onThreadViewChange]);

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
      setStatus("Posta ayarları kaydedildi.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="mail-settings-lead">Yükleniyor…</p>;
  }

  return (
    <div className="mail-posta-settings">
      <p className="mail-settings-lead">
        Gönderme, yanıtlama ve gelen kutusu davranışı. Tema ve liste yoğunluğu{" "}
        {onOpenDisplay ? (
          <button
            type="button"
            className="mail-settings-inline-link"
            onClick={onOpenDisplay}
          >
            Ekran ve görünüm
          </button>
        ) : (
          <strong>Ekran ve görünüm</strong>
        )}{" "}
        altında.
      </p>

      <section className="mail-posta-block">
        <h3 className="mail-posta-block-title">
          P0 — Gönderme ve yanıtlama
        </h3>
        <label className="mail-settings-field">
          <span>Geri al gönder süresi</span>
          <select
            value={form.undoSendSeconds}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                undoSendSeconds: Number(e.target.value) as UndoSendSeconds,
              }))
            }
          >
            {UNDO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mail-display-segment mail-posta-segment">
          <span className="mail-posta-segment-label">Varsayılan yanıt</span>
          {(
            [
              { id: "reply" as MailDefaultReplyMode, label: "Yanıtla" },
              { id: "reply_all" as MailDefaultReplyMode, label: "Yanıtla tümü" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                form.defaultReplyMode === option.id
                  ? "mail-display-segment-btn is-active"
                  : "mail-display-segment-btn"
              }
              onClick={() =>
                setForm((f) => ({ ...f, defaultReplyMode: option.id }))
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mail-posta-block">
        <h3 className="mail-posta-block-title">P0 — Okuma ve güvenlik</h3>
        <label className="mail-settings-field">
          <span>Uzak resimler (HTML posta)</span>
          <select
            value={form.remoteImagesPolicy}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                remoteImagesPolicy: e.target.value as MailRemoteImagesPolicy,
              }))
            }
          >
            <option value="show">Her zaman göster</option>
            <option value="ask">Önce sor</option>
            <option value="hide">Gizle</option>
          </select>
        </label>
        <label className="mail-settings-check">
          <input
            type="checkbox"
            checked={threadView}
            onChange={(e) => {
              onThreadViewChange(e.target.checked);
              setForm((f) => ({
                ...f,
                threadViewEnabled: e.target.checked,
              }));
            }}
          />
          Konuşma görünümü (aynı konudaki mesajları grupla)
        </label>
        <label className="mail-settings-field">
          <span>Arşiv / sil / taşı sonrası</span>
          <select
            value={form.afterMessageAction}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                afterMessageAction: e.target.value as MailAfterMessageAction,
              }))
            }
          >
            <option value="list">Listeye dön</option>
            <option value="next">Sonraki mesaj</option>
            <option value="previous">Önceki mesaj</option>
          </select>
        </label>
      </section>

      <section className="mail-posta-block">
        <h3 className="mail-posta-block-title">P1 — Onaylar ve kaydırma</h3>
        <label className="mail-settings-check">
          <input
            type="checkbox"
            checked={form.confirmPermanentDelete}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                confirmPermanentDelete: e.target.checked,
              }))
            }
          />
          Kalıcı silmeden önce onay iste
        </label>
        <label className="mail-settings-check">
          <input
            type="checkbox"
            checked={form.confirmBulkDelete}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                confirmBulkDelete: e.target.checked,
              }))
            }
          />
          Toplu kalıcı silmeden önce onay iste
        </label>
        <label className="mail-settings-field">
          <span>Mobil kaydırma — birincil aksiyon (yakında tam eşleme)</span>
          <select
            value={form.swipePrimaryAction}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                swipePrimaryAction: e.target.value as MailSwipePrimaryAction,
              }))
            }
          >
            <option value="archive">Arşiv / geri al</option>
            <option value="delete">Çöp</option>
            <option value="read">Okundu işaretle</option>
          </select>
        </label>
      </section>

      <section className="mail-posta-block mail-posta-block--muted">
        <h3 className="mail-posta-block-title">P2 — Gelişmiş (kademeli)</h3>
        <label className="mail-settings-check">
          <input
            type="checkbox"
            checked={form.focusedInboxEnabled}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                focusedInboxEnabled: e.target.checked,
              }))
            }
            disabled
          />
          Odaklı gelen kutusu (Focused Inbox) — yakında
        </label>
        <label className="mail-settings-field">
          <span>Yanıtta orijinal alıntı</span>
          <select
            value={form.replyQuoteMode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                replyQuoteMode: e.target.value as MailReplyQuoteMode,
              }))
            }
          >
            <option value="full">Tam alıntı</option>
            <option value="trimmed">Kısaltılmış</option>
            <option value="none">Alıntı yok</option>
          </select>
          <span className="mail-posta-field-hint">
            Sunucu yanıt biçimi bir sonraki sürümde bu tercihe bağlanacak.
          </span>
        </label>
      </section>

      {status ? <p className="mail-display-status">{status}</p> : null}
      <button
        type="button"
        className="mail-display-save-btn"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Kaydediliyor…" : "Posta ayarlarını kaydet"}
      </button>
    </div>
  );
}
