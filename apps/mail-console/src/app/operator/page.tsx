"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchOperatorDomains,
  isPlatformOperator,
  operatorVerifyDomainDns,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

type DomainRow = {
  id: string;
  domain: string;
  domainType: string;
  verificationStatus: string;
  organizationId: string | null;
};

export default function OperatorPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");

  async function reload() {
    if (!accessToken) {
      return;
    }
    const data = await fetchOperatorDomains(accessToken);
    setDomains(data.domains as DomainRow[]);
  }

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      const ok = await isPlatformOperator(accessToken);
      if (!ok) {
        setDenied(true);
        return;
      }
      await reload();
    })();
  }, [accessToken, router]);

  async function verifyRow(domainId: string) {
    if (!accessToken) {
      return;
    }
    setBusyId(domainId);
    setFlash("");
    try {
      const result = await operatorVerifyDomainDns(accessToken, domainId);
      const check = result.dnsCheck;
      setFlash(
        check?.ok
          ? "DNS doğrulandı."
          : `DNS eksik — MX:${check?.mx?.ok ? "✓" : "✗"} SPF:${check?.spf.ok ? "✓" : "✗"} DKIM:${check?.dkim.ok ? "✓" : "✗"}`,
      );
      await reload();
    } catch {
      setFlash("Doğrulama başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  if (!accessToken) {
    return null;
  }

  if (denied) {
    return (
      <ConsoleShell operator={false}>
        <p>Bu sayfa yalnızca platform operatörleri için.</p>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell operator={true}>
      <h1 style={{ marginTop: 0 }}>Operatör — mail domainleri</h1>
      {flash ? (
        <p style={{ color: "var(--success)", fontWeight: 600 }}>{flash}</p>
      ) : null}
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <th>Domain</th>
              <th>Tip</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {domains.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 0" }}>{row.domain}</td>
                <td>{row.domainType}</td>
                <td>
                  <span
                    className={`badge ${
                      row.verificationStatus === "verified" ? "ok" : "pending"
                    }`}
                  >
                    {row.verificationStatus}
                  </span>
                </td>
                <td>
                  {row.domainType === "custom" ? (
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busyId === row.id}
                      onClick={() => void verifyRow(row.id)}
                    >
                      DNS doğrula
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  );
}
