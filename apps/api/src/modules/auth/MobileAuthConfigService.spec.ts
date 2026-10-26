import { describe, it, expect } from "vitest";
import { MobileAuthConfigService } from "./MobileAuthConfigService";
import { MobileAuthBridgeService } from "./MobileAuthBridgeService";
import type { ConfigService } from "@nestjs/config";

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe("MobileAuthConfigService", () => {
  it("oauth disabled when issuer missing", () => {
    const bridge = new MobileAuthBridgeService(
      mockConfig({}),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const service = new MobileAuthConfigService(mockConfig({}), bridge);
    const out = service.getConfig();
    expect(out.oauth.enabled).toBe(false);
    expect(out.passwordLoginEnabled).toBe(true);
  });

  it("oauth enabled via Lerta bridge", () => {
    const bridge = new MobileAuthBridgeService(
      mockConfig({
        MOBILE_OAUTH_LERTA_BRIDGE: "1",
        API_PUBLIC_BASE_URL: "https://u88.lerta.com.tr/api/v1",
      }),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const service = new MobileAuthConfigService(mockConfig({}), bridge);
    const out = service.getConfig();
    expect(out.oauth.enabled).toBe(true);
    expect(out.oauth.tokenEndpoint).toContain("/auth/mobile/token");
  });
});
