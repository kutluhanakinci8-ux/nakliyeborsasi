"use client";

import { FormEvent, useEffect, useState } from "react";
import { useWebSession } from "../../../../context/WebSessionProvider";

type EmployeeRecord = {
  employeeId: string;
  name: string;
  email: string;
  roleLabel: string;
  status: "active" | "invited";
};

const STORAGE_PREFIX = "nb-company-employees:";

function defaultEmployees(): EmployeeRecord[] {
  return [
    {
      employeeId: "emp-demo",
      name: "Demo Dispatcher",
      email: "demo@nakliyeborsasi.local",
      roleLabel: "Dispatch / operasyon",
      status: "active",
    },
  ];
}

export function EmployeesPageClient() {
  const { session } = useWebSession();
  const companyId = session?.companyId ?? "";
  const [employees, setEmployees] = useState<EmployeeRecord[]>(defaultEmployees);
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!companyId || typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
    if (raw) {
      try {
        setEmployees(JSON.parse(raw) as EmployeeRecord[]);
      } catch {
        setEmployees(defaultEmployees());
      }
    }
  }, [companyId]);

  function persist(list: EmployeeRecord[]): void {
    setEmployees(list);
    if (companyId) {
      window.localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(list));
    }
  }

  function handleInvite(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      return;
    }
    const record: EmployeeRecord = {
      employeeId: `emp-${Date.now()}`,
      name: email.split("@")[0] ?? "Yeni kullanıcı",
      email,
      roleLabel: "Görüntüleme",
      status: "invited",
    };
    persist([record, ...employees]);
    setInviteEmail("");
    setMessage("Davet kaydedildi (demo).");
    window.setTimeout(() => setMessage(""), 4000);
  }

  return (
    <>
      <form
        className="account-card module-panel module-panel--elevated"
        onSubmit={handleInvite}
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Çalışan davet et</h2>
            <p className="account-card-lead">
              E-posta ile kullanıcı ekleyin; roller ve yetkiler sonraki sürümde
              detaylandırılacak.
            </p>
          </div>
          <button type="submit" className="btn-account-primary">Davet gönder</button>
        </header>
        <label className="label-light account-form-span-2">
          E-posta
          <input
            className="input-light"
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="kullanici@firma.com"
          />
        </label>
        {message ? <p className="account-save-hint">{message}</p> : null}
      </form>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Ekip listesi</h2>
            <p className="account-card-lead">Aktif üyeler ve bekleyen davetler.</p>
          </div>
        </header>
        <ul className="account-partner-list">
          {employees.map((employee) => (
            <li key={employee.employeeId} className="account-partner-item">
              <div className="account-partner-main">
                <div className="account-partner-title-row">
                  <h3 className="account-partner-name">{employee.name}</h3>
                  <span
                    className={
                      employee.status === "active"
                        ? "account-status-pill account-status-pill--ok"
                        : "account-status-pill account-status-pill--pending"
                    }
                  >
                    {employee.status === "active" ? "Aktif" : "Davet bekliyor"}
                  </span>
                </div>
                <p className="account-partner-meta">
                  <span>{employee.email}</span>
                  <span aria-hidden>·</span>
                  <span>{employee.roleLabel}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
