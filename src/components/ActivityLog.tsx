import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, FileText, Target, UserCheck, MessageSquare, Phone, Mail, Video, Linkedin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from "@/lib/apiFetch";

// import { API_BASE_URL } from "@/lib/queryClient"; // if exported
interface ActivityLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  oldValue?: string;
  newValue?: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface ActivityLogProps {
  leadId?: number;
  companyId?: number;
  limit?: number;
  className?: string;
}

export function ActivityLog({ leadId, companyId, limit = 50, className }: ActivityLogProps) {
  const queryKey = ['activity-log'];
  if (leadId) queryKey.push('lead', leadId.toString());
  if (companyId) queryKey.push('company', companyId.toString());

  const { data: activities, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (leadId) params.set('leadId', leadId.toString());
      if (companyId) params.set('companyId', companyId.toString());
      if (limit) params.set('limit', limit.toString());

      return apiFetch(`${API_BASE_URL}/api/activity-log?${params.toString()}`)
        .then(res => res.json());
    },
  });

  const getActionIcon = (action: string, entityType: string) => {
    if (action.includes('created') || action.includes('added')) {
      switch (entityType) {
        case 'company': return <FileText className="h-4 w-4" />;
        case 'lead': return <Target className="h-4 w-4" />;
        case 'contact': return <User className="h-4 w-4" />;
        case 'intervention': 
          if (action.includes('linkedin')) return <Linkedin className="h-4 w-4" />;
          if (action.includes('call')) return <Phone className="h-4 w-4" />;
          if (action.includes('email')) return <Mail className="h-4 w-4" />;
          if (action.includes('meeting')) return <Video className="h-4 w-4" />;
          return <MessageSquare className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
      }
    }
    if (action.includes('assigned')) return <UserCheck className="h-4 w-4" />;
    if (action.includes('stage_changed')) return <Target className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const getActionColor = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('created') || action.includes('added')) return 'default';
    if (action.includes('assigned')) return 'secondary';
    if (action.includes('stage_changed')) return 'outline';
    return 'secondary';
  };

  const getUserInitials = (user: ActivityLogEntry['user']) => {
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last) || user.email.charAt(0).toUpperCase();
  };

  const formatActivityTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No activity logs found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="activity-log">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activity Log
          <Badge variant="secondary" className="ml-auto">
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {activities.map((activity: ActivityLogEntry, index: number) => (
              <div key={activity.id}>
                <div className="flex items-start space-x-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(activity.user)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionColor(activity.action)} className="flex items-center gap-1">
                        {getActionIcon(activity.action, activity.entityType)}
                        <span className="capitalize">
                          {activity.action.replace(/_/g, ' ')}
                        </span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatActivityTime(activity.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>
                        {activity.user.firstName && activity.user.lastName
                          ? `${activity.user.firstName} ${activity.user.lastName}`
                          : activity.user.email}
                      </span>
                      {activity.entityType && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{activity.entityType}</span>
                          {activity.entityId && (
                            <span>ID: {activity.entityId}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {index < activities.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ActivityLog;