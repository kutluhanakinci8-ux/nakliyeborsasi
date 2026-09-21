import { PlatformException } from "./PlatformException";

export class SubscriptionEntitlementException extends PlatformException {
  public constructor(message: string) {
    super("SUBSCRIPTION_ENTITLEMENT_DENIED", message, 403);
  }
}
