"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addOrgSuppression,
  formatMailIdentityApiError,
  fetchCompanyMailIdentity,
  type MailDeliverabilityHints,
  fetchCustomDomainBundle,
  fetchOrgSuppressions,
  claimCompanyMailAddress,
  provisionCompanyMailIdentity,
  provisionCustomDomainSender,
  registerCustomDomain,
  removeOrgSuppression,
  updateCompanyMailDisplayName,
  verifyCustomDomainDns,
  type CompanyMailIdentitySnapshot,
  type CustomDomainBundle,
  type OrgSuppressionRow,
} from "../../lib/CompanyMailIdentityApi";
import { useWebSession } from "../../context/WebSessionProvider";

function slugifyLocalPart(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function slugifyPostOrg(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 48);
  if (base.length >= 3) {
    return base;
  }
  return slugifyLocalPart(input).replace(/-/g, "") || "firma";
}

/** Kutu ön eki: yalnızca `info` — tam e-posta yazılırsa @ öncesi alınır. */
function normalizePostLocalPart(raw: string): string {
  let value = raw.trim().toLowerCase();
  if (value.includes("@")) {
    value = value.split("@")[0] ?? value;
  }
  value = value.replace(/[^a-z0-9._-]/g, "");
  return value.slice(0, 48);
}

function normalizePostOrgSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function isValidPostOrgSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
}

