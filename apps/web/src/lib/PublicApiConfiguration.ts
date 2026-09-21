export class PublicApiConfiguration {
  public static resolveBaseUrl(): string {
    if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_BASE_URL) {
      const origin = window.location.origin.replace(/:3011$/, ":3010");
      return `${origin}/api/v1`;
    }
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3010/api/v1"
    );
  }
}
