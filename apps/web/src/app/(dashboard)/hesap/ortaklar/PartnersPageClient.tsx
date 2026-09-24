"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "../../../../components/EmptyState";
import { useWebSession } from "../../../../context/WebSessionProvider";

type PartnerRelation = "carrier" | "shipper" | "forwarder";
type PartnerStatus = "active" | "pending" | "invited";

type PartnerRecord = {
  partnerId: string;
  displayName: string;
  companyId: string;
  relation: PartnerRelation;
  status: PartnerStatus;
  corridorLabel: string;
  contactEmail: string;
  note: string;
  linkedSince: string;
};

type PartnersStore = {
  partners: PartnerRecord[];
  shareListingsByDefault: boolean;
};

const STORAGE_PREFIX = "nb-company-partners:";

const RELATION_LABELS: Record<PartnerRelation, string> = {
  carrier: "Taşıyıcı",
  shipper: "Yük veren",
  forwarder: "Forwarder / acente",
};

const STATUS_LABELS: Record<PartnerStatus, string> = {
  active: "Onaylı ortak",
  pending: "Onay bekliyor",
  invited: "Davet gönderildi",
};

function createPartnerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `partner-${Date.now()}`;
}

function defaultStore(): PartnersStore {
  return {
    partners: [
      {
        partnerId: "demo-partner-ua-eu",
        displayName: "Partner Carrier UA-EU",
        companyId: "",
        relation: "carrier",
        status: "active",
        corridorLabel: "TR · UA · EU",
        contactEmail: "lertalogistics@gmail.com",
        note: "Demo ortak — güven profili ve mesajla test edin.",
        linkedSince: "2026-01-10",
      },
      {
        partnerId: "demo-pending-invite",
        displayName: "Baltic Trans Sp. z o.o.",
        companyId: "",
        relation: "carrier",
        status: "invited",
        corridorLabel: "PL · UA",
        contactEmail: "ops@ornek-trans.pl",
        note: "Davet e-postası gönderildi.",
        linkedSince: "2026-09-20",
      },
    ],
    shareListingsByDefault: true,
  };
}

function loadStore(companyId: string): PartnersStore {
  if (typeof window === "undefined" || !companyId) {
    return defaultStore();
  }
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
  if (!raw) {
    return defaultStore();
  }
  try {
    const parsed = JSON.parse(raw) as PartnersStore;
    return {
      ...defaultStore(),
      ...parsed,
      partners: parsed.partners?.length ? parsed.partners : defaultStore().partners,
    };
  } catch {
    return defaultStore();
  }
}

function persistStore(companyId: string, store: PartnersStore): void {
  if (!companyId) {
    return;
  }
  window.localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(store));
}

type FilterTab = "all" | PartnerStatus;

