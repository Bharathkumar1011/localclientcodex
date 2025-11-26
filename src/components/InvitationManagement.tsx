import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Send,
  Users,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  MailCheck
} from "lucide-react";
// import { invitationFormSchema, type InvitationFormData, type User } from "@/lib/types";
import { invitationFormSchema, type InvitationFormData, type User } from "@/lib/types";

interface InvitationManagementProps {
  currentUser: User;
}

interface Invitation {
  id: number;
  email: string;
  role: string;
  status: string;
  inviteToken: string;
  expiresAt: string;
  createdAt: string;
  emailStatus: string | null;
  emailSentAt: string | null;
  emailError: string | null;
  retryCount: number | null;
  lastRetryAt: string | null;
  invitedByUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function InvitationManagement({ currentUser }: InvitationManagementProps) {
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [deleteInvitation, setDeleteInvitation] = useState<Invitation | null>(null);

  // Fetch invitations
  const { data: invitations = [], isLoading, refetch } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
    queryFn: async () => {
      const response = await fetch('/api/invitations', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      return response.json();
    },
  });

  // Fetch users for analyst assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/users'],
    queryFn: async () => {
      const response = await fetch('/users', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Send invitation form
  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      email: '',
      role: 'analyst',
    },
  });

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async (data: InvitationFormData) => {
      return apiRequest('POST', '/api/invitations', data);
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent successfully!",
        description: "The invitation email has been sent to the recipient.",
      });
      form.reset();
      setShowInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return apiRequest('DELETE', `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled successfully.",
      });
      setDeleteInvitation(null);
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Retry invitation email mutation
  const retryInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return apiRequest('POST', `/api/invitations/${invitationId}/retry`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: data.emailSent ? "Email sent successfully!" : "Email failed to send",
        description: data.message,
        variant: data.emailSent ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to retry email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendInvitation = (data: InvitationFormData) => {
    sendInvitationMutation.mutate(data);
  };

  const handleDeleteInvitation = () => {
    if (deleteInvitation) {
      deleteInvitationMutation.mutate(deleteInvitation.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmailStatusBadge = (emailStatus: string | null) => {
    switch (emailStatus) {
      case 'sent':
        return <Badge variant="outline" className="text-green-600 border-green-600"><MailCheck className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'sending':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-600"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-600"><Mail className="w-3 h-3 mr-1" />Not Sent</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      partner: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      analyst: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      intern: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    };
    
    return (
      <Badge variant="secondary" className={roleColors[role as keyof typeof roleColors] || ""}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Team Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Team Invitations
            </CardTitle>
            <CardDescription>
              Invite new team members to join your organization
            </CardDescription>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-send-invitation">
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Send Team Invitation</DialogTitle>
                <DialogDescription>
                  Invite a new team member to join your organization.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSendInvitation)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="colleague@company.com"
                            data-testid="input-invitation-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invitation-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="analyst">Analyst</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                            {currentUser.role === 'admin' && (
                              <SelectItem value="admin">Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('role') === 'intern' && (
                    <FormField
                      control={form.control}
                      name="analystId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Analyst</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-invitation-analyst">
                                <SelectValue placeholder="Select an analyst" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.filter(u => u.role === 'analyst').map(analyst => (
                                <SelectItem key={analyst.id} value={analyst.id}>
                                  {analyst.firstName} {analyst.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowInviteDialog(false)}
                      data-testid="button-cancel-invitation"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={sendInvitationMutation.isPending}
                      data-testid="button-confirm-send-invitation"
                    >
                      {sendInvitationMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No invitations sent</h3>
            <p className="text-muted-foreground mb-4">
              Start by sending your first team invitation.
            </p>
            <Button
              onClick={() => setShowInviteDialog(true)}
              data-testid="button-send-first-invitation"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                data-testid={`invitation-${invitation.id}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <Mail className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium" data-testid={`invitation-email-${invitation.id}`}>
                        {invitation.email}
                      </span>
                      {getRoleBadge(invitation.role)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Invited by {invitation.invitedByUser.firstName} {invitation.invitedByUser.lastName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {isExpired(invitation.expiresAt) ? 'Expired' : 'Expires'} {formatDate(invitation.expiresAt)}
                      </span>
                      {invitation.emailSentAt && (
                        <span className="flex items-center gap-1">
                          <MailCheck className="w-3 h-3" />
                          Sent {formatDate(invitation.emailSentAt)}
                        </span>
                      )}
                      {invitation.retryCount && invitation.retryCount > 0 && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <RefreshCw className="w-3 h-3" />
                          {invitation.retryCount} {invitation.retryCount === 1 ? 'retry' : 'retries'}
                        </span>
                      )}
                    </div>
                    {invitation.emailError && (
                      <div className="mt-1 text-xs text-red-600 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{invitation.emailError}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(invitation.status)}
                  {getEmailStatusBadge(invitation.emailStatus)}
                  {invitation.emailStatus === 'failed' && invitation.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryInvitationMutation.mutate(invitation.id)}
                      disabled={retryInvitationMutation.isPending || (invitation.retryCount || 0) >= 5}
                      data-testid={`button-retry-email-${invitation.id}`}
                    >
                      {retryInvitationMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </>
                      )}
                    </Button>
                  )}
                  {invitation.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteInvitation(invitation)}
                      data-testid={`button-cancel-invitation-${invitation.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteInvitation} onOpenChange={() => setDeleteInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{" "}
              <span className="font-medium">{deleteInvitation?.email}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-keep-invitation">
              Keep Invitation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvitation}
              disabled={deleteInvitationMutation.isPending}
              data-testid="button-confirm-cancel-invitation"
            >
              {deleteInvitationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Invitation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}