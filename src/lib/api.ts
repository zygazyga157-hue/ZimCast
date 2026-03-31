import { toast } from "sonner";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function api<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    let code = "UNKNOWN";
    let message = "Something went wrong";
    try {
      const data = await res.json();
      code = data.code ?? code;
      message = data.error ?? data.message ?? message;
    } catch {
      // response body was not JSON
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function showApiError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof ApiError) {
    toast.error(err.message);
  } else {
    toast.error(fallback);
  }
}
