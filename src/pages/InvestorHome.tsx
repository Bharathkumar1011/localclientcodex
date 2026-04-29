// client/src/pages/InvestorHome.tsx
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  Send,
  Activity,
  Flame,
  Newspaper,
  Handshake,
  Loader2,
  ExternalLink,
  CalendarDays,
  PieChart as PieChartIcon,
  BarChart3,
  ShieldCheck,
  Mail,
  Phone,
  Link2,
  AlertTriangle,
} from "lucide-react";

import { useLocation } from "wouter";
import type { InvestorMetrics } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/apiFetch"; // ✅ Ensure this import matches your file structure

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";

import InvestorEventsPanel from "@/components/InvestorEventsPanel";

type InvestorStageChartRow = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

type InvestorSectorChartRow = {
  sector: string;
  count: number;
  percentage: number;
};

const INVESTOR_STAGE_COLORS: Record<string, string> = {
  outreach: "#3b82f6",
  active: "#22c55e",
  warm: "#f97316",
  dealmaking: "#8b5cf6",
};

const INVESTOR_STAGE_PATHS: Record<string, string> = {
  outreach: "/investor-relation/investor-management/outreach",
  active: "/investor-relation/investor-management/active",
  warm: "/investor-relation/investor-management/warm",
  dealmaking: "/investor-relation/investor-management/dealmaking",
};

const getInvestorPercentage = (value: number, total: number) =>
  total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;

// --- News Feed Helper Component ---

