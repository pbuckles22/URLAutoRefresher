export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: string };
export type Result<T> = Ok<T> | Err;

export function validateHttpUrl(input: string): Result<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL is required' };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'URL must start with http:// or https://' };
  }
  return { ok: true, value: trimmed };
}

export function validateIntervalSec(n: number): Result<number> {
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'Interval must be a positive number (seconds)' };
  }
  return { ok: true, value: n };
}

export function validateJitterSec(n: number): Result<number> {
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: 'Jitter must be a non-negative number (seconds)' };
  }
  return { ok: true, value: n };
}
