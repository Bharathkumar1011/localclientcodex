// client/src/pages/InvestorHome.tsx
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Send, Activity, Flame, Newspaper, Handshake, Loader2, ExternalLink, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import type { InvestorMetrics } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/apiFetch"; // ✅ Ensure this import matches your file structure

import InvestorEventsPanel from "@/components/InvestorEventsPanel";


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

  const m = metrics || { totalInvestors: 0, outreach: 0, active: 0, warm: 0, dealmaking: 0 };

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