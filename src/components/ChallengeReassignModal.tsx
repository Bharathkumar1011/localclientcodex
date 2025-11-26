import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Users, Building2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { Lead, Company, User as UserType } from "@/lib/types";

interface ChallengeReassignModalProps {
  lead: Lead | null;
  company: Company | null;
  currentAssignedUser: Partial<UserType> | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
}

export default function ChallengeReassignModal({ 
  lead, 
  company, 
  currentAssignedUser,
  isOpen, 
  onClose, 
  currentUser 
}: ChallengeReassignModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [challengeText, setChallengeText] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate challenge token when modal opens
  const tokenGenerationMutation = useMutation({
      mutationFn: async () => {
        if (!lead) throw new Error('Lead is required');
        const response = await apiRequest('POST', '/challenge-token/generate', {
          leadId: lead.id,
          purpose: 'reassignment'
        });
        return response.json();
      },

    onSuccess: (data: { token: string }) => {
      setChallengeToken(data.token);
      console.log('Challenge token generated for reassignment');
    },
    onError: (error: any) => {
      console.error('Failed to generate challenge token:', error);
      toast({
        title: "Token Generation Failed",
        description: "Failed to generate security token. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedUserId(null);
      setChallengeText("");
      setChallengeToken(null);
      onClose();
    } else if (open && lead && !challengeToken) {
      // Generate challenge token when modal opens for the first time
      tokenGenerationMutation.mutate();
    }
  };

  // Fetch all users for assignment (partners/admins only)  
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<UserType[]>({
    queryKey: ['/users'],
    enabled: isOpen && ['partner', 'admin', 'analyst'].includes(currentUser.role),
    queryFn: async () => {
      const response = await fetch('/users', {
        credentials: 'include',
        cache: 'no-cache',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // // Reassignment mutation
  // const reassignmentMutation = useMutation({
  //   mutationFn: async (data: { leadId: number; assignedTo: string }) => {
  //     return apiRequest('POST', `/api/leads/${data.leadId}/assign`, { 
  //       assignedTo: data.assignedTo,
  //       challengeToken: challengeToken
  //     });
  //   },
  //   onSuccess: () => {
  //     toast({
  //       title: "Lead Reassigned",
  //       description: "The lead has been successfully reassigned.",
  //     });
  //     // Invalidate all leads queries
  //     queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
  //     handleOpenChange(false);
  //   },
  //   onError: (error: any) => {
  //     console.error('Reassignment error:', error);
  //     let errorMessage = "Failed to reassign the lead. Please try again.";
      
  //     // Handle specific token-related errors
  //     if (error?.response?.data?.message) {
  //       const message = error.response.data.message;
  //       if (message.includes('Challenge token required')) {
  //         errorMessage = "Security token required for reassignment. Please close and reopen the modal.";
  //       } else if (message.includes('Invalid or expired challenge token')) {
  //         errorMessage = "Security token has expired. Please close and reopen the modal.";
  //       } else {
  //         errorMessage = message;
  //       }
  //     }
      
  //     toast({
  //       title: "Reassignment Failed",
  //       description: errorMessage,
  //       variant: "destructive",
  //     });
  //   }
  // });

  // const handleReassign = () => {
  //   if (!lead || !selectedUserId) return;
    
  //   reassignmentMutation.mutate({
  //     leadId: lead.id,
  //     assignedTo: selectedUserId
  //   });
  // };

// ...existing code...
  // // Reassignment mutation (call server reassign endpoint and surface error text)
  // const reassignmentMutation = useMutation({
  //   mutationFn: async (data: { leadId: number; fromInternId: string; toInternId: string; notes?: string }) => {
  //     const res = await fetch(`/api/leads/${data.leadId}/reassign-intern`, {
  //       method: 'PATCH',
  //       credentials: 'include',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         fromInternId: data.fromInternId,
  //         toInternId: data.toInternId,
  //         notes: data.notes ?? '',
  //       }),
  //     });

  //     const payload = await res.json().catch(() => ({}));
  //     if (!res.ok) {
  //       // prefer server error message if provided
  //       const message = payload?.message || payload?.error || `HTTP ${res.status}`;
  //       const err: any = new Error(message);
  //       err.response = payload;
  //       throw err;
  //     }
  //     return payload;
  //   },
  //   onSuccess: (data) => {
  //     toast({
  //       title: "Lead Reassigned",
  //       description: "The lead has been successfully reassigned.",
  //     });
  //     queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
  //     handleOpenChange(false);
  //   },
  //   onError: (error: any) => {
  //     console.error('Reassignment error:', error);
  //     const serverMessage = error?.message || (error?.response && (error.response.message || error.response.error)) || 'Failed to reassign the lead. Please try again.';
  //     toast({
  //       title: "Reassignment Failed",
  //       description: serverMessage,
  //       variant: "destructive",
  //     });
  //   }
  // });

  const reassignmentMutation = useMutation({
    mutationFn: async (data: { leadId: number; fromInternId: string; toInternId: string; notes?: string }) => {
      const res = await fetch(`/api/leads/${data.leadId}/reassign-intern`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to reassign lead');
      }

      return res.json();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Reassignment failed');
    },
    onSuccess: () => {
      toast.success('Lead reassigned successfully');
      queryClient.invalidateQueries(['leads']);
    },
  });



  const handleReassign = () => {
    if (!lead || !selectedUserId || !currentAssignedUser?.id) return;

    // send fromInternId (current assigned) and toInternId (selected)
    reassignmentMutation.mutate({
      leadId: lead.id,
      fromInternId: String(currentAssignedUser.id),
      toInternId: String(selectedUserId),
      notes: `Reassigned by ${currentUser.email ?? currentUser.id}`
    });
  };
// ...existing code...


  // Check if challenge is correctly typed
  // const isChallengeValid = challengeText.trim().toUpperCase() === "REASSIGN";
  // const canSubmit = selectedUserId && isChallengeValid && challengeToken && !reassignmentMutation.isPending && !tokenGenerationMutation.isPending;
  const canSubmit = Boolean(selectedUserId);

  if (!lead || !company || !currentAssignedUser) return null;

  // Check if user has permission to reassign
  const canReassign = ['partner', 'admin', 'analyst'].includes(currentUser.role);

  if (!canReassign) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent data-testid="modal-challenge-reassign">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Reassignment Not Permitted
            </DialogTitle>
            <DialogDescription>
              Only partners and administrators can reassign leads.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => handleOpenChange(false)} data-testid="button-close">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Get the name of the currently assigned user
  const currentAssignedName = currentAssignedUser.firstName && currentAssignedUser.lastName
    ? `${currentAssignedUser.firstName} ${currentAssignedUser.lastName}`
    : currentAssignedUser.email;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-challenge-reassign">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* <ShieldAlert className="h-5 w-5 text-destructive" /> */}
            Confirm Lead Reassignment
          </DialogTitle>
          <DialogDescription>
            You are about to reassign this lead to another team member. This action will be logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead Information */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <h4 className="font-medium">{company.name}</h4>
              <p className="text-sm text-muted-foreground">
                Stage: <Badge variant="outline">{lead.stage}</Badge>
              </p>
            </div>
          </div>

          {/* Current Assignment */}
          <div className="p-3 border rounded-md">
            <h5 className="font-medium mb-1">Currently Assigned To:</h5>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{currentAssignedName}</span>
              <Badge variant="secondary" className="ml-2">
                {currentAssignedUser.role}
              </Badge>
            </div>
          </div>

          {/* Security Token Status */}
          {tokenGenerationMutation.isPending && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Generating security token for reassignment...
              </AlertDescription>
            </Alert>
          )}

          {/* {!challengeToken && !tokenGenerationMutation.isPending && (
            <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Security token required. Please wait while we prepare your request.
              </AlertDescription>
            </Alert>
          )} */}

          {/* New Assignment Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reassign to:</label>
            <Select 
              onValueChange={setSelectedUserId} 
              // disabled={isLoadingUsers || !challengeToken || tokenGenerationMutation.isPending}
              disabled={isLoadingUsers}
            >
              <SelectTrigger data-testid="select-reassign-user">
                {/* <SelectValue placeholder={
                  !challengeToken ? "Preparing security token..." : "Select new assignee..."
                } />
              </SelectTrigger> */}
                <SelectValue placeholder={
                  "Select new assignee..."
                } />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                {users
                  .filter(user => user.id !== currentAssignedUser.id) // Don't allow reassigning to same user
                  .map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.email
                      }
                      <Badge variant="secondary" className="ml-2">
                        {user.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Challenge Section */}
          {/* <Alert className="border-destructive/50 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Check:</strong> To prevent accidental reassignments, please type <code className="bg-muted px-1 rounded">REASSIGN</code> in the field below.
            </AlertDescription>
          </Alert> */}

          {/* <div className="space-y-2">
            <label className="text-sm font-medium">Type "REASSIGN" to confirm:</label>
            <Input
              type="text"
              value={challengeText}
              onChange={(e) => setChallengeText(e.target.value)}
              placeholder="Type REASSIGN here..."
              className={challengeText && !isChallengeValid ? "border-destructive" : ""}
              data-testid="input-challenge-text"
            />
            {challengeText && !isChallengeValid && (
              <p className="text-sm text-destructive">
                Please type "REASSIGN" exactly as shown
              </p>
            )}
          </div> */}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={reassignmentMutation.isPending}
              data-testid="button-cancel-reassign"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!canSubmit}
              variant="destructive"
              data-testid="button-confirm-reassign"
            >
              {reassignmentMutation.isPending ? "Reassigning..." : "Confirm Reassignment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}