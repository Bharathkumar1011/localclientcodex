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

import AuditAnalyticsPage from "@/pages/AuditAnalyticsPage";

import LeadEditPage from "@/pages/LeadEditPage";
import InternDashboard from "@/pages/InternDashboard";
import OrganizationSetup from "@/pages/OrganizationSetup";
import RoleSelection from "@/pages/RoleSelection";
import NotFound from "@/pages/not-found";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from "./lib/queryClient";
import Demo from './pages/testPage';
import ContactManagement from "@/pages/ContactManagement";
import ContactManagementPOC1 from "@/pages/ContactManagementPOC1";
import ContactManagementPOC2 from "@/pages/ContactManagementPOC2";
import ContactManagementPOC3 from "@/pages/ContactManagementPOC3";
import ContactManagementOtherFields from "@/pages/ContactManagementOtherFields";
import OutreachStatus from "@/pages/OutreachStatus";

import InvestorOutreach from "@/pages/InvestorOutreach";
import InvestorWarm from "@/pages/InvestorWarm";
import InvestorActive from "@/pages/InvestorActive";
import InvestorDealmaking from "@/pages/InvestorDealmaking";
import InvestorOutreachStatus from "@/pages/InvestorOutreachStatus";

import InvestorOutreachPage from "./pages/InvestorOutreachPage"; // Make sure to import the new page

import LinkInvestorsPage from "@/pages/LinkInvestorsPage";



import InvestorDashboard from "@/pages/InvestorDashboard";
import InvestorEditPage from "@/pages/InvestorEditPage";

import InvestorContactManagement from "@/pages/InvestorContactManagement"; // ✅ New Page for Contact Health
import InvestorPOC1 from "@/pages/InvestorPOC1";
import InvestorPOC2 from "@/pages/InvestorPOC2";
import InvestorPOC3 from "@/pages/InvestorPOC3";

import InvestorContactManagementOtherFields from "@/pages/InvestorContactManagementOtherFields"; // ✅ Import the new page for other fields

import InvestorHome from "@/pages/InvestorHome"; // Import the new page

import DeletedInvestors from "@/pages/DeletedInvestors";

import PitchingDashboard from "@/pages/PitchingDashboard";
import PitchingEditPage from "@/pages/PitchingEditPage";


import UnifiedDashboard from "@/pages/UnifiedDashboard"; // <--- Add this


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

import EpnHome from "@/pages/epn/EpnHome";
import EpnUniverse from "@/pages/epn/EpnUniverse";
import EpnGroupHome from "@/pages/epn/EpnGroupHome";
import EpnStagePage from "@/pages/epn/EpnStagePage";

import EpnAddPage from "@/pages/epn/EpnAddPage"; // <--- Import this

import LinkEpnPage from "@/pages/epn/LinkEpnPage";

import LinkLeadsToEpnPage from "@/pages/epn/LinkLeadsToEpnPage"; // <--- Import this for linking leads to EPN

import EpnEditPage from "@/pages/epn/EpnEditPage"; // <--- Import this for editing EPN details

import EpnBucketDashboard from "@/pages/epn/EpnBucketDashboard"; // ✅ ADD THIS LINE

