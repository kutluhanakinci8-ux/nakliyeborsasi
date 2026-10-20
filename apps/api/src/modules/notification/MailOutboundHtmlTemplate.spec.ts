import {
  buildBrandedPlainText,
  isLertaBrandedOutboundHtml,
  resolveOutboundHtml,
} from "./MailOutboundHtmlTemplate";

describe("MailOutboundHtmlTemplate", () => {
  it("wraps plain text in branded HTML with v2 marker", () => {
    const html = resolveOutboundHtml("Merhaba dünya", undefined, {
      fromHeader: '"Test" <a@lerta.com.tr>',
      branding: {
        brandTitle: "U88 Sport",
        logoUrl: null,
        accentColor: "#1a1647",
        hidePlatformFooter: false,
      },
    });
    expect(isLertaBrandedOutboundHtml(html)).toBe(true);
    expect(html).toContain("<!-- lerta-posta-outbound-v2 -->");
    expect(html).not.toContain("data-lerta-posta-outbound");
    expect(html).toContain("Merhaba dünya");
    expect(html).toContain("U88 Sport");
    expect(html).toContain('bgcolor="#1a1647"');
  });

  it("builds branded plain text for multipart clients", () => {
    const plain = buildBrandedPlainText(
      '"kutluhan" <u@lerta.com.tr>',
      "deneme 3",
    );
    expect(plain).toContain("LERTA POSTA");
    expect(plain).toContain("kutluhan · u@lerta.com.tr");
    expect(plain).toContain("deneme 3");
    expect(plain).toContain("posta.lerta.com.tr");
  });

  it("renders social links in HTML and plain footer", () => {
    const branding = {
      brandTitle: "Lerta Mail SaaS",
      logoUrl: null,
      accentColor: "#1a1647",
      hidePlatformFooter: false,
      socialLinks: [
        {
          platform: "instagram" as const,
          url: "https://instagram.com/lerta",
        },
        {
          platform: "linkedin" as const,
          url: "https://www.linkedin.com/company/lerta",
        },
      ],
    };
    const html = resolveOutboundHtml("merhaba", undefined, { branding });
    expect(html).toContain("https://instagram.com/lerta");
    expect(html).toContain('title="Instagram"');
    const plain = buildBrandedPlainText(undefined, "merhaba", branding);
    expect(plain).toContain("Instagram: https://instagram.com/lerta");
  });
});
