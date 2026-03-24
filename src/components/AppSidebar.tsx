import { 
  Home, 
  Database, 
  CheckCircle, 
  MessageSquare, 
  Presentation, 
  XCircle,
  PauseCircle,
  Users,
  Settings,
  Trophy,
  TrendingDown,
  FileText,
  Calendar,
  Building2,
  Briefcase,
  Shield,
  Handshake,
  LayoutDashboard,
  HeartPulse // ✅ Optional: Added if you want to use HeartPulse instead of Users
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";
import { useMemo , Fragment} from "react";
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
    title: "Unified Dashboard", // <--- New Item
    url: "/unified-dashboard",
    icon: LayoutDashboard,
  },
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
    title: "Completed Mandate",
    url: "/completed-mandate",
    icon: Briefcase,
  },
  {
    title: "Contact Management",
    url: "/contact-management",
    icon: Users,
      children: [
        { title: "POC 1", url: "/contact-management/poc1", disabled: false },
        { title: "POC 2", url: "/contact-management/poc2", disabled: false },
        { title: "POC 3", url: "/contact-management/poc3", disabled: false },
        { title: "Other Fields", url: "/contact-management/other-fields", disabled: false },
      ],
  },

  {
  title: "Hold",
  url: "/hold",
  icon: PauseCircle,
  },
  {
  title: "Dropped",
  url: "/dropped",
  icon: TrendingDown,
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
    title: "Audit Analytics",
    url: "/audit-log",
    icon: FileText,
    requiresRole: 'admin' as const,
  },
];

const investorSubItems = [
  { title: "Home", url: "/investor-relation/home", icon: Home }, // ✅ Added Home
  { title: "Investor Universe", url: "/investor-relation/investor-management/database" }, // ✅ Added Database Link
  { title: "Outreach", url: "/investor-relation/investor-management/outreach",hideCount: true, },
  { title: "Warm", url: "/investor-relation/investor-management/warm" },
  { title: "Active", url: "/investor-relation/investor-management/active" },
  { title: "Dealmaking", url: "/investor-relation/investor-management/dealmaking" },
  // ✅ NEW ITEM ADDED HERE
{ 
    title: "Contact Health", 
    url: "/investor-contact-management", 
    icon: Users,
    children: [ // ✅ Added Children
       { title: "POC 1 (Primary)", url: "/investor-contact-management/poc1" },
       { title: "POC 2", url: "/investor-contact-management/poc2" },
       { title: "POC 3", url: "/investor-contact-management/poc3" },
       { title: "Investor Other Fields", url: "/investor-contact-management/other-fields" },
    ]
  },

];


const stageKeyMap: Record<string, string> = {
  Universe: "universe",
  Qualified: "qualified",
  Outreach: "outreach",
  Pitching: "pitching",
  Mandates: "mandates",
  "Completed Mandate": "completed_mandate",
  Hold: "hold",
  Dropped: "dropped",
  Rejected: "rejected",
};


export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const currentPath = useMemo(() => {
    // remove querystring + trailing slash (except "/")
    const base = (location || "").split("?")[0];
    const trimmed = base !== "/" ? base.replace(/\/+$/, "") : base;
    return trimmed || "/";
  }, [location]);

  const isActiveUrl = (url: string) => {
    const target = url !== "/" ? url.replace(/\/+$/, "") : url;
    return currentPath === target || currentPath.startsWith(target + "/");
  };
  const { user } = useAuth();
  const { filters } = useLeadFilters();
  const role = user?.role || "";
  const canSeeLeadCRM = role === "admin" || role === "partner";
  const canSeeEpn = role === "admin" || role === "partner";

const { data: allLeads = [] } = useQuery({
  queryKey: ["leads", "sidebar", role],
  queryFn: async () => {
    // ✅ analysts: only their assigned/team leads
    const url = role === "analyst" ? "/leads/stage/universe" : "/leads/all";
    const res = await apiRequest("GET", url);
    return res.json();
  },
  refetchOnWindowFocus: false,
});

