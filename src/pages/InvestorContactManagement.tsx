import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, Users, UserX, Phone, Mail, Linkedin } from "lucide-react";

export default function InvestorContactManagement() {

  const { data, isLoading, isError } = useQuery({
    queryKey: ["investor-contact-metrics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/investors/contact-metrics");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mb-2 text-yellow-500" />
        <h3 className="text-lg font-medium">Failed to load metrics</h3>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  // ✅ Removed fixList from destructuring
  const { cards, coverage, top3 } = data;

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Investor Data Health</h1>
        <p className="text-muted-foreground">Monitor contact data quality across your investor universe.</p>
      </div>

      {/* LAYER 1: RISK CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500 bg-red-50/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2"><UserX className="h-4 w-4"/> Ghost Investors</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{cards?.ghostInvestors ?? 0}</div>
                <p className="text-xs text-muted-foreground">Active/Dealmaking investors with 0 contacts.</p>
            </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Incomplete Primary</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{cards?.incompletePrimary ?? 0}</div>
                <p className="text-xs text-muted-foreground">Primary POCs missing Email or Phone.</p>
            </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 bg-green-50/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2"><CheckCircle className="h-4 w-4"/> Database Health</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{cards?.databaseHealth ?? 0}%</div>
                <p className="text-xs text-muted-foreground">Of all contacts have valid email addresses.</p>
            </CardContent>
        </Card>
      </div>

      {/* LAYER 2: COVERAGE & COMPLETENESS TABLE */}
      <Card>
        <CardHeader>
            <CardTitle>Coverage & Completeness Report</CardTitle>
            <p className="text-sm text-muted-foreground">Breakdown of investors by number of contacts and data quality.</p>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-3 font-medium">Investor POC Depth</th>
                            <th className="text-center p-3 font-medium">Total Investors</th>
                            <th className="text-center p-3 font-medium text-green-600">✅ Fully Complete</th>
                            <th className="text-center p-3 font-medium text-amber-600">⚠️ Partially Filled</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {[0, 1, 2, 3, 4].map(idx => {
                            const row = coverage?.[idx];
                            const label = idx === 0 ? "0 POCs (Ghost)" : idx === 4 ? "4+ POCs" : `${idx} POC${idx > 1 ? 's' : ''}`;
                            
                            if(!row) return null;
                            
                            return (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="p-3 font-medium">{label}</td>
                                    <td className="p-3 text-center">{row.total}</td>
                                    <td className="p-3 text-center">
                                        {idx === 0 ? "—" : <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{row.complete} ({row.total > 0 ? Math.round((row.complete/row.total)*100) : 0}%)</Badge>}
                                    </td>
                                    <td className="p-3 text-center">
                                        {idx === 0 ? "—" : <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{row.partial} ({row.total > 0 ? Math.round((row.partial/row.total)*100) : 0}%)</Badge>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

      {/* LAYER 3: TOP 3 POC METRICS */}
      <Card>
        <CardHeader>
            <CardTitle>Top 3 Key Contact Health</CardTitle>
            <p className="text-sm text-muted-foreground">Data quality for the most important people (Primary, Secondary, Tertiary).</p>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg">
                    <thead className="bg-blue-50/50 border-b">
                        <tr>
                            <th className="text-left p-3 font-medium">Field</th>
                            <th className="text-center p-3 font-medium">POC 1 (Primary)</th>
                            <th className="text-center p-3 font-medium">POC 2 (Secondary)</th>
                            <th className="text-center p-3 font-medium">POC 3 (Tertiary)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr>
                            <td className="p-3 font-medium flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground"/> Total Added</td>
                            <td className="p-3 text-center font-bold">{top3?.poc1?.total ?? 0}</td>
                            <td className="p-3 text-center font-bold">{top3?.poc2?.total ?? 0}</td>
                            <td className="p-3 text-center font-bold">{top3?.poc3?.total ?? 0}</td>
                        </tr>
                         <tr>
                            <td className="p-3 font-medium flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> Phone Numbers</td>
                            {['poc1', 'poc2', 'poc3'].map(k => {
                                // @ts-ignore
                                const stat = top3?.[k];
                                const total = stat?.total ?? 0;
                                const val = stat?.phone ?? 0;
                                return (
                                <td key={k} className="p-3 text-center">
                                    <span className={val < total * 0.5 ? "text-red-600 font-medium" : ""}>
                                        {val} ({total > 0 ? Math.round((val/total)*100) : 0}%)
                                    </span>
                                </td>
                            )})}
                        </tr>
                         <tr>
                            <td className="p-3 font-medium flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/> Email Addresses</td>
                            {['poc1', 'poc2', 'poc3'].map(k => {
                                // @ts-ignore
                                const stat = top3?.[k];
                                const total = stat?.total ?? 0;
                                const val = stat?.email ?? 0;
                                return (
                                <td key={k} className="p-3 text-center">
                                    <span className={val < total * 0.7 ? "text-yellow-600 font-medium" : ""}>
                                        {val} ({total > 0 ? Math.round((val/total)*100) : 0}%)
                                    </span>
                                </td>
                            )})}
                        </tr>
                         <tr>
                            <td className="p-3 font-medium flex items-center gap-2"><Linkedin className="h-4 w-4 text-muted-foreground"/> LinkedIn</td>
                            {['poc1', 'poc2', 'poc3'].map(k => {
                                // @ts-ignore
                                const stat = top3?.[k];
                                const total = stat?.total ?? 0;
                                const val = stat?.linkedin ?? 0;
                                return (
                                <td key={k} className="p-3 text-center">
                                    {val} ({total > 0 ? Math.round((val/total)*100) : 0}%)
                                </td>
                            )})}
                        </tr>
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}