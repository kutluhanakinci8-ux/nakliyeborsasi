export class PlatformException extends Error {
  public readonly errorCode: string;

  public readonly httpStatus: number;

  public constructor(
    errorCode: string,
    message: string,
    httpStatus: number,
  ) {
    super(message);
    this.name = new.target.name;
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
