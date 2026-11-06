export class DTPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly requestId: number
  ) {
    super(message);

    this.name = "DTPError";
  }
}
