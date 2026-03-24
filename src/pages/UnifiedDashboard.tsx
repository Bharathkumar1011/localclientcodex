import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ActivityLog } from "@/components/ActivityLog";
import { apiFetch } from "@/lib/apiFetch";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Loader2, 
  Briefcase, 
  Users, 
  TrendingUp, 
  Globe, 
  Newspaper, 
  ExternalLink,
  PieChart as PieChartIcon,
  BarChart3,
  Link as LinkIcon,
  Activity,
  Info,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  Clock
} from "lucide-react";


import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Types ---
interface DashboardMetrics {
  totalLeads: number;
  qualified: number;
  inOutreach: number;
  inPitching: number;
  inMandates?: number;
  leadsCountByStage?: Record<string, number>;
}

interface InvestorMetrics {
  totalInvestors: number;
  outreach: number;
  active: number;
  warm: number;
  dealmaking: number;
  rejected: number;
}

interface LinkageMetrics {
  totalActiveLeads: number;
  linkedActiveLeads: number;
  totalInvestors: number;
  linkedInvestors: number;
  totalLinks: number;
}

interface NewsItem {
  id: number;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

// ✅ NEW Types for Momentum and Activity
interface MomentumStats {
  leadsAdded: number;
  leadsDropped: number;
  mandatesSigned: number;
  investorsMapped: number;
  meetingsLogged: number;
  tasksCompleted: number;
  stageMovements: number;
}

interface WeeklyMomentum {
  currentWeek: MomentumStats;
  prevWeek: MomentumStats;
}



// --- Helper Components ---

function MetricCard({ title, value, icon: Icon, subtext, colorClass }: any) {
  return (
    <Card className="border-l-4 shadow-sm hover:shadow-md transition-all" style={{ borderLeftColor: colorClass }}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full opacity-10`} style={{ backgroundColor: colorClass }}>
          <Icon className="h-6 w-6" style={{ color: colorClass }} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, value, total, colorClass, subText }: any) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-muted-foreground">{value} / {total} ({percentage}%)</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      {subText && <p className="text-xs text-muted-foreground pt-1">{subText}</p>}
    </div>
  );
}

function NewsFeedPanel({ category }: { category: 'leads' | 'investors' }) {
  const { data: newsItems, isLoading } = useQuery<NewsItem[]>({ 
    queryKey: ['/news', category], 
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await apiFetch(`${baseUrl}/news?category=${category}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch news");
      }
      
      return res.json();
    }
  });

  return (
    <div className="h-[300px] overflow-y-auto pr-2">
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
          {newsItems.map((item) => (
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

// ✅ Updated to make 'equation' optional so it looks clean for basic text explanations
function InfoHelp({ text, equation }: { text: string, equation?: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-800 cursor-help ml-1.5 transition-colors" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px] p-3 bg-blue-50 dark:bg-slate-950 border shadow-md z-50">
          <div className="space-y-2">
            <p className="text-xs font-medium leading-snug">{text}</p>
            {equation && (
              <div className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {equation}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}



// --- Main Component ---

export default function UnifiedDashboard() {
  const { user } = useAuth();
  
  // 1. Fetch Lead Metrics
  const { data: leadData, isLoading: leadsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/dashboard/metrics'],
    refetchInterval: 60000,
  });

  // 2. Fetch Investor Metrics
  const { data: investorData, isLoading: investorsLoading } = useQuery<InvestorMetrics>({
    queryKey: ['/dashboard/investor-metrics'],
    refetchInterval: 60000,
  });

  // 3. Fetch Linkage Metrics
  const { data: linkageData, isLoading: linkageLoading } = useQuery<LinkageMetrics>({
    queryKey: ['/dashboard/linkage-metrics'],
    refetchInterval: 60000,
  });

  // 4. Fetch Weekly Momentum
  const { data: momentumData, isLoading: momentumLoading } = useQuery<WeeklyMomentum>({
    queryKey: ['/dashboard/weekly-momentum'],
    refetchInterval: 60000,
  });


  // 6. ✅ Fetch Pipeline Aging Analytics
  const { data: agingStats = [] } = useQuery({
    queryKey: ["/api/analytics/pipeline-aging"],
    queryFn: async () => {
      const res = await apiFetch("/api/analytics/pipeline-aging");
      return res.json();
    }
  });


  if (leadsLoading || investorsLoading || linkageLoading || momentumLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Unified View...</span>
      </div>
    );
  }

  // --- Data Prep for Charts ---
  const getStageCount = (data: DashboardMetrics | undefined, stage: string) => {
    if (!data?.leadsCountByStage) return 0;
    if (data.leadsCountByStage[stage] !== undefined) return Number(data.leadsCountByStage[stage]);
    const key = Object.keys(data.leadsCountByStage).find(k => k.toLowerCase() === stage.toLowerCase());
    return key ? Number(data.leadsCountByStage[key]) : 0;
  };

  const countQualified = getStageCount(leadData, 'qualified');
  const countOutreach = getStageCount(leadData, 'outreach');
  const countPitching = getStageCount(leadData, 'pitching');
  const countMandates = getStageCount(leadData, 'mandates');

  const activeLeads = countQualified + countOutreach + countPitching + countMandates;
  
  const leadChartData = [
    { name: 'Qualified', value: countQualified, color: '#94a3b8' },
    { name: 'Outreach', value: countOutreach, color: '#60a5fa' },
    { name: 'Pitching', value: countPitching, color: '#3b82f6' },
    { name: 'Mandates', value: countMandates, color: '#2563eb' },
  ].filter(d => d.value > 0);

  const activeInvestors = (investorData?.active || 0) + (investorData?.warm || 0) + (investorData?.dealmaking || 0);
  
  const investorChartData = [
    { name: 'Outreach', count: Number(investorData?.outreach || 0) },
    { name: 'Active', count: Number(investorData?.active || 0) },
    { name: 'Warm', count: Number(investorData?.warm || 0) },
    { name: 'Dealmaking', count: Number(investorData?.dealmaking || 0) },
  ];

  const networkDensity = linkageData?.linkedActiveLeads ? (linkageData.totalLinks / linkageData.linkedActiveLeads).toFixed(1) : "0";

  // Helper for Momentum Arrows
  const renderTrend = (key: keyof MomentumStats, isNegativeGood = false) => {
    if (!momentumData) return null;
    const current = momentumData.currentWeek[key];
    const prev = momentumData.prevWeek[key];
    const diff = current - prev;

    if (diff === 0) return <span className="text-slate-400 flex items-center text-xs ml-2"><MinusIcon className="h-3 w-3 mr-0.5"/> 0</span>;
    
    const isPositive = diff > 0;
    const isGood = isNegativeGood ? !isPositive : isPositive;
    const color = isGood ? "text-emerald-500" : "text-rose-500";
    const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
    
    return (
      <span className={`${color} flex items-center text-xs font-semibold ml-2`}>
        <Icon className="h-3 w-3 mr-0.5"/> {Math.abs(diff)}
      </span>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Unified Command Center
          </h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}. Here is the pulse of your deal flow and investor relations.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 h-8">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Badge>
        </div>
      </div>

      {/* KPI Cards (Top Row) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Active Deals" value={activeLeads} icon={Briefcase} subtext="Total Live Pipeline" colorClass="#2563eb" />
        <MetricCard title="Live Mandates" value={countMandates} icon={TrendingUp} subtext="Highest Priority" colorClass="#16a34a" />
        <MetricCard title="Total Investors" value={investorData?.totalInvestors || 0} icon={Globe} subtext="Global Database" colorClass="#8b5cf6" />
        <MetricCard title="Active Conversations" value={activeInvestors} icon={Users} subtext="Engaged Investors" colorClass="#f59e0b" />
      </div>

      {/* Network Health & Linkages */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <LinkIcon className="h-4 w-4 text-emerald-500 mr-2" />
              Deal Coverage
              <InfoHelp text="Percentage of Active Deals that have at least one investor linked." equation="(Linked Deals / Active Deals) × 100" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <h3 className="text-2xl font-bold mb-4">
                {linkageData?.linkedActiveLeads || 0} <span className="text-sm font-normal text-muted-foreground">linked deals</span>
              </h3>
              <ProgressBar 
                label="Active Deals Linked"
                value={linkageData?.linkedActiveLeads || 0}
                total={linkageData?.totalActiveLeads || 0}
                colorClass="bg-emerald-500"
                subText={`${(linkageData?.totalActiveLeads || 0) - (linkageData?.linkedActiveLeads || 0)} active deals have NO investors added yet.`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Activity className="h-4 w-4 text-blue-500 mr-2" />
              Investor Utilization
              <InfoHelp text="Percentage of your total Investor Database that is currently connected to a deal." equation="(Linked Investors / Total Investors) × 100" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <h3 className="text-2xl font-bold mb-4">
                {linkageData?.linkedInvestors || 0} <span className="text-sm font-normal text-muted-foreground">engaged investors</span>
              </h3>
              <ProgressBar 
                label="Database Utilization"
                value={linkageData?.linkedInvestors || 0}
                total={linkageData?.totalInvestors || 0}
                colorClass="bg-blue-500"
                subText={`Investors connected to at least one active deal.`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Users className="h-4 w-4 text-indigo-500 mr-2" />
              Network Density
              <InfoHelp text="The average number of investors being pitched for every linked deal." equation="Total Connections / Linked Deals" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-4xl font-bold text-indigo-900">
                {networkDensity}
              </h3>
              <span className="text-sm font-medium text-muted-foreground">investors / deal</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              On average, each linked deal is being pitched to <strong>{networkDensity}</strong> investors.
              <br/>
              Total Connections: <span className="font-semibold text-foreground">{linkageData?.totalLinks || 0}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ NEW SECTION: Weekly Momentum (Velocity Bar) */}
      <Card className="shadow-sm bg-slate-50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center text-slate-700 dark:text-slate-300">
              <Activity className="h-4 w-4 mr-2 text-primary" />
              Weekly Momentum (Last 7 Days vs Prior 7 Days)
            </h3>
          </div>
          <div className="flex flex-wrap gap-y-4 gap-x-8">
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Leads Added <InfoHelp text="New companies or deals added to the pipeline this week." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.leadsAdded || 0}</span>
              {renderTrend('leadsAdded')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Leads Dropped <InfoHelp text="Deals that were marked as dropped or lost this week." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.leadsDropped || 0}</span>
              {renderTrend('leadsDropped', true)} {/* Negative is good */}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Mandates Signed <InfoHelp text="Deals that successfully progressed to the signed mandate stage." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.mandatesSigned || 0}</span>
              {renderTrend('mandatesSigned')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Investors Mapped <InfoHelp text="New connections made between investors and active deals." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.investorsMapped || 0}</span>
              {renderTrend('investorsMapped')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Meetings Logged <InfoHelp text="Total number of meetings scheduled or logged by the team." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.meetingsLogged || 0}</span>
              {renderTrend('meetingsLogged')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Tasks Completed <InfoHelp text="To-dos, follow-ups, and interventions marked as done." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.tasksCompleted || 0}</span>
              {renderTrend('tasksCompleted')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Stage Movements <InfoHelp text="Total number of times deals advanced or moved across pipeline stages." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.stageMovements || 0}</span>
              {renderTrend('stageMovements')}
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        <Card className="col-span-3 lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              Deal Flow Distribution
            </CardTitle>
            <CardDescription>Breakdown of active leads by stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {leadChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No active leads data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              Investor Pipeline
            </CardTitle>
            <CardDescription>Volume of investors across relationship stages</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={investorChartData} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} />
                 <YAxis axisLine={false} tickLine={false} />
                 <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                 <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>



      {/* Intelligence / News */}
      <div className="grid gap-4">
        {/* ✅ PIPELINE HEALTH: STAGNANT DEALS BY ANALYST */}
      <Card className="shadow-sm border-red-100 bg-white/50 mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
              <Clock className="h-4 w-4" />
              PIPELINE AGING BY ANALYST
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Monitoring deals stuck in the current stage
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="h-9 px-4 text-left font-bold text-slate-600">Analyst</TableHead>
                  <TableHead className="h-9 px-2 text-center font-bold text-amber-600 bg-amber-50/30 w-32">14d+ (Warning)</TableHead>
                  <TableHead className="h-9 px-2 text-center font-bold text-red-600 bg-red-50/30 w-32">30d+ (Stagnant)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground italic">
                      Pipeline is healthy! No aging deals found.
                    </TableCell>
                  </TableRow>
                ) : (
                  agingStats.map((stat: any) => (
                    <TableRow key={stat.name} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="p-3 font-semibold text-slate-800">{stat.name}</TableCell>
                      <TableCell className={`p-2 text-center font-black ${stat.warning > 0 ? 'text-amber-600' : 'text-slate-200'}`}>
                        {stat.warning}
                      </TableCell>
                      <TableCell className={`p-2 text-center font-black ${stat.stagnant > 0 ? 'text-red-600' : 'text-slate-200'}`}>
                        {stat.stagnant}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
        <Card className="shadow-sm flex flex-col w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Newspaper className="h-4 w-4 text-orange-500" />
              Market Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Tabs defaultValue="leads" className="w-full">
              <div className="px-4 border-b">
                <TabsList className="w-full justify-start h-9 bg-transparent p-0">
                  <TabsTrigger 
                    value="leads" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 pb-2 pt-1"
                  >
                    Sectors & Deals
                  </TabsTrigger>
                  <TabsTrigger 
                    value="investors" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 pb-2 pt-1"
                  >
                    Investor News
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="leads" className="m-0">
                <NewsFeedPanel category="leads" />
              </TabsContent>
              <TabsContent value="investors" className="m-0">
                <NewsFeedPanel category="investors" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <div className="w-full">
           <ActivityLog limit={10} title="Unified Activity Log" className="w-full" />
        </div>
      </div>
    </div>
  );
}