import { 
  Home, 
  Database, 
  CheckCircle, 
  MessageSquare, 
  Presentation, 
  XCircle,
  Users,
  Settings,
  Trophy,
  TrendingDown,
  FileText,
  Calendar
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useMemo } from "react";
import { useLeadFilters } from "@/context/LeadFiltersContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const crmNavigationItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Universe",
    url: "/universe",
    icon: Database,
  },
  {
    title: "Qualified",
    url: "/qualified", 
    icon: CheckCircle,
  },
  {
    title: "Outreach",
    url: "/outreach",
    icon: MessageSquare,
  },  
  {
    title: "Pitching",
    url: "/pitching",
    icon: Presentation,
  },
  {
    title: "Mandates",
    url: "/mandates",
    icon: FileText,
  },
  {
    title: "Rejected",
    url: "/rejected",
    icon: XCircle,
  },
  {
    title: "Scheduled Tasks",
    url: "/scheduled-tasks",
    icon: Calendar,
  },
];

const adminNavigationItems = [
  {
    title: "User Management",
    url: "/user-management",
    icon: Settings,
    requiresRole: 'admin' as const,
  },
  {
    title: "Audit Log",
    url: "/audit-log",
    icon: FileText,
    requiresRole: 'admin' as const,
  },
];

const stageKeyMap: Record<string, string> = {
  Universe: "universe",
  Qualified: "qualified",
  Outreach: "outreach",
  Pitching: "pitching",
  Mandates: "mandates",
  Rejected: "rejected",
};


export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { filters } = useLeadFilters();

const { data: allLeads = [] } = useQuery({
  queryKey: ["leads", "stage", "all"],
  queryFn: async () => {
    const res = await apiRequest("GET", "/leads/all");
    return res.json();
  },
  refetchOnWindowFocus: false,
});

const countsByStage = useMemo(() => {
  const norm = (s: string) => (s || "").trim().toLowerCase();
  const getSS = (c: any) => (c?.subSector ?? c?.sub_sector ?? "").trim();

  let result = [...allLeads];

  // Search
  if (filters.searchTerm) {
    const q = filters.searchTerm.toLowerCase();
    result = result.filter((lead: any) => {
      const companyMatch = (lead.company?.name || "").toLowerCase().includes(q);
      const assigneeMatch = lead.assignedToUser
        ? `${lead.assignedToUser.firstName || ""} ${lead.assignedToUser.lastName || ""}`
            .toLowerCase()
            .includes(q)
        : false;
      return companyMatch || assigneeMatch;
    });
  }

  // Sector
  if (filters.filterSector !== "all") {
    result = result.filter((lead: any) => norm(lead.company?.sector) === norm(filters.filterSector));
  }

  // Sub-sector
  if (filters.filterSubSector !== "all") {
    result = result.filter((lead: any) => norm(getSS(lead.company)) === norm(filters.filterSubSector));
  }

  // Assigned To
  if (filters.filterAssignedTo !== "all") {
    if (filters.filterAssignedTo === "unassigned") {
      result = result.filter((lead: any) => !lead.assignedTo);
    } else {
      result = result.filter((lead: any) => lead.assignedTo === filters.filterAssignedTo);
    }
  }

  // Location (only applies if user selected it)
  if (filters.filterLocation !== "all") {
    result = result.filter((lead: any) => (lead.company?.location || "") === filters.filterLocation);
  }

  // Group counts
  const counts: Record<string, number> = {
    universe: result.length,
    qualified: 0,
    outreach: 0,
    pitching: 0,
    mandates: 0,
    rejected: 0,
  };

  for (const lead of result) {
    const st = (lead.stage || "").toLowerCase();
    if (counts[st] !== undefined) counts[st] += 1;
  }

  return counts;
}, [allLeads, filters]);


  const canManageUsers = user?.role === 'admin' || user?.role === 'partner';

  return (
    <Sidebar className="bg-gray-50 border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Investment Bank CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={location === item.url}>
                    <a 
                      href={item.url}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                      className={location === item.url ? "bg-sidebar-accent" : ""}
                    >
                      <item.icon />
                      <span className="flex-1">{item.title}</span>

                      {stageKeyMap[item.title] && (
                        <span
                          className="ml-auto text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                          data-testid={`nav-count-${stageKeyMap[item.title]}`}
                        >
                          {countsByStage[stageKeyMap[item.title]] ?? 0}
                        </span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Navigation */}
        {canManageUsers && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={location === item.url}>
                      <a 
                        href={item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                        className={location === item.url ? "bg-sidebar-accent" : ""}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}