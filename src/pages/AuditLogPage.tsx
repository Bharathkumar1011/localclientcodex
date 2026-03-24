import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRightLeft,
  Briefcase,
  Building2,
  Clock3,
  FileText,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  UserCircle2,
  Network,
  ListOrdered,
} from "lucide-react";

type TimeWindow = "24h" | "15d" | "30d";
type DrilldownTab = "profile" | "leads" | "investors" | "epn" | "timeline";

interface AuditOverviewResponse {
  generatedAt: string;
  summaryCards: {
    activeUsers24h: number;
    totalActiveLeads: number;
    activeMandates: number;
    conversionPct: number;
    investorResponseRate: number;
    stageChanges30d: number;
  };
  monthlyReport: {
    period: string;
    totalActiveLeads: number;
    activeMandates: number;
    conversionPct: number;
    investorResponseRate: number;
    channelContribution: Array<{
      source: string;
      count: number;
      percentage: number;
    }>;
  };
  charts: {
    userRoleMix: Array<{ role: string; count: number }>;
    channelContribution: Array<{ source: string; count: number; percentage: number }>;
    actionMix: Array<{ entityType: string; count: number }>;
    epnBucketMix: Array<{ bucket: string; count: number }>;
  };
  idfcFocus: {
    idfcPartners: number;
    idfcLeadLinks: number;
  };
}

interface AuditUserSummary {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: "admin" | "partner" | "analyst" | "intern";
  lastLoginTime?: string | null;
  lastActionTime?: string | null;
  firstActivityToday?: string | null;
  roughHoursToday: number;

  actions24h: number;
  actions15d: number;
  actions30d: number;

  stageChanges24h: number;
  stageChanges15d: number;
  stageChanges30d: number;

  leadsAdded24h: number;
  leadsAdded15d: number;
  leadsAdded30d: number;

  investorsAdded24h: number;
  investorsAdded15d: number;
  investorsAdded30d: number;

  epnAdded24h: number;
  epnAdded15d: number;
  epnAdded30d: number;
}

interface AuditUserProfileResponse {
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    lastLoginTime?: string | null;
    lastActionTime?: string | null;
  };
  window: TimeWindow;
  metrics: {
    firstActivityToday?: string | null;
    lastActivityToday?: string | null;
    roughHoursToday: number;
    actions: number;
    stageChanges: number;
    leadsAdded: number;
    investorsAdded: number;
    epnAdded: number;
  };
  charts: {
    actionMix: Array<{ entityType: string; count: number }>;
  };
  recentTimeline: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId?: string | number;
    description?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    createdAt?: string | null;
  }>;
}

interface DrilldownListResponse {
  window: TimeWindow;
  summary: {
    totalActions: number;
    addedCount: number;
    stageChangeCount: number;
    sourceBreakdown: {
      singleAdd: number;
      csvUpload: number;
      bulkImport: number;
      other: number;
    };
    distinctInvestorsTouched?: number;
    distinctEpnTouched?: number;
    idfcTouchedCount?: number;
  };
  items: Array<any>;
}

