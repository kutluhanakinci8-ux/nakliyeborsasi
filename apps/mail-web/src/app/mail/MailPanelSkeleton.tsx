"use client";

type Props = {
  label?: string;
};

export function MailPanelSkeleton({ label }: Props) {
  return (
    <div className="mail-panel-skeleton" role="status" aria-live="polite">
      <span className="mail-panel-skeleton-bar" />
      <span className="mail-panel-skeleton-bar mail-panel-skeleton-bar--short" />
      {label ? <span className="mail-panel-skeleton-label">{label}</span> : null}
    </div>
  );
}
