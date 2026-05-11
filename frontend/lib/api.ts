import { API_BASE_URL } from "@/lib/config";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/tokens";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(getErrorMessage(body) || `API Error ${status}`);
    this.status = status;
    this.body = body;
  }
}

function getErrorMessage(body: unknown) {
  if (!body || typeof body !== "object") return "";

  const detail = (body as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return "요청값 형식이 올바르지 않습니다.";
  }

  return "";
}

type ApiOptions = RequestInit & {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

async function parseResponse(res: Response) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearTokens();
    return null;
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    clearTokens();
    return null;
  }

  if (data?.access_token) {
    setTokens(data.access_token);
    return data.access_token as string;
  }

  return null;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, retryOnUnauthorized = true, headers, body, ...rest } = options;
  const token = getAccessToken();

  const requestHeaders = new Headers(headers);

  if (auth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (!isFormData && body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body,
    });
  } catch (error) {
    const target = `${API_BASE_URL}${path}`;
    const hint = "백엔드를 실행해 보세요: `cd backend && uvicorn app.main:app --reload --port 8000`";
    const message =
      error instanceof Error && error.message
        ? `백엔드 서버에 연결하지 못했습니다. 서버 실행 상태와 네트워크를 확인하세요. (target: ${target}, error: ${error.message})\n${hint}`
        : `백엔드 서버에 연결하지 못했습니다. 서버 실행 상태와 네트워크를 확인하세요. (target: ${target})\n${hint}`;
    throw new Error(message);
  }

  const data = await parseResponse(res);

  if (res.status === 401 && auth && retryOnUnauthorized) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      return apiRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

export function toJsonBody(data: unknown) {
  return JSON.stringify(data);
}
