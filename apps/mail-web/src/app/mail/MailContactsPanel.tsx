"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createOrgContact,
  deleteOrgContact,
  downloadContactsVcf,
  fetchContactCardDavAccounts,
  importContactsVcf,
  fetchOrgContacts,
  isMailSessionExpiredError,
  pushContactToCardDav,
  type MailOrgContact,
} from "@/lib/mailApi";
import { MailContactsCardDavPanel } from "./MailContactsCardDavPanel";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
  onComposeTo: (email: string) => void;
};

type ContactsViewMode = "list" | "grid";

function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function contactHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

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
  const [cardDavPushAccountId, setCardDavPushAccountId] = useState<
    string | null
  >(null);
  const [viewMode, setViewMode] = useState<ContactsViewMode>("grid");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchOrgContacts(accessToken);
      setContacts(data.contacts ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Kişiler yüklenemedi.";
      setLoadError(message);
      if (!isMailSessionExpiredError(error)) {
        onToast(message);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    void fetchContactCardDavAccounts(accessToken)
      .then((data) => {
        const writable = data.accounts.find((a) => a.enabled && a.writeEnabled);
        setCardDavPushAccountId(writable?.id ?? null);
      })
      .catch(() => setCardDavPushAccountId(null));
  }, [accessToken]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...contacts].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "tr"),
    );
    if (!q) {
      return list;
    }
    return list.filter((c) => {
      const hay = `${c.displayName} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, search]);

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
    <div className="mail-d6-inner mail-contacts-premium">
      <header className="mail-contacts-header">
        <div className="mail-contacts-heading">
          <h1>Kişiler</h1>
          <p className="mail-contacts-kicker">
            {loading
              ? "Güncelleniyor…"
              : `${contacts.length} kişi · kurumsal adres defteri`}
          </p>
        </div>
        <div className="mail-contacts-toolbar">
          <div
            className="mail-contacts-view-toggle"
            role="group"
            aria-label="Görünüm"
          >
            <button
              type="button"
              className={`mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm${viewMode === "list" ? " is-active" : ""}`}
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
            >
              Liste
            </button>
            <button
              type="button"
              className={`mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm${viewMode === "grid" ? " is-active" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
            >
              Kart
            </button>
          </div>
          <div className="mail-contacts-import-actions">
            <button
              type="button"
              className="mail-cal-btn mail-cal-btn--ghost"
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
              İndir .vcf
            </button>
            <label className="mail-cal-btn mail-cal-btn--ghost mail-cal-file-input">
              Yükle .vcf
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
          </div>
        </div>
      </header>

      <div className="mail-contacts-layout">
        <aside className="mail-contacts-aside">
          <div className="mail-cal-card mail-contacts-search-card">
            <label className="mail-cal-field mail-cal-field--full">
              <span className="mail-cal-field-label">Ara</span>
              <input
                className="mail-cal-input"
                type="search"
                placeholder="Ad, e-posta veya telefon"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {search.trim() ? (
              <p className="mail-contacts-search-meta">
                {filteredContacts.length} sonuç
              </p>
            ) : null}
          </div>

          <div className="mail-cal-card mail-contacts-composer">
            <h2 className="mail-cal-card-title">Yeni kişi</h2>
            <div className="mail-cal-form-grid mail-contacts-form-grid">
              <label className="mail-cal-field mail-cal-field--full">
                <span className="mail-cal-field-label">Ad</span>
                <input
                  className="mail-cal-input"
                  placeholder="Ad soyad"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <label className="mail-cal-field mail-cal-field--full">
                <span className="mail-cal-field-label">E-posta</span>
                <input
                  className="mail-cal-input"
                  type="email"
                  placeholder="ornek@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="mail-cal-field mail-cal-field--full">
                <span className="mail-cal-field-label">Telefon</span>
                <input
                  className="mail-cal-input"
                  type="tel"
                  placeholder="+90 …"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <div className="mail-cal-form-actions">
                <button
                  type="button"
                  className="mail-cal-btn mail-cal-btn--primary"
                  onClick={() => void onAdd()}
                >
                  Kişi ekle
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="mail-contacts-main">
          {loadError ? (
            <div className="mail-contacts-empty mail-cal-card">
              <strong>Kişiler yüklenemedi</strong>
              <p>{loadError}</p>
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--primary"
                onClick={() => void load()}
              >
                Yeniden dene
              </button>
            </div>
          ) : null}
          {!loadError && loading ? (
            <p className="mail-contacts-loading">Yükleniyor…</p>
          ) : !loadError && filteredContacts.length === 0 ? (
            <div className="mail-contacts-empty mail-cal-card">
              <strong>
                {search.trim() ? "Aramanızla eşleşen kişi yok." : "Henüz kişi yok."}
              </strong>
              <p>
                Soldan yeni kişi ekleyin veya .vcf dosyası yükleyin. CardDAV ile
                Nextcloud adres defterinizi de bağlayabilirsiniz.
              </p>
            </div>
          ) : !loadError && viewMode === "grid" ? (
            <ul className="mail-contacts-grid" aria-label="Kişi kartları">
              {filteredContacts.map((c) => (
                <li key={c.id} className="mail-contacts-grid-card">
                  <div
                    className="mail-contacts-avatar"
                    style={{
                      background: `hsl(${contactHue(c.displayName)} 42% 42%)`,
                    }}
                    aria-hidden="true"
                  >
                    {contactInitials(c.displayName)}
                  </div>
                  <div className="mail-contacts-card-body">
                    <strong className="mail-contacts-name">{c.displayName}</strong>
                    <div className="mail-d6-meta mail-contacts-detail">
                      {c.email ? (
                        <span className="mail-contacts-email">{c.email}</span>
                      ) : (
                        <span className="mail-contacts-muted">E-posta yok</span>
                      )}
                      {c.phone ? (
                        <span className="mail-contacts-phone">{c.phone}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mail-contacts-card-actions">
                    {c.email ? (
                      <button
                        type="button"
                        className="mail-cal-btn mail-cal-btn--primary mail-cal-btn--sm"
                        onClick={() => onComposeTo(c.email!)}
                      >
                        Yaz
                      </button>
                    ) : null}
                    {cardDavPushAccountId ? (
                      <button
                        type="button"
                        className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                        onClick={() =>
                          void pushContactToCardDav(
                            accessToken,
                            cardDavPushAccountId,
                            c.id,
                          )
                            .then(() => onToast("CardDAV’a yazıldı."))
                            .catch((err: unknown) => {
                              onToast(
                                err instanceof Error
                                  ? err.message
                                  : "CardDAV yazma başarısız.",
                              );
                            })
                        }
                      >
                        CardDAV
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                      onClick={() =>
                        void deleteOrgContact(accessToken, c.id)
                          .then(() => {
                            onToast("Silindi.");
                            void load();
                          })
                          .catch((err: unknown) => {
                            onToast(
                              err instanceof Error
                                ? err.message
                                : "Silinemedi.",
                            );
                          })
                      }
                    >
                      Sil
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !loadError ? (
            <ul className="mail-contacts-list" aria-label="Kişi listesi">
              {filteredContacts.map((c) => (
                <li key={c.id} className="mail-contacts-list-row">
                  <div
                    className="mail-contacts-avatar mail-contacts-avatar--sm"
                    style={{
                      background: `hsl(${contactHue(c.displayName)} 42% 42%)`,
                    }}
                    aria-hidden="true"
                  >
                    {contactInitials(c.displayName)}
                  </div>
                  <div className="mail-contacts-list-info">
                    <strong>{c.displayName}</strong>
                    <div className="mail-d6-meta">
                      {c.email ?? "—"}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                  </div>
                  <span className="mail-cal-event-actions">
                    {c.email ? (
                      <button
                        type="button"
                        className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                        onClick={() => onComposeTo(c.email!)}
                      >
                        Yaz
                      </button>
                    ) : null}
                    {cardDavPushAccountId ? (
                      <button
                        type="button"
                        className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                        onClick={() =>
                          void pushContactToCardDav(
                            accessToken,
                            cardDavPushAccountId,
                            c.id,
                          )
                            .then(() => onToast("CardDAV’a yazıldı."))
                            .catch((err: unknown) => {
                              onToast(
                                err instanceof Error
                                  ? err.message
                                  : "CardDAV yazma başarısız.",
                              );
                            })
                        }
                      >
                        CardDAV
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                      onClick={() =>
                        void deleteOrgContact(accessToken, c.id)
                          .then(() => {
                            onToast("Silindi.");
                            void load();
                          })
                          .catch((err: unknown) => {
                            onToast(
                              err instanceof Error
                                ? err.message
                                : "Silinemedi.",
                            );
                          })
                      }
                    >
                      Sil
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </main>
      </div>

      <MailContactsCardDavPanel
        accessToken={accessToken}
        onToast={onToast}
        onSynced={() => void load()}
      />
    </div>
  );
}
