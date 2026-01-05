// Integration: javascript_log_in_with_replit
import './index.css';
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { LeadFiltersProvider } from "@/context/LeadFiltersContext";
import ThemeToggle from "@/components/ThemeToggle";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import InternDashboard from "@/pages/InternDashboard";
import OrganizationSetup from "@/pages/OrganizationSetup";
import RoleSelection from "@/pages/RoleSelection";
import NotFound from "@/pages/not-found";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from "./lib/queryClient";
import Demo from './pages/testPage';
import { supabase } from "@/lib/supabaseClient";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import { useEffect } from "react";
import { ReminderBell } from "@/components/ReminderBell";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";



const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Router({ isAuthenticated, userRole }: { isAuthenticated: boolean; userRole?: string }) {
  return (
    <Switch>
      {/* ======================== */}
      {/* Public Routes            */}
      {/* ======================== */}
      {!isAuthenticated && (
        <>
          <Route path="/organization-setup" component={OrganizationSetup} />
          <Route path="/forgot-password" component={ForgotPassword} />   {/* 🔵 Add this */}
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </>
      )}

      {/* ======================== */}
      {/* Authenticated Routes     */}
      {/* ======================== */}
      {isAuthenticated && (
        <>
          {/* Allow reset-password even when authenticated */}
          <Route path="/reset-password" component={ResetPassword} /> 
          {/* Intern-only */}
          {userRole === 'intern' ? (
            <>
              <Route path="/intern-dashboard" component={InternDashboard} />
              <Route path="/" component={InternDashboard} />
            </>
          ) : (
            <>
              {/* More specific routes FIRST */}
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
              <Route path="/demo" component={Demo} />
              
              {/* Least specific LAST */}
              <Route path="/" component={Home} />
            </>
          )}

          {/* Fallback */}
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  const { isAuthenticated, isLoading, needsOrganizationSetup, needsRoleSelection, user } = useAuth();
  console.log("App - isAuthenticated:", isAuthenticated);
  console.log("AUTH USER → ", user);

  // Detect password-recovery redirect from Supabase email link
  useEffect(() => {
    const hash = window.location.hash; // #access_token=..&refresh_token=..&type=recovery
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));

    const type = params.get("type");
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (type === "recovery" && access_token && refresh_token) {
      // Restore Supabase session BEFORE redirect
      supabase.auth.setSession({
        access_token,
        refresh_token
      }).then(() => {
        window.location.replace("/reset-password");
      });
    }
  }, []);


  // Custom sidebar width for investment banking CRM
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  // Show loading while checking auth
  if (isLoading) {
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

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Router isAuthenticated={isAuthenticated} />
        <Toaster />
      </TooltipProvider>
    );
  }

  // // Show organization setup if needed
  // if (needsOrganizationSetup) {
  //   return (
  //     <TooltipProvider>
  //       <OrganizationSetup />
  //       <Toaster />
  //     </TooltipProvider>
  //   );
  // }

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
          <LeadFiltersProvider>
            <div className="flex h-screen w-full bg-background text-foreground">
              {showSidebar && <AppSidebar />}
            <div className="flex flex-col flex-1 bg-card text-card-foreground">
              <header className="flex items-center justify-between p-4 border-b border-border bg-white">
                <div className="flex items-center gap-4">
                  {showSidebar && <SidebarTrigger data-testid="button-sidebar-toggle" />}
                  <h1 className="text-lg font-semibold text-primary">Investment Bank CRM</h1>
                </div>
                <div className="flex items-center gap-4">
                  <ReminderBell />     {/* ✅ INSERTED HERE */}
                  <ThemeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                      <Avatar className="h-8 w-8 cursor-pointer">
                        <AvatarFallback>
                          {user?.firstName?.charAt(0).toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-white dark:bg-neutral-900 shadow-md rounded-md border"

                    >

                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Signed in as
                      </DropdownMenuLabel>

                      <div className="px-3 py-2">
                        <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem>
                        <span className="text-sm">Role: {user?.role}</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem>
                        <span className="text-sm">User ID: {user?.id}</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={async () => {
                          try {
                            const { data } = await supabase.auth.getSession();
                            const accessToken = data.session?.access_token;

                            if (accessToken) {
                              await fetch(`${API_BASE_URL}/auth/clear-test-role`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { Authorization: `Bearer ${accessToken}` },
                              });
                            }

                            await supabase.auth.signOut();
                            window.location.href = '/';
                          } catch (err) {
                            console.error("Logout error:", err);
                            window.location.href = '/';
                          }
                        }}
                      >
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
              </header>
              <main className="flex-1 overflow-y-auto">
                <Router isAuthenticated={isAuthenticated} userRole={userRole} />
              </main>
            </div>
              </div>
            </LeadFiltersProvider>
          </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
