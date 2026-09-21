export class PublicApiConfiguration {
  public static resolveBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (typeof window !== "undefined") {
      const isLocalConfigured =
        !configured ||
        configured.includes("127.0.0.1") ||
        configured.includes("localhost");
      if (isLocalConfigured) {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:3010/api/v1`;
      }
      return configured;
    }
    return configured ?? "http://localhost:3010/api/v1";
  }
}
