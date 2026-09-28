"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addOrgSuppression,
  formatMailIdentityApiError,
  fetchCompanyMailIdentity,
  type MailDeliverabilityHints,
  fetchCustomDomainBundle,
  fetchOrgSuppressions,
  provisionCustomDomainSender,
  registerCustomDomain,
  removeOrgSuppression,
  updateCompanyMailDisplayName,
  verifyCustomDomainDns,
  type CompanyMailIdentitySnapshot,
  type CustomDomainBundle,
  type OrgSuppressionRow,
} from "../../lib/CompanyMailIdentityApi";
import { LertaComTrMailAddressPicker } from "./LertaComTrMailAddressPicker";
import { useWebSession } from "../../context/WebSessionProvider";

function normalizeCustomDomainInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.includes("@")) {
    const domain = trimmed.slice(trimmed.indexOf("@") + 1);
    return domain.replace(/\.$/, "");
  }
  return trimmed.replace(/\.$/, "");
}

type OrganizationMailIdentityPanelProps = {
  companyTradeName: string;
};

export function OrganizationMailIdentityPanel({
  companyTradeName,
}: OrganizationMailIdentityPanelProps) {
  const { accessToken, session } = useWebSession();
  const isOwner = session?.roleCodes?.includes("COMPANY_OWNER") ?? false;
  const [identity, setIdentity] = useState<CompanyMailIdentitySnapshot | null>(
    null,
  );
  const [deliverability, setDeliverability] =
    useState<MailDeliverabilityHints | null>(null);
  const [replyToHintTr, setReplyToHintTr] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [suppressions, setSuppressions] = useState<OrgSuppressionRow[]>([]);
  const [blockEmail, setBlockEmail] = useState("");
  const [customDomain, setCustomDomain] = useState<CustomDomainBundle | null>(
    null,
  );
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [customLocalPart, setCustomLocalPart] = useState("bildirim");
  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const bundle = await fetchCompanyMailIdentity(accessToken);
      const next = bundle.identity;
      setIdentity(next);
      setDeliverability(bundle.deliverability);
      setReplyToHintTr(bundle.replyToHintTr);
      if (isOwner) {
        setSuppressions(await fetchOrgSuppressions(accessToken));
        setCustomDomain(await fetchCustomDomainBundle(accessToken));
      }
      if (next.sender?.displayName) {
        setDisplayName(next.sender.displayName);
      } else if (!displayName) {
        setDisplayName(companyTradeName);
      }
    } catch {
      setError("E-posta kimliği bilgisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyTradeName, isOwner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleDisplayNameSave(): Promise<void> {
    if (!accessToken || !identity?.sender) {
      return;
    }
    setMessage("");
    setError("");
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Görünen ad boş olamaz.");
      return;
    }
    try {
      await updateCompanyMailDisplayName(accessToken, trimmed);
      setDisplayName(trimmed);
      setMessage("Görünen ad güncellendi.");
      await refresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setError(
        raw ? formatMailIdentityApiError(raw) : "Görünen ad kaydedilemedi.",
      );
    }
  }

  if (!accessToken) {
    return null;
  }

  return (
    <section
      id="org-eposta"
      className="account-card module-panel module-panel--elevated account-org-section"
    >
      <p className="account-verify-eyebrow">Faz B — Kurumsal kimlik</p>
      <h2 className="account-card-title">E-posta gönderen kimliği</h2>
      <p className="account-card-lead">
        Kurumsal posta adresi: <strong>önek@lerta.com.tr</strong> (ör.{" "}
        <code>kutluhanlogistics@lerta.com.tr</code>). Platform giriş e-postanız
        ayrıdır. Kimlik değişiklikleri denetim günlüğüne kaydedilir (KVKK).
      </p>

      {loading && !identity ? (
        <p className="module-hint">Yükleniyor…</p>
      ) : null}

      {identity ? (
        <div className="account-org-mail-status">
          <div className="account-verify-badges" style={{ marginBottom: "1rem" }}>
            <span
              className={
                identity.platformDnsReady
                  ? "account-status-pill account-status-pill--ok"
                  : "account-status-pill account-status-pill--pending"
              }
            >
              Platform DNS {identity.platformDnsReady ? "hazır" : "bekleniyor"}
            </span>
            <span
              className={
                identity.fromAddress
                  ? "account-status-pill account-status-pill--ok"
                  : "account-status-pill account-status-pill--pending"
              }
            >
              {identity.fromAddress ? "Kimlik tanımlı" : "Kimlik yok"}
            </span>
          </div>

          {identity.fromAddress || identity.displayAddress ? (
            <p className="account-card-lead">
              Gönderen:{" "}
              <code>{identity.displayAddress ?? identity.fromAddress}</code>
              {identity.vanityAddress &&
              identity.vanityAddress !== identity.displayAddress ? (
                <>
                  {" "}
                  (teknik: <code>{identity.fromAddress}</code>)
                </>
              ) : null}
              {identity.sender?.displayName
                ? ` — ${identity.sender.displayName}`
                : null}
            </p>
          ) : null}

          {replyToHintTr ? (
            <p className="module-hint" style={{ marginTop: "0.75rem" }}>
              {replyToHintTr}
            </p>
          ) : null}

          {deliverability ? (
            <div
              className="module-panel"
              style={{ marginTop: "1rem", padding: "1rem" }}
            >
              <p className="account-verify-eyebrow">Güvenilir gönderim (SPF / DKIM)</p>
              <p className="module-hint" style={{ marginBottom: "0.75rem" }}>
                {deliverability.outlookHintTr}
              </p>
              <p className="module-hint">
                Alıcıya giden SMTP From:{" "}
                <code>{deliverability.smtpFromAddress}</code>
                {deliverability.fromHeaderMode === "aligned" ? (
                  <>
                    {" "}
                    · Görünen ürün adresi:{" "}
                    <code>{deliverability.vanityAddress}</code>
                  </>
                ) : null}
              </p>
              {deliverability.zoneDnsRecords.length > 0 ? (
                <details style={{ marginTop: "0.75rem" }}>
                  <summary className="module-panel-title" style={{ cursor: "pointer" }}>
                    isimtescil — post.lerta.com.tr bölgesi (operatör)
                  </summary>
                  <ul className="module-hint" style={{ marginTop: "0.5rem" }}>
                    {deliverability.zoneDnsRecords.map((row) => (
                      <li key={`${row.type}-${row.host}`}>
                        <strong>{row.type}</strong> {row.host}:{" "}
                        <code style={{ wordBreak: "break-all" }}>{row.value}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {deliverability.tenantDnsRecords.length > 0 ? (
                <details style={{ marginTop: "0.5rem" }}>
                  <summary className="module-panel-title" style={{ cursor: "pointer" }}>
                    Bu kutu — DKIM / SPF (DNS’e TXT)
                  </summary>
                  <ul className="module-hint" style={{ marginTop: "0.5rem" }}>
                    {deliverability.tenantDnsRecords.map((row) => (
                      <li key={`${row.type}-${row.host}`}>
                        <strong>{row.type}</strong> {row.host}:{" "}
                        <code style={{ wordBreak: "break-all" }}>{row.value}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}

          {!identity.fromAddress &&
          !identity.displayAddress &&
          isOwner &&
          accessToken ? (
            <div style={{ marginTop: "1rem" }}>
              <LertaComTrMailAddressPicker
                accessToken={accessToken}
                companyLegalName={companyTradeName}
                displayNameDefault={companyTradeName}
                onSuccess={(from) => {
                  setMessage(`Kurumsal posta adresi hazır: ${from}`);
                  void refresh();
                }}
              />
            </div>
          ) : null}

          {!identity.platformDnsReady ? (
            <p className="module-hint">
              Platform MX/SPF kayıtları henüz doğrulanmadı. Kutu oluşturulabilir;
              dışarıdan gelen posta DNS tamamlandığında açılır.
            </p>
          ) : null}

          {identity.fromAddress && isOwner ? (
            <div className="account-form-row" style={{ marginTop: "1rem" }}>
              <label className="account-label">
                Görünen ad (From başlığı)
                <input
                  className="account-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-account-secondary"
                onClick={() => void handleDisplayNameSave()}
              >
                Görünen adı kaydet
              </button>
            </div>
          ) : null}

          {!identity.fromAddress && !isOwner ? (
            <p className="module-hint">
              Kurumsal gönderen adresi yalnızca firma sahibi oluşturabilir.
            </p>
          ) : null}
        </div>
      ) : null}

      {isOwner ? (
        <div
          className="account-org-mail-status"
          style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-subtle, #e5e7eb)", paddingTop: "1.25rem" }}
        >
          <p className="account-verify-eyebrow">Faz B5 — Özel domain</p>
          <h3 className="account-card-title" style={{ fontSize: "1rem" }}>
            Kendi alan adınız (@musteri.com)
          </h3>
          <p className="module-hint">
            Sadece <strong>alan adı</strong> girin (ör. <code>musteri.com.tr</code>
            ), e-posta adresi değil. Paylaşımlı <code>@lerta.com.tr</code> adresi
            için yukarıdaki formu kullanın.
          </p>

          {!customDomain?.mailDomain ? (
            <div className="account-form-row" style={{ marginTop: "0.75rem" }}>
              <label className="account-label">
                Alan adı
                <input
                  className="account-input"
                  placeholder="musteri.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-account-secondary"
                onClick={() => {
                  if (!accessToken || !customDomainInput.trim()) {
                    return;
                  }
                  setMessage("");
                  setError("");
                  const domain = normalizeCustomDomainInput(customDomainInput);
                  if (!domain || domain.includes("@")) {
                    setError(
                      "Geçerli alan adı girin (ör. musteri.com) — @ işareti olmadan.",
                    );
                    return;
                  }
                  void registerCustomDomain(accessToken, domain)
                    .then((bundle) => {
                      setCustomDomain(bundle);
                      setMessage(
                        `Özel domain kaydı oluşturuldu: ${bundle.dnsInstructions?.domain}`,
                      );
                    })
                    .catch(() =>
                      setError(
                        "Domain eklenemedi — geçersiz alan veya başka firmaya bağlı olabilir.",
                      ),
                    );
                }}
              >
                Özel domain kaydet
              </button>
            </div>
          ) : null}

          {customDomain?.dnsInstructions ? (
            <div style={{ marginTop: "1rem" }}>
              <p className="account-card-lead">
                Domain: <code>{customDomain.dnsInstructions.domain}</code> — durum:{" "}
                <strong>{customDomain.mailDomain?.verificationStatus}</strong>
              </p>
              <ul className="module-hint" style={{ textAlign: "left" }}>
                <li>
                  TXT <code>{customDomain.dnsInstructions.spfHost}</code> →{" "}
                  <code>{customDomain.dnsInstructions.spfValue}</code>
                </li>
                <li>
                  TXT <code>{customDomain.dnsInstructions.dkimHost}</code> → DKIM
                  (panelde üretilen değer)
                </li>
                <li>
                  TXT <code>{customDomain.dnsInstructions.dmarcHost}</code> →{" "}
                  <code>{customDomain.dnsInstructions.dmarcValue}</code>
                </li>
              </ul>
              {customDomain.dnsInstructions.dkimTxt ? (
                <p className="module-hint" style={{ wordBreak: "break-all" }}>
                  DKIM: <code>{customDomain.dnsInstructions.dkimTxt}</code>
                </p>
              ) : null}
              {customDomain.dnsCheck ? (
                <div className="account-verify-badges" style={{ marginTop: "0.5rem" }}>
                  <span
                    className={
                      customDomain.dnsCheck.spf.ok
                        ? "account-status-pill account-status-pill--ok"
                        : "account-status-pill account-status-pill--pending"
                    }
                  >
                    SPF {customDomain.dnsCheck.spf.ok ? "ok" : "eksik"}
                  </span>
                  <span
                    className={
                      customDomain.dnsCheck.dkim.ok
                        ? "account-status-pill account-status-pill--ok"
                        : "account-status-pill account-status-pill--pending"
                    }
                  >
                    DKIM {customDomain.dnsCheck.dkim.ok ? "ok" : "eksik"}
                  </span>
                </div>
              ) : null}
              <div className="account-form-row" style={{ marginTop: "0.75rem" }}>
                <button
                  type="button"
                  className="btn-account-secondary"
                  onClick={() => {
                    if (!accessToken) {
                      return;
                    }
                    setMessage("");
                    setError("");
                    void verifyCustomDomainDns(accessToken)
                      .then(() => {
                        setMessage("DNS doğrulandı; OpenDKIM senkronu denendi.");
                        void refresh();
                      })
                      .catch(() => {
                        setError(
                          "DNS henüz hazır değil — SPF/DKIM TXT kayıtlarını kontrol edin.",
                        );
                        void refresh();
                      });
                  }}
                >
                  DNS doğrula
                </button>
              </div>
              <p className="module-hint">
                VPS (root): <code>{customDomain.dnsInstructions.vpsOpendkimScript}</code>
                — veya <code>MAIL_SYNC_OPENDKIM=true</code> ile otomatik.
              </p>
            </div>
          ) : null}

          {customDomain?.mailDomain?.verificationStatus === "verified" &&
          !customDomain.fromAddress ? (
            <div className="account-form-row" style={{ marginTop: "1rem" }}>
              <label className="account-label">
                Gönderen ön eki
                <input
                  className="account-input"
                  value={customLocalPart}
                  onChange={(e) => setCustomLocalPart(e.target.value)}
                  placeholder="bildirim"
                />
              </label>
              <button
                type="button"
                className="btn-account-primary"
                onClick={() => {
                  if (!accessToken || !customLocalPart.trim()) {
                    return;
                  }
                  void provisionCustomDomainSender(
                    accessToken,
                    customLocalPart.trim(),
                    displayName.trim() || companyTradeName,
                  )
                    .then((r) => {
                      setMessage(`Özel domain gönderen: ${r.fromAddress}`);
                      void refresh();
                    })
                    .catch(() =>
                      setError("Gönderen oluşturulamadı — adres kullanımda olabilir."),
                    );
                }}
              >
                @{customDomain.dnsInstructions?.domain ?? "domain"} gönderen oluştur
              </button>
            </div>
          ) : null}

          {customDomain?.fromAddress ? (
            <p className="account-card-lead" style={{ marginTop: "0.75rem" }}>
              Aktif özel gönderen: <code>{customDomain.fromAddress}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      {isOwner && identity?.fromAddress ? (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 className="account-card-title" style={{ fontSize: "1rem" }}>
            Org suppression (B4)
          </h3>
          <p className="module-hint">
            Bu listeye alınan adreslere yalnızca firmanız adına giden bildirimler
            gönderilmez; platform genel listesinden bağımsızdır.
          </p>
          <div className="account-form-row">
            <input
              className="account-input"
              placeholder="engellenecek@ornek.com"
              value={blockEmail}
              onChange={(e) => setBlockEmail(e.target.value)}
            />
            <button
              type="button"
              className="btn-account-secondary"
              onClick={() => {
                if (!accessToken || !blockEmail.trim()) {
                  return;
                }
                void addOrgSuppression(accessToken, blockEmail.trim()).then(
                  () => {
                    setBlockEmail("");
                    void refresh();
                  },
                );
              }}
            >
              Engelle
            </button>
          </div>
          {suppressions.length > 0 ? (
            <ul className="module-hint">
              {suppressions.map((row) => (
                <li key={row.emailAddress}>
                  {row.emailAddress}{" "}
                  <button
                    type="button"
                    className="btn-account-ghost"
                    onClick={() =>
                      void removeOrgSuppression(accessToken!, row.emailAddress).then(
                        () => void refresh(),
                      )
                    }
                  >
                    Kaldır
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="account-save-message">{message}</p> : null}
      {error ? (
        <p className="account-save-message account-save-message--error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