function NewsFeedPanel({ category }: { category: 'leads' | 'investors' }) {
  const { data: newsItems, isLoading } = useQuery({ 
    queryKey: ['/news', category], 
    queryFn: async () => {
      // ✅ Using your apiFetch utility to handle Supabase Auth automatically
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await apiFetch(`${API_BASE_URL}/news?category=${category}`);
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    }
  });

  return (
    <div className="h-[400px] overflow-y-auto pr-2">
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !newsItems?.length ? (
        <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
          <Newspaper className="mb-2 h-8 w-8 opacity-20" />
          <p>No recent {category} news.</p>
        </div>
      ) : (
        <div className="divide-y">
          {newsItems.map((item: any) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 p-3 hover:bg-muted/50 transition-colors group rounded-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-semibold text-primary/70">{item.source || 'News'}</span>
                <span>•</span>
                <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}



interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
  colorClass?: string;
}

function MetricCard({ title, value, icon: Icon, onClick, colorClass }: MetricCardProps) {
  return (
    <Card 
      onClick={onClick}
      className={`cursor-pointer hover:shadow-md transition-all ${onClick ? 'hover:bg-accent/50' : ''}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${colorClass || "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}


function InvestorStageDonutChart({
  rows,
  total,
  onStageClick,
}: {
  rows: InvestorStageChartRow[];
  total: number;
  onStageClick: (path: string) => void;
}) {
  const hasData = rows.some((row) => row.count > 0);

  return (
    <Card className="h-full overflow-hidden border-t-4 border-t-blue-500 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-blue-600" />
          <CardTitle>Investor Status Summary</CardTitle>
        </div>
        <CardDescription>
          Donut view of investors across outreach, active, warm, and dealmaking.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="flex h-[280px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <PieChartIcon className="mb-2 h-8 w-8 opacity-30" />
            <p>No investor stage data available.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="relative h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {rows.map((row) => (
                      <Cell
                        key={row.key}
                        fill={INVESTOR_STAGE_COLORS[row.key] || "#64748b"}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any, _name: any, props: any) => [
                      `${value} investors`,
                      props?.payload?.label || "Stage",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold">{total}</div>
                <div className="text-xs text-muted-foreground">
                  Total Investors
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {rows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => onStageClick(INVESTOR_STAGE_PATHS[row.key])}
                  className="flex items-center justify-between rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          INVESTOR_STAGE_COLORS[row.key] || "#64748b",
                      }}
                    />
                    <div>
                      <div className="text-sm font-medium">{row.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.percentage}% of investor universe
                      </div>
                    </div>
                  </div>

                  <div className="text-lg font-semibold">{row.count}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvestorHorizontalChart({
  title,
  description,
  icon: Icon,
  rows,
  labelKey,
  emptyText,
  barClassName,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  rows: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
  labelKey: string;
  emptyText: string;
  barClassName: string;
}) {
  const maxCount = Math.max(...rows.map((row) => row.count), 0);

  return (
    <Card className="h-full border-t-4 border-t-slate-500 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-slate-700" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {rows.length === 0 || maxCount === 0 ? (
          <div className="flex h-[260px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <BarChart3 className="mb-2 h-8 w-8 opacity-30" />
            <p>{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const width = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

              return (
                <div key={`${labelKey}-${row.label}`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium">
                      {row.label}
                    </div>
                    <div className="shrink-0 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {row.count}
                      </span>{" "}
                      / {row.percentage}%
                    </div>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${barClassName}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvestorHealthReportCard({
  health,
}: {
  health: NonNullable<InvestorMetrics["health"]>;
}) {
  const score = Number(health.score || 0);

  const status =
    score >= 80
      ? "Strong"
      : score >= 60
        ? "Good"
        : score >= 40
          ? "Needs Attention"
          : "Poor";

  const statusClass =
    score >= 80
      ? "text-emerald-600"
      : score >= 60
        ? "text-blue-600"
        : score >= 40
          ? "text-orange-600"
          : "text-red-600";

  const rows = [
    {
      label: "Investor Contact Coverage",
      value: health.contactCoverage,
      icon: Users,
    },
    {
      label: "Primary POC Completeness",
      value: health.primaryPocCoverage,
      icon: ShieldCheck,
    },
    {
      label: "Email Coverage",
      value: health.emailCoverage,
      icon: Mail,
    },
    {
      label: "Phone Coverage",
      value: health.phoneCoverage,
      icon: Phone,
    },
    {
      label: "LinkedIn Coverage",
      value: health.linkedinCoverage,
      icon: Link2,
    },
  ];

  return (
    <Card className="h-full border-t-4 border-t-emerald-500 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <CardTitle>Investor Data Health Report</CardTitle>
        </div>
        <CardDescription>
          Completeness score based on investor contacts and POC details.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-5 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                Overall Health Score
              </div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-bold">{score}%</span>
                <span className={`pb-1 text-sm font-semibold ${statusClass}`}>
                  {status}
                </span>
              </div>
            </div>

            <div className="rounded-full bg-background p-3 shadow-sm">
              <ShieldCheck className={`h-8 w-8 ${statusClass}`} />
            </div>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">
              Total POC Records
            </div>
            <div className="mt-1 text-2xl font-bold">
              {health.totalContacts}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Investors Without POCs
            </div>
            <div className="mt-1 text-2xl font-bold">
              {health.investorsWithNoContacts}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {rows.map((row) => {
            const Icon = row.icon;

            return (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {row.label}
                  </div>
                  <div className="text-sm font-semibold">
                    {Number(row.value || 0)}%
                  </div>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Number(row.value || 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


export default function InvestorHome() {
  const [, setLocation] = useLocation();

  const { data: metrics, isLoading } = useQuery<InvestorMetrics>({
    queryKey: ["/investors/metrics"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Investor Relation</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const m: InvestorMetrics = metrics || {
    totalInvestors: 0,
    outreach: 0,
    active: 0,
    warm: 0,
    dealmaking: 0,
    deleted: 0,
    stageDistribution: [],
    sectorDistribution: [],
    health: {
      score: 0,
      totalContacts: 0,
      investorsWithNoContacts: 0,
      incompletePrimaryContacts: 0,
      contactCoverage: 0,
      primaryPocCoverage: 0,
      emailCoverage: 0,
      phoneCoverage: 0,
      linkedinCoverage: 0,
    },
  };

  const stageDistribution: InvestorStageChartRow[] =
    m.stageDistribution && m.stageDistribution.length > 0
      ? m.stageDistribution
      : [
          {
            key: "outreach",
            label: "Outreach",
            count: m.outreach,
            percentage: getInvestorPercentage(m.outreach, m.totalInvestors),
          },
          {
            key: "active",
            label: "Active",
            count: m.active,
            percentage: getInvestorPercentage(m.active, m.totalInvestors),
          },
          {
            key: "warm",
            label: "Warm",
            count: m.warm,
            percentage: getInvestorPercentage(m.warm, m.totalInvestors),
          },
          {
            key: "dealmaking",
            label: "Dealmaking",
            count: m.dealmaking,
            percentage: getInvestorPercentage(m.dealmaking, m.totalInvestors),
          },
        ];

  const sectorDistribution: InvestorSectorChartRow[] =
    m.sectorDistribution || [];

  const health = m.health || {
    score: 0,
    totalContacts: 0,
    investorsWithNoContacts: 0,
    incompletePrimaryContacts: 0,
    contactCoverage: 0,
    primaryPocCoverage: 0,
    emailCoverage: 0,
    phoneCoverage: 0,
    linkedinCoverage: 0,
  };

  
  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Investor Relation</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your investor pipeline and coverage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        
        {/* 1. Universe */}
        <MetricCard 
          title="Investor Universe" 
          value={m.totalInvestors} 
          icon={Users}
          onClick={() => setLocation("/investor-relation/investor-management")} // Goes to "All" list
        />

        {/* 2. Outreach */}
        <MetricCard 
          title="Outreach" 
          value={m.outreach} 
          icon={Send}
          colorClass="text-blue-500"
          onClick={() => setLocation("/investor-relation/investor-management/outreach")}
        />

        {/* 3. Active */}
        <MetricCard 
          title="Active" 
          value={m.active} 
          icon={Activity}
          colorClass="text-green-500"
          onClick={() => setLocation("/investor-relation/investor-management/active")}
        />

        {/* 4. Warm */}
        <MetricCard 
          title="Warm" 
          value={m.warm} 
          icon={Flame}
          colorClass="text-orange-500"
          onClick={() => setLocation("/investor-relation/investor-management/warm")}
        />

        {/* 5. Dealmaking */}
        <MetricCard 
          title="Dealmaking" 
          value={m.dealmaking} 
          icon={Handshake}
          colorClass="text-purple-500"
          onClick={() => setLocation("/investor-relation/investor-management/dealmaking")}
        />

      </div>

            <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <InvestorStageDonutChart
            rows={stageDistribution}
            total={m.totalInvestors}
            onStageClick={(path) => setLocation(path)}
          />
        </div>

        <div className="xl:col-span-2">
          <InvestorHealthReportCard health={health} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <InvestorHorizontalChart
          title="Investor Stage-wise Distribution"
          description="Horizontal view of investor count across each relationship stage."
          icon={BarChart3}
          labelKey="stage"
          rows={stageDistribution.map((row) => ({
            label: row.label,
            count: row.count,
            percentage: row.percentage,
          }))}
          emptyText="No investor stage distribution available."
          barClassName="bg-blue-500"
        />

        <InvestorHorizontalChart
          title="Investor Sector-wise Distribution"
          description="Top investor sectors based on available investor records."
          icon={BarChart3}
          labelKey="sector"
          rows={sectorDistribution.map((row) => ({
            label: row.sector,
            count: row.count,
            percentage: row.percentage,
          }))}
          emptyText="No investor sector distribution available."
          barClassName="bg-purple-500"
        />
      </div>
      

      {/* ✅ ADDED: Investor Market Intelligence Section */}
      <div className="mt-8 grid gap-6 xl:grid-cols-5">
        <Card className="shadow-sm border-t-4 border-t-indigo-500 xl:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-indigo-600" />
              <CardTitle>Investor Market Intelligence</CardTitle>
            </div>
            <CardDescription>
              Latest fund raises, LP updates, and buy-side activity in the Indian market.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewsFeedPanel category="investors" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-emerald-500 xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              <CardTitle>Upcoming Events & Conferences</CardTitle>
            </div>
            <CardDescription>
              Hyderabad-priority investor and sector events discovered from free web sources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvestorEventsPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}