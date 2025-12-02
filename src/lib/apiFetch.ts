import { supabase } from "@/lib/supabaseClient";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(token ? { "x-supabase-access-token": token } : {}),
  };

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
}
