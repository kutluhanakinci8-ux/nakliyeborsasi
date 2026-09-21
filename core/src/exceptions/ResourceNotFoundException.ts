import { PlatformException } from "./PlatformException";

export class ResourceNotFoundException extends PlatformException {
  public constructor(resourceName: string, identifier: string) {
    super(
      "RESOURCE_NOT_FOUND",
      `${resourceName} not found: ${identifier}`,
      404,
    );
  }
}
