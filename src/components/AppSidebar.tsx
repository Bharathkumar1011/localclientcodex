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

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const canManageUsers = user?.role === 'admin' || user?.role === 'partner';

  return (
    <Sidebar>
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
                      <span>{item.title}</span>
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