import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  User, 
  Building, 
  Activity,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  details: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  timestamp: string;
  createdAt?: string;   // add this
  updatedAt?: string;   // optional but often present in APIs
  companyName?: string;
  leadId?: string;
}

interface AuditLogFilters {
  search: string;
  user: string;
  company: string;
  action: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  page: number;
  limit: number;
}

const actionTypes = [
  "lead_created",
  "lead_updated", 
  "lead_assigned",
  "lead_reassigned",
  "lead_stage_changed",
  "company_created",
  "company_updated",
  "poc_created",
  "poc_updated",
  "outreach_logged",
  "user_created",
  "user_updated",
  "user_role_changed"
];

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    search: "",
    user: "all",
    company: "all",
    action: "all",
    startDate: undefined,
    endDate: undefined,
    page: 1,
    limit: 50
  });

  // Transform filters for API - convert "all" to empty string for backend  
  const apiFilters = {
    ...filters,
    user: filters.user === "all" ? "" : filters.user,
    company: filters.company === "all" ? "" : filters.company,
    action: filters.action === "all" ? "" : filters.action,
  };

  // const { data: auditLogsResponse, isLoading } = useQuery({
  //   queryKey: ['/activity-log', apiFilters],
  //   enabled: true
  // });

    const { data: auditLogsResponse, isLoading } = useQuery({
    queryKey: ['/activity-log', apiFilters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (apiFilters.search) params.append('search', apiFilters.search);
      if (apiFilters.user) params.append('user', apiFilters.user);
      if (apiFilters.company) params.append('company', apiFilters.company);
      if (apiFilters.action) params.append('action', apiFilters.action);
      if (apiFilters.startDate) params.append('startDate', apiFilters.startDate.toISOString());
      if (apiFilters.endDate) params.append('endDate', apiFilters.endDate.toISOString());
      params.append('page', apiFilters.page.toString());
      params.append('limit', apiFilters.limit.toString());

      const res = await fetch(`/api/activity-logs?${params.toString()}`, {
        credentials: "include"
      });

      if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.status}`);
      const json = await res.json();

    // ✅ Your backend returns { data: [...] } or plain array — normalize both cases
    if (Array.isArray(json)) {
      return { data: json, total: json.length };
    }

    if (Array.isArray(json.data)) {
      return { data: json.data, total: json.total ?? json.data.length };
    }

    // fallback for edge cases
    return { data: [], total: 0 };
    },
    enabled: true
  });
// 🧠 Add this right here (below useQuery)
console.log('🧠 auditLogsResponse:', auditLogsResponse);

  const { data: usersResponse } = useQuery({
    queryKey: ['/users'],
    enabled: true
  });

  const { data: companiesResponse } = useQuery({
    queryKey: ['/companies'],
    enabled: true
  });

  // const auditLogs = auditLogsResponse as { data?: ActivityLog[], total?: number } | undefined;
  const auditLogs = auditLogsResponse ?? { data: [], total: 0 };
  console.log("✅ Final normalized logs object:", auditLogs);
  
  const users = usersResponse as { data?: any[] } | undefined;
  const companies = companiesResponse as { data?: any[] } | undefined;

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      user: "all",
      company: "all",
      action: "all",
      startDate: undefined,
      endDate: undefined,
      page: 1,
      limit: 50
    });
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (action.includes('updated') || action.includes('changed')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (action.includes('assigned')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    if (action.includes('deleted')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatActionName = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-audit-log">
            <FileText className="h-8 w-8" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-2">
            Track all user activities and system changes across the platform
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Search and filter activity logs by user, company, action, and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                  data-testid="input-search-logs"
                />
              </div>
            </div>

            {/* User Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select 
                value={filters.user} 
                onValueChange={(value) => handleFilterChange('user', value)}
              >
                <SelectTrigger data-testid="select-filter-user">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users?.data?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Company</label>
              <Select 
                value={filters.company} 
                onValueChange={(value) => handleFilterChange('company', value)}
              >
                <SelectTrigger data-testid="select-filter-company">
                  <Building className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companies?.data?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select 
                value={filters.action} 
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger data-testid="select-filter-action">
                  <Activity className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {formatActionName(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={clearFilters} 
              variant="outline" 
              size="sm"
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            {auditLogs?.total ? `Showing ${auditLogs.data?.length || 0} of ${auditLogs.total} activities` : 'Loading activities...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : auditLogs?.data?.length ? (
            <>
              <div className="space-y-4">
                {auditLogs.data.map((log: ActivityLog) => (
                  <div key={log.id} className="border rounded-lg p-4 hover-elevate" data-testid={`log-entry-${log.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="secondary" 
                            className={getActionBadgeColor(log.action)}
                          >
                            {formatActionName(log.action)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {/* {format(new Date(log.timestamp), "PPp")} */}
                            {format(new Date(log.createdAt ?? log.timestamp), "PPp")}

                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <span className="font-medium">{log.userFirstName} {log.userLastName}</span>
                          <span className="text-muted-foreground text-sm ml-2">({log.userEmail})</span>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium">{log.entityType}:</span> {log.entityName}
                          {log.companyName && (
                            <>
                              <span className="text-muted-foreground mx-2">•</span>
                              <span className="font-medium">Company:</span> {log.companyName}
                            </>
                          )}
                        </div>

                        {log.details && (
                          <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                            {log.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {auditLogs?.total && auditLogs.total > filters.limit && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {filters.page} of {Math.ceil(auditLogs.total / filters.limit)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={filters.page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={filters.page >= Math.ceil(auditLogs?.total || 1 / filters.limit)}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No activity logs found</h3>
              <p className="text-muted-foreground">
                {Object.values(filters).some(v => v && v !== 1 && v !== 50) 
                  ? "Try adjusting your filters to see more results"
                  : "No activities have been logged yet"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}