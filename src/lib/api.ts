import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, details: extra }, { status });
}

/** Wrap a route handler so Zod and unexpected errors become clean JSON. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return ok(data);
  } catch (err) {
    if (err instanceof ZodError) {
      return fail("Validation failed", 422, err.flatten());
    }
    if (err instanceof HttpError) {
      return fail(err.message, err.status);
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return fail(message, 500);
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
