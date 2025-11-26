// Integration: javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type UserWithTestRole = User & {
  testRole?: string;
  hasSelectedTestRole?: boolean;
  effectiveRole?: string;
};

export function useAuth() {
  console.log("useAuth - Fetching user authentication status");
  const { data: user, isLoading, error } = useQuery<UserWithTestRole | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        credentials: "include"
      });
      
      // If user is not authenticated, return null instead of throwing
      if (response.status === 401) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    retry: false,
  });

  // If query completed (success or error), we're no longer loading
  const authLoading = isLoading;
  
  // User is authenticated if we have user data and no error
  const authenticated = !!user && !error;
  
  // User needs organization setup if they're authenticated but don't have an organizationId
  const needsOrganizationSetup = authenticated && user && !user.organizationId;
  
  // User needs to select test role if authenticated, has org, is admin/partner, but hasn't selected a test role
  const needsRoleSelection = authenticated && user && user.organizationId && 
    (user.role === 'admin' || user.role === 'partner') && !user.hasSelectedTestRole;

  return {
    user,
    isLoading: authLoading,
    isAuthenticated: authenticated,
    needsOrganizationSetup,
    needsRoleSelection,
  };
}