// ✅ Fetch EPN links for all lead stages (for sidebar filtered counts)
const sidebarStages = ["qualified", "outreach", "pitching", "mandates", "completed_mandate", "hold", "dropped", "rejected"];

const { data: epnLinksSidebar = [] } = useQuery<Array<{ leadId: number; epns: any[] }>>({
  queryKey: ["epn", "links", "sidebar"],
  enabled: canSeeEpn, // ✅ analysts won't call /epn/links at all
  queryFn: async () => {
    // fetch all stages in parallel
    const results = await Promise.all(
      sidebarStages.map(async (st) => {
        const res = await apiRequest("GET", `/epn/links?stage=${st}`);
        return res.json();
      })
    );
    // flatten
    return results.flat();
  },
  refetchOnWindowFocus: false,
  staleTime: 0,
});

// ✅ leadId -> linked epns map for sidebar filtering
const epnByLeadIdSidebar = useMemo(() => {
  const m = new Map<number, any[]>();
  for (const row of epnLinksSidebar || []) {
    m.set(row.leadId, row.epns || []);
  }
  return m;
}, [epnLinksSidebar]);



  // ✅ NEW: Fetch Investor Counts
  const { data: investorMetrics } = useQuery({
    queryKey: ["investor-metrics"],
    queryFn: async () => {
      const res = await apiFetch("/api/dashboard/investor-metrics");
      if (!res.ok) return null;
      return res.json();
    },
  });


  // ✅ Fetch EPN Bucket Counts (Kept the correct apiFetch ones)
  const { data: idfcMetrics } = useQuery({
    queryKey: ["/api/epn/bucket-metrics/idfc"],
    enabled: canSeeEpn,
    queryFn: async () => {
      const res = await apiFetch("/api/epn/bucket-metrics/idfc");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: ocpMetrics } = useQuery({
    queryKey: ["/api/epn/bucket-metrics/other_channel_partner"],
    enabled: canSeeEpn,
    queryFn: async () => {
      const res = await apiFetch("/api/epn/bucket-metrics/other_channel_partner");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: epnMetrics } = useQuery({
    queryKey: ["/api/epn/bucket-metrics/other_epn"],
    enabled: canSeeEpn,
    queryFn: async () => {
      const res = await apiFetch("/api/epn/bucket-metrics/other_epn");
      if (!res.ok) return null;
      return res.json();
    },
  });

const countsByStage = useMemo(() => {
  const norm = (v: any) =>
    typeof v === "string" ? v.trim().toLowerCase() : String(v ?? "").trim().toLowerCase();

  const getSS = (c: any) => String(c?.subSector ?? c?.sub_sector ?? "").trim();

  const isAll = (arr: any[] | undefined | null) => !arr || arr.length === 0;

  // ✅ multi-select arrays (empty = "All")
  const filterSector = (filters as any).filterSector ?? [];
  const filterSubSector = (filters as any).filterSubSector ?? [];
  const filterAssignedTo = (filters as any).filterAssignedTo ?? [];
  const filterLocation = (filters as any).filterLocation ?? [];

    // ✅ EPN filters (multi-select arrays; empty = "All")
  const filterEpnLinkage = (filters as any).filterEpnLinkage ?? [];
  const filterEpnBucket = (filters as any).filterEpnBucket ?? [];
  const filterEpnCategory = (filters as any).filterEpnCategory ?? [];
  const filterEpnStage = (filters as any).filterEpnStage ?? [];
  const filterEpnPartnerIds = (filters as any).filterEpnPartnerIds ?? [];

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

  // ✅ Sector (multi-select)
  if (!isAll(filterSector)) {
    const selected = filterSector.map(norm);
    result = result.filter((lead: any) => selected.includes(norm(lead.company?.sector || "")));
  }

  // ✅ Sub-sector (multi-select)
  if (!isAll(filterSubSector)) {
    const selected = filterSubSector.map(norm);
    result = result.filter((lead: any) => selected.includes(norm(getSS(lead.company))));
  }

  // ✅ Assigned To (multi-select: ids + "unassigned")
  if (!isAll(filterAssignedTo)) {
    const wantsUnassigned = filterAssignedTo.includes("unassigned");
    const wantsIds = filterAssignedTo.filter((x: string) => x !== "unassigned");

    result = result.filter((lead: any) => {
      const assignee = lead.assignedTo || null;
      return (
        (wantsUnassigned && !assignee) ||
        (assignee && wantsIds.includes(assignee))
      );
    });
  }

  // ✅ Location (multi-select)
  if (!isAll(filterLocation)) {
    const selected = filterLocation.map((x: any) => String(x ?? "").trim());
    result = result.filter((lead: any) =>
      selected.includes(String(lead.company?.location ?? "").trim())
    );
  }


  const applyEpnFilters = canSeeEpn; // analysts should NOT apply EPN filters
  
    // ✅ EPN relation filters (lead -> linked epn partners)
  const anyLinkedMatch = (leadId: number, pred: (p: any) => boolean) => {
    const linked = epnByLeadIdSidebar.get(leadId) || [];
    return linked.some(pred);
  };

  // 1) Linked / Unlinked
  if (!isAll(filterEpnLinkage)) {
    const wantsLinked = filterEpnLinkage.includes("linked");
    const wantsUnlinked = filterEpnLinkage.includes("unlinked");

    // if both selected, treat as "all"
    if (!(wantsLinked && wantsUnlinked)) {
      result = result.filter((lead: any) => {
        const linked = (epnByLeadIdSidebar.get(lead.id) || []).length > 0;
        return wantsLinked ? linked : !linked;
      });
    }
  }

  // 2) Bucket
  if (!isAll(filterEpnBucket)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnBucket.includes((p.bucket || "").trim()))
    );
  }

  // 3) Category
  if (!isAll(filterEpnCategory)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnCategory.includes((p.category || "").trim()))
    );
  }

  // 4) Partner Stage
  if (!isAll(filterEpnStage)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnStage.includes((p.stage || "").trim()))
    );
  }

  // 5) Specific Partner IDs
  if (!isAll(filterEpnPartnerIds)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnPartnerIds.includes(String(p.id)))
    );
  }


  // Group counts
