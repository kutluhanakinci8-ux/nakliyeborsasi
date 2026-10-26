import { describe, expect, it } from "vitest";
import {
  isBrotliBase64Envelope,
  parseClientLertaEncoding,
} from "./mailJsonCompressionHttp.util";

describe("mailJsonCompressionHttp", () => {
  it("parses br encoding header", () => {
    expect(
      parseClientLertaEncoding({ headers: { "x-lerta-encoding": "br" } }),
    ).toBe("br");
  });

  it("detects brotli envelope", () => {
    expect(
      isBrotliBase64Envelope({ encoding: "brotli-base64", data: "abc" }),
    ).toBe(true);
  });
});
