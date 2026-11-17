export const API_ERROR_STATUS_CODES = Object.freeze({
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  unprocessable_entity: 422,
  rate_limit_exceeded: 429,
  internal_server_error: 500,
  service_unavailable: 503,
} as const);

export type ErrorCode = keyof typeof API_ERROR_STATUS_CODES;

/** An intentional API failure with a stable code and corresponding HTTP status. */
export class PapermarkApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string) {
    const knownCode =
      typeof code === "string" && Object.hasOwn(API_ERROR_STATUS_CODES, code);
    super(knownCode ? message : "Internal Server Error");
    // The project targets ES5; explicitly preserve Error subclass identity.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "PapermarkApiError";
    this.code = knownCode ? code : "internal_server_error";
    this.statusCode = API_ERROR_STATUS_CODES[this.code];
  }
}
