import { supabase } from "@/lib/supabaseClient";

let refreshPromise: Promise<any> | null = null;

export async function apiFetch(url: string, options: RequestInit = {}) {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;

  const getHeaders = (currentToken?: string) => ({
    ...(options.headers || {}),
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    ...(currentToken ? { "x-supabase-access-token": currentToken } : {}),
  });

  let response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: getHeaders(token),
  });

  if (response.status === 401 || response.status === 403) {
    console.warn(`Token expired for ${url}. Attempting to recover...`);
    
    if (!refreshPromise) {
      refreshPromise = supabase.auth.refreshSession().finally(() => {
        refreshPromise = null;
      });
    }

    const { data: refreshData, error } = await refreshPromise;

    // THE CRITICAL FIX: If Supabase rejects the refresh, the session is dead.
    // We MUST clear the broken state and redirect to login.
    if (error || !refreshData?.session) {
      console.error("Session permanently dead (likely revoked). Forcing logout...");
      
      // Clear the broken data from localStorage
      await supabase.auth.signOut(); 
      
      // Kick the user back to the login route (change '/' to your actual login route if different)
      window.location.href = "/"; 
      
      return response; 
    }

    // If refresh succeeded, grab the new token and retry the API call seamlessly
    token = refreshData.session.access_token;
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: getHeaders(token),
    });
  }

  return response;
}