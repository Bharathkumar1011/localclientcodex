import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2, TrendingUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import POCManagement from "@/components/POCManagement";
import { queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lead, Company, User, Contact } from "@/lib/types";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface LeadWithDetails extends Lead {
  company: Company;
  ownerAnalyst?: User;
  contacts?: Contact[];
  assignmentDate?: string;
}

function getPOCStatusColor(status?: string): string {
  switch (status) {
    case 'green': return 'bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400';
    case 'amber': return 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-400';
    case 'red': return 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStageDisplay(stage: string): { label: string; className: string } {
  const stages: Record<string, { label: string; className: string }> = {
    universe: { label: 'Universe', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    qualified: { label: 'Qualified', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    outreach: { label: 'Outreach', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    pitching: { label: 'Pitching', className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    mandates: { label: 'Mandates', className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
    won: { label: 'Won', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    lost: { label: 'Lost', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    rejected: { label: 'Rejected', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
  };
  return stages[stage] || { label: stage, className: 'bg-muted text-muted-foreground' };
}

export default function InternDashboard() {
  const [, navigate] = useLocation();
  const [showPOCManagement, setShowPOCManagement] = useState<{leadId: number; companyId: number; companyName: string} | null>(null);

  const { data: assignedLeads, isLoading } = useQuery<LeadWithDetails[]>({
    queryKey: ['/api/leads/assigned'],
    queryFn: async () => {
      console.log('[InternDashboard] Fetching assigned leads...');
      const response = await fetch('/api/leads/assigned', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('[InternDashboard] Received leads:', data);
      return data;
    },
  });

  const handleCompanyClick = (lead: LeadWithDetails) => {
    setShowPOCManagement({
      leadId: lead.id,
      companyId: lead.companyId,
      companyName: lead.company.name
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading assigned leads...</span>
      </div>
    );
  }

  if (showPOCManagement) {
    return (
      <div className="flex justify-center">
        <POCManagement
          companyId={showPOCManagement.companyId}
          companyName={showPOCManagement.companyName}
          startInEditMode={false}
          onClose={() => setShowPOCManagement(null)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/leads/assigned'] });
            setShowPOCManagement(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Assigned Leads</h1>
          <p className="text-muted-foreground mt-1">View and manage leads assigned to you</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedLeads?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignedLeads?.filter(l => l.stage === 'outreach' || l.stage === 'pitching').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Outreach & Pitching</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed POCs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignedLeads?.filter(l => l.pocCompletionStatus === 'green').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Full contact info</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Leads</CardTitle>
          <CardDescription>
            View details, edit POCs, and log outreach activities for your assigned leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!assignedLeads || assignedLeads.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No assigned leads</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your analyst will assign leads to you when available
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Analyst</TableHead>
                  
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>POC Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedLeads.map((lead) => {
                  const stageInfo = getStageDisplay(lead.stage);
                  return (
                    <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          <button
                            onClick={() => handleCompanyClick(lead)}
                            className="text-base font-semibold hover:underline focus:outline-none focus:underline text-foreground flex items-center gap-1"
                            data-testid={`button-company-${lead.id}`}
                          >
                            {lead.company.name}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {lead.company.sector}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={stageInfo.className}>
                          {stageInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.ownerAnalyst ? (
                          <div className="text-sm">
                            {lead.ownerAnalyst.firstName} {lead.ownerAnalyst.lastName}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.assignmentDate 
                            ? format(new Date(lead.assignmentDate), 'MMM d, yyyy')
                            : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getPOCStatusColor(lead.pocCompletionStatus || 'red')}
                        >
                          {lead.pocCompletionStatus?.toUpperCase() || 'RED'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/?companyId=${lead.companyId}`)}
                          data-testid={`button-view-${lead.id}`}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
