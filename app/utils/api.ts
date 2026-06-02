const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://web-production-17b65.up.railway.app";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, params } = options;

  // Build URL with query params
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>;
    const queryString = new URLSearchParams(cleanParams).toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Get token from localStorage
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("ticket_app_token");
  }

  // Set default headers
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: defaultHeaders,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return {} as T;
    }

    // Try to parse JSON response
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Gagal melakukan request (${response.status})`;
      throw new ApiError(errorMessage, response.status);
    }

    if (data && typeof data === "object" && "success" in data && "data" in data) {
      return data.data as T;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other runtime error
    throw new Error(error instanceof Error ? error.message : "Terjadi kesalahan koneksi internet.");
  }
}
