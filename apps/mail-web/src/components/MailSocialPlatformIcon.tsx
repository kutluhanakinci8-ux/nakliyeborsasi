import { useId, type ReactNode } from "react";
import type { MailEmailSocialPlatform } from "@/lib/mailApi";

type Props = {
  platform: MailEmailSocialPlatform;
  className?: string;
};

function IconSvg({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function MailSocialPlatformIcon({ platform, className }: Props) {
  const igGradId = useId();
  const wrap = `mail-social-icon mail-social-icon--${platform}${className ? ` ${className}` : ""}`;

  switch (platform) {
    case "instagram":
      return (
        <span className={wrap}>
          <IconSvg title="Instagram">
            <defs>
              <linearGradient id={igGradId} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f58529" />
                <stop offset="50%" stopColor="#dd2a7b" />
                <stop offset="100%" stopColor="#8134af" />
              </linearGradient>
            </defs>
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="5"
              fill={`url(#${igGradId})`}
            />
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.6" />
            <circle cx="17.4" cy="6.6" r="1.1" fill="#fff" />
          </IconSvg>
        </span>
      );
    case "facebook":
      return (
        <span className={wrap}>
          <IconSvg title="Facebook">
            <path
              fill="#1877F2"
              d="M24 12.07C24 5.48 18.63 0 12 0S0 5.48 0 12.07c0 6.02 4.39 11.01 10.12 11.9v-8.4H7.08v-3.5h3.04V9.41c0-3 1.79-4.66 4.52-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87v2.25h3.32l-.53 3.5h-2.79v8.4C19.61 23.08 24 18.09 24 12.07z"
            />
          </IconSvg>
        </span>
      );
    case "linkedin":
      return (
        <span className={wrap}>
          <IconSvg title="LinkedIn">
            <path
              fill="#0A66C2"
              d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"
            />
          </IconSvg>
        </span>
      );
    case "x":
      return (
        <span className={wrap}>
          <IconSvg title="X">
            <path
              fill="currentColor"
              className="mail-social-icon-x-path"
              d="M18.9 2.25h3.36l-7.33 8.38L23.2 21.75h-6.76l-5.3-6.93-6.06 6.93H1.7l7.84-8.96L.8 2.25h6.93l4.79 6.33 5.38-6.33zm-1.18 17.52h1.86L7.04 4.04H5.04l12.68 15.73z"
            />
          </IconSvg>
        </span>
      );
    case "youtube":
      return (
        <span className={wrap}>
          <IconSvg title="YouTube">
            <path
              fill="#FF0000"
              d="M23.5 6.2s-.23-1.66-.95-2.39c-.9-.95-1.92-.96-2.38-1.01C17.12 2.5 12 2.5 12 2.5h-.01s-5.12 0-8.17.3c-.46.05-1.48.06-2.38 1.01-.72.73-.95 2.39-.95 2.39S0 8.26 0 10.33v1.94c0 2.07.3 4.13.3 4.13s.23 1.66.95 2.39c.9.95 2.08.92 2.61 1.02 1.89.18 8.04.3 8.04.3s5.13-.01 8.18-.31c.46-.05 1.48-.06 2.38-1.01.72-.73.95-2.39.95-2.39s.3-2.06.3-4.13v-1.94c0-2.07-.3-4.13-.3-4.13zM9.55 14.57V7.43L15.82 11l-6.27 3.57z"
            />
          </IconSvg>
        </span>
      );
    case "tiktok":
      return (
        <span className={wrap}>
          <IconSvg title="TikTok">
            <path
              fill="#000"
              className="mail-social-icon-tiktok-path"
              d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.01a8.16 8.16 0 004.77 1.52V7.08a4.85 4.85 0 01-1-.39z"
            />
            <path
              fill="#25F4EE"
              d="M17.59 5.3v2.43a8.16 8.16 0 004.77 1.52V7.08a4.85 4.85 0 01-1-.39V5.3z"
              opacity="0.85"
            />
            <path
              fill="#FE2C55"
              d="M19.59 6.69a4.83 4.83 0 01-1-3.39V2h-1.55v11.97a2.89 2.89 0 01-5.77 0 2.89 2.89 0 012.89-2.89V9.01a6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34V9.01a8.16 8.16 0 004.77 1.52V7.08a4.85 4.85 0 01-1-.39z"
              opacity="0.75"
            />
          </IconSvg>
        </span>
      );
    case "website":
      return (
        <span className={wrap}>
          <IconSvg title="Web sitesi">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="mail-social-icon-web-stroke"
              d="M12 21a9 9 0 100-18 9 9 0 000 18z"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="mail-social-icon-web-stroke"
              d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.5 3.4 5.8 3.4 9s-1.2 6.5-3.4 9c-2.2-2.5-3.4-5.8-3.4-9s1.2-6.5 3.4-9z"
            />
          </IconSvg>
        </span>
      );
    default:
      return null;
  }
}
