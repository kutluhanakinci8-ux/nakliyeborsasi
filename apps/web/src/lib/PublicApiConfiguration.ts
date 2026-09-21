export class PublicApiConfiguration {
  public static resolveBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";
  }
}
