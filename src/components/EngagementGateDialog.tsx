import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Calendar, CheckCircle, UserCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface Contact {
  id: number;
  companyId: number;
  name: string;
  designation: string;
  email?: string;
  phone?: string;
  linkedinProfile: string;
  isPrimary: boolean;
  isComplete: boolean;
}

interface EngagementGateDialogProps {
  isOpen: boolean;
  leadId: number;
  companyId: number;
  companyName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EngagementGateDialog({
  isOpen,
  leadId,
  companyId,
  companyName,
  onClose,
  onSuccess
}: EngagementGateDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    meetingType: 'meeting' as const,
    scheduledAt: '',
    notes: '',
    defaultPocId: '',
    backupPocId: ''
  });

  // Fetch contacts for POC selection
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: [`/contacts/company/${companyId}`],
    enabled: isOpen && !!companyId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.scheduledAt || !formData.notes.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!formData.defaultPocId) {
      toast({
        title: "Missing POC Selection",
        description: "Please select a default POC for pitching",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Create the meeting intervention
      await apiRequest('POST', `/interventions`, {
        leadId,
        type: formData.meetingType,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        notes: formData.notes
      });

      // Move the lead to pitching stage with POC information
      await apiRequest('PATCH', `/leads/${leadId}/stage`, {
        stage: 'pitching',
        defaultPocId: parseInt(formData.defaultPocId),
        backupPocId: formData.backupPocId ? parseInt(formData.backupPocId) : null
      });

      toast({
        title: "Success",
        description: "Meeting recorded and lead moved to Pitching stage",
      });

      // Invalidate queries and wait for refetch to complete
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['interventions', leadId], refetchType: 'active' });

      // Reset form
      setFormData({
        meetingType: 'meeting',
        scheduledAt: '',
        notes: '',
        defaultPocId: '',
        backupPocId: ''
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record meeting and move lead",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      meetingType: 'meeting',
      scheduledAt: '',
      notes: '',
      defaultPocId: '',
      backupPocId: ''
    });
    onClose();
  };

  // Filter available backup POCs (exclude the selected default POC)
  const availableBackupPocs = contacts.filter(c => c.id.toString() !== formData.defaultPocId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl" data-testid="dialog-engagement-gate">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Record Meeting - Move to Pitching
          </DialogTitle>
          <DialogDescription>
            To move <span className="font-semibold">{companyName}</span> to Pitching stage, you must record a meeting and select POCs for engagement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 h-[550px] pl-2 overflow-y-auto pr-2 ">
          <div className="space-y-2">
            <Label htmlFor="meeting-type">Meeting Type</Label>
            <Select
              value={formData.meetingType}
              onValueChange={(value) => setFormData({ ...formData, meetingType: value as 'meeting' })}
            >
              <SelectTrigger id="meeting-type" data-testid="select-meeting-type">
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Meeting Date & Time *</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              data-testid="input-meeting-datetime"
              required
            />
            <p className="text-xs text-muted-foreground">When did or will the meeting take place?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Meeting Notes *</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Describe the meeting: attendees, key discussion points, outcomes, next steps..."
              rows={5}
              data-testid="textarea-meeting-notes"
              required
            />
            <p className="text-xs text-muted-foreground">Include POC names, discussion topics, and outcomes</p>
          </div>

          {/* POC Selection Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              <h3 className="font-semibold">POC Selection for Pitching</h3>
            </div>
            
            {isLoadingContacts ? (
              <p className="text-sm text-muted-foreground">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <div className="p-4 border border-destructive rounded-md bg-destructive/10">
                <p className="text-sm text-destructive font-medium">No contacts found for this company</p>
                <p className="text-xs text-muted-foreground mt-1">Please add POCs before moving to Pitching stage</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="default-poc">
                    Default POC <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.defaultPocId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, defaultPocId: value });
                      // Clear backup POC if it's the same as default POC
                      if (formData.backupPocId === value) {
                        setFormData({ ...formData, defaultPocId: value, backupPocId: '' });
                      }
                    }}
                  >
                    <SelectTrigger id="default-poc" data-testid="select-default-poc">
                      <SelectValue placeholder="Select primary contact for pitching" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-50">
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} - {contact.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Primary point of contact for this pitch</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-poc">Backup POC (Optional)</Label>
                  <Select
                    value={formData.backupPocId}
                    onValueChange={(value) => setFormData({ ...formData, backupPocId: value })}
                    disabled={!formData.defaultPocId}
                  >
                    <SelectTrigger id="backup-poc" data-testid="select-backup-poc">
                      <SelectValue placeholder="Select backup contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBackupPocs.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} - {contact.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Secondary contact if primary is unavailable</p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              data-testid="button-cancel-engagement"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || contacts.length === 0}
              data-testid="button-save-engagement"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Record Meeting & Move to Pitching"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
