import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, PhoneForwarded, Activity, Trophy, ArrowRight, Link as LinkIcon, Info } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";

const BUCKET_LABELS: Record<string, string> = {
  idfc: "IDFC",
  "other-channel-partners": "Other Channel Partners",
  "other-epn": "Other EPN",
};

const BUCKET_API_MAP: Record<string, string> = {
  idfc: "idfc",
  "other-channel-partners": "other_channel_partner",
  "other-epn": "other_epn",
};

// Colors for the Pie Chart
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

// Helper component for the Info Tooltip
const InfoTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help ml-2" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs bg-gray-900 text-white border-gray-800">
      <p className="text-sm">{text}</p>
    </TooltipContent>
  </Tooltip>
);

export default function EpnBucketDashboard() {
  const [location, setLocation] = useLocation();

  const parts = (location || "").split("?")[0].split("/").filter(Boolean);
  const bucketUrl = parts[1] || "";
  const bucketLabel = BUCKET_LABELS[bucketUrl] ?? bucketUrl;
  const bucketApi = BUCKET_API_MAP[bucketUrl] ?? bucketUrl;

  const { data: metrics, isLoading } = useQuery({
    queryKey: [`/epn/bucket-metrics/${bucketApi}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/epn/bucket-metrics/${bucketApi}`);
      return res.json();
    }
  });

  const pipelineData = [
    { name: "Outreach", count: metrics?.outreach || 0, fill: "#818cf8" },
    { name: "Active", count: metrics?.active || 0, fill: "#fbbf24" },
    { name: "Rainmakers", count: metrics?.rainmaking || 0, fill: "#22c55e" }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {bucketLabel} Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          High-level overview, analytics, and pipeline metrics.
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* TIER 1: KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Universe</CardTitle>
                  <InfoTooltip text="The total number of partners currently managed within this bucket." />
                </div>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{metrics?.total || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-indigo-400 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-medium text-gray-500">Outreach</CardTitle>
                  <InfoTooltip text="Partners we are currently trying to establish contact or sign agreements with." />
                </div>
                <PhoneForwarded className="h-4 w-4 text-indigo-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{metrics?.outreach || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-amber-400 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
                  <InfoTooltip text="Partners who have signed and are actively engaging with us." />
                </div>
                <Activity className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{metrics?.active || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-medium text-gray-500">Rainmakers</CardTitle>
                  <InfoTooltip text="Top-performing partners who consistently bring in high-value deals." />
                </div>
                <Trophy className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{metrics?.rainmaking || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-l-4 border-l-blue-700 shadow-sm dark:bg-blue-900/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                  <CardTitle className="text-sm font-semibold text-blue-800 dark:text-blue-300">Total Linked Deals</CardTitle>
                  <InfoTooltip text="The total number of companies/leads sourced directly through partners in this bucket." />
                </div>
                <LinkIcon className="h-4 w-4 text-blue-700" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{metrics?.totalLinkedCompanies || 0}</div>
                <p className="text-xs text-blue-600 mt-1">Companies sourced</p>
              </CardContent>
            </Card>
          </div>

          {/* TIER 2: PIPELINE & CATEGORIES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <CardTitle>Partner Pipeline</CardTitle>
                  <InfoTooltip text="Visualizes the conversion flow of partners from initial outreach to rainmaker status." />
                </div>
                <CardDescription>Conversion flow of your partners</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <CardTitle>Category Distribution</CardTitle>
                  <InfoTooltip text="Breakdown of partner types (e.g., CA Firm, Sector Expert) to identify network diversity." />
                </div>
                <CardDescription>Types of partners in this bucket</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {metrics?.categoryData?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No category data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics?.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {metrics?.categoryData?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* TIER 3: GEOGRAPHY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Zone Chart - Vertical Bars */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <CardTitle>Zone Distribution</CardTitle>
                  <InfoTooltip text="Geographical spread of partners across major regions (North, South, East, West)." />
                </div>
                <CardDescription>Geographical spread across zones</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.zoneData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* State Chart - Horizontal Bars */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <CardTitle>Top 10 States</CardTitle>
                  <InfoTooltip text="The top performing states where your partners are concentrated." />
                </div>
                <CardDescription>Highest partner concentration by state</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={metrics?.stateData} 
                    layout="vertical" // This makes the chart horizontal
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={80} />
                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* TIER 4: TOP PERFORMERS */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Performers
                </CardTitle>
                <InfoTooltip text="The highest-ranking individual partners based on the number of deals they've brought in." />
              </div>
              <CardDescription>Most linked companies</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.topPerformers?.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No partners have linked companies yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics?.topPerformers?.map((partner: any, idx: number) => (
                    <div key={partner.id} className="flex items-center justify-between border rounded-lg p-3 bg-gray-50 dark:bg-neutral-800/50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{idx + 1}. {partner.name}</p>
                        <p className="text-xs text-muted-foreground">{partner.category || 'No Category'}</p>
                      </div>
                      <div className="text-right bg-white dark:bg-neutral-900 px-3 py-1 rounded-md border shadow-sm">
                        <p className="text-sm font-bold text-blue-600">{partner.links}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Deals</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
}