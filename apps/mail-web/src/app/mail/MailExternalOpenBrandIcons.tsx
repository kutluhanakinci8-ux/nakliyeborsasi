type IconProps = { size?: number };

export function IconEdge({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="14" fill="#0078D4" />
      <path
        fill="#50E6FF"
        d="M8 10.5c2.5-3.5 7-4.5 10.5-2.2 1.2.8 2 2 2.4 3.4-2.8-.6-5.6.4-7.4 2.8-.8 1.1-1.2 2.4-1.1 3.7 1.4-2.2 3.8-3.6 6.5-3.9-1.5 2.6-4.2 4.2-7.2 4.2-.5 0-1-.1-1.5-.2.3 1.5 1.2 2.9 2.5 3.8z"
      />
      <path fill="#fff" d="M10 18.5c3.5 0 6.5-2.2 7.6-5.3-2.2 1.5-4.9 1.8-7.3.5-1.2-.6-2.1-1.6-2.7-2.8 1.8 3.8 5.8 6 9.8 5.1-1.2.9-2.7 1.5-4.2 1.5z" />
    </svg>
  );
}

export function IconFirefox({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="14" fill="#FF7139" />
      <circle cx="14" cy="14" r="8" fill="#FFBD4F" />
      <path fill="#2AC3A2" d="M14 6c4.5 0 8 3.5 8 8 0 1.2-.3 2.3-.7 3.3C19 10.5 16 8 12.5 8.5c-1.8.3-3.3 1.3-4.3 2.7C9.5 8.8 11.6 6 14 6z" />
    </svg>
  );
}

export function IconSafari({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="14" fill="#0A84FF" />
      <circle cx="14" cy="14" r="9" fill="#fff" />
      <polygon points="14,7 16,14 14,21 12,14" fill="#FF3B30" />
      <polygon points="14,7 21,14 14,21 7,14" fill="#34C759" opacity="0.85" />
    </svg>
  );
}

export function IconChrome({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="14" fill="#fff" />
      <path fill="#EA4335" d="M14 4.5 22.5 19H16.8L14 14.2z" />
      <path fill="#FBBC04" d="M14 4.5 5.5 19h5.7L14 14.2z" />
      <path fill="#34A853" d="M5.5 19h11l3.5 6H9z" />
      <circle cx="14" cy="14" r="5" fill="#4285F4" stroke="#fff" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2.5" fill="#fff" />
    </svg>
  );
}

export function IconOpera({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="14" fill="#FF1B2D" />
      <ellipse cx="14" cy="14" rx="5" ry="8" fill="#fff" />
    </svg>
  );
}

export function IconGlobeSystem({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="13" fill="none" stroke="#8E8E93" strokeWidth="1.5" />
      <ellipse cx="14" cy="14" rx="5" ry="13" fill="none" stroke="#8E8E93" strokeWidth="1.2" />
      <path d="M1.5 14h25M2.5 9h23M2.5 19h23" stroke="#8E8E93" strokeWidth="1.2" />
    </svg>
  );
}

export function IconAppleMaps({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="6" fill="#34C759" />
      <path
        fill="#fff"
        d="M14 6c-3 0-5.5 2.2-5.5 5 0 3.8 5.5 11 5.5 11s5.5-7.2 5.5-11c0-2.8-2.5-5-5.5-5zm0 2.2a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6z"
      />
    </svg>
  );
}

export function IconGoogleMaps({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <path fill="#34A853" d="M14 2C9 2 5 6 5 11c0 7 9 15 9 15s9-8 9-15c0-5-4-9-9-9z" />
      <circle cx="14" cy="11" r="3.5" fill="#4285F4" stroke="#fff" strokeWidth="1.2" />
      <path fill="#FBBC04" d="M20 20l4 4" stroke="#EA4335" strokeWidth="2" />
    </svg>
  );
}

export function IconWaze({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="6" fill="#33CCFF" />
      <circle cx="10" cy="12" r="2" fill="#fff" />
      <circle cx="18" cy="12" r="2" fill="#fff" />
      <path d="M9 17c2 2 8 2 10 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function IconYandexMaps({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="6" fill="#FC3F1D" />
      <path
        fill="#fff"
        d="M14 5c-3.5 0-6 2.5-6 6 0 4.5 6 12 6 12s6-7.5 6-12c0-3.5-2.5-6-6-6zm0 3a3 3 0 110 6 3 3 0 010-6z"
      />
    </svg>
  );
}

export function IconCitymapper({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="6" fill="#37AB2F" />
      <path fill="#fff" d="M8 18h3l2-8h5l2 8h3L16 8h-4L8 18z" />
    </svg>
  );
}

export function IconMapsSystem({ size = 28 }: IconProps) {
  return <IconGlobeSystem size={size} />;
}
