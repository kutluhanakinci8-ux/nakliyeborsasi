"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  createMailTeamInvite,
  fetchMailTeam,
  isPlatformOperator,
  removeMailTeamMember,
  revokeMailTeamInvite,
  updateMailTeamMemberRole,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

type MemberRow = {
  membershipId: string;
  emailAddress: string;
  displayName: string;
  roleCode: string;
  joinedAt: string;
};

type InviteRow = {
  inviteId: string;
  email: string;
  roleCode: string;
  expiresAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  COMPANY_OWNER: "Firma sahibi",
  MAIL_ADMIN: "Posta yöneticisi",
  BILLING_ADMIN: "Faturalama yöneticisi",
  VIEWER: "Salt okunur",
};

export default function TeamPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [invitableRoles, setInvitableRoles] = useState<string[]>([]);
  const [canInvite, setCanInvite] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchMailTeam(accessToken);
    setCompanyName(data.team.companyLegalName);
    setMembers(data.team.members);
    setInvites(data.team.pendingInvites);
    setInvitableRoles(data.team.invitableRoles);
    setCanInvite(data.permissions.canInvite);
    setCanManageRoles(data.permissions.canManageRoles);
    if (data.team.invitableRoles.length > 0) {
      setInviteRole(data.team.invitableRoles[0]);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        setOperator(await isPlatformOperator(accessToken));
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ekip yüklenemedi");
      }
    })();
  }, [accessToken, reload, router]);

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !canInvite) {
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await createMailTeamInvite(accessToken, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setMessage("Davet e-postası gönderildi.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Davet gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConsoleShell operator={operator}>
      <h1>Ekip ve roller</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        {companyName
          ? `${companyName} — yönetim konsolu erişimleri`
          : "Konsol kullanıcıları ve davetler"}
      </p>
      {message ? (
        <p style={{ color: "#16a34a", marginBottom: 12 }}>{message}</p>
      ) : null}
      {error ? (
        <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>
      ) : null}

      {canInvite ? (
        <form
          onSubmit={onInvite}
          style={{
            display: "grid",
            gap: 12,
            maxWidth: 480,
            marginBottom: 32,
            padding: 16,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          <strong>Yeni davet</strong>
          <label>
            E-posta
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            Rol
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}
            >
              {invitableRoles.map((code) => (
                <option key={code} value={code}>
                  {ROLE_LABELS[code] ?? code}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn" disabled={loading}>
            Davet gönder
          </button>
        </form>
      ) : null}

      <section style={{ marginBottom: 32 }}>
        <h2>Üyeler</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: 8 }}>E-posta</th>
              <th style={{ padding: 8 }}>Rol</th>
              <th style={{ padding: 8 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {members.map((row) => (
              <tr key={row.membershipId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 8 }}>
                  {row.displayName}
                  <br />
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {row.emailAddress}
                  </span>
                </td>
                <td style={{ padding: 8 }}>
                  {canManageRoles && row.roleCode !== "COMPANY_OWNER" ? (
                    <select
                      value={row.roleCode}
                      onChange={(e) => {
                        void (async () => {
                          if (!accessToken) {
                            return;
                          }
                          try {
                            await updateMailTeamMemberRole(
                              accessToken,
                              row.membershipId,
                              e.target.value,
                            );
                            await reload();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Rol güncellenemedi",
                            );
                          }
                        })();
                      }}
                    >
                      {invitableRoles.map((code) => (
                        <option key={code} value={code}>
                          {ROLE_LABELS[code] ?? code}
                        </option>
                      ))}
                    </select>
                  ) : (
                    ROLE_LABELS[row.roleCode] ?? row.roleCode
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  {canManageRoles && row.roleCode !== "COMPANY_OWNER" ? (
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        void (async () => {
                          if (!accessToken) {
                            return;
                          }
                          if (
                            !window.confirm(
                              `${row.emailAddress} ekibden çıkarılsın mı?`,
                            )
                          ) {
                            return;
                          }
                          try {
                            await removeMailTeamMember(
                              accessToken,
                              row.membershipId,
                            );
                            await reload();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Üye çıkarılamadı",
                            );
                          }
                        })();
                      }}
                    >
                      Çıkar
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Bekleyen davetler</h2>
        {invites.length === 0 ? (
          <p style={{ color: "#64748b" }}>Bekleyen davet yok.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {invites.map((row) => (
              <li
                key={row.inviteId}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <span>
                  {row.email} — {ROLE_LABELS[row.roleCode] ?? row.roleCode}
                </span>
                {canInvite ? (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      void (async () => {
                        if (!accessToken) {
                          return;
                        }
                        try {
                          await revokeMailTeamInvite(accessToken, row.inviteId);
                          await reload();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Davet iptal edilemedi",
                          );
                        }
                      })();
                    }}
                  >
                    İptal
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsoleShell>
  );
}
