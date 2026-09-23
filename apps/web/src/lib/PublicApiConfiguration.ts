export class PublicApiConfiguration {
  public static resolveBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (typeof window !== "undefined") {
      const { protocol, hostname, port } = window.location;
      if (protocol === "https:" && (port === "" || port === "443")) {
        return `${protocol}//${hostname}/api/v1`;
      }
      const isDynamicApi =
        !configured ||
        configured.includes("127.0.0.1") ||
        configured.includes("localhost") ||
        (Boolean(configured?.includes(hostname)) &&
          configured.includes(":3010"));
      if (isDynamicApi) {
        return `${protocol}//${hostname}:3010/api/v1`;
      }
      return configured;
    }
    return configured ?? "http://localhost:3010/api/v1";
  }
}
