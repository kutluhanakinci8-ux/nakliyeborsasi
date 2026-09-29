"use client";

type IconProps = {
  className?: string;
  size?: number;
};

const defaultSize = 18;

function strokeProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function IconPaperclip({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M14.5 6.5l-5.5 5.5a3 3 0 104.24 4.24l6-6a5 5 0 00-7.07-7.07l-7 7a7 7 0 009.9 9.9l8-8" />
    </svg>
  );
}

export function IconSend({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function IconReply({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M9 17l-5-5 5-5" />
      <path d="M20 18v-2a4 4 0 00-4-4H4" />
    </svg>
  );
}

export function IconCheck({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconX({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconEye({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconLanguages({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M5 8h8M9 4v4M12 20a9 9 0 100-18 9 9 0 000 18z" />
      <path d="M16 8l2 12M18 14h4" />
    </svg>
  );
}

export function IconPencil({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function IconTrash({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconSearch({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function IconUsers({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconTemplate({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

export function IconChannels({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMessageSquare({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function IconLockNote({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

export function IconSparkles({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M12 3l1.2 4.2L17.5 8l-4.3 1.2L12 13.5 10.8 9.2 6.5 8l4.3-1.2L12 3z" />
      <path d="M5 19l.6 2.1L7.7 22l-2.1-.6L5 19zM19 5l.6 2.1L21.7 8l-2.1-.6L19 5z" />
    </svg>
  );
}

export function IconStickyNote({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M15 3H6a2 2 0 00-2 2v14l4-4h9a2 2 0 002-2V5a2 2 0 00-2-2z" />
    </svg>
  );
}

export function IconMail({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M4 6h16v12H4z" />
      <path d="M4 8l8 6 8-6" />
    </svg>
  );
}

export function IconBell({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M18 14v-2a6 6 0 10-12 0v2l-2 3h16l-2-3z" />
      <path d="M10 18a2 2 0 004 0" />
    </svg>
  );
}

export function IconDownload({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </svg>
  );
}

export function IconShieldLock({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M10 11v2a2 2 0 104 0v-2" />
    </svg>
  );
}

export function IconPalette({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M12 3a9 9 0 109 9c0-1.5-.4-2.9-1-4.1" />
      <circle cx="8" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="16" cy="11" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="11" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMaximize({ className, size = defaultSize }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M8 4H4v4M20 4h-4v4M4 16v4h4M16 20h4v-4" />
    </svg>
  );
}

export function IconChevronDown({ className, size = 16 }: IconProps) {
  return (
    <svg className={className} aria-hidden {...strokeProps(size)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
