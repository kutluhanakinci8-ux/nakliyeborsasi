import { applyOutboundMergeFields } from "./MailOutboundMergeFields";

describe("MailOutboundMergeFields", () => {
  it("replaces tokens in plain text", () => {
    const result = applyOutboundMergeFields(
      "Sayın {{musteri_adi}}, ref: {{referans}}",
      undefined,
      {
        firmaAdi: "U88",
        musteriAdi: "Ali",
        referans: "REF-1",
      },
    );
    expect(result.text).toBe("Sayın Ali, ref: REF-1");
  });

  it("escapes html merge values in html body", () => {
    const result = applyOutboundMergeFields(
      "x",
      "<p>{{musteri_adi}}</p>",
      {
        firmaAdi: "U88",
        musteriAdi: "<script>",
      },
    );
    expect(result.html).toBe("<p>&lt;script&gt;</p>");
  });
});
