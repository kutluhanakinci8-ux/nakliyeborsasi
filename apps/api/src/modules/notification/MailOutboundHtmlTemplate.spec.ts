import {
  buildBrandedPlainText,
  isLertaBrandedOutboundHtml,
  resolveOutboundHtml,
} from "./MailOutboundHtmlTemplate";

describe("MailOutboundHtmlTemplate", () => {
  it("wraps plain text in branded HTML with v2 marker", () => {
    const html = resolveOutboundHtml("Merhaba dünya", undefined, {
      fromHeader: '"Test" <a@lerta.com.tr>',
    });
    expect(isLertaBrandedOutboundHtml(html)).toBe(true);
    expect(html).toContain("<!-- lerta-posta-outbound-v2 -->");
    expect(html).not.toContain("data-lerta-posta-outbound");
    expect(html).toContain("Merhaba dünya");
    expect(html).toContain("Lerta Posta");
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
});
