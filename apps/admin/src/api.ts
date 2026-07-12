const API_URL = String(import.meta.env.VITE_API_URL ?? "http://localhost:3000");
const TOKEN_KEY = "paramingle.admin.access-token";
export const adminSession = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};
export async function adminApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = adminSession.get();
  if (!token) throw new Error("MFA-authenticated admin session required");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? "Admin request failed");
  }
  return response.json() as Promise<T>;
}
