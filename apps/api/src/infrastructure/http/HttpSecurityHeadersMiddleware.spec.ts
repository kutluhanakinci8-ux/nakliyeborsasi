import { describe, expect, it, vi } from "vitest";
import { HttpSecurityHeadersMiddleware } from "./HttpSecurityHeadersMiddleware";

describe("HttpSecurityHeadersMiddleware", () => {
  it("sets security headers on the response", () => {
    const middleware = new HttpSecurityHeadersMiddleware();
    const headers: Record<string, string> = {};
    const response = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    };
    const next = vi.fn();
    middleware.use({} as never, response as never, next);
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(next).toHaveBeenCalledOnce();
  });
});
