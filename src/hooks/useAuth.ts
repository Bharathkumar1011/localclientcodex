// Integration: javascript_log_in_with_replit
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type UserWithTestRole = User & {
  testRole?: string;
  hasSelectedTestRole?: boolean;
  effectiveRole?: string;
};

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Sync Supabase session & react-query
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    );

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [queryClient]);

  console.log("useAuth - Fetching user authentication status");
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        window.location.href = "/reset-password";
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const { data: user, isLoading, error } = useQuery<UserWithTestRole | null>({
    queryKey: ["/api/auth/user"],
queryFn: async () => {
      // 1. Get the session (might be stale)
      let { data: { session: freshSession } } = await supabase.auth.getSession();

      // 2. 🛡️ BULLETPROOF CHECK: Force a refresh if it expires in less than 2 minutes
      if (freshSession?.expires_at) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = freshSession.expires_at - nowInSeconds;

        if (timeUntilExpiry < 120) { // 120 seconds = 2 minutes
          console.log("Token expiring soon, manually forcing refresh...");
          const { data, error } = await supabase.auth.refreshSession();
          
          if (!error && data.session) {
            freshSession = data.session;
          } else {
            console.error("Manual refresh failed:", error);
          }
        }
      }

      if (!freshSession?.access_token) {
        return null;
      }

      // 3. Proceed with the guaranteed valid token
      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`,
        },
      });

      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return await response.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !sessionLoading,
      // 💥 REQUIRED FIXES
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const authLoading = isLoading || sessionLoading;

  const authenticated = !!user && !error;

  const needsOrganizationSetup = authenticated && user && !user.organizationId;

  const needsRoleSelection =
    authenticated &&
    user &&
    user.organizationId &&
    user.role === "admin"  &&
    !user.hasSelectedTestRole;

  return {
    user,
    isLoading: authLoading,
    isAuthenticated: authenticated,
    needsOrganizationSetup,
    needsRoleSelection,
  };
}