interface TimelineItem {
  id: number;
  createdAt?: string | null;
  action: string;
  entityType: string;
  entityId?: string | number;
  entityName?: string | null;
  description?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  bucket?: string | null;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPct(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function roleBadgeClass(role?: string) {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-700 border-red-200";
    case "partner":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "analyst":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "intern":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function bucketLabel(bucket?: string | null) {
  if (bucket === "idfc") return "IDFC";
  if (bucket === "other_channel_partner") return "Other Channel Partner";
  if (bucket === "other_epn") return "Other EPN";
  return bucket || "—";
}

function entityLabel(entityType?: string) {
  if (entityType === "lead") return "Leads";
  if (entityType === "investor") return "Investors";
  if (entityType === "epn" || entityType === "epn_partner") return "EPN";
  return entityType || "Other";
}

function formatActionName(action?: string) {
  if (!action) return "—";
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getWindowValue(
  user: AuditUserSummary,
  prefix: "actions" | "stageChanges" | "leadsAdded" | "investorsAdded" | "epnAdded",
  window: TimeWindow
) {
  if (window === "24h") return user[`${prefix}24h` as keyof AuditUserSummary] as number;
  if (window === "15d") return user[`${prefix}15d` as keyof AuditUserSummary] as number;
  return user[`${prefix}30d` as keyof AuditUserSummary] as number;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  accentClass: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
            <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className={`rounded-2xl p-3 ${accentClass}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HorizontalBars({
  title,
  description,
  items,
  valueFormatter,
  barClass = "bg-slate-900",
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: number; helper?: string }>;
  valueFormatter?: (value: number) => string;
  barClass?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">No data available.</div>
        ) : (
          items.map((item) => {
            const width = `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                    {item.helper ? <p className="text-xs text-slate-500">{item.helper}</p> : null}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {valueFormatter ? valueFormatter(item.value) : item.value}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-2.5 rounded-full ${barClass}`} style={{ width }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function TabButton({
  label,
  value,
  activeTab,
  onClick,
}: {
  label: string;
  value: DrilldownTab;
  activeTab: DrilldownTab;
  onClick: (value: DrilldownTab) => void;
}) {
  const active = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const canAccessAudit = user?.role === "admin" || user?.role === "partner";

  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>("24h");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DrilldownTab>("profile");

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery<AuditOverviewResponse>({
    queryKey: ["/api/audit/overview"],
    enabled: !!user && canAccessAudit,
    queryFn: async () => {
      const res = await apiFetch("/api/audit/overview");
      if (!res.ok) throw new Error(`Failed to fetch audit overview: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const {
    data: userSummaries = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<AuditUserSummary[]>({
    queryKey: ["/api/audit/users/summary"],
    enabled: !!user && canAccessAudit,
    queryFn: async () => {
      const res = await apiFetch("/api/audit/users/summary");
      if (!res.ok) throw new Error(`Failed to fetch audit user summaries: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return userSummaries;

    return userSummaries.filter((item) => {
      const fullName = `${item.firstName || ""} ${item.lastName || ""}`.toLowerCase();
      const email = (item.email || "").toLowerCase();
      const role = (item.role || "").toLowerCase();
      return fullName.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [userSummaries, search]);

  useEffect(() => {
    if (!selectedUserId && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = useMemo(() => {
    if (!filteredUsers.length) return null;
    if (!selectedUserId) return filteredUsers[0] || null;
    return filteredUsers.find((item) => item.id === selectedUserId) || filteredUsers[0] || null;
  }, [filteredUsers, selectedUserId]);

  const selectedUserName = useMemo(() => {
    if (!selectedUser) return "—";
    return `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() || selectedUser.email;
  }, [selectedUser]);

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<AuditUserProfileResponse>({
    queryKey: ["/api/audit/users/profile", selectedUserId, selectedWindow],
    enabled: !!selectedUserId && !!user && canAccessAudit,
    queryFn: async () => {
      const res = await apiFetch(`/api/audit/users/${selectedUserId}/profile?window=${selectedWindow}`);
      if (!res.ok) throw new Error(`Failed to fetch audit user profile: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const {
    data: leadsData,
    isLoading: leadsLoading,
    error: leadsError,
  } = useQuery<DrilldownListResponse>({
    queryKey: ["/api/audit/users/leads", selectedUserId, selectedWindow],
    enabled: !!selectedUserId && !!user && canAccessAudit,
    queryFn: async () => {
      const res = await apiFetch(`/api/audit/users/${selectedUserId}/leads?window=${selectedWindow}`);
      if (!res.ok) throw new Error(`Failed to fetch audit user leads: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const {
    data: investorsData,
    isLoading: investorsLoading,
    error: investorsError,
  } = useQuery<DrilldownListResponse>({
    queryKey: ["/api/audit/users/investors", selectedUserId, selectedWindow],
    enabled: !!selectedUserId && !!user && canAccessAudit,
    queryFn: async () => {
      const res = await apiFetch(`/api/audit/users/${selectedUserId}/investors?window=${selectedWindow}`);
      if (!res.ok) throw new Error(`Failed to fetch audit user investors: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const {
    data: epnData,
    isLoading: epnLoading,
    error: epnError,
  } = useQuery<DrilldownListResponse>({
    queryKey: ["/api/audit/users/epn", selectedUserId, selectedWindow],
    enabled: !!selectedUserId && !!user && canAccessAudit,
    queryFn: async () => {
      const res = await apiFetch(`/api/audit/users/${selectedUserId}/epn?window=${selectedWindow}`);
      if (!res.ok) throw new Error(`Failed to fetch audit user epn: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const {
    data: timelineData = [],
    isLoading: timelineLoading,
    error: timelineError,
  } = useQuery<TimelineItem[]>({
    queryKey: ["/api/audit/users/timeline", selectedUserId, selectedWindow],
    enabled: !!selectedUserId && !!user && canAccessAudit,
    queryFn: async () => {
      const res = await apiFetch(`/api/audit/users/${selectedUserId}/timeline?window=${selectedWindow}&limit=100`);
      if (!res.ok) throw new Error(`Failed to fetch audit user timeline: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  if (!user) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Please log in to access audit analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccessAudit) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-semibold text-amber-900">Access restricted</h2>
                <p className="mt-2 text-sm text-amber-800">
                  Audit Analytics is currently available only for Admin and Partner users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (overviewLoading || usersLoading) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <FileText className="h-8 w-8" />
            Audit Analytics
          </h1>
          <p className="mt-2 text-slate-500">Loading audit overview...</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-8 w-20 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (overviewError || usersError || !overview) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold text-red-900">Unable to load audit analytics</h2>
            <p className="mt-2 text-sm text-red-800">
              Please check whether Step 2 and Step 4 backend routes are added and the server is restarted.
            </p>
            <p className="mt-1 text-sm text-red-700">
              Expected APIs: <span className="font-medium">/api/audit/overview</span>,{" "}
              <span className="font-medium">/api/audit/users/summary</span> and drilldown routes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRoleItems = (overview.charts.userRoleMix || []).map((item) => ({
    label: item.role?.toUpperCase() || "UNKNOWN",
    value: Number(item.count || 0),
  }));

  const channelItems = (overview.charts.channelContribution || []).map((item) => ({
    label: item.source || "Unknown",
    value: Number(item.count || 0),
    helper: `${formatPct(item.percentage)} of new leads`,
  }));

  const actionMixItems = (overview.charts.actionMix || []).map((item) => ({
    label: entityLabel(item.entityType),
    value: Number(item.count || 0),
  }));

  const epnBucketItems = (overview.charts.epnBucketMix || []).map((item) => ({
    label: bucketLabel(item.bucket),
    value: Number(item.count || 0),
  }));

  const renderSourceBreakdown = (summary?: DrilldownListResponse["summary"]) => {
    if (!summary) return null;

    return (
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Single Add</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{summary.sourceBreakdown?.singleAdd || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">CSV Upload</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{summary.sourceBreakdown?.csvUpload || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Bulk Import</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{summary.sourceBreakdown?.bulkImport || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Other</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{summary.sourceBreakdown?.other || 0}</p>
        </div>
      </div>
    );
  };

  const renderDataError = (title: string) => (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {title} could not be loaded. Please confirm the corresponding backend route from Step 4 is working.
    </div>
  );

  const renderProfileTab = () => {
    if (profileLoading) {
      return <div className="text-sm text-slate-500">Loading user profile...</div>;
    }

    if (profileError || !profileData) {
      return renderDataError("User profile");
    }

    const profileActionMix = (profileData.charts?.actionMix || []).map((item) => ({
      label: entityLabel(item.entityType),
      value: Number(item.count || 0),
    }));

    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">User Profile Summary</CardTitle>
              <CardDescription>Selected window: {selectedWindow}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {`${profileData.user.firstName || ""} ${profileData.user.lastName || ""}`.trim() || profileData.user.email}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={roleBadgeClass(profileData.user.role)}>
                    {profileData.user.role}
                  </Badge>
                  <span className="text-xs text-slate-500">{profileData.user.email}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">First Activity Today</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateTime(profileData.metrics.firstActivityToday)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Last Activity Today</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateTime(profileData.metrics.lastActivityToday)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Last Login</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateTime(profileData.user.lastLoginTime)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Rough Hours Today</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {Number(profileData.metrics.roughHoursToday || 0).toFixed(1)} hrs
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-xs text-slate-500">Actions</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{profileData.metrics.actions}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-xs text-slate-500">Stage Changes</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{profileData.metrics.stageChanges}</p>
                </div>
                <div className="rounded-xl bg-sky-50 p-3">
                  <p className="text-xs text-sky-600">Leads Added</p>
                  <p className="mt-2 text-xl font-bold text-sky-900">{profileData.metrics.leadsAdded}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-600">Investors Added</p>
                  <p className="mt-2 text-xl font-bold text-emerald-900">{profileData.metrics.investorsAdded}</p>
                </div>
                <div className="rounded-xl bg-violet-50 p-3">
                  <p className="text-xs text-violet-600">EPN Added</p>
                  <p className="mt-2 text-xl font-bold text-violet-900">{profileData.metrics.epnAdded}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <HorizontalBars
            title="Action Mix"
            description="Entity-wise split for this user in selected window"
            items={profileActionMix}
            barClass="bg-gradient-to-r from-blue-500 to-indigo-600"
          />
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent User Timeline Preview</CardTitle>
            <CardDescription>Latest 10 events from profile API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(profileData.recentTimeline || []).length === 0 ? (
              <div className="text-sm text-slate-500">No recent activity found.</div>
            ) : (
              profileData.recentTimeline.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatActionName(item.action)} • {entityLabel(item.entityType)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.description || "No description available."}
                      </p>
                      {(item.oldValue || item.newValue) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {item.oldValue || "—"} → {item.newValue || "—"}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderLeadsTab = () => {
    if (leadsLoading) return <div className="text-sm text-slate-500">Loading lead details...</div>;
    if (leadsError || !leadsData) return renderDataError("Lead drilldown");

    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total Lead Actions</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{leadsData.summary.totalActions}</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm text-sky-700">Leads Added</p>
            <p className="mt-2 text-3xl font-bold text-sky-900">{leadsData.summary.addedCount}</p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-700">Stage Changes</p>
            <p className="mt-2 text-3xl font-bold text-indigo-900">{leadsData.summary.stageChangeCount}</p>
          </div>
        </div>

        {renderSourceBreakdown(leadsData.summary)}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lead Activity Details</CardTitle>
            <CardDescription>Detailed lead actions in the selected window</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(leadsData.items || []).length === 0 ? (
              <div className="text-sm text-slate-500">No lead activity found.</div>
            ) : (
              leadsData.items.map((item) => (
                <div key={item.logId} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.companyName || `Lead #${item.leadId || "—"}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatActionName(item.action)} • {item.description || "No description"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>Current Stage: {item.currentStage || "—"}</span>
                        <span>Lead Source: {item.leadSource || "—"}</span>
                        {(item.oldValue || item.newValue) && (
                          <span>
                            {item.oldValue || "—"} → {item.newValue || "—"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInvestorsTab = () => {
    if (investorsLoading) return <div className="text-sm text-slate-500">Loading investor details...</div>;
    if (investorsError || !investorsData) return renderDataError("Investor drilldown");

    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total Investor Actions</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{investorsData.summary.totalActions}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Investors Added</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">{investorsData.summary.addedCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Stage Changes</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{investorsData.summary.stageChangeCount}</p>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm text-teal-700">Distinct Touched</p>
            <p className="mt-2 text-3xl font-bold text-teal-900">{investorsData.summary.distinctInvestorsTouched || 0}</p>
          </div>
        </div>

        {renderSourceBreakdown(investorsData.summary)}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Investor Activity Details</CardTitle>
            <CardDescription>Detailed investor actions in the selected window</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(investorsData.items || []).length === 0 ? (
              <div className="text-sm text-slate-500">No investor activity found.</div>
            ) : (
              investorsData.items.map((item) => (
                <div key={item.logId} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.investorName || `Investor #${item.investorId || "—"}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatActionName(item.action)} • {item.description || "No description"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>Current Stage: {item.currentStage || "—"}</span>
                        <span>Type: {item.investorType || "—"}</span>
                        <span>Location: {item.location || "—"}</span>
                        <span>Linked Leads: {item.linkedLeadCount || 0}</span>
                        {(item.oldValue || item.newValue) && (
                          <span>
                            {item.oldValue || "—"} → {item.newValue || "—"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderEpnTab = () => {
    if (epnLoading) return <div className="text-sm text-slate-500">Loading EPN details...</div>;
    if (epnError || !epnData) return renderDataError("EPN drilldown");

    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total EPN Actions</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{epnData.summary.totalActions}</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm text-violet-700">EPN Added</p>
            <p className="mt-2 text-3xl font-bold text-violet-900">{epnData.summary.addedCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Stage Changes</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{epnData.summary.stageChangeCount}</p>
          </div>
          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
            <p className="text-sm text-fuchsia-700">Distinct Touched</p>
            <p className="mt-2 text-3xl font-bold text-fuchsia-900">{epnData.summary.distinctEpnTouched || 0}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">IDFC Touched</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{epnData.summary.idfcTouchedCount || 0}</p>
          </div>
        </div>

        {renderSourceBreakdown(epnData.summary)}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">EPN Activity Details</CardTitle>
            <CardDescription>Detailed EPN actions in the selected window</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(epnData.items || []).length === 0 ? (
              <div className="text-sm text-slate-500">No EPN activity found.</div>
            ) : (
              epnData.items.map((item) => (
                <div
                  key={item.logId}
                  className={`rounded-xl border p-3 ${
                    item.isIdfc ? "border-amber-300 bg-amber-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.epnName || `EPN #${item.epnId || "—"}`}
                        </p>
                        {item.isIdfc ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                            IDFC
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatActionName(item.action)} • {item.description || "No description"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>Bucket: {bucketLabel(item.bucket)}</span>
                        <span>Category: {item.category || "—"}</span>
                        <span>Current Stage: {item.currentStage || "—"}</span>
                        <span>City: {item.city || "—"}</span>
                        <span>Linked Leads: {item.linkedLeadCount || 0}</span>
                        {(item.oldValue || item.newValue) && (
                          <span>
                            {item.oldValue || "—"} → {item.newValue || "—"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTimelineTab = () => {
    if (timelineLoading) return <div className="text-sm text-slate-500">Loading timeline...</div>;
    if (timelineError) return renderDataError("Timeline");

    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Full Timeline</CardTitle>
          <CardDescription>Chronological audit trail for the selected user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {timelineData.length === 0 ? (
            <div className="text-sm text-slate-500">No timeline activity found.</div>
          ) : (
            timelineData.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatActionName(item.action)}
                      </p>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {entityLabel(item.entityType)}
                      </Badge>
                      {item.bucket ? (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                          {bucketLabel(item.bucket)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {item.entityName || `Entity #${item.entityId || "—"}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description || "No description available."}
                    </p>
                    {(item.oldValue || item.newValue) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.oldValue || "—"} → {item.newValue || "—"}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900" data-testid="heading-audit-analytics">
            <FileText className="h-8 w-8" />
            Audit Analytics
          </h1>
          <p className="mt-2 text-slate-500">
            Organization-wide user activity, performance visibility, and monthly audit signals.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Generated</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(overview.generatedAt)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Active Users"
          value={overview.summaryCards.activeUsers24h}
          subtitle="Users active in the last 24 hours"
          icon={Users}
          accentClass="bg-gradient-to-br from-sky-500 to-blue-600"
        />
        <MetricCard
          title="Total Active Leads"
          value={overview.summaryCards.totalActiveLeads}
          subtitle="Current working lead base"
          icon={Building2}
          accentClass="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <MetricCard
          title="Active Mandates"
          value={overview.summaryCards.activeMandates}
          subtitle="Leads currently in mandates stage"
          icon={Briefcase}
          accentClass="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <MetricCard
          title="Conversion %"
          value={formatPct(overview.summaryCards.conversionPct)}
          subtitle="Last 30 days lead-to-mandate / won signal"
          icon={TrendingUp}
          accentClass="bg-gradient-to-br from-amber-500 to-orange-500"
        />
        <MetricCard
          title="Investor Response Rate"
          value={formatPct(overview.summaryCards.investorResponseRate)}
          subtitle="Investors progressing beyond outreach"
          icon={Activity}
          accentClass="bg-gradient-to-br from-rose-500 to-pink-600"
        />
        <MetricCard
          title="Stage Changes"
          value={overview.summaryCards.stageChanges30d}
          subtitle="Total stage transitions in the last 30 days"
          icon={ArrowRightLeft}
          accentClass="bg-gradient-to-br from-slate-700 to-slate-900"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <HorizontalBars
          title="User Role Mix"
          description="All users included: admin, partner, analyst, intern"
          items={userRoleItems}
          barClass="bg-gradient-to-r from-blue-500 to-indigo-600"
        />

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">IDFC Focus</CardTitle>
            <CardDescription>Special focus block for the EPN IDFC bucket</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-700">IDFC Partners</p>
              <p className="mt-2 text-3xl font-bold text-amber-900">{overview.idfcFocus.idfcPartners}</p>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-700">IDFC Linked Leads</p>
              <p className="mt-2 text-3xl font-bold text-orange-900">{overview.idfcFocus.idfcLeadLinks}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <HorizontalBars
          title="Channel Contribution"
          description="New lead source contribution over the last 30 days"
          items={channelItems}
          barClass="bg-gradient-to-r from-emerald-500 to-green-600"
        />

        <HorizontalBars
          title="Action Mix"
          description="Entity-wise activity concentration over the last 30 days"
          items={actionMixItems}
          barClass="bg-gradient-to-r from-violet-500 to-purple-600"
        />

        <HorizontalBars
          title="EPN Bucket Mix"
          description="Distribution across IDFC / OCP / Other EPN buckets"
          items={epnBucketItems}
          barClass="bg-gradient-to-r from-amber-500 to-orange-500"
        />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">User Activity Directory</CardTitle>
              <CardDescription>
                Search users and open a detailed drilldown without leaving the page
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, role..."
                  className="pl-9"
                />
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["24h", "15d", "30d"] as TimeWindow[]).map((window) => (
                  <button
                    key={window}
                    type="button"
                    onClick={() => setSelectedWindow(window)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      selectedWindow === window
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {window}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No users matched your search.
              </div>
            ) : (
              filteredUsers.map((item) => {
                const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email;
                const isSelected = selectedUser?.id === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(item.id);
                      setActiveTab("profile");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                          <Badge variant="outline" className={roleBadgeClass(item.role)}>
                            {item.role}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.email}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Last login: {formatDateTime(item.lastLoginTime)}</span>
                          <span>Last action: {formatDateTime(item.lastActionTime)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:min-w-[420px]">
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Actions</p>
                          <p className="mt-1 text-base font-bold text-slate-900">
                            {getWindowValue(item, "actions", selectedWindow)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Stage</p>
                          <p className="mt-1 text-base font-bold text-slate-900">
                            {getWindowValue(item, "stageChanges", selectedWindow)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-sky-50 p-2">
                          <p className="text-[11px] uppercase tracking-wide text-sky-600">Leads</p>
                          <p className="mt-1 text-base font-bold text-sky-900">
                            {getWindowValue(item, "leadsAdded", selectedWindow)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-2">
                          <p className="text-[11px] uppercase tracking-wide text-emerald-600">Investors</p>
                          <p className="mt-1 text-base font-bold text-emerald-900">
                            {getWindowValue(item, "investorsAdded", selectedWindow)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-violet-50 p-2">
                          <p className="text-[11px] uppercase tracking-wide text-violet-600">EPN</p>
                          <p className="mt-1 text-base font-bold text-violet-900">
                            {getWindowValue(item, "epnAdded", selectedWindow)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <Card className="border-slate-200 bg-slate-50 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Selected User Snapshot</CardTitle>
              <CardDescription>Quick summary for the current selection</CardDescription>
            </CardHeader>

            <CardContent>
              {!selectedUser ? (
                <div className="text-sm text-slate-500">Select a user to view details.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{selectedUserName}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className={roleBadgeClass(selectedUser.role)}>
                        {selectedUser.role}
                      </Badge>
                      <span className="text-xs text-slate-500">{selectedUser.email}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock3 className="h-4 w-4" />
                        <span className="text-sm font-medium">First Activity Today</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatDateTime(selectedUser.firstActivityToday)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm font-medium">Rough Hours Today</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {Number(selectedUser.roughHoursToday || 0).toFixed(1)} hrs
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{selectedWindow} activity</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Actions</p>
                        <p className="text-lg font-bold text-slate-900">
                          {getWindowValue(selectedUser, "actions", selectedWindow)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Stage Changes</p>
                        <p className="text-lg font-bold text-slate-900">
                          {getWindowValue(selectedUser, "stageChanges", selectedWindow)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Leads Added</p>
                        <p className="text-lg font-bold text-sky-700">
                          {getWindowValue(selectedUser, "leadsAdded", selectedWindow)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Investors Added</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {getWindowValue(selectedUser, "investorsAdded", selectedWindow)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">EPN Added</p>
                        <p className="text-lg font-bold text-violet-700">
                          {getWindowValue(selectedUser, "epnAdded", selectedWindow)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
                    <p className="text-sm font-medium text-slate-700">Drilldown ready</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Use the tabs below to open Profile, Leads, Investors, EPN, and Timeline views for this user.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">User Drilldown</CardTitle>
              <CardDescription>
                Detailed audit breakdown for <span className="font-medium text-slate-700">{selectedUserName}</span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <TabButton label="Profile" value="profile" activeTab={activeTab} onClick={setActiveTab} />
              <TabButton label="Leads" value="leads" activeTab={activeTab} onClick={setActiveTab} />
              <TabButton label="Investors" value="investors" activeTab={activeTab} onClick={setActiveTab} />
              <TabButton label="EPN" value="epn" activeTab={activeTab} onClick={setActiveTab} />
              <TabButton label="Timeline" value="timeline" activeTab={activeTab} onClick={setActiveTab} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!selectedUser ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Select a user from the directory above to open the drilldown.
            </div>
          ) : activeTab === "profile" ? (
            renderProfileTab()
          ) : activeTab === "leads" ? (
            renderLeadsTab()
          ) : activeTab === "investors" ? (
            renderInvestorsTab()
          ) : activeTab === "epn" ? (
            renderEpnTab()
          ) : (
            renderTimelineTab()
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <UserCircle2 className="h-8 w-8 text-slate-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Profile</p>
              <p className="text-sm font-medium text-slate-900">Login, hours, action mix</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Leads</p>
              <p className="text-sm font-medium text-slate-900">Adds, sources, stage changes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Network className="h-8 w-8 text-violet-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">EPN</p>
              <p className="text-sm font-medium text-slate-900">Bucket, IDFC, linked leads</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <ListOrdered className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Timeline</p>
              <p className="text-sm font-medium text-slate-900">Chronological audit trail</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}