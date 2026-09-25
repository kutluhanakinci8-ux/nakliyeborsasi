import { createHmac, randomBytes } from "node:crypto";

export type IyzicoCheckoutInitializeResponse = {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
  checkoutFormContent?: string;
};

export type IyzicoCheckoutRetrieveResponse = {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  paymentStatus?: string;
  basketId?: string;
  conversationId?: string;
};

export class MailIyzicoApiClient {
  public constructor(
    private readonly apiKey: string,
    private readonly secretKey: string,
    private readonly baseUrl: string,
  ) {}

  public async initializeCheckoutForm(
    body: Record<string, unknown>,
  ): Promise<IyzicoCheckoutInitializeResponse> {
    return this.post(
      "/payment/iyzipos/checkoutform/initialize/auth/ecom",
      body,
    );
  }

  public async retrieveCheckoutForm(
    body: Record<string, unknown>,
  ): Promise<IyzicoCheckoutRetrieveResponse> {
    return this.post("/payment/iyzipos/checkoutform/auth/ecom/detail", body);
  }

  private async post<T extends Record<string, unknown>>(
    uri: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const requestString = JSON.stringify(body);
    const randomKey = `${Date.now()}${randomBytes(8).toString("hex")}`;
    const signature = createHmac("sha256", this.secretKey)
      .update(randomKey + uri + requestString)
      .digest("hex");
    const authParams = `apiKey:${this.apiKey}&randomKey:${randomKey}&signature:${signature}`;
    const authorization = `IYZWSv2 ${Buffer.from(authParams, "utf8").toString("base64")}`;

    const response = await fetch(`${this.baseUrl}${uri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
        "x-iyzi-rnd": randomKey,
        "x-iyzi-client-version": "lerta-mail-1.0",
      },
      body: requestString,
    });

    const payload = (await response.json()) as T;
    return payload;
  }
}
