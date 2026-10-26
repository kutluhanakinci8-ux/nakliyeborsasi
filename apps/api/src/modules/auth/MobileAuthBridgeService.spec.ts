import { describe, it, expect } from "vitest";
import { MobileAuthBridgeService } from "./MobileAuthBridgeService";
import type { ConfigService } from "@nestjs/config";

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe("MobileAuthBridgeService", () => {
  it("issuer when bridge enabled", () => {
    const service = new MobileAuthBridgeService(
      mockConfig({
        MOBILE_OAUTH_LERTA_BRIDGE: "1",
        API_PUBLIC_BASE_URL: "https://u88.lerta.com.tr/api/v1",
      }),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    expect(service.resolveIssuerBase()).toBe(
      "https://u88.lerta.com.tr/api/v1/auth/mobile",
    );
    const oidc = service.openIdConfiguration();
    expect(oidc?.token_endpoint).toContain("/auth/mobile/token");
  });

  it("parseExpiresInSeconds handles 12h", () => {
    const service = new MobileAuthBridgeService(
      mockConfig({}),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    expect(service["parseExpiresInSeconds"]("12h")).toBe(43_200);
  });
});
