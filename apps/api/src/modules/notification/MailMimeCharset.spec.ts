import {
  decodeMimeEncodedWords,
  repairUtf8Mojibake,
} from "./MailMimeCharset";

describe("repairUtf8Mojibake", () => {
  it("repairs UTF-8 Turkish text misread as Latin-1", () => {
    const broken = Buffer.from("müşteri mesajı", "utf8").toString("latin1");
    expect(repairUtf8Mojibake(broken)).toBe("müşteri mesajı");
  });

  it("leaves valid UTF-8 unchanged", () => {
    const ok = "müşteri mesajı";
    expect(repairUtf8Mojibake(ok)).toBe(ok);
  });

  it("returns null for null input", () => {
    expect(repairUtf8Mojibake(null)).toBeNull();
  });
});

describe("decodeMimeEncodedWords", () => {
  it("repairs mojibake on plain subjects", () => {
    const broken = Buffer.from("müşteri", "utf8").toString("latin1");
    expect(decodeMimeEncodedWords(broken)).toBe("müşteri");
  });
});
