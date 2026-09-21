export class WebAccessTokenStorage {
  private static readonly storageKey = "nakliyeborsasi_access_token";

  public static save(accessToken: string): void {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(WebAccessTokenStorage.storageKey, accessToken);
  }

  public static read(): string {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(WebAccessTokenStorage.storageKey) ?? "";
  }

  public static clear(): void {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(WebAccessTokenStorage.storageKey);
  }
}
