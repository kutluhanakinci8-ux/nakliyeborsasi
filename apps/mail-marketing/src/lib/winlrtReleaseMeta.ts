/**
 * WinLRT vitrin sürümü — W5 tek kaynak (MSI/DMG dosya adları ile hizalı).
 * Yeni sürümde: bu dosya + public/downloads/winlrt artefakt adları + CI.
 */
export const WINLRT_RELEASE = {
  version: "0.1.0",
  phase: "W5",
  windows: {
    msi: "WinLRT_0.1.0_x64_en-US.msi",
    setupExe: "WinLRT_0.1.0_x64-setup.exe",
  },
  macos: {
    dmg: "WinLRT_0.1.0_aarch64.dmg",
  },
} as const;

export function winlrtDownloadHref(kind: keyof typeof WINLRT_RELEASE.windows | "macosDmg"): string {
  if (kind === "macosDmg") {
    return `/downloads/winlrt/${WINLRT_RELEASE.macos.dmg}`;
  }
  const file =
    kind === "msi" ? WINLRT_RELEASE.windows.msi : WINLRT_RELEASE.windows.setupExe;
  return `/downloads/winlrt/${file}`;
}
