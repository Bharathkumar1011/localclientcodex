import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, Target, Calendar, Loader2, Database, FileText, PauseCircle, CheckCircle, Newspaper, ExternalLink } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ActivityLog } from "@/components/ActivityLog";
import type { User } from "@/lib/types";
import { useLocation } from "wouter";



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


  // Fetch top leads in Pitching stage
  const { data: pitchingLeads = [] } = useQuery<Lead[]>({
    queryKey: ['/leads/stage/pitching'],
    enabled: !!currentUser,
  });

  // Fetch top leads in Mandates stage
  const { data: mandatesLeads = [] } = useQuery<Lead[]>({
    queryKey: ['/leads/stage/mandates'],
    enabled: !!currentUser,
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

  const topPitching = pitchingLeads.slice(0, 3).map((lead: any) => lead.company?.name || lead.company?.companyName || 'Unnamed');
  const topMandates = mandatesLeads.slice(0, 3).map((lead: any) => lead.company?.name || lead.company?.companyName || 'Unnamed');
  console.log("Pitching Leads Data:", pitchingLeads);
  console.log("Mandates Leads Data:", mandatesLeads);

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
