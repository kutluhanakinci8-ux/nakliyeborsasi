"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createOrgContact,
  deleteOrgContact,
  downloadContactsVcf,
  importContactsVcf,
  fetchOrgContacts,
  type MailOrgContact,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
  onComposeTo: (email: string) => void;
};

export function MailContactsPanel({
  accessToken,
  onToast,
  onComposeTo,
}: Props) {
  const [contacts, setContacts] = useState<MailOrgContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrgContacts(accessToken);
      setContacts(data.contacts);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Kişiler yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    if (!displayName.trim()) {
      onToast("Ad gerekli.");
      return;
    }
    try {
      await createOrgContact(accessToken, {
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setDisplayName("");
      setEmail("");
      setPhone("");
      onToast("Kişi eklendi.");
      void load();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Kişi eklenemedi.",
      );
    }
  }

  return (
    <div className="mail-d6-inner">
      <header className="mail-d6-header">
        <h1>Kişiler</h1>
        <button
          type="button"
          onClick={() =>
            void downloadContactsVcf(accessToken)
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "lerta-kisiler.vcf";
                a.click();
                URL.revokeObjectURL(url);
              })
              .catch((e: unknown) => {
                onToast(
                  e instanceof Error ? e.message : "Dışa aktarılamadı.",
                );
              })
          }
        >
          .vcf indir
        </button>
        <label className="mail-d6-file-btn">
          .vcf yükle
          <input
            type="file"
            accept=".vcf,text/vcard"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) {
                return;
              }
              void file.text().then((vcf) =>
                importContactsVcf(accessToken, vcf)
                  .then((r) => {
                    onToast(
                      `${r.imported} kişi içe aktarıldı${r.skipped ? `, ${r.skipped} atlandı` : ""}.`,
                    );
                    void load();
                  })
                  .catch((err: unknown) => {
                    onToast(
                      err instanceof Error
                        ? err.message
                        : "İçe aktarma başarısız.",
                    );
                  }),
              );
            }}
          />
        </label>
      </header>

      <div className="mail-d6-form">
        <input
          placeholder="Ad"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Telefon"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="button" onClick={() => void onAdd()}>
          Ekle
        </button>
      </div>

      {loading ? <p>Yükleniyor…</p> : null}
      <ul className="mail-d6-list">
        {contacts.map((c) => (
          <li key={c.id}>
            <div>
              <strong>{c.displayName}</strong>
              <div className="mail-d6-meta">
                {c.email ?? "—"}
                {c.phone ? ` · ${c.phone}` : ""}
              </div>
            </div>
            <span className="mail-d6-actions">
              {c.email ? (
                <button
                  type="button"
                  onClick={() => onComposeTo(c.email!)}
                >
                  Yaz
                </button>
              ) : null}
              <button
                type="button"
                className="mail-d6-danger"
                onClick={() =>
                  void deleteOrgContact(accessToken, c.id)
                    .then(() => {
                      onToast("Silindi.");
                      void load();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error ? err.message : "Silinemedi.",
                      );
                    })
                }
              >
                Sil
              </button>
            </span>
          </li>
        ))}
        {!loading && contacts.length === 0 ? (
          <li className="mail-d6-empty">Henüz kişi yok.</li>
        ) : null}
      </ul>
    </div>
  );
}
