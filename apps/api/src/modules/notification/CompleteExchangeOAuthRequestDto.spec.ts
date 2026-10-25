import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CompleteExchangeOAuthRequestDto } from "./MailMailboxDelegationRequestDto";

describe("CompleteExchangeOAuthRequestDto", () => {
  it("rejects missing code and state (global ValidationPipe whitelist)", async () => {
    const dto = plainToInstance(CompleteExchangeOAuthRequestDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts non-empty code and state", async () => {
    const dto = plainToInstance(CompleteExchangeOAuthRequestDto, {
      code: "oauth-code",
      state: "oauth-state",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
