import {
  applyEkolojikMarketWebmailBranding,
  isEkolojikMarketMailboxAddress,
} from "./MailEkolojikWebmailBranding";
import type { MailOrganizationBrandingSnapshot } from "./MailOrganizationBrandingService";

const base: MailOrganizationBrandingSnapshot = {
  allowed: false,
  planCode: null,
  logoUrl: null,
  emailBrandTitle: null,
  defaultFromDisplayName: null,
  hidePlatformEmailChrome: false,
  detailTr: "test",
};

describe("MailEkolojikWebmailBranding", () => {
  it("detects ekolojik market addresses", () => {
    expect(
      isEkolojikMarketMailboxAddress("posta@ekolojikmarket.com.tr"),
    ).toBe(true);
    expect(isEkolojikMarketMailboxAddress("lerta@lerta.com.tr")).toBe(false);
  });

  it("applies tenant title and hides platform chrome", () => {
    const next = applyEkolojikMarketWebmailBranding(
      base,
      "info@ekolojikmarket.com.tr",
    );
    expect(next.emailBrandTitle).toBe("Ekolojik Posta");
    expect(next.hidePlatformEmailChrome).toBe(true);
    expect(next.allowed).toBe(true);
  });
});
