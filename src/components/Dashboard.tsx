import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, Target, Calendar, Loader2, Database, FileText } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ActivityLog } from "@/components/ActivityLog";
import type { User } from "@/lib/types";

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
  leadsCountByStage: { [stage: string]: number };
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
}

function MetricCard({ title, value, change, trend, icon: Icon, topLeads }: MetricCardProps) {
  return (
    <Card data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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

  // Fetch real dashboard metrics
  const { data: metricsData, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['/dashboard/metrics'],
    refetchInterval: 60000, // Refresh every minute
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

  const topPitching = pitchingLeads.slice(0, 3).map((lead: any) => lead.companyName || 'Unnamed');
  const topMandates = mandatesLeads.slice(0, 3).map((lead: any) => lead.companyName || 'Unnamed');

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

  const userRole = currentUser?.role || 'analyst';
  const isAnalyst = userRole === 'analyst';

  const metrics = [
    {
      title: "Total Leads",
      value: metricsData.totalLeads,
      icon: Users,
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
      value: topPitching.length,
      icon: FileText,
      topLeads: topPitching,
    },
    {
      title: "Mandates",
      value: topMandates.length,
      icon: FileText,
      topLeads: topMandates,
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
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityLog limit={10} />

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              // Define pipeline stages in order (excluding won/lost which are tracked separately)
              const pipelineStages = ['universe', 'qualified', 'outreach', 'pitching', 'mandates', 'rejected'];
              
              // Check if data is available
              if (!metricsData || !metricsData.leadsCountByStage) {
                return (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No pipeline data available</p>
                  </div>
                );
              }
              
              const leadsCountByStage = metricsData.leadsCountByStage;
              
              // Always show all 6 pipeline stages with their counts (including 0)
              return pipelineStages
                .map((stage) => ({
                  stage,
                  count: leadsCountByStage[stage] || 0
                }))
                .map(({ stage, count }) => (
                  <div key={stage} className="flex justify-between">
                    <span className="text-sm text-muted-foreground capitalize">{stage}</span>
                    <span className="text-sm font-medium">{count} leads</span>
                  </div>
                ));
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Admin Development Controls */}
      {currentUser.role === 'admin' && (
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
      )}
    </div>
  );
}