function isValidPostLocalPart(local: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,48}[a-z0-9]$|^[a-z0-9]$/.test(local);
}

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
  const [localPart, setLocalPart] = useState("");
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
  const [postOrgSlug, setPostOrgSlug] = useState("");
  const [postLocalPart, setPostLocalPart] = useState("info");
  const [claimingPost, setClaimingPost] = useState(false);

  const lertaPostPreview = useMemo(() => {
    const slug = normalizePostOrgSlug(postOrgSlug);
    const local = normalizePostLocalPart(postLocalPart);
    if (!slug || !local) {
      return null;
    }
    return `${local}@${slug}.post`;
  }, [postOrgSlug, postLocalPart]);

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
      if (isOwner) {
        setSuppressions(await fetchOrgSuppressions(accessToken));
        setCustomDomain(await fetchCustomDomainBundle(accessToken));
      }
      if (!next.sender && !localPart) {
        setLocalPart(slugifyLocalPart(companyTradeName));
      }
      if (!postOrgSlug) {
        setPostOrgSlug(slugifyPostOrg(companyTradeName));
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

  async function handleClaimLertaPost(): Promise<void> {
    setMessage("");
    setError("");
    if (!accessToken) {
      setError("Oturum bulunamadı — sayfayı yenileyip tekrar giriş yapın.");
      return;
    }
    if (!isOwner) {
      setError("Lerta Post kutusu yalnızca firma sahibi oluşturabilir.");
      return;
    }
    const slug = normalizePostOrgSlug(postOrgSlug);
    const local = normalizePostLocalPart(postLocalPart);
    if (!slug || !local) {
      setError("Firma kısa adı ve kutu ön eki zorunlu.");
      return;
    }
    if (!isValidPostOrgSlug(slug)) {
      setError(
        "Firma kısa adı: 3–50 karakter, küçük harf/rakam/tire (ör. abayer).",
      );
      return;
    }
    if (!isValidPostLocalPart(local)) {
      setError(
        "Kutu ön eki yalnızca info gibi tek parça olmalı — tam e-posta yazmayın.",
      );
      return;
    }
    const desiredAddress = `${local}@${slug}.post`;
    setClaimingPost(true);
    try {
      const result = await claimCompanyMailAddress(accessToken, {
        desiredAddress,
        displayName: displayName.trim() || companyTradeName,
      });
      setPostLocalPart(local);
      setPostOrgSlug(slug);
      setMessage(
        result.nextStepTr ||
          `Lerta Post kutusu hazır: ${result.vanityAddress ?? result.fromAddress}`,
      );
      await refresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setError(
        raw
          ? formatMailIdentityApiError(raw)
          : "Lerta Post adresi oluşturulamadı — slug kullanımda veya geçersiz.",
      );
    } finally {
      setClaimingPost(false);
    }
  }

  async function handleProvision(): Promise<void> {
    if (!accessToken || !localPart.trim()) {
      return;
    }
    setMessage("");
    setError("");
    try {
      const result = await provisionCompanyMailIdentity(accessToken, {
        localPart: localPart.trim(),
        displayName: displayName.trim() || undefined,
      });
      setMessage(`Kurumsal gönderen adresi hazır: ${result.fromAddress}`);
      await refresh();
    } catch {
      setError(
        "Adres oluşturulamadı. DNS doğrulaması veya adres kullanımda olabilir.",
      );
    }
  }

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
        Kurumsal posta ve Mesajlar sekmesi için önerilen adres:{" "}
        <strong>info@firma.post</strong> (teknik:{" "}
        <code>info@firma.post.lerta.com.tr</code>). Pilot tenant:{" "}
        <code>@{identity?.domain ?? "kullanici.lerta.com.tr"}</code>. Kimlik
        değişiklikleri denetim günlüğüne kaydedilir (KVKK).
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
          identity.platformDnsReady &&
          isOwner ? (
            <div
              className="account-form-row"
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "12px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
              }}
            >
              <p className="account-verify-eyebrow">Lerta Post (önerilen)</p>
              <p className="module-hint">
                DNS sizden istenmez. Görünen adres{" "}
                <code>{lertaPostPreview ?? "info@firma.post"}</code> (teknik:{" "}
                <code>
                  {lertaPostPreview
                    ? `${normalizePostLocalPart(postLocalPart)}@${normalizePostOrgSlug(postOrgSlug)}.post.lerta.com.tr`
                    : "info@firma.post.lerta.com.tr"}
                </code>
                ). <strong>Kutu ön eki</strong> sadece <code>info</code> olmalı;
                <code>info@lerta.com.tr</code> yazmayın.
              </p>
              <label className="account-label">
                Firma kısa adı (slug)
                <input
                  className="account-input"
                  value={postOrgSlug}
                  onChange={(e) => setPostOrgSlug(e.target.value)}
                  onBlur={() => setPostOrgSlug(normalizePostOrgSlug(postOrgSlug))}
                  placeholder="abayer"
                />
              </label>
              <label className="account-label">
                Kutu ön eki (local-part)
                <input
                  className="account-input"
                  value={postLocalPart}
                  onChange={(e) => setPostLocalPart(e.target.value)}
                  onBlur={() =>
                    setPostLocalPart(normalizePostLocalPart(postLocalPart))
                  }
                  placeholder="info"
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                className="btn-account-primary"
                disabled={claimingPost}
                onClick={() => void handleClaimLertaPost()}
              >
                {claimingPost ? "Oluşturuluyor…" : "Lerta Post kutusu oluştur"}
              </button>
            </div>
          ) : null}

          {!identity.platformDnsReady ? (
            <p className="module-hint">
              Paylaşımlı alan DNS kayıtları henüz doğrulanmadı. Lerta operatörü
              kurulumu tamamladığında buradan adres alabilirsiniz.
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

          {!identity.fromAddress &&
          !identity.displayAddress &&
          identity.platformDnsReady &&
          isOwner ? (
            <div className="account-form-row" style={{ marginTop: "1rem" }}>
              <p className="account-verify-eyebrow">Pilot tenant (lerta.com.tr)</p>
              <label className="account-label">
                Adres ön eki (local-part)
                <input
                  className="account-input"
                  value={localPart}
                  onChange={(e) => setLocalPart(e.target.value)}
                  placeholder="ornek-lojistik"
                />
              </label>
              <p className="module-hint">
                Örnek: <code>{localPart || "firma"}@{identity.domain}</code> —
                küçük harf, rakam ve tire; 3–50 karakter.
              </p>
              <label className="account-label">
                Görünen ad
                <input
                  className="account-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-account-primary"
                onClick={() => void handleProvision()}
              >
                Kurumsal gönderen oluştur
              </button>
            </div>
          ) : null}

          {!identity.fromAddress && identity.platformDnsReady && !isOwner ? (
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
            ), e-posta adresi değil. Lerta Post için yukarıdaki yeşil kutuyu
            kullanın; <code>info@lerta.com.tr</code> buraya yazılmaz.
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
