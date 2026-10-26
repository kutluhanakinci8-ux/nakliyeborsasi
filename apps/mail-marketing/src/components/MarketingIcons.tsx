type IconName =
  | "domain"
  | "inbox"
  | "sync"
  | "devices"
  | "shield"
  | "console"
  | "mail"
  | "check";

const paths: Record<IconName, JSX.Element> = {
  domain: (
    <>
      <path d="M4 10h16v10H4z" opacity="0.35" />
      <path d="M8 6h8l4 4v14H4V10l4-4z" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 6v4h4" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </>
  ),
  inbox: (
    <>
      <path
        d="M4 8h16l-2 10H6L4 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M4 8l8 5 8-5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </>
  ),
  sync: (
    <>
      <path
        d="M17 4v4h-4M7 20v-4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M7 8a5 5 0 0 1 8.5-3.5L17 8M17 16a5 5 0 0 1-8.5 3.5L7 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </>
  ),
  devices: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  shield: (
    <path
      d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  ),
  console: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M7 9h10M7 13h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  mail: (
    <path
      d="M4 7h16v10H4V7zm0 0l8 6 8-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  ),
  check: (
    <path
      d="M6 12l4 4 8-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

export function MarketingIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
