"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState } from "../../../../components/EmptyState";
import {
  addManualCompanyId,
  discoverCompanies,
  type AdminCompanyListItem,
} from "../../../../lib/adminCompanyDirectory";
import {
  CORRIDOR_OPTIONS,
  appendOrganizationAudit,
  defaultAdminSettings,
  defaultOrganizationProfile,
  loadOrganizationAdminSettings,
  loadOrganizationAudit,
  loadOrganizationProfile,
  saveOrganizationAdminSettings,
  saveOrganizationProfile,
  type OrganizationAdminSettings,
  type OrganizationAuditEntry,
  type OrganizationProfile,
} from "../../../../lib/organizationProfile";
import { useWebSession } from "../../../../context/WebSessionProvider";

export function AdminOrganizationPageClient() {
  const { session, accessToken, locale } = useWebSession();
  const actorEmail = session?.emailAddress ?? "admin";
  const [companies, setCompanies] = useState<AdminCompanyListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [profile, setProfile] = useState<OrganizationProfile>(() =>
    defaultOrganizationProfile(""),
  );
  const [adminSettings, setAdminSettings] = useState<OrganizationAdminSettings>(
    defaultAdminSettings(),
  );
  const [auditLog, setAuditLog] = useState<OrganizationAuditEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [manualId, setManualId] = useState("");
  const [message, setMessage] = useState("");

  const refreshDirectory = useCallback(async () => {
    const list = await discoverCompanies(
      accessToken,
      locale,
      session?.companyId ?? "",
    );
    setCompanies(list);
    setSelectedId((current) => current || list[0]?.companyId || "");
  }, [accessToken, locale, session?.companyId]);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    setProfile(loadOrganizationProfile(selectedId));
    setAdminSettings(loadOrganizationAdminSettings(selectedId));
    setAuditLog(loadOrganizationAudit(selectedId));
  }, [selectedId]);

  function flash(text: string): void {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4000);
  }

  function saveAll(summary: string): void {
    if (!selectedId) {
      return;
    }
    const nextAdmin: OrganizationAdminSettings = {
      ...adminSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail,
    };
    saveOrganizationProfile(selectedId, profile);
    saveOrganizationAdminSettings(selectedId, nextAdmin);
    appendOrganizationAudit(selectedId, actorEmail, summary);
    setAdminSettings(nextAdmin);
    setAuditLog(loadOrganizationAudit(selectedId));
    flash(summary);
  }

  function handleProfileSubmit(event: FormEvent): void {
    event.preventDefault();
    saveAll("Organizasyon profili kaydedildi.");
  }

  function handleAdminSubmit(event: FormEvent): void {
    event.preventDefault();
    saveAll("Doğrulama ve operasyon ayarları kaydedildi.");
  }

  function toggleCorridor(code: string): void {
    setProfile((current) => {
      const has = current.corridors.includes(code);
      const corridors = has
        ? current.corridors.filter((c) => c !== code)
        : [...current.corridors, code];
      return { ...current, corridors };
    });
  }

  function addCompany(): void {
    const id = manualId.trim();
    if (!id) {
      return;
    }
    addManualCompanyId(id);
    setManualId("");
    void refreshDirectory().then(() => setSelectedId(id));
    flash("Firma dizine eklendi.");
  }

  const q = filter.trim().toLowerCase();
  const filtered = companies.filter((item) => {
    if (!q) {
      return true;
    }
    return (
      item.companyId.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-org-layout">
      <aside className="admin-org-sidebar module-panel module-panel--elevated">
        <h2 className="account-card-title">Firmalar</h2>
        <p className="account-card-lead">Marketplace ve manuel kayıtlar.</p>
        <label className="label-light">
          Ara
          <input
            className="input-light"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="ID veya etiket"
          />
        </label>
        <div className="admin-org-add">
          <input
            className="input-light"
            value={manualId}
            onChange={(event) => setManualId(event.target.value)}
            placeholder="UUID firma kimliği"
          />
          <button type="button" className="btn-account-ghost" onClick={addCompany}>
            Ekle
          </button>
        </div>
        <ul className="admin-org-company-list">
          {filtered.map((item) => (
            <li key={item.companyId}>
              <button
                type="button"
                className={
                  selectedId === item.companyId
                    ? "admin-org-company active"
                    : "admin-org-company"
                }
                onClick={() => setSelectedId(item.companyId)}
              >
                <span className="admin-org-company-label">{item.label}</span>
                <code>{item.companyId.slice(0, 8)}…</code>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn-account-ghost admin-org-refresh"
          onClick={() => void refreshDirectory()}
        >
          Listeyi yenile
        </button>
      </aside>

      <div className="admin-org-main">
        {!selectedId ? (
          <EmptyState message="Soldan firma seçin veya UUID ekleyin." />
        ) : (
          <>
            <div className="admin-org-toolbar">
              <div>
                <h2 className="account-card-title">
                  {profile.tradeName || "Organizasyon"}
                </h2>
                <p className="account-meta-line">
                  <code>{selectedId}</code>
                </p>
              </div>
              <Link href="/hesap/organizasyon" className="btn-account-ghost">
                Kullanıcı sayfası
              </Link>
            </div>
            {message ? <p className="account-save-hint">{message}</p> : null}

            <form
              className="account-card module-panel module-panel--elevated"
              onSubmit={handleAdminSubmit}
            >
              <header className="account-card-head">
                <div>
                  <h2 className="account-card-title">Güven ve doğrulama</h2>
                  <p className="account-card-lead">
                    Kullanıcı organizasyon sayfasındaki rozetler ve kısıtlar.
                  </p>
                </div>
                <button type="submit" className="btn-account-primary">Kaydet</button>
              </header>
              <div className="account-form-grid">
                <label className="label-light admin-checkbox">
                  <input
                    type="checkbox"
                    checked={adminSettings.emailVerified}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        emailVerified: event.target.checked,
                      }))
                    }
                  />
                  E-posta onaylı
                </label>
                <label className="label-light">
                  Belge durumu
                  <select
                    className="input-light"
                    value={adminSettings.documentStatus}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        documentStatus: event.target
                          .value as OrganizationAdminSettings["documentStatus"],
                      }))
                    }
                  >
                    <option value="pending">Bekleniyor</option>
                    <option value="approved">Onaylı</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </label>
                <label className="label-light">
                  Doğrulama seviyesi
                  <select
                    className="input-light"
                    value={adminSettings.verificationLevel}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        verificationLevel: event.target.value as "basic" | "full",
                      }))
                    }
                  >
                    <option value="basic">Temel</option>
                    <option value="full">Tam</option>
                  </select>
                </label>
                <label className="label-light">
                  Destek kayıt no
                  <input
                    className="input-light"
                    value={adminSettings.supportTicketRef}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        supportTicketRef: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="label-light account-form-span-2">
                  Admin notu
                  <textarea
                    className="input-light account-textarea"
                    rows={3}
                    value={adminSettings.adminNotes}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        adminNotes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="admin-toggle-row">
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={adminSettings.featuredInSearch}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        featuredInSearch: event.target.checked,
                      }))
                    }
                  />
                  Öne çıkan arama
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={adminSettings.allowNewListings}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        allowNewListings: event.target.checked,
                      }))
                    }
                  />
                  Yeni ilan izni
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={adminSettings.allowAuctions}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        allowAuctions: event.target.checked,
                      }))
                    }
                  />
                  İhale izni
                </label>
                <label className="admin-checkbox admin-checkbox--danger">
                  <input
                    type="checkbox"
                    checked={adminSettings.accountFrozen}
                    onChange={(event) =>
                      setAdminSettings((c) => ({
                        ...c,
                        accountFrozen: event.target.checked,
                      }))
                    }
                  />
                  Hesabı dondur
                </label>
              </div>
            </form>

            <form
              className="account-card module-panel module-panel--elevated"
              onSubmit={handleProfileSubmit}
            >
              <header className="account-card-head">
                <div>
                  <h2 className="account-card-title">Temel bilgiler</h2>
                </div>
                <button type="submit" className="btn-account-primary">Kaydet</button>
              </header>
              <div className="account-form-grid">
                <label className="label-light">
                  Ticari unvan
                  <input
                    className="input-light"
                    value={profile.tradeName}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, tradeName: event.target.value }))
                    }
                  />
                </label>
                <label className="label-light">
                  Resmi unvan
                  <input
                    className="input-light"
                    value={profile.legalName}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, legalName: event.target.value }))
                    }
                  />
                </label>
                <label className="label-light">
                  Vergi / TIN
                  <input
                    className="input-light"
                    value={profile.taxNumber}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, taxNumber: event.target.value }))
                    }
                  />
                </label>
                <label className="label-light">
                  Ülke
                  <select
                    className="input-light"
                    value={profile.countryCode}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, countryCode: event.target.value }))
                    }
                  >
                    <option value="TR">TR</option>
                    <option value="UA">UA</option>
                    <option value="PL">PL</option>
                    <option value="DE">DE</option>
                    <option value="RO">RO</option>
                  </select>
                </label>
                <label className="label-light account-form-span-2">
                  Şehir
                  <input
                    className="input-light"
                    value={profile.city}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, city: event.target.value }))
                    }
                  />
                </label>
              </div>
            </form>

            <section className="account-card module-panel module-panel--elevated">
              <header className="account-card-head">
                <div>
                  <h2 className="account-card-title">Koridor yetkileri</h2>
                </div>
                <button
                  type="button"
                  className="btn-account-primary"
                  onClick={() => saveAll("Koridor yetkileri güncellendi.")}
                >
                  Kaydet
                </button>
              </header>
              <div className="account-corridor-toggles">
                {CORRIDOR_OPTIONS.map((corridor) => {
                  const active = profile.corridors.includes(corridor.code);
                  return (
                    <button
                      key={corridor.code}
                      type="button"
                      className={
                        active ? "account-corridor-chip active" : "account-corridor-chip"
                      }
                      onClick={() => toggleCorridor(corridor.code)}
                    >
                      <span className="account-corridor-code">{corridor.code}</span>
                      <span>{corridor.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="account-card module-panel module-panel--elevated">
              <header className="account-card-head">
                <div>
                  <h2 className="account-card-title">Birincil iletişim</h2>
                </div>
                <button
                  type="button"
                  className="btn-account-primary"
                  onClick={() => saveAll("İletişim bilgileri güncellendi.")}
                >
                  Kaydet
                </button>
              </header>
              <div className="account-form-grid">
                <label className="label-light account-form-span-2">
                  Birincil e-posta
                  <input
                    className="input-light"
                    type="email"
                    value={profile.primaryEmail}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, primaryEmail: event.target.value }))
                    }
                  />
                </label>
                <label className="label-light">
                  Telefon
                  <input
                    className="input-light"
                    value={profile.phone}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, phone: event.target.value }))
                    }
                  />
                </label>
                <label className="label-light">
                  Web sitesi
                  <input
                    className="input-light"
                    value={profile.website}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, website: event.target.value }))
                    }
                  />
                </label>
              </div>
            </section>

            <section className="account-card module-panel module-panel--elevated">
              <h2 className="account-card-title">Denetim günlüğü</h2>
              <ul className="admin-audit-list">
                {auditLog.length === 0 ? (
                  <li className="admin-audit-empty">Henüz kayıt yok.</li>
                ) : (
                  auditLog.map((entry) => (
                    <li key={entry.id}>
                      <time dateTime={entry.at}>
                        {new Date(entry.at).toLocaleString("tr-TR")}
                      </time>
                      <span>{entry.summary}</span>
                      <span className="admin-audit-actor">{entry.actorEmail}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
