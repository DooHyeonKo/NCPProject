import { apiRequest, toJsonBody } from "@/lib/api";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/tokens";
import type { LoginResponse, RegisterResponse, User } from "@/lib/types";

export async function register(email: string, password: string, name: string) {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: toJsonBody({ email, password, name }),
  });
}

export async function login(email: string, password: string) {
  const data = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: toJsonBody({ email, password }),
  });

  setTokens(data.access_token, data.refresh_token);

  return data;
}

export async function logout() {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await apiRequest<{ message: string }>("/auth/logout", {
        method: "POST",
        body: toJsonBody({ refresh_token: refreshToken }),
      });
    }
  } finally {
    clearTokens();
  }
}

export async function getMe() {
  return apiRequest<User>("/auth/me", {
    method: "GET",
  });
}
