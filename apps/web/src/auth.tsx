/* eslint-disable react-refresh/only-export-components */
import { createClient, type Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
interface AuthValue {
  session: Session | null;
  loading: boolean;
}
const Context = createContext<AuthValue>({ session: null, loading: true });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    if (!supabase) {
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <Context.Provider value={{ session, loading }}>{children}</Context.Provider>
  );
}
export function useAuth() {
  return useContext(Context);
}
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (!supabase) return children;
  if (loading)
    return (
      <main className="auth-page">
        <p role="status">Checking your session…</p>
      </main>
    );
  if (!session) {
    const returnTo =
      location.pathname.startsWith("/") && !location.pathname.startsWith("//")
        ? location.pathname
        : "/app";
    return (
      <Navigate
        replace
        to={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
      />
    );
  }
  return children;
}
export async function api<T>(path: string, options: RequestInit = {}) {
  if (!supabase) throw new Error("Supabase browser configuration is missing");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Authentication required");
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${data.session.access_token}`,
      "x-device-label": navigator.userAgent.slice(0, 120),
      ...(options.body instanceof FormData
        ? {}
        : { "content-type": "application/json" }),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
