import { getAuthToken } from "./authSession";

// src/services/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost/One-Convenience/backend/api";

export const apiRequest = async (endpoint: string, method = "GET", body?: unknown, authToken?: string) => {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken ?? getAuthToken()}`,
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return await response.json();
};
