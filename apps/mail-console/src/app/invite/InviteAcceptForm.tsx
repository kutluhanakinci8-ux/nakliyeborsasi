"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  acceptMailTeamInvite,
  previewMailTeamInvite,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export function InviteAcceptForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { setAccessToken } = useConsoleSession();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [requiresRegistration, setRequiresRegistration] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Davet bağlantısı geçersiz.");
      return;
    }
    void (async () => {
      try {
        const preview = await previewMailTeamInvite(token);
        setCompanyName(preview.companyLegalName);
        setEmail(preview.email);
        setRoleLabel(preview.roleLabel);
        setRequiresRegistration(preview.requiresRegistration);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Davet yüklenemedi");
      }
    })();
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await acceptMailTeamInvite(token, {
        password,
        displayName: requiresRegistration ? displayName : undefined,
      });
      setAccessToken(result.accessToken);
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Davet kabul edilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <h1>Lerta Mail daveti</h1>
        {companyName ? (
          <p>
            <strong>{companyName}</strong> sizi{" "}
            <strong>{roleLabel}</strong> olarak davet etti.
          </p>
        ) : null}
        {email ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{email}</p>
        ) : null}
        {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          {requiresRegistration ? (
            <label>
              Adınız
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>
          ) : null}
          <label>
            {requiresRegistration ? "Şifre oluşturun" : "Mevcut şifreniz"}
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <button type="submit" className="btn" disabled={loading || !token}>
            Daveti kabul et ve giriş yap
          </button>
        </form>
      </div>
    </div>
  );
}
