"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LertaComTrMailAddressPicker } from "../../../../components/account/LertaComTrMailAddressPicker";
import { fetchCompanyMailIdentity } from "../../../../lib/CompanyMailIdentityApi";
import { loadOrganizationProfile } from "../../../../lib/organizationProfile";
import {
  markLertaComTrMailOnboardingSkipped,
  wasLertaComTrMailOnboardingSkipped,
} from "../../../../lib/lertaComTrMailOnboarding";
import { useWebSession } from "../../../../context/WebSessionProvider";

export function PostaAdresiOnboardingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const { accessToken, session } = useWebSession();
  const companyId = session?.companyId ?? "";
  const emailAddress = session?.emailAddress ?? "";
  const [legalName, setLegalName] = useState("");
  const [doneAddress, setDoneAddress] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    const profile = loadOrganizationProfile(companyId, emailAddress);
    setLegalName(profile.legalName || profile.tradeName || "");
  }, [companyId, emailAddress]);

  useEffect(() => {
    if (!accessToken || !companyId) {
      setChecking(false);
      return;
    }
    if (wasLertaComTrMailOnboardingSkipped(companyId) && !welcome) {
      router.replace("/marketplace");
      return;
    }
    void (async () => {
      try {
        const bundle = await fetchCompanyMailIdentity(accessToken);
        if (bundle.identity.fromAddress || bundle.identity.displayAddress) {
          router.replace("/hesap/organizasyon#org-eposta");
          return;
        }
      } catch {
        /* show wizard */
      } finally {
        setChecking(false);
      }
    })();
  }, [accessToken, companyId, router, welcome]);

  function handleSkip(): void {
    markLertaComTrMailOnboardingSkipped(companyId);
    router.replace("/hesap/organizasyon");
  }

  if (!accessToken) {
    return (
      <p className="module-hint">
        Oturum gerekli. <Link href="/login">Giriş yapın</Link>.
      </p>
    );
  }

  if (checking) {
    return <p className="module-hint">Yükleniyor…</p>;
  }

  if (doneAddress) {
    return (
      <section className="account-card module-panel module-panel--elevated">
        <h1 className="account-card-title">Posta adresiniz hazır</h1>
        <p className="account-card-lead">
          Kurumsal posta kutusu: <code>{doneAddress}</code>
        </p>
        <p className="module-hint">
          Giriş e-postanız (platform hesabı): <code>{emailAddress}</code> — bu
          adres değişmedi.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a
            className="btn-account-primary"
            href="https://posta.lerta.com.tr/login"
            target="_blank"
            rel="noopener noreferrer"
          >
            Webmail&apos;e git
          </a>
          <Link className="btn-account-secondary" href="/messaging?tab=email">
            Mesajlar
          </Link>
          <Link className="btn-account-secondary" href="/marketplace">
            Borsaya devam
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="account-card module-panel module-panel--elevated">
      <p className="account-verify-eyebrow">
        {welcome ? "Üyelik tamamlandı" : "Kurumsal posta"}
      </p>
      <h1 className="account-card-title">Lerta posta adresinizi seçin</h1>
      <p className="account-card-lead">
        Bir dakikada <strong>@lerta.com.tr</strong> adresinizi alın. İsterseniz
        sonra organizasyon ayarlarından değiştirebilir veya ek kutu
        açabilirsiniz.
      </p>

      <LertaComTrMailAddressPicker
        accessToken={accessToken}
        companyLegalName={legalName}
        displayNameDefault={legalName}
        onSuccess={(from) => setDoneAddress(from)}
      />

      <p style={{ marginTop: "1.25rem" }}>
        <button
          type="button"
          className="btn-account-secondary"
          onClick={handleSkip}
        >
          Sonra hatırlat
        </button>
      </p>
    </section>
  );
}
