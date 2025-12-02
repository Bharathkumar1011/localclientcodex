import { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ------------------------------------
   CLEAN QUERY CLIENT (ONLY ONE)
------------------------------------- */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = `${API_BASE_URL}${queryKey[0]}`;
        const res = await apiFetch(url);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000,
    },
    mutations: {
      retry: false,
    },
  },
});

/* ------------------------------------
   Utility helpers
------------------------------------- */

function getFullUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/* ------------------------------------
   apiRequest: POST, PUT, PATCH, DELETE
------------------------------------- */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const fullUrl = getFullUrl(url);

  const res = await apiFetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}
