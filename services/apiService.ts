import { useAppStore } from "../stores/useAppStore";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5010";

type ErrorHandler = (status: number, errorData: unknown) => boolean | void;

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseBody = (raw: string): unknown => {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const extractMessage = (payload: unknown, fallback: string): string => {
  if (isRecord(payload)) {
    const errorMessage = payload.error;
    if (typeof errorMessage === "string" && errorMessage.trim()) {
      return errorMessage;
    }
    const message = payload.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
};

const resolveSuccessPayload = <T>(payload: unknown): T | null => {
  if (!isRecord(payload)) {
    return (payload as T | null) ?? null;
  }
  if ("data" in payload) {
    return (payload.data as T | null) ?? null;
  }
  return (payload as T) ?? null;
};

const buildHeaders = (options: RequestInit): Headers => {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
};

export async function fetchApiResult<T>(
  endpoint: string,
  options: RequestInit = {},
  handleError?: ErrorHandler,
): Promise<ApiResult<T>> {
  const { setError, clearError } = useAppStore.getState();
  clearError();

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(options),
    });

    const text = response.status === 204 ? "" : await response.text();
    const payload = parseBody(text);

    if (!response.ok) {
      const handled = handleError?.(response.status, payload);
      const errorMessage = extractMessage(payload, `HTTP error ${response.status}`);
      if (handled !== true) {
        setError(`API Error: ${errorMessage}`);
      }
      return {
        ok: false,
        status: response.status,
        data: null,
        error: errorMessage,
      };
    }

    if (isRecord(payload) && payload.success === false) {
      const errorMessage = extractMessage(payload, "API returned success=false");
      setError(`API Error: ${errorMessage}`);
      return {
        ok: false,
        status: response.status,
        data: null,
        error: errorMessage,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: resolveSuccessPayload<T>(payload),
      error: null,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const message =
      raw === "Failed to fetch"
        ? `Backend unreachable at ${BACKEND_URL}. Make sure the Python backend is running (./start.sh backend).`
        : `Network Error: ${raw}`;
    setError(message);
    return {
      ok: false,
      status: 0,
      data: null,
      error: message,
    };
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  handleError?: ErrorHandler,
): Promise<T | null> {
  const result = await fetchApiResult<T>(endpoint, options, handleError);
  return result.ok ? result.data : null;
}
