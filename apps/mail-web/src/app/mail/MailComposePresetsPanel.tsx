"use client";

import { useCallback, useEffect, useState } from "react";
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

export function MailComposePresetsPanel({ accessToken }: Props) {
  const [signatures, setSignatures] = useState<MailComposePreset[]>([]);
  const [templates, setTemplates] = useState<MailComposePreset[]>([]);
  const [campaignTemplates, setCampaignTemplates] = useState<MailComposePreset[]>(
    [],
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formKind, setFormKind] = useState<
    "signature" | "template" | "campaign"
  >("signature");
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
      try {
        await reload();
      } catch {
        setError("İmza ve şablonlar yüklenemedi.");
      }
    })();
  }, [reload]);

  async function onCreate() {
    setError("");
    if (!formName.trim() || !formBody.trim()) {
      setError("Ad ve metin zorunlu.");
      return;
    }
    if (
      (formKind === "template" || formKind === "campaign") &&
      !formSubject.trim()
    ) {
      setError("Şablon için konu zorunlu.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDefault(preset: MailComposePreset) {
    try {
      await updateComposePreset(accessToken, preset.id, {
        isDefault: !preset.isDefault,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncellenemedi.");
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteComposePreset(accessToken, id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  function renderList(items: MailComposePreset[], showDefault: boolean) {
    if (items.length === 0) {
      return <p className="mail-empty">Kayıt yok</p>;
    }
    return (
      <ul className="preset-list">
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.name}</strong>
              {(item.kind === "template" || item.kind === "campaign") &&
              item.subject ? (
                <span className="preset-meta"> — {item.subject}</span>
              ) : null}
              {showDefault && item.isDefault ? (
                <span className="preset-meta"> (varsayılan)</span>
              ) : null}
            </div>
            <div className="preset-actions">
              {showDefault ? (
                <button type="button" onClick={() => void toggleDefault(item)}>
                  {item.isDefault ? "Varsayılanı kaldır" : "Varsayılan yap"}
                </button>
              ) : null}
              {item.isSystem ? null : (
                <button type="button" onClick={() => void onDelete(item.id)}>
                  Sil
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="presets-panel">
      {error ? <p className="login-error">{error}</p> : null}
      <h3>İmzalar</h3>
      <p className="preset-hint">Kişisel imzalarınız; yaz ekranından seçilebilir.</p>
      {renderList(signatures, true)}
      <h3>Hazır şablonlar</h3>
      <p className="preset-hint">
        Tüm kullanıcılar için nakliye odaklı sistem şablonları (yaz ekranından
        seçilir).
      </p>
      {renderList(templates.filter((row) => row.isSystem), false)}
      <h3>Kurumsal şablonlar</h3>
      <p className="preset-hint">
        Posta yöneticisi ek şablon tanımlayabilir.
      </p>
      {renderList(templates.filter((row) => !row.isSystem), false)}
      <h3>Kampanya şablonları</h3>
      <p className="preset-hint">
        Kampanya modunda yaz ekranından seçilir (posta yöneticisi).
      </p>
      {renderList(campaignTemplates, false)}
      <h3>Yeni kayıt</h3>
      <div className="preset-form">
        <label>
          Tür
          <select
            value={formKind}
            onChange={(e) =>
              setFormKind(
                e.target.value as "signature" | "template" | "campaign",
              )
            }
          >
            <option value="signature">İmza</option>
            <option value="template">Şablon</option>
            <option value="campaign">Kampanya şablonu</option>
          </select>
        </label>
        <input
          placeholder="Ad"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
        {formKind === "template" || formKind === "campaign" ? (
          <input
            placeholder="Konu"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
          />
        ) : null}
        <textarea
          placeholder="Metin"
          rows={4}
          value={formBody}
          onChange={(e) => setFormBody(e.target.value)}
        />
        {formKind === "signature" ? (
          <textarea
            className="preset-html"
            placeholder="HTML imza (isteğe bağlı): logo, telefon, bağlantılar"
            rows={5}
            value={formBodyHtml}
            onChange={(e) => setFormBodyHtml(e.target.value)}
          />
        ) : null}
        {formKind === "template" || formKind === "campaign" ? (
          <textarea
            className="preset-html"
            placeholder="HTML gövde (isteğe bağlı)"
            rows={5}
            value={formBodyHtml}
            onChange={(e) => setFormBodyHtml(e.target.value)}
          />
        ) : null}
        {formKind === "signature" ? (
          <label className="preset-check">
            <input
              type="checkbox"
              checked={formDefault}
              onChange={(e) => setFormDefault(e.target.checked)}
            />
            Varsayılan imza
          </label>
        ) : null}
        <button type="button" disabled={loading} onClick={() => void onCreate()}>
          {loading ? "…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
