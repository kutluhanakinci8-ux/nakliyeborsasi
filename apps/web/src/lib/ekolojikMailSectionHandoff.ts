import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";
import type { EkolojikHubSection } from "./ekolojikHubTypes";

export function ekolojikSectionToMailHandoff(
  section: EkolojikHubSection,
  options?: { composeTo?: string; openCompose?: boolean },
): MailWebEmbedHandoff | null {
  if (
    section === "mesajlar" ||
    section === "sosyal" ||
    section === "sosyal-dm" ||
    section === "entegrasyon" ||
    section === "grup-sohbet"
  ) {
    return null;
  }
  if (options?.openCompose) {
    return {
      mailView: "inbox",
      openCompose: true,
      composeTo: options.composeTo,
    };
  }
  switch (section) {
    case "fatura":
      return {
        mailView: "inbox",
        customFolder: "Fatura",
      };
    case "gonderilen":
      return { mailView: "sent" };
    case "arsiv":
      return { mailView: "archive" };
    case "posta":
    default:
      return { mailView: "inbox" };
  }
}
