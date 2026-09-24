import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  section: string;
  title: string;
  lead: string;
  meta?: ReactNode;
};

export function AdminPageHeader({
  section,
  title,
  lead,
  meta,
}: AdminPageHeaderProps) {
  return (
    <header className="platform-admin-command-hero pa-page-hero">
      <div>
        <p className="platform-admin-command-eyebrow">{section}</p>
        <h1 className="platform-admin-command-title">{title}</h1>
        <p className="platform-admin-command-sub">{lead}</p>
      </div>
      {meta ? (
        <div className="platform-admin-command-hero-meta">{meta}</div>
      ) : null}
    </header>
  );
}
