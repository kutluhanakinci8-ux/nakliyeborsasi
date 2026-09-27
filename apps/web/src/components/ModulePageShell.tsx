import { type ReactNode } from "react";

export type ModuleStatItem = {
  value: string;
  label: string;
  highlight?: boolean;
};

type ModulePageShellProps = {
  eyebrow?: string;
  title?: string;
  lead?: string;
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
  const showHero =
    Boolean(eyebrow?.trim()) ||
    Boolean(title?.trim()) ||
    Boolean(lead?.trim()) ||
    action;

  return (
    <div className="module-page">
      {showHero ? (
        <header className="exchange-hero">
          <div>
            {eyebrow?.trim() ? (
              <p className="exchange-eyebrow">{eyebrow}</p>
            ) : null}
            {title?.trim() ? (
              <h1 className="exchange-title">{title}</h1>
            ) : null}
            {lead?.trim() ? <p className="exchange-lead">{lead}</p> : null}
          </div>
          {action ? <div className="exchange-hero-action">{action}</div> : null}
        </header>
      ) : null}
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