import ManageEpnPage from "@/pages/epn/ManageEpnPage"; // <--- Import this for managing EPNs within a bucket

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

              <Route path="/unified-dashboard" component={UnifiedDashboard} /> {/* <--- Add this */}
              
              <Route path="/leads/:id/edit" component={LeadEditPage} />
              <Route path="/dashboard" component={Home} />
              <Route path="/universe" component={Home} />
              <Route path="/qualified" component={Home} />
              <Route path="/outreach" component={Home} />
              <Route path="/scheduled-tasks" component={Home} />
              <Route path="/outreach-status/:leadId" component={OutreachStatus} />
              <Route path="/pitching" component={Home} />
              <Route path="/mandates" component={Home} />
              <Route path="/completed-mandate" component={Home} />
              <Route path="/rejected" component={Home} />
              <Route path="/hold" component={Home} />
              <Route path="/dropped" component={Home} />
              <Route path="/user-management" component={Home} />
              <Route path="/audit-log" component={AuditAnalyticsPage} />
              <Route path="/demo" component={Demo} />
              <Route path="/contact-management" component={ContactManagement} />
              <Route path="/contact-management/poc1" component={ContactManagementPOC1} />
              <Route path="/contact-management/poc2" component={ContactManagementPOC2} />
              <Route path="/contact-management/poc3" component={ContactManagementPOC3} />
              <Route path="/contact-management/other-fields" component={ContactManagementOtherFields} />
              <Route path="/investor-relation/investor-management/outreach" component={InvestorOutreach} />
              <Route path="/investor-relation/investor-management/warm" component={InvestorWarm} />
              <Route path="/investor-relation/investor-management/active" component={InvestorActive} />
              <Route path="/investor-relation/investor-management/dealmaking" component={InvestorDealmaking} />


              <Route path="/pitching/:id" component={PitchingDashboard} />
              <Route path="/pitching/:id/edit" component={PitchingEditPage} />

              <Route path="/investor-outreach/:leadId/:investorId" component={InvestorOutreachStatus} />
              <Route path="/investor-outreach/:leadId" component={InvestorOutreachPage} />


              <Route path="/investors/:id/edit" component={InvestorEditPage} />


              <Route path="/leads/:id/link-investors" component={LinkInvestorsPage} />

              

              <Route path="/investor-management" component={InvestorDashboard} />
              <Route path="/investor-relation/investor-management" component={InvestorDashboard} />

              <Route path="/investor-relation/investor-management/database" component={InvestorDashboard} />
                 

              {/* ✅ New Route for Contact Health */}
              <Route path="/investor-contact-management" component={InvestorContactManagement} />
              <Route path="/investor-contact-management/poc1" component={InvestorPOC1} />
              <Route path="/investor-contact-management/poc2" component={InvestorPOC2} />
              <Route path="/investor-contact-management/poc3" component={InvestorPOC3} />
              <Route path="/investor-contact-management/other-fields" component={InvestorContactManagementOtherFields} />

              <Route path="/link-investors" component={LinkInvestorsPage} />
              <Route path="/leads/:leadId/link-investors" component={LinkInvestorsPage} />

              <Route path="/investor-relation/home" component={InvestorHome} /> {/* ✅ Added Route */}

              <Route path="/investor-relation/investor-management/deleted" component={DeletedInvestors} />
              
              {/* ======================== */}
              {/* EPN Relations (Stage 0)  */}
              {/* ======================== */}
              
              {/* 1. Static & Action Routes (Highest Priority) */}
              <Route path="/epn/add" component={EpnAddPage} />
              <Route path="/epn/universe" component={EpnUniverse} />
              
              {/* 2. Specific ID-based Routes (Safe Pattern) */}
              {/* We use /edit/:id to ensure the router never mistakes 'edit' for a bucket name */}
              <Route path="/epn/edit/:id" component={EpnEditPage} /> 
              <Route path="/epn/:epnId/link-leads" component={LinkLeadsToEpnPage} />

              {/* 3. Dynamic Parameter Routes (Lower Priority) */}
              {/* ✅ 1. 'universe' must be caught FIRST so it doesn't get treated as a stage */}
              <Route path="/epn/:bucket/universe" component={EpnGroupHome} />
              
              {/* ✅ 2. Then catch actual stages (outreach, active, etc.) */}
              <Route path="/epn/:bucket/:stage" component={EpnStagePage} />
              
              {/* ✅ 3. Finally, catch the parent bucket click and show the Dashboard */}
              <Route path="/epn/:bucket" component={EpnBucketDashboard} />
              
              {/* 4. Base & Cross-Linked Routes (Least Specific) */}
              <Route path="/epn" component={EpnHome} />
              <Route path="/leads/:id/epn" component={ManageEpnPage} /> {/* <--- Add this route for managing EPNs linked to a specific lead */}
              <Route path="/leads/:id/link-epn" component={LinkEpnPage} /> {/* <--- Add this route for linking EPNs to a specific lead */}


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
              <header className="flex items-center justify-between p-4 border-b border-border bg-blue-100 dark:bg-neutral-900">
                <div className="flex items-center gap-4">
                  {showSidebar && <SidebarTrigger data-testid="button-sidebar-toggle" />}
                  <h1 className="text-lg font-semibold text-primary">Investment Bank CRM</h1>
                </div>

{/* Right side actions */}
<div className="flex items-center gap-3">
  {/* SPIKE logo */}
  <div className="h-7 sm:h-8 w-[84px] sm:w-[96px] flex items-center justify-center">
    <img
      src="/brand/spike.jpeg"
      alt="SPIKE"
      className="max-h-full max-w-full object-contain"
      loading="eager"
    />
  </div>

  <ReminderBell />
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

