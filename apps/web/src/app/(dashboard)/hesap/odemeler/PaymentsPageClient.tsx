"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useWebSession } from "../../../../context/WebSessionProvider";
import { SubscriptionApiClient } from "../../../../lib/SubscriptionApiClient";

type InvoiceStatus = "paid" | "open" | "overdue";

type InvoiceRecord = {
  invoiceId: string;
  periodLabel: string;
  amount: number;
  currencyCode: string;
  status: InvoiceStatus;
  issuedAt: string;
};

type PaymentMethod = {
  brand: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  holderName: string;
};

type BillingStore = {
  planCode: string;
  planLabel: string;
  planPrice: number;
  currencyCode: string;
  billingCycle: "monthly" | "annual";
  renewalDate: string;
  autoRenew: boolean;
  billingEmail: string;
  taxId: string;
  billingAddress: string;
  paymentMethod: PaymentMethod;
  invoices: InvoiceRecord[];
};

const STORAGE_PREFIX = "nb-company-billing:";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Ödendi",
  open: "Açık",
  overdue: "Gecikmiş",
};

function defaultStore(emailAddress: string): BillingStore {
  return {
    planCode: "carrier_professional_tr_ua",
    planLabel: "Carrier Professional · TR-UA",
    planPrice: 149,
    currencyCode: "EUR",
    billingCycle: "monthly",
    renewalDate: "2026-10-22",
    autoRenew: true,
    billingEmail: emailAddress || "fatura@firma.com",
    taxId: "",
    billingAddress: "",
    paymentMethod: {
      brand: "Visa",
      last4: "4242",
      expiryMonth: "12",
      expiryYear: "28",
      holderName: "Demo Firma",
    },
    invoices: [
      {
        invoiceId: "INV-2026-09",
        periodLabel: "Eylül 2026",
        amount: 149,
        currencyCode: "EUR",
        status: "paid",
        issuedAt: "2026-09-01",
      },
      {
        invoiceId: "INV-2026-08",
        periodLabel: "Ağustos 2026",
        amount: 149,
        currencyCode: "EUR",
        status: "paid",
        issuedAt: "2026-08-01",
      },
      {
        invoiceId: "INV-2026-07",
        periodLabel: "Temmuz 2026",
        amount: 149,
        currencyCode: "EUR",
        status: "paid",
        issuedAt: "2026-07-01",
      },
    ],
  };
}

function loadStore(companyId: string, emailAddress: string): BillingStore {
  if (typeof window === "undefined" || !companyId) {
    return defaultStore(emailAddress);
  }
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
  if (!raw) {
    return defaultStore(emailAddress);
  }
  try {
    return { ...defaultStore(emailAddress), ...(JSON.parse(raw) as BillingStore) };
  } catch {
    return defaultStore(emailAddress);
  }
}

