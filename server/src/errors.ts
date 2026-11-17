/** Every expected failure is an AppError so the error handler can map it to an HTTP response. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT', details?: unknown) {
    super(409, code, message, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Request body is too large') {
    super(413, 'PAYLOAD_TOO_LARGE', message);
  }
}

/** The request was well-formed but the content could not be used (private URL, no readable text...). */
export class UnprocessableError extends AppError {
  constructor(message: string, code = 'UNPROCESSABLE') {
    super(422, code, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please slow down') {
    super(429, 'RATE_LIMITED', message);
  }
}

/** A dependency we call (OpenAI, a remote website) failed. 502 by default, 504 for timeouts. */
export class UpstreamError extends AppError {
  constructor(message: string, status = 502, code = 'UPSTREAM_ERROR') {
    super(status, code, message);
  }
}
