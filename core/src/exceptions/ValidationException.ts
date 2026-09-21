import { PlatformException } from "./PlatformException";

export class ValidationException extends PlatformException {
  public constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
  }
}
