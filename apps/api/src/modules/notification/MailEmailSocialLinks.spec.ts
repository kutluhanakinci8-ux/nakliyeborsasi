import { normalizeMailEmailSocialLinks } from "./MailEmailSocialLinks";

describe("MailEmailSocialLinks", () => {
  it("accepts instagram host without scheme", () => {
    const links = normalizeMailEmailSocialLinks([
      { platform: "instagram", url: "instagram.com/lerta" },
    ]);
    expect(links).toEqual([
      { platform: "instagram", url: "https://instagram.com/lerta" },
    ]);
  });

  it("accepts plain instagram handle", () => {
    const links = normalizeMailEmailSocialLinks([
      { platform: "instagram", url: "lerta" },
    ]);
    expect(links[0]?.url).toBe("https://instagram.com/lerta");
  });
});
