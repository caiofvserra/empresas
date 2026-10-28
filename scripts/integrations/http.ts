export type HttpOptions = {
  fetch?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  maxBytes?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  headers?: Record<string, string>;
  allowNoContent?: boolean;
};

export class HttpFailure extends Error {
  constructor(readonly status: number, readonly retryable: boolean) {
    super(`Source returned HTTP ${status}.`);
  }
}

/** No redirects and no response bodies in errors: internal tokens cannot leak. */
export async function requestJson(url: URL, options: HttpOptions = {}): Promise<unknown> {
  if (url.protocol !== 'https:') throw new Error('Source HTTPS is required.');
  if (url.username || url.password) throw new Error('Credentials must not be included in a source URL.');
  const fetcher = options.fetch ?? fetch;
  const maxBytes = options.maxBytes ?? 20_000_000;
  const retries = options.retries ?? 3;
  if (!Number.isSafeInteger(retries) || retries < 0 || retries > 10) throw new Error('Invalid retry budget.');
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('Invalid response byte limit.');
  if (!Number.isSafeInteger(options.timeoutMs ?? 30_000) || (options.timeoutMs ?? 30_000) <= 0) throw new Error('Invalid request timeout.');
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
    try {
      const response = await fetcher(url, {
        method: 'GET', redirect: 'error', signal: controller.signal,
        headers: { Accept: 'application/json', ...options.headers },
      });
      if (!response.ok) throw new HttpFailure(response.status, response.status === 429 || response.status >= 500);
      if (response.status === 204 && options.allowNoContent) return undefined;
      const declaredSize = response.headers.get('content-length');
      if (declaredSize && Number(declaredSize) > maxBytes) throw new HttpFailure(413, false);
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader) {
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            length += chunk.value.byteLength;
            if (length > maxBytes) { await reader.cancel(); throw new HttpFailure(413, false); }
            chunks.push(chunk.value);
          }
        } finally { reader.releaseLock(); }
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const body = new TextDecoder().decode(bytes);
      try { return JSON.parse(body); } catch { throw new HttpFailure(422, false); }
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof HttpFailure && !error.retryable) throw error;
      if (attempt === retries) {
        if (error instanceof HttpFailure) throw error;
        throw new Error('Source request failed or timed out; no batch was published.');
      }
      await sleep(Math.min(250 * 2 ** attempt, 2_000));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Source retry budget exhausted.');
}

export function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}: object required.`);
  return value as Record<string, unknown>;
}

export function nonempty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${label}: nonempty string required.`);
  return value;
}

export function integer(value: unknown, label: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) throw new Error(`Invalid ${label}: integer required.`);
  return value;
}

export function isoDate(value: unknown, label: string): string {
  const text = nonempty(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`)) || new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) !== text) throw new Error(`Invalid ${label}: ISO calendar date required.`);
  return text;
}

export function instant(value: unknown, label: string): string {
  const text = nonempty(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text) || Number.isNaN(Date.parse(text))) throw new Error(`Invalid ${label}: timezone-qualified timestamp required.`);
  return text;
}
