import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, Target, Calendar, Loader2, Database, FileText, PauseCircle, CheckCircle, Newspaper, ExternalLink, ArrowRight, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ActivityLog } from "@/components/ActivityLog";
import type { User } from "@/lib/types";
import { useLocation } from "wouter";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";


interface NewsItem {
  id: number;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

function NewsFeedCard() {
  const { data: newsItems, isLoading } = useQuery<NewsItem[]>({
    queryKey: ['/news'],
  });

  return (
    <Card className="h-full flex flex-col md:col-span-2 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            Top Investor News
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !newsItems?.length ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
            <Newspaper className="mb-2 h-8 w-8 opacity-20" />
            <p>No news updates yet.</p>
          </div>
        ) : (
          <div className="h-[300px] overflow-y-auto pr-1">
            <div className="divide-y">
              {newsItems.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-1 p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{item.source || 'News'}</span>
                    <span>•</span>
                    <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


interface Lead {
  id: number;
  companyName: string;
  stage: string;
  company?: {
    name?: string;
    companyName?: string;
  };
}

interface PaginatedStageLeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

interface DashboardMetrics {
  totalLeads: number;
  qualified: number;
  inOutreach: number;
  inPitching: number;
  inMandates?: number;
  rejected: number; 
  leadsCountByStage: { [stage: string]: number };
  userRole?: string;
  isPersonalized?: boolean;
}

interface SourceStageCounts {
  qualified: number;
  outreach: number;
  pitching: number;
  mandates: number;
  universeActive: number;
}

interface SourceStageRow extends SourceStageCounts {
  name: string;
  userId?: string;
}

interface SourceStageTableResponse {
  scope: 'organization' | 'personal';
  total: SourceStageCounts;
  analysts: SourceStageRow[];
  partners: SourceStageRow[];
  userRole?: string;
  includeAll?: boolean;
}

interface ActiveLeadSectorRow {
  sector: string;
  count: number;
  percentage: number;
}

interface ActiveLeadSectorResponse {
  scope: 'organization' | 'personal';
  totalActive: number;
  rows: ActiveLeadSectorRow[];
  userRole?: string;
  isPersonalized?: boolean;
}


interface DashboardProps {
  currentUser: User;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  topLeads?: string[];
  isLoading?: boolean;
  onClick?: () => void;

}

  function MetricCard({ title, value, change, trend, icon: Icon, topLeads, onClick }: MetricCardProps) {
    return (
      <Card
        data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={onClick ? "cursor-pointer hover:bg-muted/30 transition-colors" : undefined}
      >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {change && (
          <div className={`text-xs flex items-center gap-1 ${
            trend === 'up' ? 'text-chart-1' : 
            trend === 'down' ? 'text-destructive' : 
            'text-muted-foreground'
          }`}>
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {change}
          </div>
        )}
        {topLeads && topLeads.length > 0 && (
          <div className="mt-2 space-y-1">
            {topLeads.map((company, idx) => (
              <div key={idx} className="text-xs text-muted-foreground truncate">
                • {company}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveLeadFlowChart({
  qualified,
  outreach,
  pitching,
  mandates,
  total,
  onStageClick,
}: {
  qualified: number;
  outreach: number;
  pitching: number;
  mandates: number;
  total: number;
  onStageClick: (path: string) => void;
}) {
  const stages = [
    {
      label: "Qualified",
      value: qualified,
      path: "/qualified",
      color: "#94a3b8",
    },
    {
      label: "Outreach",
      value: outreach,
      path: "/outreach",
      color: "#60a5fa",
    },
    {
      label: "Pitching",
      value: pitching,
      path: "/pitching",
      color: "#3b82f6",
    },
    {
      label: "Mandates",
      value: mandates,
      path: "/mandates",
      color: "#2563eb",
    },
  ];

  const chartData = stages
    .filter((stage) => stage.value > 0)
    .map((stage) => ({
      name: stage.label,
      value: stage.value,
      color: stage.color,
    }));

  return (
    <Card className="h-full overflow-hidden shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-blue-600" />
          Active Lead Flow
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Donut view and clickable movement flow of active BD leads
        </p>
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
            <Target className="mb-2 h-8 w-8 opacity-20" />
            <p>No active leads available.</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            <div className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`active-lead-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>

                  <RechartsTooltip
                    formatter={(value: any, name: any) => [`${value} leads`, name]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                    }}
                  />

                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {stages.map((stage) => {
                  const percentage = total > 0 ? Math.round((stage.value / total) * 100) : 0;

                  return (
                    <button
                      key={stage.label}
                      type="button"
                      onClick={() => onStageClick(stage.path)}
                      className="rounded-xl border bg-white p-4 text-left transition-all hover:bg-slate-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="truncate text-sm font-medium text-muted-foreground">
                            {stage.label}
                          </span>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                          {percentage}%
                        </span>
                      </div>

                      <div className="mt-3 text-3xl font-bold">
                        {stage.value}
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(percentage, stage.value > 0 ? 6 : 0)}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                <span>Qualified</span>
                <ArrowRight className="h-4 w-4" />
                <span>Outreach</span>
                <ArrowRight className="h-4 w-4" />
                <span>Pitching</span>
                <ArrowRight className="h-4 w-4" />
                <span>Mandates</span>
              </div>

              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Total active leads:{" "}
                <span className="font-semibold text-foreground">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveLeadsBySectorChart({
  data,
  isLoading,
}: {
  data?: ActiveLeadSectorResponse;
  isLoading: boolean;
}) {
  const rawRows = data?.rows ?? [];
  const totalActive = data?.totalActive ?? 0;

  const visibleLimit = 9;
  const sortedRows = [...rawRows].sort((a, b) => b.count - a.count);
  const visibleRows = sortedRows.slice(0, visibleLimit);
  const remainingRows = sortedRows.slice(visibleLimit);

  const remainingCount = remainingRows.reduce((sum, row) => sum + row.count, 0);

  const chartRows =
    remainingRows.length > 0
      ? [
          ...visibleRows,
          {
            sector: "Other sectors",
            count: remainingCount,
            percentage: totalActive > 0 ? Number(((remainingCount / totalActive) * 100).toFixed(2)) : 0,
          },
        ]
      : visibleRows;

  const rechartsData = chartRows.map((row) => ({
    sector: row.sector,
    count: row.count,
    percentage: row.percentage,
    label: `${row.count} leads · ${row.percentage}%`,
  }));

  return (
    <Card className="h-full overflow-hidden shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-600" />
          Active Leads by Sector
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sector-wise split of Qualified, Outreach, Pitching, and Mandates leads
        </p>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex h-[360px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartRows.length === 0 ? (
          <div className="flex h-[360px] flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
            <BarChart3 className="mb-2 h-8 w-8 opacity-20" />
            <p>No active sector data available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rechartsData}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 35, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="sector"
                    width={145}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />

                  <RechartsTooltip
                    formatter={(value: any) => [`${value} leads`, "Count"]}
                    labelFormatter={(label: any) => `Sector: ${label}`}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Total active leads counted:{" "}
              <span className="font-semibold text-foreground">{totalActive}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();


  // Fetch real dashboard metrics
  const { data: metricsData, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['/dashboard/metrics'],
    refetchInterval: 60000, // Refresh every minute
  });
  // Stage table by source (analysts + partners)
  const { data: sourceStageTable, isLoading: isSourceStageLoading } = useQuery<SourceStageTableResponse>({
    queryKey: ['/dashboard/source-stage-table'],
    enabled: !!currentUser,
  });

    // Active leads by sector chart
  const {
    data: activeLeadsBySector,
    isLoading: isActiveLeadsBySectorLoading,
  } = useQuery<ActiveLeadSectorResponse>({
    queryKey: ['/dashboard/active-leads-by-sector'],
    enabled: !!currentUser,
  });


  // Fetch top leads in Pitching stage
  const { data: pitchingLeadsResponse } = useQuery<PaginatedStageLeadsResponse | Lead[]>({
    queryKey: ['/leads/stage/pitching', 'dashboard-top'],
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        '/leads/stage/pitching?page=1&limit=3&sortBy=dateUpdated-desc'
      );
      return res.json();
    },
  });

  // Fetch top leads in Mandates stage
  const { data: mandatesLeadsResponse } = useQuery<PaginatedStageLeadsResponse | Lead[]>({
    queryKey: ['/leads/stage/mandates', 'dashboard-top'],
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        '/leads/stage/mandates?page=1&limit=3&sortBy=dateUpdated-desc'
      );
      return res.json();
    },
  });

  // Populate dummy data mutation (admin only)
  const populateDataMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/dev/populate-data', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/dashboard/metrics'] });
      toast({
        title: "Data Populated Successfully!",
        description: data.message || 'Dummy data has been added to the system',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to populate dummy data",
        variant: "destructive",
      });
    },
  });

  const pitchingLeads = Array.isArray(pitchingLeadsResponse)
    ? pitchingLeadsResponse
    : (pitchingLeadsResponse?.data ?? []);

  const mandatesLeads = Array.isArray(mandatesLeadsResponse)
    ? mandatesLeadsResponse
    : (mandatesLeadsResponse?.data ?? []);

  const topPitching = pitchingLeads
    .slice(0, 3)
    .map((lead: any) => lead.company?.name || lead.company?.companyName || lead.companyName || 'Unnamed');

  const topMandates = mandatesLeads
    .slice(0, 3)
    .map((lead: any) => lead.company?.name || lead.company?.companyName || lead.companyName || 'Unnamed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground">Please refresh the page to try again</p>
        </div>
      </div>
    );
  }

  if (!metricsData) {
    return null;
  }

  const qualifiedCount = Number(metricsData.qualified ?? metricsData.leadsCountByStage?.["qualified"] ?? 0);
const outreachCount = Number(metricsData.inOutreach ?? metricsData.leadsCountByStage?.["outreach"] ?? 0);
const pitchingCount = Number(metricsData.inPitching ?? metricsData.leadsCountByStage?.["pitching"] ?? 0);
const mandatesCount = Number(metricsData.inMandates ?? metricsData.leadsCountByStage?.["mandates"] ?? 0);

const activeLeadsCount = qualifiedCount + outreachCount + pitchingCount + mandatesCount;


  const userRole = currentUser?.role || 'analyst';
  const isAnalyst = userRole === 'analyst';

  const metrics = [
    {
      title: "Total Leads",
      value: metricsData.totalLeads,
      icon: Users,
    },
    {
      title: "Active Leads",
      value: activeLeadsCount,
      icon: CheckCircle,
    },
    {
      title: "Qualified",
      value: metricsData.qualified,
      icon: Target,
    },
    {
      title: "In Outreach",
      value: metricsData.inOutreach,
      icon: Calendar,
    },
    {
      title: "Pitching",
      value: metricsData.inPitching ?? metricsData.leadsCountByStage?.["pitching"] ?? 0,
      icon: FileText,
      topLeads: topPitching,
    },
    {
      title: "Mandates",
      value: metricsData.inMandates ?? metricsData.leadsCountByStage?.["mandates"] ?? 0,
      icon: FileText,
      topLeads: topMandates,
    },
    {
      title: "Hold",
      value: metricsData.leadsCountByStage?.["hold"] || 0,
      icon: PauseCircle,
      onClick: () => setLocation("/hold"),
    },
    {
      title: "Dropped",
      value: metricsData.leadsCountByStage?.["dropped"] || 0,
      icon: TrendingDown,
      onClick: () => setLocation("/dropped"),
    },
    {
      title: "Rejected",
      value: metricsData.leadsCountByStage?.["rejected"] || 0,
      icon: TrendingDown,
      onClick: () => setLocation("/rejected"),
    },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAnalyst ? 'My Dashboard' : 'Team Dashboard'}
          </h2>
          <p className="text-muted-foreground">
            {isAnalyst 
              ? 'Overview of your assigned leads and activities' 
              : 'Overview of team performance and pipeline'
            }
          </p>
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Full Width News Feed */}
      <NewsFeedCard />

      <div className="grid gap-6 xl:grid-cols-2">
        <ActiveLeadFlowChart
          qualified={qualifiedCount}
          outreach={outreachCount}
          pitching={pitchingCount}
          mandates={mandatesCount}
          total={activeLeadsCount}
          onStageClick={setLocation}
        />

        <ActiveLeadsBySectorChart
          data={activeLeadsBySector}
          isLoading={isActiveLeadsBySectorLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ✅ Table first + full width */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle>Stage Breakdown by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {isSourceStageLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}

            {!isSourceStageLoading && !sourceStageTable && (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}

            {!isSourceStageLoading && sourceStageTable && (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4 font-medium">Source</th>
                      <th className="py-2 pr-4 font-medium">Universe</th>
                      <th className="py-2 pr-4 font-medium">Qualified</th>
                      <th className="py-2 pr-4 font-medium">Outreach</th>
                      <th className="py-2 pr-4 font-medium">Pitching</th>
                      <th className="py-2 pr-0 font-medium">Mandate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b font-semibold">
                      <td className="py-2 pr-4">Total</td>
                      <td className="py-2 pr-4">{sourceStageTable.total.universeActive}</td>
                      <td className="py-2 pr-4">{sourceStageTable.total.qualified}</td>
                      <td className="py-2 pr-4">{sourceStageTable.total.outreach}</td>
                      <td className="py-2 pr-4">{sourceStageTable.total.pitching}</td>
                      <td className="py-2 pr-0">{sourceStageTable.total.mandates}</td>
                    </tr>

                    {sourceStageTable.analysts.map((r) => (
                      <tr key={`analyst-${r.name}`} className="border-b">
                        <td className="py-2 pr-4">{r.name}</td>
                        <td className="py-2 pr-4">{r.universeActive}</td>
                        <td className="py-2 pr-4">{r.qualified}</td>
                        <td className="py-2 pr-4">{r.outreach}</td>
                        <td className="py-2 pr-4">{r.pitching}</td>
                        <td className="py-2 pr-0">{r.mandates}</td>
                      </tr>
                    ))}

                  <tr>
                    <td colSpan={6} className="py-3">
                      <div className="space-y-1">
                        <div className="border-t-10 border-solid border-foreground/100" />
                      </div>
                    </td>
                  </tr>



                    {sourceStageTable.partners.map((r) => (
                      <tr key={`partner-${r.name}`} className="border-b">
                        <td className="py-2 pr-4">{r.name}</td>
                        <td className="py-2 pr-4">{r.universeActive}</td>
                        <td className="py-2 pr-4">{r.qualified}</td>
                        <td className="py-2 pr-4">{r.outreach}</td>
                        <td className="py-2 pr-4">{r.pitching}</td>
                        <td className="py-2 pr-0">{r.mandates}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>



        {/* ✅ Activity log below + full width */}
        <div className="md:col-span-2 lg:col-span-3">
          <ActivityLog limit={10} />
        </div>
      </div>

      {/* Admin Development Controls */}
      {/* {currentUser.role === 'admin' && (
        <div className="mt-8 p-4 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Development Tools (Admin Only)</h3>
              <p className="text-xs text-muted-foreground mt-1">Populate the CRM with sample data for testing</p>
            </div>
            <Button
              onClick={() => populateDataMutation.mutate()}
              disabled={populateDataMutation.isPending}
              variant="outline"
              size="sm"
              data-testid="button-populate-data"
            >
              <Database className="h-4 w-4 mr-2" />
              {populateDataMutation.isPending ? "Populating..." : "Populate Dummy Data"}
            </Button>
          </div>
        </div>
      )} */}
    </div>
  );
}