export function PartnersPageClient() {
  const router = useRouter();
  const { session } = useWebSession();
  const companyId = session?.companyId ?? "";
  const [store, setStore] = useState<PartnersStore>(() => defaultStore());
  const [filter, setFilter] = useState<FilterTab>("all");
  const [saveMessage, setSaveMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRelation, setInviteRelation] = useState<PartnerRelation>("carrier");
  const [inviteName, setInviteName] = useState("");

  useEffect(() => {
    if (!companyId) {
      return;
    }
    setStore(loadStore(companyId));
  }, [companyId]);

  function updateStore(next: PartnersStore, message?: string): void {
    setStore(next);
    persistStore(companyId, next);
    if (message) {
      setSaveMessage(message);
      window.setTimeout(() => setSaveMessage(""), 4000);
    }
  }

  const filteredPartners = useMemo(() => {
    if (filter === "all") {
      return store.partners;
    }
    return store.partners.filter((partner) => partner.status === filter);
  }, [store.partners, filter]);

  const stats = useMemo(() => {
    const active = store.partners.filter((p) => p.status === "active").length;
    const pending = store.partners.filter((p) => p.status === "pending").length;
    const invited = store.partners.filter((p) => p.status === "invited").length;
    return { active, pending, invited, total: store.partners.length };
  }, [store.partners]);

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const email = inviteEmail.trim();
    const name = inviteName.trim() || email.split("@")[0] || "Yeni ortak";
    if (!email) {
      return;
    }
    const partner: PartnerRecord = {
      partnerId: createPartnerId(),
      displayName: name,
      companyId: "",
      relation: inviteRelation,
      status: "invited",
      corridorLabel: "—",
      contactEmail: email,
      note: "Davet gönderildi (demo).",
      linkedSince: new Date().toISOString().slice(0, 10),
    };
    updateStore(
      { ...store, partners: [partner, ...store.partners] },
      "Davet kaydedildi (demo — API ile e-posta yakında).",
    );
    setInviteEmail("");
    setInviteName("");
  }

  function acceptPartner(partnerId: string): void {
    const partners = store.partners.map((partner) =>
      partner.partnerId === partnerId ? { ...partner, status: "active" as const } : partner,
    );
    updateStore({ ...store, partners }, "Ortaklık onaylandı (demo).");
  }

  function removePartner(partnerId: string): void {
    const partners = store.partners.filter((partner) => partner.partnerId !== partnerId);
    updateStore({ ...store, partners }, "Ortak listeden kaldırıldı.");
  }

  function openMessaging(partner: PartnerRecord): void {
    if (partner.companyId) {
      router.push(`/messaging?companyId=${encodeURIComponent(partner.companyId)}`);
      return;
    }
    router.push(`/messaging?email=${encodeURIComponent(partner.contactEmail)}`);
  }

  function openTrust(partner: PartnerRecord): void {
    if (!partner.companyId) {
      setSaveMessage("Firma kimliği yok — ortağı düzenleyip companyId ekleyin (demo).");
      window.setTimeout(() => setSaveMessage(""), 4000);
      return;
    }
    router.push(`/trust?companyId=${encodeURIComponent(partner.companyId)}`);
  }

  return (
    <>
      <div className="stats-strip">
        <div className="stat-item stat-item--highlight">
          <span className="stat-item-value">{String(stats.active)}</span>
          <span className="stat-item-label">Aktif ortak</span>
        </div>
        <div className="stat-item">
          <span className="stat-item-value">{String(stats.pending)}</span>
          <span className="stat-item-label">Onay bekliyor</span>
        </div>
        <div className="stat-item">
          <span className="stat-item-value">{String(stats.invited)}</span>
          <span className="stat-item-label">Davet gönderildi</span>
        </div>
      </div>

      <form
        className="account-card module-panel module-panel--elevated"
        onSubmit={handleInviteSubmit}
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Ortak davet et</h2>
            <p className="account-card-lead">
              Taşıyıcı veya yük veren firmayı e-posta ile davet edin. Onay sonrası
              ortak ilanlar ve mesajlaşma açılır.
            </p>
          </div>
          <button type="submit" className="btn-account-primary">Davet gönder</button>
        </header>
        <div className="account-form-grid">
          <label className="label-light">
            Firma / kişi adı
            <input
              className="input-light"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="Örn. Baltic Trans"
            />
          </label>
          <label className="label-light">
            İlişki türü
            <select
              className="input-light"
              value={inviteRelation}
              onChange={(event) =>
                setInviteRelation(event.target.value as PartnerRelation)
              }
            >
              <option value="carrier">Taşıyıcı</option>
              <option value="shipper">Yük veren</option>
              <option value="forwarder">Forwarder</option>
            </select>
          </label>
          <label className="label-light account-form-span-2">
            Davet e-postası
            <input
              className="input-light"
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="ops@firma.com"
            />
          </label>
        </div>
        {saveMessage ? <p className="account-save-hint">{saveMessage}</p> : null}
      </form>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Ortak listesi</h2>
            <p className="account-card-lead">
              Onaylı bağlantılar, bekleyen talepler ve gönderilen davetler.
            </p>
          </div>
          <div className="account-partner-filters" role="tablist" aria-label="Ortak filtre">
            {(
              [
                ["all", "Tümü"],
                ["active", "Aktif"],
                ["pending", "Bekleyen"],
                ["invited", "Davet"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={filter === key ? "account-partner-filter active" : "account-partner-filter"}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {filteredPartners.length === 0 ? (
          <EmptyState message="Bu filtrede ortak görünmüyor. Yukarıdan davet gönderin veya filtreyi değiştirin." />
        ) : (
          <ul className="account-partner-list">
            {filteredPartners.map((partner) => (
              <li key={partner.partnerId} className="account-partner-item">
                <div className="account-partner-main">
                  <div className="account-partner-title-row">
                    <h3 className="account-partner-name">{partner.displayName}</h3>
                    <span
                      className={
                        partner.status === "active"
                          ? "account-status-pill account-status-pill--ok"
                          : "account-status-pill account-status-pill--pending"
                      }
                    >
                      {STATUS_LABELS[partner.status]}
                    </span>
                  </div>
                  <p className="account-partner-meta">
                    <span>{RELATION_LABELS[partner.relation]}</span>
                    <span aria-hidden>·</span>
                    <span>{partner.corridorLabel}</span>
                    <span aria-hidden>·</span>
                    <span>{partner.contactEmail}</span>
                  </p>
                  {partner.note ? (
                    <p className="account-partner-note">{partner.note}</p>
                  ) : null}
                  <p className="account-meta-line">
                    Bağlantı: {partner.linkedSince}
                    {partner.companyId ? (
                      <>
                        {" "}
                        · Firma: <code>{partner.companyId.slice(0, 8)}</code>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="account-partner-actions">
                  <button
                    type="button"
                    className="btn-account-ghost"
                    onClick={() => openMessaging(partner)}
                  >
                    Mesaj
                  </button>
                  <button
                    type="button"
                    className="btn-account-ghost"
                    onClick={() => openTrust(partner)}
                  >
                    Güven profili
                  </button>
                  {partner.status === "pending" ? (
                    <button
                      type="button"
                      className="btn-account-primary"
                      onClick={() => acceptPartner(partner.partnerId)}
                    >
                      Onayla
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn-account-ghost account-partner-remove"
                    onClick={() => removePartner(partner.partnerId)}
                  >
                    Kaldır
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Paylaşım ayarları</h2>
            <p className="account-card-lead">
              Ortaklarınızın hangi içerikleri görebileceğini varsayılan olarak belirleyin.
            </p>
          </div>
        </header>
        <div className="account-corridor-toggles">
          <button
            type="button"
            className={
              store.shareListingsByDefault
                ? "account-corridor-chip active"
                : "account-corridor-chip"
            }
            aria-pressed={store.shareListingsByDefault}
            onClick={() =>
              updateStore(
                { ...store, shareListingsByDefault: !store.shareListingsByDefault },
                "Paylaşım ayarı güncellendi.",
              )
            }
          >
            <span>Aktif ilanları ortaklarla paylaş</span>
          </button>
        </div>
        <p className="module-hint">
          İhale ve güven modülleri ortaklık onayından sonra açılır. Detaylı yetkiler
          çalışanlar sekmesindeki rollerle birleştirilecek.
        </p>
        <Link href="/hesap/calisanlar" className="btn-account-ghost">
          Çalışan rolleri
        </Link>
      </section>
    </>
  );
}
