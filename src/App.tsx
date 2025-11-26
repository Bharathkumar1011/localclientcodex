// Integration: javascript_log_in_with_replit
import './index.css';
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import InternDashboard from "@/pages/InternDashboard";
import OrganizationSetup from "@/pages/OrganizationSetup";
import RoleSelection from "@/pages/RoleSelection";
import NotFound from "@/pages/not-found";
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import MockLoginSelector from '@/components/MockLoginSelector';
import { queryClient } from "./lib/queryClient";
import Demo from './pages/testPage';
import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Router({ isAuthenticated, userRole }: { isAuthenticated: boolean; userRole?: string }) {
  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
        
      ) : (
        <>
          {userRole === 'intern' ? (
            <>
              <Route path="/" component={InternDashboard} />
              <Route path="/intern-dashboard" component={InternDashboard} />
            </>
          ) : (
            <>
            <Route path="/demo" component={Demo} />
              <Route path="/" component={Home} />
              <Route path="/dashboard" component={Home} />
              <Route path="/universe" component={Home} />
              <Route path="/qualified" component={Home} />
              <Route path="/outreach" component={Home} />
              <Route path="/scheduled-tasks" component={Home} />
              <Route path="/pitching" component={Home} />
              <Route path="/mandates" component={Home} />
              <Route path="/rejected" component={Home} />
              <Route path="/user-management" component={Home} />
              <Route path="/audit-log" component={Home} />
            </>
          )}
        </>
      )}
      <Route path="/organization-setup" component={OrganizationSetup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isAuthenticated, isLoading, needsOrganizationSetup, needsRoleSelection, user } = useAuth();
  console.log("App - isAuthenticated:", isAuthenticated);
  
  // Check mock authentication status
  const { data: authStatus, isLoading: mockAuthLoading } = useQuery({
    queryKey: ['/api/auth/mock/status'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/auth/mock/status`, {
        credentials: 'include'
      });
      return res.json();
    }
  });

    // ✅ Add this line below:
  const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
  
    if (USE_MOCK_AUTH && !authStatus?.authenticated) {
      return (
        <TooltipProvider>
          <MockLoginSelector />
          <Toaster />
        </TooltipProvider>
      );
    }

  // Custom sidebar width for investment banking CRM
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  // Show loading while checking auth
  if (isLoading || mockAuthLoading) {
    return (
      <TooltipProvider>
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    );
  }

  // // Show mock login if not authenticated (for dev mode)
  // if (!authStatus?.authenticated && !isAuthenticated) {
  //   return (
  //     <TooltipProvider>
  //       <MockLoginSelector />
  //       <Toaster />
  //     </TooltipProvider>
  //   );
  // }
   
     // ✅ Only show mock login when USE_MOCK_AUTH is true
    if (USE_MOCK_AUTH && !authStatus?.authenticated && !isAuthenticated) {
      return (
        <TooltipProvider>
          <MockLoginSelector />
          <Toaster />
        </TooltipProvider>
      );
    }

  // Show landing page if not authenticated (for production)
  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Router isAuthenticated={isAuthenticated} />
        <Toaster />
      </TooltipProvider>
    );
  }

  // Show organization setup if needed
  if (needsOrganizationSetup) {
    return (
      <TooltipProvider>
        <OrganizationSetup />
        <Toaster />
      </TooltipProvider>
    );
  }

  // Show role selection if needed
  if (needsRoleSelection) {
    return (
      <TooltipProvider>
        <RoleSelection />
        <Toaster />
      </TooltipProvider>
    );
  }

  const userRole = (user as any)?.effectiveRole || user?.role;
  const showSidebar = userRole !== 'intern';

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full bg-background text-foreground">          {showSidebar && <AppSidebar />}
          <div className="flex flex-col flex-1 bg-card text-card-foreground">
            <header className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-4">
                {showSidebar && <SidebarTrigger data-testid="button-sidebar-toggle" />}
                <h1 className="text-lg font-semibold text-primary">Investment Bank CRM</h1>
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <button
                  onClick={async () => {
                    try {
                      // Try mock logout first
                      await fetch(`${API_BASE_URL}/auth/mock/logout`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      // Also clear test role
                      await fetch(`${API_BASE_URL}/auth/clear-test-role`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Error during logout:', error);
                      window.location.href = '/';
                    }
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  data-testid="button-logout"
                >
                  Switch Role
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto">
              <Router isAuthenticated={isAuthenticated} userRole={userRole} />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
