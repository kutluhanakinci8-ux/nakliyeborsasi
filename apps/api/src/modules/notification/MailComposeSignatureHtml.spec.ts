import {
  buildOutboundSignatureHtml,
  signatureAlreadyInPlainBody,
} from "./MailComposeSignatureHtml";

describe("MailComposeSignatureHtml", () => {
  it("detects duplicate plain signature", () => {
    expect(signatureAlreadyInPlainBody("Merhaba\n\nSaygılarım", "Saygılarım")).toBe(
      true,
    );
    expect(signatureAlreadyInPlainBody("Merhaba", "Saygılarım")).toBe(false);
  });

  it("renders custom html signature block", () => {
    const html = buildOutboundSignatureHtml({
      bodyText: "x",
      bodyHtml: "<strong>Ad Soyad</strong>",
    });
    expect(html).toContain("lerta-signature-block");
    expect(html).toContain("<strong>Ad Soyad</strong>");
  });
});
