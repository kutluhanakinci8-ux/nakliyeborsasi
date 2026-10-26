"use client";

import { PasswordField } from "@/components/PasswordField";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthPremiumShell,
  type MailRegisterPlan,
} from "@/components/AuthPremiumShell";
import { MAIL_WEB_URL } from "@/lib/apiConfig";
import {
  MAIL_PILOT_TENANT_DOMAIN,
  parseLertaPilotMailboxAddress,
  suggestLertaPilotFromCompany,
} from "@/lib/lertaPostAddress";
import {
  claimMailAddress,
  quickStartPilotMailbox,
  registerMailSaas,
} from "@/lib/consoleApi";
import { isEmailAlreadyRegisteredMessage } from "@/lib/authErrorMessages";
import { useConsoleSession } from "@/lib/session";

const MAIL_PLAN_CODES = new Set<MailRegisterPlan>([
  "lerta_mail_pilot_tr",
  "lerta_mail_corporate_tr",
]);

export default function RegisterPage() {
  const router = useRouter();
  const { setAccessToken } = useConsoleSession();
  const [subscriptionPlanCode, setSubscriptionPlanCode] =
    useState<MailRegisterPlan>("lerta_mail_pilot_tr");
  const [postaDesired, setPostaDesired] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("plan")?.trim();
    if (fromQuery && MAIL_PLAN_CODES.has(fromQuery as MailRegisterPlan)) {
      setSubscriptionPlanCode(fromQuery as MailRegisterPlan);
    }
    const slug = params.get("slug")?.trim().toLowerCase() ?? "";
    if (slug) {
      setPostaDesired(
        slug.includes("@") ? slug : `${slug}@${MAIL_PILOT_TENANT_DOMAIN}`,
      );
    }
  }, []);
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPilot = subscriptionPlanCode === "lerta_mail_pilot_tr";

  const parsedPost = useMemo(
    () => parseLertaPilotMailboxAddress(postaDesired),
    [postaDesired],
  );
  const suggestedFromCompany = useMemo(
    () => suggestLertaPilotFromCompany(companyLegalName),
    [companyLegalName],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await registerMailSaas({
        emailAddress: email.trim(),
        password,
        displayName: displayName.trim() || companyLegalName.trim(),
        companyLegalName: companyLegalName.trim(),
        subscriptionPlanCode,
      });
      setAccessToken(token);
      if (isPilot) {
        const desired =
          parseLertaPilotMailboxAddress(postaDesired)?.full ??
          suggestLertaPilotFromCompany(companyLegalName);
        if (desired) {
          try {
            const claim = await claimMailAddress(token, desired, {
              displayName: displayName.trim() || companyLegalName.trim(),
            });
            const show =
              claim.vanityAddress ?? claim.fromAddress ?? desired;
            const handoff = `${MAIL_WEB_URL.replace(/\/$/, "")}/auth/consume#access_token=${encodeURIComponent(token)}&from=${encodeURIComponent(show)}`;
            window.location.href = handoff;
            return;
          } catch {
            setError(
              `Lerta Posta adresi açılamadı. Format: firma-on-eki@${MAIL_PILOT_TENANT_DOMAIN} (küçük harf).`,
            );
            setLoading(false);
            return;
          }
        }
        try {
          const quick = await quickStartPilotMailbox(token, {
            companyLegalName: companyLegalName.trim(),
            displayName: displayName.trim() || companyLegalName.trim(),
          });
          const handoff = `${MAIL_WEB_URL.replace(/\/$/, "")}/auth/consume#access_token=${encodeURIComponent(token)}&from=${encodeURIComponent(quick.fromAddress)}`;
          window.location.href = handoff;
          return;
        } catch {
          router.replace("/dashboard?pilot=dns_pending");
          return;
        }
      }
      router.replace(
        `/domain?welcome=1&plan=${encodeURIComponent(subscriptionPlanCode)}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kayıt tamamlanamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPremiumShell plan={subscriptionPlanCode}>
      <form className="auth-premium-form" onSubmit={onSubmit}>
        <h2 className="auth-premium-form-title">Hesap oluştur</h2>
        <p className="auth-premium-form-sub">
          {isPilot
            ? "Pilot plan — kutu açıldıktan sonra webmail’e yönlendirilirsiniz."
            : "Kurumsal plan — sonraki adım özel domain sihirbazı."}
        </p>

        {error ? (
          <div className="auth-premium-error" role="alert">
            <p>{error}</p>
            {isEmailAlreadyRegisteredMessage(error) ? (
              <p className="auth-premium-error-actions">
                <Link href="/login">Giriş yap</Link>
                {" · "}
                <Link href="/forgot-password">Şifremi unuttum</Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {isPilot ? (
          <div className="auth-premium-field">
            <label htmlFor="posta">Lerta Posta adresiniz</label>
            <input
              id="posta"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder={`firma-adi@${MAIL_PILOT_TENANT_DOMAIN}`}
              value={postaDesired}
              onChange={(e) =>
                setPostaDesired(e.target.value.trim().toLowerCase())
              }
            />
            <p className="auth-premium-hint">
              Pilot kutular <strong>@{MAIL_PILOT_TENANT_DOMAIN}</strong> altında
              açılır. Örnek: <code>kutluhan@{MAIL_PILOT_TENANT_DOMAIN}</code>
            </p>
            {parsedPost ? (
              <p className="auth-premium-success">
                Açılacak kutu: <strong>{parsedPost.full}</strong>
              </p>
            ) : postaDesired.trim() ? (
              <p className="auth-premium-error auth-premium-error--inline">
                Geçerli format: ön-ek@{MAIL_PILOT_TENANT_DOMAIN}
              </p>
            ) : suggestedFromCompany ? (
              <p className="auth-premium-hint">
                Öneri:{" "}
                <button
                  type="button"
                  className="auth-premium-chip"
                  onClick={() => setPostaDesired(suggestedFromCompany)}
                >
                  {suggestedFromCompany}
                </button>
              </p>
            ) : (
              <p className="auth-premium-hint">
                Firma ünvanını yazdıktan sonra adres önerilir; boş bırakırsanız
                kayıt sonrası otomatik oluşturulur.
              </p>
            )}
          </div>
        ) : null}

        <div className="auth-premium-field">
          <label htmlFor="company">Firma ünvanı</label>
          <input
            id="company"
            value={companyLegalName}
            onChange={(e) => setCompanyLegalName(e.target.value)}
            placeholder="Örn. Abayer Lojistik A.Ş."
            required
          />
        </div>

        <div className="auth-premium-field">
          <label htmlFor="display">Yetkili adı</label>
          <input
            id="display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ad Soyad"
          />
        </div>

        <div className="auth-premium-field">
          <label htmlFor="email">Giriş e-postası</label>
          <p className="auth-premium-hint auth-premium-hint--tight">
            <strong>Giriş e-postası</strong> hesabınızın kimliğidir (panel +
            webmail şifresi). Nakliye Borsası veya önceki Lerta kaydında
            kullandığınız adres burada tekrar kayıt olamaz —{" "}
            <Link href="/login">giriş yapın</Link>. Pilot kutu adresi (
            <code>@{MAIL_PILOT_TENANT_DOMAIN}</code>) ayrı bir alandır.
          </p>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sizin@eposta.com"
            required
          />
        </div>

        <div className="auth-premium-field">
          <label htmlFor="password">Şifre</label>
          <PasswordField
            id="password"
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            placeholder="En az 8 karakter"
            required
          />
        </div>

        <button
          className="auth-premium-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? "Kayıt yapılıyor…" : "Hesap oluştur"}
        </button>

        <p className="auth-premium-footer-link">
          Zaten hesabınız var mı? <Link href="/login">Giriş yap</Link>
        </p>
      </form>
    </AuthPremiumShell>
  );
}