// Group counts
const counts: Record<string, number> = {

  universe: 0,
  qualified: 0,
  outreach: 0,
  pitching: 0,
  mandates: 0,
  completed_mandate: 0,
  hold: 0,
  dropped: 0,
  rejected: 0,
};

for (const lead of result) {
  const st = (lead.stage || "").toLowerCase();
  if (counts[st] !== undefined) counts[st] += 1;
}
// ✅ Universe badge should include:
// (A) leads still in "universe" stage
// (B) active stages: qualified + outreach + pitching + mandates
const universeStageCount = counts.universe;

counts.universe =
  universeStageCount +
  counts.qualified +
  counts.outreach +
  counts.pitching +
  counts.mandates;


  return counts;
}, [allLeads, filters, epnByLeadIdSidebar]);


  const canManageUsers = user?.role === 'admin' || user?.role === 'partner';

// ---------- Grouping ----------
// const homeItems = crmNavigationItems.filter((i) => i.title === "Home");
const unifiedItems = crmNavigationItems.filter((i) => i.title === "Unified Dashboard");

const bdItems = crmNavigationItems.filter((i) =>
  ["Home", "Universe", "Qualified", "Outreach", "Pitching", "Mandates", "Completed Mandate"].includes(i.title)
);

const contactItems = crmNavigationItems.filter((i) => i.title === "Contact Management");

const greenRoomItems = crmNavigationItems.filter((i) =>
  ["Hold", "Dropped", "Rejected"].includes(i.title)
);

const scheduledItems = crmNavigationItems.filter((i) => i.title === "Scheduled Tasks");

// ---------- Heading style (silver) ----------
const headingClass =
  "mx-2 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-800/80 " +
  "bg-slate-200/40 backdrop-blur-sm rounded-md border border-slate-300/40";

