import { type ReactNode } from "react";

export type ModuleStatItem = {
  value: string;
  label: string;
  highlight?: boolean;
};

type ModulePageShellProps = {
  eyebrow: string;
  title: string;
  lead: string;
  action?: ReactNode;
  stats?: ModuleStatItem[];
  children: ReactNode;
};

export function ModulePageShell({
  eyebrow,
  title,
  lead,
  action,
  stats,
  children,
}: ModulePageShellProps) {
  return (
    <div className="module-page">
      <header className="exchange-hero">
        <div>
          <p className="exchange-eyebrow">{eyebrow}</p>
          <h1 className="exchange-title">{title}</h1>
          <p className="exchange-lead">{lead}</p>
        </div>
        {action ? <div className="exchange-hero-action">{action}</div> : null}
      </header>
      {stats && stats.length > 0 ? (
        <div className="stats-strip">
          {stats.map((item) => (
            <div
              key={item.label}
              className={
                item.highlight ? "stat-item stat-item--highlight" : "stat-item"
              }
            >
              <span className="stat-item-value">{item.value}</span>
              <span className="stat-item-label">{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}
