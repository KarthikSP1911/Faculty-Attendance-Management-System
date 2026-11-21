export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: FieldIssue[] | null = null,
  ) {
    super(message);
  }
}

const BASE = '/api/v1';
type Params = Record<string, string | number | boolean | undefined | null>;

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

function qs(params?: Params): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function raw(method: string, path: string, body?: unknown, params?: Params, retry = true): Promise<Response> {
  const res = await fetch(`${BASE}${path}${qs(params)}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isAuthCall = path.startsWith('/auth/login') || path.startsWith('/auth/refresh') || path.startsWith('/auth/logout');
  if (res.status === 401 && retry && !isAuthCall) {
    if (await refreshSession()) return raw(method, path, body, params, false);
    onUnauthorized?.();
  }
  return res;
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const json = await res.json();
    const e = json?.error;
    return new ApiError(res.status, e?.code ?? 'ERROR', e?.message ?? 'Request failed', Array.isArray(e?.details) ? e.details : null);
  } catch {
    return new ApiError(res.status, 'NETWORK', 'Request failed');
  }
}

async function call<T>(method: string, path: string, body?: unknown, params?: Params): Promise<T> {
  let res: Response;
  try {
    res = await raw(method, path, body, params);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return json.data as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => call<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => call<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body ?? {}),
  del: <T = void>(path: string) => call<T>('DELETE', path),
  /** Downloads a CSV/PDF report through the browser. */
  async download(path: string, params: Params, filename: string): Promise<void> {
    const res = await raw('GET', path, undefined, params);
    if (!res.ok) throw await toError(res);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');