// ---------- Render helper (keeps counts + children + SPA navigation fix) ----------
const renderNavItems = (items: any[]) => (
  <SidebarMenu>
    {items.map((item) => {
      const active = isActiveUrl(item.url);

      return (
        <Fragment key={item.title}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-active={active}>
              <a
                href={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  setLocation(item.url);
                }}
                data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                className={[
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                    : "hover:bg-muted/60",
                  "rounded-md px-2 py-2 transition-colors",
                ].join(" ")}
              >
        {/* ✅ Only render icon if it exists */}
                {item.icon && <item.icon />}
                <span className="flex-1">{item.title}</span>

{/* ✅ Fix: Check if hideCount is NOT true before showing badge */}
                {stageKeyMap[item.title] && !item.hideCount && (
                  <span
                    className={[
                      "ml-auto text-xs px-2 py-0.5 rounded-full",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    ].join(" ")}
                    data-testid={`nav-count-${stageKeyMap[item.title]}`}
                  >
                    {countsByStage[stageKeyMap[item.title]] ?? 0}
                  </span>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Children (Contact Management POCs) */}
          {item.children?.map((child: any) => {
            const isDisabled = child.disabled ?? !child.url;

            return (
              <SidebarMenuItem key={`${item.title}-${child.title}`}>
                <SidebarMenuButton asChild data-active={false}>
                  {isDisabled ? (
                    <button
                      type="button"
                      disabled
                      data-testid={`nav-contact-management-${child.title
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                      className="w-full text-left rounded-md px-2 py-2 ml-6 text-muted-foreground opacity-60 cursor-not-allowed"
                    >
                      <span className="text-xs">{child.title}</span>
                    </button>
                  ) : (
                    <a
                      href={child.url}
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation(child.url);
                      }}
                      data-testid={`nav-contact-management-${child.title
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                      className="w-full text-left rounded-md px-2 py-2 ml-6 hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-xs">{child.title}</span>
                    </a>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </Fragment>
      );
    })}
  </SidebarMenu>
);



  return (
    <Sidebar className="bg-gray-50 border-r border-border">
      <SidebarContent>
{/* Top Brand Block */}
<div className="px-3 pt-3 pb-2">
  <div className="rounded-lg border border-cyan-300/40 bg-cyan-100/35 overflow-hidden">
    <div className="h-20 w-full bg-white flex items-center justify-center">
      <img
        src="/brand/spike.jpeg"
        alt="SPIKE"
        className="h-full w-full object-contain"
        loading="eager"
      />
    </div>

  </div>
</div>

        <div className="mx-2 my-2 h-px bg-border" />
        {/* CRM Navigation */}  
{/* 1) Investment Bank CRM -> Unified Dashboard */}
<SidebarGroup className="pt-1 bg-emerald-50">
  <SidebarGroupLabel 
    className={headingClass.replace(
      "bg-slate-200/40", 
      "bg-gradient-to-r from-blue-100 via-white to-blue-100 border-blue-200/60 shadow-sm"
    )}
  >
    <span className="flex items-center gap-2 bg-emerald-50">
      <Building2 className="h-3.5 w-3.5 text-slate-700/80 " />
      Investment Bank CRM
    </span>
  </SidebarGroupLabel>
  <div className="h-1" />
  <SidebarGroupContent>{renderNavItems(unifiedItems)}</SidebarGroupContent>
</SidebarGroup>



        {/* 2) Business Development */}
        <SidebarGroup className="pt-1 bg-blue-500">
          <SidebarGroupLabel 
            // Shiny effect: Gradient from Blue -> White -> Blue
            className={headingClass.replace(
              "bg-slate-200/40", 
              "bg-gradient-to-r from-blue-100 via-white to-blue-100 border-blue-200/60 shadow-sm"
            )}
          >
            <span className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-slate-700/80" />
              Business Development
            </span>
          </SidebarGroupLabel>
          <div className="h-1" />
          <SidebarGroupContent>{renderNavItems(bdItems)}</SidebarGroupContent>
        </SidebarGroup>


        {/* 3) Contact Management */}
        <SidebarGroup className="pt-1 bg-cyan-50">
          <SidebarGroupLabel 
            // Shiny effect: Gradient from Blue -> White -> Blue
            className={headingClass.replace(
              "bg-slate-200/40", 
              "bg-gradient-to-r from-blue-100 via-white to-blue-100 border-blue-200/60 shadow-sm"
            )}
          >
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-slate-700/80" />
              Field Coverage
            </span>
          </SidebarGroupLabel>
          <div className="h-1" />
          <SidebarGroupContent>{renderNavItems(contactItems)}</SidebarGroupContent>
        </SidebarGroup>

           {/* Investor Relation (Admin only) */}
        {["admin", "partner", "analyst"].includes(user?.role || "") && (
          <SidebarGroup className="pt-1 bg-emerald-50">
            <SidebarGroupLabel 
            // Shiny effect: Gradient from Blue -> White -> Blue
            className={headingClass.replace(
              "bg-slate-200/40", 
              "bg-gradient-to-r from-blue-100 via-white to-blue-100 border-blue-200/60 shadow-sm"
            )}
          >
              <span className="flex items-center gap-2">
                <Handshake className="h-3.5 w-3.5 text-slate-700/80" />
                Investor relation
              </span>
            </SidebarGroupLabel>
            <div className="h-1" />
<SidebarGroupContent>
  {/* Mini header: Investor management */}
  <div className="px-3 py-2 ml-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    Investor management
  </div>
  
  <SidebarMenu>
    {investorSubItems.map((child) => {
      const active = isActiveUrl(child.url);
      
      // ✅ Determine count based on title (skip Home)
      let count = 0;
      if (investorMetrics && child.title !== "Home") {
        const key = child.title.toLowerCase();
        if (child.title === "Investor Universe") count = investorMetrics.totalInvestors || 0;
        else if (child.title === "Outreach") count = investorMetrics.outreach || 0;
        else if (child.title === "Active") count = investorMetrics.active || 0;
        else if (child.title === "Warm") count = investorMetrics.warm || 0;
        else if (child.title === "Dealmaking") count = investorMetrics.dealmaking || 0;
      }

      return (
        <Fragment key={child.title}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-active={active}>
              <a
                href={child.url}
                onClick={(e) => {
                  e.preventDefault();
                  setLocation(child.url);
                }}
                className={[
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                    : "hover:bg-muted/60",
                  "rounded-md px-2 py-2 transition-colors ml-2 flex items-center justify-between",
                ].join(" ")}
              >
                <span className="text-sm">{child.title}</span>
                
                {/* ✅ Count Badge - show for all non-Home items (including zero) */}
                {child.title !== "Home" && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Children (Contact Health POCs) */}
          {child.children?.map((subChild: any) => {
            return (
              <SidebarMenuItem key={`${child.title}-${subChild.title}`}>
                <SidebarMenuButton asChild data-active={false}>
                  <a
                    href={subChild.url}
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation(subChild.url);
                    }}
                    className="w-full text-left rounded-md px-2 py-2 ml-6 hover:bg-muted/60 transition-colors"
                  >
                    <span className="text-xs">{subChild.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </Fragment>
      );
    })}
  </SidebarMenu>
</SidebarGroupContent>

          </SidebarGroup>
        )}



{/* EPN Relations (Admin + Partner) */}
        {(user?.role === "admin" || user?.role === "partner") && (
          <SidebarGroup className="pt-1 bg-fuchsia-50">
            <SidebarGroupLabel
              className={headingClass.replace(
                "bg-slate-200/40",
                "bg-gradient-to-r from-blue-100 via-white to-blue-100 border-blue-200/60 shadow-sm"
              )}
            >
              <span className="flex items-center gap-2">
                <Handshake className="h-3.5 w-3.5 text-slate-700/80" />
                EPN Relations
              </span>
            </SidebarGroupLabel>

            <div className="h-1" />

            <SidebarGroupContent>
              {/* Top: Home + Universe */}
              <SidebarMenu>
                {/* Home (Unified) */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={isActiveUrl("/epn")}>
                    <a
                      href="/epn"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation("/epn");
                      }}
                      className={[
                        isActiveUrl("/epn")
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                          : "hover:bg-muted/60",
                        "rounded-md px-2 py-2 transition-colors ml-2 flex items-center gap-2",
                      ].join(" ")}
                    >
                      <Home className="h-4 w-4" />
                      <span className="text-sm">Home</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Universe */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={isActiveUrl("/epn/universe")}>
                    <a
                      href="/epn/universe"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation("/epn/universe");
                      }}
                      className={[
                        isActiveUrl("/epn/universe")
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                          : "hover:bg-muted/60",
                        "rounded-md px-2 py-2 transition-colors ml-2 flex items-center gap-2",
                      ].join(" ")}
                    >
                      <Database className="h-4 w-4" />
                      <span className="text-sm">Universe</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              {/* Channel Partners heading */}
              <div className="px-3 py-2 ml-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Channel Partners
              </div>

              <SidebarMenu>
                {/* IDFC Group (Dashboard/Home icon node) */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={isActiveUrl("/epn/idfc")}>
                    <a
                      href="/epn/idfc"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation("/epn/idfc");
                      }}
                      className={[
                        isActiveUrl("/epn/idfc")
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                          : "hover:bg-muted/60",
                        "rounded-md px-2 py-2 transition-colors ml-2 flex items-center gap-2",
                      ].join(" ")}
                    >
                      <Home className="h-4 w-4" />
                      <span className="text-sm">IDFC</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* IDFC stages */}
                {[
                  { title: "Universe", url: "/epn/idfc/universe", count: idfcMetrics?.total },
                  { title: "Outreach", url: "/epn/idfc/outreach", count: idfcMetrics?.outreach },
                  { title: "Active", url: "/epn/idfc/active", count: idfcMetrics?.active },
                  { title: "RainMaking", url: "/epn/idfc/rainmaking", count: idfcMetrics?.rainmaking },
                ].map((s: any) => {
                  const active = isActiveUrl(s.url);
                  return (
                    <SidebarMenuItem key={`idfc-${s.title}`}>
                      <SidebarMenuButton asChild data-active={active}>
                        <a
                          href={s.url}
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation(s.url);
                          }}
                          className={[
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                              : "hover:bg-muted/60",
                            "rounded-md px-2 py-2 transition-colors ml-6 flex items-center w-full",
                          ].join(" ")}
                        >
                          <span className="text-xs flex-1">{s.title}</span>
                          <span
                            className={[
                              "ml-auto text-xs px-2 py-0.5 rounded-full",
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {s.count ?? 0}
                          </span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* Other Channel Partners (Dashboard/Home icon node) */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={isActiveUrl("/epn/other-channel-partners")}>
                    <a
                      href="/epn/other-channel-partners"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation("/epn/other-channel-partners");
                      }}
                      className={[
                        isActiveUrl("/epn/other-channel-partners")
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                          : "hover:bg-muted/60",
                        "rounded-md px-2 py-2 transition-colors ml-2 flex items-center gap-2",
                      ].join(" ")}
                    >
                      <Home className="h-4 w-4" />
                      <span className="text-sm">Other Channel Partners</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Other Channel Partner stages */}
                {[
                  { title: "Universe", url: "/epn/other-channel-partners/universe", count: ocpMetrics?.total },
                  { title: "Outreach", url: "/epn/other-channel-partners/outreach", count: ocpMetrics?.outreach },
                  { title: "Active", url: "/epn/other-channel-partners/active", count: ocpMetrics?.active },
                  { title: "RainMaking", url: "/epn/other-channel-partners/rainmaking", count: ocpMetrics?.rainmaking },
                ].map((s: any) => {
                  const active = isActiveUrl(s.url);
                  return (
                    <SidebarMenuItem key={`ocp-${s.title}`}>
                      <SidebarMenuButton asChild data-active={active}>
                        <a
                          href={s.url}
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation(s.url);
                          }}
                          className={[
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                              : "hover:bg-muted/60",
                            "rounded-md px-2 py-2 transition-colors ml-6 flex items-center w-full",
                          ].join(" ")}
                        >
                          <span className="text-xs flex-1">{s.title}</span>
                          <span
                            className={[
                              "ml-auto text-xs px-2 py-0.5 rounded-full",
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {s.count ?? 0}
                          </span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>

              {/* Other EPN heading */}
              <div className="px-3 py-2 ml-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Other EPN
              </div>

              <SidebarMenu>
                {/* Other EPN (Dashboard/Home icon node) */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={isActiveUrl("/epn/other-epn")}>
                    <a
                      href="/epn/other-epn"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation("/epn/other-epn");
                      }}
                      className={[
                        isActiveUrl("/epn/other-epn")
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                          : "hover:bg-muted/60",
                        "rounded-md px-2 py-2 transition-colors ml-2 flex items-center gap-2",
                      ].join(" ")}
                    >
                      <Home className="h-4 w-4" />
                      <span className="text-sm">Home</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Other EPN stages */}
                {[
                  { title: "Universe", url: "/epn/other-epn/universe", count: epnMetrics?.total },
                  { title: "Outreach", url: "/epn/other-epn/outreach", count: epnMetrics?.outreach },
                  { title: "Active", url: "/epn/other-epn/active", count: epnMetrics?.active },
                  { title: "RainMaking", url: "/epn/other-epn/rainmaking", count: epnMetrics?.rainmaking },
                ].map((s: any) => {
                  const active = isActiveUrl(s.url);
                  return (
                    <SidebarMenuItem key={`oepn-${s.title}`}>
                      <SidebarMenuButton asChild data-active={active}>
                        <a
                          href={s.url}
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation(s.url);
                          }}
                          className={[
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                              : "hover:bg-muted/60",
                            "rounded-md px-2 py-2 transition-colors ml-6 flex items-center w-full",
                          ].join(" ")}
                        >
                          <span className="text-xs flex-1">{s.title}</span>
                          <span
                            className={[
                              "ml-auto text-xs px-2 py-0.5 rounded-full",
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {s.count ?? 0}
                          </span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 4) Green Room */}
        <SidebarGroup className="pt-1 bg-red-50">
          <SidebarGroupLabel 
            // Shiny effect: Gradient from Blue -> White -> Blue
            className={headingClass.replace(
              "bg-slate-200/40", 
              "bg-gradient-to-r from-blue-100 via-white to-blue-100 border-blue-200/60 shadow-sm"
            )}
          >
            <span className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-slate-700/80" />
              Green Room
            </span>
          </SidebarGroupLabel>
          <div className="h-1" />
          <SidebarGroupContent>{renderNavItems(greenRoomItems)}</SidebarGroupContent>
        </SidebarGroup>

        {/* 5) Scheduled Tasks (no heading) */}
        <SidebarGroup className="pt-1">
          <div className="mx-2 my-1 h-px bg-border" />
          <SidebarGroupContent>{renderNavItems(scheduledItems)}</SidebarGroupContent>
        </SidebarGroup>


        {/* Management Navigation */}
        {canManageUsers && (
            <SidebarGroup className="pt-1 bg-amber-100">
              <SidebarGroupLabel 
            // Shiny effect: Gradient from Blue -> White -> Blue
            className={headingClass.replace(
              "bg-slate-200/40", 
              "bg-gradient-to-r from-blue-100 via-white to-blue-100 border-blue-200/60 shadow-sm"
            )}
          >
                <span className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5 text-slate-700/80" />
                  Management
                </span>
              </SidebarGroupLabel>
              <div className="h-1" />
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigationItems.map((item) => {
                  const active = isActiveUrl(item.url);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={active}>
                          <a
                            href={item.url}
                            onClick={(e) => {
                              e.preventDefault();
                              setLocation(item.url);
                            }}
                            data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                            className={[
                              active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border border-primary/30"
                                : "hover:bg-muted/60",
                              "rounded-md px-2 py-2 transition-colors",
                            ].join(" ")}
                          >
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      
      </SidebarContent>
    </Sidebar>
  );
}