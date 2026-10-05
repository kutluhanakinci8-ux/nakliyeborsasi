import {
  extractTelegramRetryAfterSeconds,
  formatTelegramApiFailureMessage,
  isTelegramFloodError,
} from "./socialHubTelegramFlood";

describe("socialHubTelegramFlood", () => {
  it("detects flood by error_code", () => {
    expect(
      isTelegramFloodError({
        ok: false,
        error_code: 429,
        description: "Too Many Requests",
      }),
    ).toBe(true);
  });

  it("extracts retry_after from parameters", () => {
    expect(
      extractTelegramRetryAfterSeconds({
        description: "Too Many Requests",
        parameters: { retry_after: 12 },
      }),
    ).toBe(12);
  });

  it("formats Turkish flood message", () => {
    expect(
      formatTelegramApiFailureMessage(
        {
          ok: false,
          error_code: 429,
          description: "Too Many Requests: retry after 5",
          parameters: { retry_after: 5 },
        },
        "fallback",
      ),
    ).toContain("5 sn");
  });
});
