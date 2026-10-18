/**
 * Calls to our Django API (`NEXT_PUBLIC_API_URL`). Every failure becomes an
 * `ApiError` whose `message` can be shown to the driver as is, with any field
 * messages in `fields`. An aborted request rethrows the browser's AbortError.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export type ApiErrorKind =
  | "invalid_input" // 400: see `fields`
  | "not_found" // 404
  | "no_route" // 422
  | "rate_limited" // 429
  | "unavailable" // 502 / 504: an outside service failed or was slow
  | "server" // 500 or anything unexpected
  | "network"; // the API couldn't be reached

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  invalid_input: "Some inputs need fixing.",
  not_found: "We couldn't find that.",
  no_route: "No route found between these places.",
  rate_limited: "Too many requests in a short time. Wait a minute and try again.",
  unavailable: "A service we rely on didn't respond. Try again in a moment.",
  server: "Something went wrong on our side. Try again in a moment.",
  network: "Couldn't reach the server. Check your connection and try again.",
};

const RETRYABLE: ReadonlySet<ApiErrorKind> = new Set(["rate_limited", "unavailable", "server", "network"]);

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  /** The backend's machine code, e.g. "provider_timeout". */
  readonly code: string | null;
  /** Messages per input, keyed by the backend's dotted names, e.g. "origin.lat". */
  readonly fields: Readonly<Record<string, string[]>>;

  constructor(
    kind: ApiErrorKind,
    message: string,
    { status = null, code = null, fields = {} }: { status?: number | null; code?: string | null; fields?: Record<string, string[]> } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** Whether to show a "try again" banner rather than ask the driver to change something. */
  get retryable(): boolean {
    return RETRYABLE.has(this.kind);
  }

  /** Messages for one form field, including nested ones ("origin" collects "origin.lat"). */
  fieldMessages(field: string): string[] {
    return Object.entries(this.fields)
      .filter(([key]) => key === field || key.startsWith(`${field}.`))
      .flatMap(([, messages]) => messages);
  }
}

const kindForStatus = (status: number): ApiErrorKind => {
  if (status === 400) return "invalid_input";
  if (status === 404) return "not_found";
  if (status === 422) return "no_route";
  if (status === 429) return "rate_limited";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  return "server";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toFields = (value: unknown): Record<string, string[]> => {
  if (!isRecord(value)) return {};
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(value)) {
    const list = (Array.isArray(messages) ? messages : [messages]).filter(
      (m): m is string => typeof m === "string" && m.length > 0,
    );
    if (list.length > 0) fields[key] = list;
  }
  return fields;
};

/** Reads `{"error": {"code", "message", "fields"}}` (B10); anything else gets a plain fallback. */
export const toApiError = async (res: Response): Promise<ApiError> => {
  const kind = kindForStatus(res.status);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON (e.g. a proxy's HTML error page): use the fallback message.
  }
  const error = isRecord(body) && isRecord(body.error) ? body.error : null;
  const message = typeof error?.message === "string" && error.message ? error.message : FALLBACK_MESSAGES[kind];
  const code = typeof error?.code === "string" ? error.code : null;
  return new ApiError(kind, message, { status: res.status, code, fields: toFields(error?.fields) });
};

const isAbort = (err: unknown): boolean => err instanceof DOMException && err.name === "AbortError";

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { Accept: "application/json", ...init.headers } });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ApiError("network", FALLBACK_MESSAGES.network);
  }
  if (!res.ok) throw await toApiError(res);
  try {
    return (await res.json()) as T;
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ApiError("server", FALLBACK_MESSAGES.server, { status: res.status });
  }
};

export const apiGet = <T>(path: string, init?: RequestInit): Promise<T> => request<T>(path, init);

export const apiPost = <T>(path: string, body: unknown, init?: RequestInit): Promise<T> =>
  request<T>(path, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
  });