function persistStore(companyId: string, store: BillingStore): void {
  if (!companyId) {
    return;
  }
  window.localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(store));
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PaymentsPageClient() {
  const { session, accessToken, isReady } = useWebSession();
  const companyId = session?.companyId ?? "";
  const emailAddress = session?.emailAddress ?? "";
  const [store, setStore] = useState<BillingStore>(() => defaultStore(emailAddress));
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!companyId) {
      return;
    }
    setStore(loadStore(companyId, emailAddress));
  }, [companyId, emailAddress]);

  useEffect(() => {
    if (!isReady || !accessToken) {
      return;
    }
    void SubscriptionApiClient.fetchCompanySubscription(accessToken).then((view) => {
      const plan = view.activePlan;
      if (!plan) {
        return;
      }
      setStore((current) => {
        const next = {
          ...current,
          planCode: plan.planCode,
          planLabel: `${plan.displayName} · TR-UA`,
          planPrice: plan.monthlyPriceEur ?? current.planPrice,
          currencyCode: "EUR",
        };
        persistStore(companyId, next);
        return next;
      });
    });
  }, [accessToken, isReady, companyId]);

  const openInvoiceCount = useMemo(
    () => store.invoices.filter((inv) => inv.status !== "paid").length,
    [store.invoices],
  );

  function flash(message: string): void {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(""), 4000);
  }

  function updateStore(next: BillingStore, message?: string): void {
    setStore(next);
    persistStore(companyId, next);
    if (message) {
      flash(message);
    }
  }

  function handleBillingSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    updateStore(store, "Fatura bilgileri kaydedildi (demo).");
  }

  function toggleAutoRenew(): void {
    updateStore(
      { ...store, autoRenew: !store.autoRenew },
      store.autoRenew ? "Otomatik yenileme kapatıldı (demo)." : "Otomatik yenileme açıldı (demo).",
    );
  }

  function downloadInvoice(invoice: InvoiceRecord): void {
    flash(`${invoice.invoiceId} PDF indirme yakında — demo.`);
  }

  return (
    <>
      <div className="stats-strip">
        <div className="stat-item stat-item--highlight">
          <span className="stat-item-value">{store.planLabel.split("·")[0]?.trim() ?? store.planCode}</span>
          <span className="stat-item-label">Aktif plan</span>
        </div>
        <div className="stat-item">
          <span className="stat-item-value">
            {formatMoney(store.planPrice, store.currencyCode)}
          </span>
          <span className="stat-item-label">
            {store.billingCycle === "monthly" ? "Aylık" : "Yıllık"}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-item-value">{String(openInvoiceCount)}</span>
          <span className="stat-item-label">Açık fatura</span>
        </div>
      </div>

      <section className="account-verify-banner module-panel module-panel--elevated account-billing-plan">
        <div className="account-verify-copy">
          <p className="account-verify-eyebrow">Abonelik</p>
          <h2 className="account-card-title">{store.planLabel}</h2>
          <p className="account-card-lead">
            Marketplace, ihale, mesaj ve güven modülleri bu pakete dahil. Koridor:
            TR · UA · EU.
          </p>
          <div className="account-verify-badges">
            <span className="account-status-pill account-status-pill--ok">Aktif</span>
            <span className="account-status-pill">
              Yenileme: {store.renewalDate}
            </span>
            {store.autoRenew ? (
              <span className="account-status-pill account-status-pill--ok">
                Otomatik yenileme açık
              </span>
            ) : (
              <span className="account-status-pill account-status-pill--pending">
                Manuel yenileme
              </span>
            )}
          </div>
          <div className="account-verify-actions">
            <a href="/hesap/organizasyon#org-abonelik" className="btn-account-primary">
              Planı değiştir
            </a>
            <button type="button" className="btn-account-ghost" onClick={toggleAutoRenew}>
              {store.autoRenew ? "Otomatik yenilemeyi kapat" : "Otomatik yenilemeyi aç"}
            </button>
          </div>
        </div>
        <div className="account-verify-aside">
          <div className="account-verify-stat">
            <span className="account-verify-stat-value">
              {formatMoney(store.planPrice, store.currencyCode)}
            </span>
            <span className="account-verify-stat-label">Sonraki tahsilat</span>
          </div>
          <div className="account-verify-stat">
            <span className="account-verify-stat-value">{store.planCode}</span>
            <span className="account-verify-stat-label">Plan kodu</span>
          </div>
        </div>
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Ödeme yöntemi</h2>
            <p className="account-card-lead">
              Tahsilatlar bu kart veya havale hesabından yapılır. PCI uyumlu saklama
              sonraki sürümde.
            </p>
          </div>
          <button type="button" className="btn-account-ghost" disabled>
            Kart değiştir (yakında)
          </button>
        </header>
        <div className="account-payment-card">
          <div className="account-payment-card-chip" aria-hidden />
          <div>
            <p className="account-payment-card-brand">
              {store.paymentMethod.brand} ·••• {store.paymentMethod.last4}
            </p>
            <p className="account-payment-card-meta">
              {store.paymentMethod.holderName} · SKT{" "}
              {store.paymentMethod.expiryMonth}/{store.paymentMethod.expiryYear}
            </p>
          </div>
        </div>
      </section>

      <form
        className="account-card module-panel module-panel--elevated"
        onSubmit={handleBillingSubmit}
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Fatura bilgileri</h2>
            <p className="account-card-lead">
              E-fatura ve kurumsal sözleşme için kullanılır. Organizasyon unvanı ile
              eşleşmeli.
            </p>
          </div>
          <button type="submit" className="btn-account-primary">Kaydet</button>
        </header>
        <div className="account-form-grid">
          <label className="label-light">
            Fatura e-postası
            <input
              className="input-light"
              type="email"
              value={store.billingEmail}
              onChange={(event) =>
                setStore((current) => ({ ...current, billingEmail: event.target.value }))
              }
            />
          </label>
          <label className="label-light">
            Vergi / TIN
            <input
              className="input-light"
              value={store.taxId}
              onChange={(event) =>
                setStore((current) => ({ ...current, taxId: event.target.value }))
              }
              placeholder="TR vergi no"
            />
          </label>
          <label className="label-light account-form-span-2">
            Fatura adresi
            <textarea
              className="input-light account-textarea"
              rows={3}
              value={store.billingAddress}
              onChange={(event) =>
                setStore((current) => ({
                  ...current,
                  billingAddress: event.target.value,
                }))
              }
              placeholder="Unvan, cadde, posta kodu, şehir"
            />
          </label>
        </div>
        {saveMessage ? <p className="account-save-hint">{saveMessage}</p> : null}
      </form>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Fatura geçmişi</h2>
            <p className="account-card-lead">Son tahsilatlar ve indirilebilir e-faturalar.</p>
          </div>
        </header>
        <div className="account-invoice-table-wrap">
          <table className="account-invoice-table">
            <thead>
              <tr>
                <th scope="col">Dönem</th>
                <th scope="col">Fatura no</th>
                <th scope="col">Tutar</th>
                <th scope="col">Durum</th>
                <th scope="col" className="account-invoice-actions-col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {store.invoices.map((invoice) => (
                <tr key={invoice.invoiceId}>
                  <td>{invoice.periodLabel}</td>
                  <td>
                    <code>{invoice.invoiceId}</code>
                  </td>
                  <td>{formatMoney(invoice.amount, invoice.currencyCode)}</td>
                  <td>
                    <span
                      className={
                        invoice.status === "paid"
                          ? "account-status-pill account-status-pill--ok"
                          : "account-status-pill account-status-pill--pending"
                      }
                    >
                      {STATUS_LABELS[invoice.status]}
                    </span>
                  </td>
                  <td className="account-invoice-actions-col">
                    <button
                      type="button"
                      className="btn-account-ghost"
                      onClick={() => downloadInvoice(invoice)}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="account-meta-line">
          Firma kimliği: <code>{companyId || "—"}</code>
        </p>
      </section>
    </>
  );
}
