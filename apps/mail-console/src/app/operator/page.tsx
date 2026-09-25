"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import { fetchOperatorDomains, isPlatformOperator } from "@/lib/consoleApi";
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
      const data = await fetchOperatorDomains(accessToken);
      setDomains(data.domains as DomainRow[]);
    })();
  }, [accessToken, router]);

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
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th>Domain</th>
              <th>Tip</th>
              <th>Durum</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  );
}
