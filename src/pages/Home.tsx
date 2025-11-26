import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "../components/Dashboard";
import LeadManagement from "../components/LeadManagement";
import ScheduledTasksPipeline from "../components/ScheduledTasksPipeline";
import UserManagementPage from "./UserManagementPage";
import AuditLogPage from "./AuditLogPage";

export default function Home() {
  const { user } = useAuth();
   console.log("Home - Current User:", user);
  // Show loading state if user data isn't available yet
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="home-page">
      <Switch>
        <Route path="/universe" component={() => <LeadManagement stage="universe" currentUser={user} />} />
        <Route path="/qualified" component={() => <LeadManagement stage="qualified" currentUser={user} />} />
        <Route path="/outreach" component={() => <LeadManagement stage="outreach" currentUser={user} />} />
        <Route path="/scheduled-tasks" component={() => <ScheduledTasksPipeline currentUser={user} />} />
        <Route path="/pitching" component={() => <LeadManagement stage="pitching" currentUser={user} />} />
        <Route path="/mandates" component={() => <LeadManagement stage="mandates" currentUser={user} />} />
        <Route path="/rejected" component={() => <LeadManagement stage="rejected" currentUser={user} />} />
        <Route path="/deals-won" component={() => <LeadManagement stage="won" currentUser={user} />} />
        <Route path="/deals-lost" component={() => <LeadManagement stage="lost" currentUser={user} />} />
        <Route path="/user-management" component={() => <UserManagementPage />} />
        <Route path="/audit-log" component={() => <AuditLogPage />} />
        <Route path="/dashboard" component={() => <Dashboard currentUser={user} />} />
        <Route path="/" component={() => <Dashboard currentUser={user} />} />
        <Route component={() => <Dashboard currentUser={user} />} />
      </Switch>
    </div>
  );
}