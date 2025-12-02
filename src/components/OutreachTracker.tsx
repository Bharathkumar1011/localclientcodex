import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Linkedin,
  Mail,
  Phone,
  MessageSquare,
  Users,
  FileText,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

interface OutreachActivity {
  id: number;
  leadId: number;
  userId: string;
  activityType: string;
  status: 'pending' | 'completed' | 'scheduled' | 'sent' | 'received' | 'follow_up' | 'invalid';
  contactDate: string | null;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface OutreachTrackerProps {
  leadId: number;
  companyId: number;
  companyName: string;
  leadStage: string;
  onClose: () => void;
  onViewPOC?: () => void;
}

const activityTypeOptions = [
  { value: 'linkedin_request_self', label: 'LinkedIn Request (Self)', icon: Linkedin, actions: { linkedin: true } },
  { value: 'linkedin_request_kvs', label: 'LinkedIn Request (KVS)', icon: Linkedin, actions: { linkedin: true } },
  { value: 'linkedin_request_dinesh', label: 'LinkedIn Request (Dinesh)', icon: Linkedin, actions: { linkedin: true } },
  { value: 'linkedin_messages_self', label: 'LinkedIn Messages (Self)', icon: MessageSquare, actions: { linkedin: true } },
  { value: 'linkedin_messages_kvs', label: 'LinkedIn Messages (KVS)', icon: MessageSquare, actions: { linkedin: true } },
  { value: 'linkedin_messages_dinesh', label: 'LinkedIn Messages (Dinesh)', icon: MessageSquare, actions: { linkedin: true } },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, actions: { phone: true } },
  { value: 'email_d0_analyst', label: 'Email D0 (Analyst)', icon: Mail, actions: { email: true } },
  { value: 'call_d1_dinesh', label: 'Call D1 (Dinesh)', icon: Phone, actions: { phone: true } },
  { value: 'email_d3_analyst', label: 'Email D3 (Analyst)', icon: Mail, actions: { email: true } },
  { value: 'email_d7_kvs', label: 'Email D7 (KVS)', icon: Mail, actions: { email: true } },
  { value: 'channel_partner', label: 'Channel Partner', icon: Users, actions: { phone: true, email: true } },
];

const statusOptions = [
  { 
    value: 'sent', 
    label: 'Sent', 
    tag: 'Non-responsive', 
    description: 'Action proceeded but no response received',
    variant: 'secondary' as const
  },
  { 
    value: 'received', 
    label: 'Received', 
    tag: 'Responded', 
    description: 'Follow-back response received',
    variant: 'default' as const
  },
  { 
    value: 'follow_up', 
    label: 'Follow Up', 
    tag: 'Non-responsive', 
    description: 'No response received or requires further discussion',
    variant: 'secondary' as const
  },
  { 
    value: 'invalid', 
    label: 'Invalid', 
    tag: 'Invalid', 
    description: 'False contact details encountered',
    variant: 'destructive' as const
  },
];

const getActivityTypeLabel = (value: string) => {
  const option = activityTypeOptions.find(opt => opt.value === value);
  return option?.label || value;
};

const getActivityTypeIcon = (value: string) => {
  const option = activityTypeOptions.find(opt => opt.value === value);
  return option?.icon || MessageSquare;
};

const getActivityTypeIndex = (value: string) => {
  return activityTypeOptions.findIndex(opt => opt.value === value);
};

const shouldShowStatusField = (activityType: string) => {
  const index = getActivityTypeIndex(activityType);
  return index >= 0 && index <= 11;
};

const getStatusTag = (statusValue: string) => {
  const status = statusOptions.find(opt => opt.value === statusValue);
  return status?.tag || '';
};

const combineDateAndTime = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  return `${date}T${time}`;
};

interface ContactIconPopoverProps {
  icon: typeof Phone | typeof Mail | typeof Linkedin;
  contacts: any[];
  type: 'phone' | 'email' | 'linkedin';
  optionValue: string;
  className?: string;
}

const ContactIconPopover = ({ icon: Icon, contacts, type, optionValue,className }: ContactIconPopoverProps) => {
  const [open, setOpen] = useState(false);
  
  const getContactItems = () => {
    const items: { name: string; value: string }[] = [];
    
    contacts.forEach((contact) => {
      let value = '';
      if (type === 'phone' && contact.phone) {
        value = contact.phone;
      } else if (type === 'email' && contact.email) {
        value = contact.email;
      } else if (type === 'linkedin' && contact.linkedinProfile) {
        value = contact.linkedinProfile;
      }
      
      if (value) {
        items.push({ name: contact.name || 'Unknown', value });
      }
    });
    
    return items;
  };
  
  const contactItems = getContactItems();
  
  if (contactItems.length === 0) {
    return null;
  }
  
  const handleContactClick = (value: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'phone') {
      window.open(`tel:${value}`, '_self');
    } else if (type === 'email') {
      window.open(`mailto:${value}`, '_self');
    } else if (type === 'linkedin') {
      window.open(value, '_blank');
    }
    
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Icon
          className="h-3.5 w-3.5 text-muted-foreground hover-elevate cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!open);
          }}
          data-testid={`icon-${type}-${optionValue}`}
        />
      </PopoverTrigger>
      <PopoverContent 
        className={`w-64 p-2 ${className}`}
        align="end"
        side="right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {type === 'phone' ? 'Phone Numbers' : type === 'email' ? 'Email Addresses' : 'LinkedIn Profiles'}
          </p>
          {contactItems.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-1 p-2 rounded-md hover-elevate cursor-pointer"
              onClick={(e) => handleContactClick(item.value, e)}
              data-testid={`contact-${type}-${index}`}
            >
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground truncate">{item.value}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function OutreachTracker({ 
  leadId,
  companyId,
  companyName,
  leadStage,
  onClose,
  onViewPOC
}: OutreachTrackerProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  // ✅ Auto-open Add Outreach form when coming from Scheduled Tasks
// useEffect(() => {
//   const params = new URLSearchParams(window.location.search);
//   const interventionId = params.get("interventionId");

//   if (interventionId) {
//     console.log("Detected interventionId from URL:", interventionId);
//     setShowAddForm(true);
//   }
// }, []);

  const [formData, setFormData] = useState({
    activityType: 'linkedin_request_self',
    status: 'completed' as 'completed' | 'scheduled' | 'sent' | 'received' | 'follow_up' | 'invalid',
    contactDate: '',
    contactTime: '',
    followUpDate: '',
    followUpTime: '',
    notes: '',
  });
  const [selectedStatusTag, setSelectedStatusTag] = useState<string>('');

  // Document collection state for Pitching/Mandates stages
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentFormData, setDocumentFormData] = useState({
    documentName: '',
    uploadDate: '',
    notes: '',
  });

  // Google Drive Link state for Pitching stage
  const [driveLink, setDriveLink] = useState('');
  const [isEditingDriveLink, setIsEditingDriveLink] = useState(false);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const interventionId = params.get("interventionId");

  if (interventionId) {
    setShowAddForm(true);
  }
}, []);


  // Fetch outreach activities
  const { data: activities = [], isLoading } = useQuery<OutreachActivity[]>({
    queryKey: ['/outreach/lead', leadId],
    queryFn: () =>
      apiRequest('GET', `/outreach/lead/${leadId}`).then(res => res.json()),
    enabled: !!leadId,
  });

  // --- detect if editing existing scheduled task ---
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const leadIdFromUrl = searchParams.get("leadId");
  const interventionIdFromUrl = searchParams.get("interventionId");

  // Auto-open Add Outreach form when coming from Scheduled Tasks
  useEffect(() => {
    if (interventionIdFromUrl) {
      setShowAddForm(true);
    }
  }, [interventionIdFromUrl]);

  // Fetch documents (interventions with type='document') for Pitching/Mandates stages
  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ['/interventions/lead', leadId],
    queryFn: () =>
      apiRequest('GET', `/interventions/lead/${leadId}`).then(res => res.json()),
    enabled: !!leadId && (leadStage === 'pitching' || leadStage === 'mandates'),
  });


  // Fetch company data for Drive Link (Pitching stage only)
  const { data: company } = useQuery<any>({
    queryKey: ['/companies', companyId],
    queryFn: () =>
      apiRequest('GET', `/companies/${companyId}`).then(res => res.json()),
    enabled: !!companyId && leadStage === 'pitching',
  });

  
  console.log("company data:", company);


  // Fetch contacts for the company to display POC information
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['/contacts/company', companyId],
    queryFn: () =>
      apiRequest('GET', `/contacts/company/${companyId}`).then(res => res.json()),
    enabled: !!companyId,
  });

  console.log("contacts data:", contacts);


  // Update driveLink state when company data is loaded
  useEffect(() => {
    if (company?.driveLink) {
      setDriveLink(company.driveLink);
    }
  }, [company]);

  // Update company drive link mutation
  const updateDriveLinkMutation = useMutation({
    mutationFn: (link: string) => apiRequest('PATCH', `/companies/${companyId}`, { driveLink: link }),
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Google Drive Link updated successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId], refetchType: 'active' });
      setIsEditingDriveLink(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Drive Link",
        variant: "destructive",
      });
    },
  });

  // Create outreach activity mutation
  const createActivityMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/outreach', data),
    onSuccess: async (data, variables) => {
      const hasFollowUp = typeof variables.followUpDate === 'string' && variables.followUpDate.length > 0;
      toast({
        title: "Success",
        description: hasFollowUp 
          ? "Outreach activity added and scheduled in Scheduled Tasks" 
          : "Outreach activity added",
      });
      await queryClient.invalidateQueries({ queryKey: ['/outreach/lead', leadId], refetchType: 'active' });
      
      // If follow-up date provided, also refresh Scheduled Tasks pipeline
      if (hasFollowUp) {
        await queryClient.invalidateQueries({ queryKey: ['/interventions/scheduled'], refetchType: 'active' });
      }
      
      setShowAddForm(false);
      setSelectedStatusTag('');
      setFormData({
        activityType: 'linkedin_request_self',
        status: 'completed',
        contactDate: '',
        contactTime: '',
        followUpDate: '',
        followUpTime: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add outreach activity",
        variant: "destructive",
      });
    },
  });

  // Create document mutation for Pitching/Mandates stages
  const createDocumentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/interventions', data),
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Document recorded successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ['/interventions/lead', leadId], refetchType: 'active' });
      setShowDocumentForm(false);
      setDocumentFormData({
        documentName: '',
        uploadDate: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record document",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.notes.trim()) {
      toast({
        title: "Error",
        description: "Please add notes for this activity",
        variant: "destructive",
      });
      return;
    }

    // Automatically set contact date to current time
    const contactDateTime = new Date().toISOString();
    const followUpDateTime = combineDateAndTime(formData.followUpDate, formData.followUpTime);

    createActivityMutation.mutate({
      leadId,
      activityType: formData.activityType,
      status: formData.status,
      contactDate: contactDateTime,
      followUpDate: followUpDateTime ? new Date(followUpDateTime).toISOString() : null,
      notes: formData.notes,
    });
  };

  const handleDocumentSubmit = () => {
    if (!documentFormData.documentName) {
      toast({
        title: "Error",
        description: "Please select a document type",
        variant: "destructive",
      });
      return;
    }

    if (!documentFormData.uploadDate) {
      toast({
        title: "Error",
        description: "Please select upload date",
        variant: "destructive",
      });
      return;
    }

    if (!documentFormData.notes.trim()) {
      toast({
        title: "Error",
        description: "Please add notes about this document",
        variant: "destructive",
      });
      return;
    }

    createDocumentMutation.mutate({
      leadId,
      type: 'document',
      documentName: documentFormData.documentName,
      scheduledAt: new Date(documentFormData.uploadDate).toISOString(),
      notes: documentFormData.notes,
    });
  };

  // Group activities by status
  const completedActivities = activities.filter(a => a.status === 'completed');
  // const scheduledActivities = activities.filter(a => a.status === 'scheduled');
  const scheduledActivities = activities.filter(a =>
  ['scheduled', 'received', 'follow_up'].includes(a.status)
);

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Outreach Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{companyName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
                data-testid="button-toggle-add-form"
              >
                {showAddForm ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Outreach
                  </>
                )}
              </Button>
              {onViewPOC && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={onViewPOC}
                  data-testid="button-view-poc"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View POC
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClose}
                data-testid="button-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Google Drive Link Section - Only for Pitching Stage */}
          {leadStage === 'pitching' && (
            <Card className="border-2 border-blue-200 dark:border-blue-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-base">Pitching Documents Drive Link</CardTitle>
                  </div>
                  {!isEditingDriveLink && driveLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingDriveLink(true)}
                      data-testid="button-edit-drive-link"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingDriveLink || !driveLink ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="driveLink">Google Drive Link</Label>
                      <Input
                        id="driveLink"
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={driveLink}
                        onChange={(e) => setDriveLink(e.target.value)}
                        data-testid="input-drive-link"
                      />
                      <p className="text-xs text-muted-foreground">
                        Add a Google Drive link containing all pitching documents for this company
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      {driveLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (company?.driveLink) {
                              setDriveLink(company.driveLink);
                            }
                            setIsEditingDriveLink(false);
                          }}
                          data-testid="button-cancel-drive-link"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => updateDriveLinkMutation.mutate(driveLink)}
                        disabled={!driveLink.trim() || updateDriveLinkMutation.isPending}
                        data-testid="button-save-drive-link"
                      >
                        {updateDriveLinkMutation.isPending ? 'Saving...' : 'Save Link'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <a
                      href={driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                      data-testid="link-drive"
                    >
                      {driveLink}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add Outreach Form */}
          {showAddForm && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">Add Outreach Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="activityType">Activity Type</Label>
                    <Select
                      value={formData.activityType}
                      onValueChange={(value) => {
                        // If switching to activity type that doesn't show status field (0-1), set default status to 'completed'
                        if (!shouldShowStatusField(value)) {
                          setFormData({ ...formData, activityType: value, status: 'completed' });
                          setSelectedStatusTag('');
                        } else {
                          setFormData({ ...formData, activityType: value });
                        }
                      }}
                    >
                      <SelectTrigger id="activityType" data-testid="select-activity-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-50">
                        {activityTypeOptions.map((option, index) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-2">
                                <option.icon className="h-4 w-4" />
                                <span>{option.label}</span>
                                {selectedStatusTag && index >= 0 && index <= 11 && formData.activityType === option.value && (
                                  <Badge 
                                    variant={statusOptions.find(s => s.tag === selectedStatusTag)?.variant || 'secondary'}
                                    className="text-xs"
                                    data-testid={`badge-status-tag-${option.value}`}
                                  >
                                    {selectedStatusTag}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {shouldShowStatusField(formData.activityType) && (
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => {
                          setFormData({ ...formData, status: value });
                          // Update the selected status tag for dynamic display
                          const tag = getStatusTag(value);
                          setSelectedStatusTag(tag);
                        }}
                      >
                        <SelectTrigger id="status" data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-50">
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              <div className="flex flex-col gap-1 py-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{status.label}</span>
                                  <Badge 
                                    variant={status.variant}
                                    className="text-xs"
                                    data-testid={`badge-${status.value}`}
                                  >
                                    {status.tag}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{status.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                   {/* Contacts Section */}
                  <div className="space-y-2">
                    <Label>Contacts</Label>
                    <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-md border">
                      <span className="text-xs font-medium text-muted-foreground">Quick Contact:</span>
                      <div className="flex gap-2">
                        {contacts.some(c => c.phone) && (
                          <ContactIconPopover className="bg-gray-50"
                            icon={Phone}
                            contacts={contacts}
                            type="phone"
                            optionValue={formData.activityType}
                          />
                        )}
                        {contacts.some(c => c.email) && (
                          <ContactIconPopover className="bg-gray-50"
                            icon={Mail}
                            contacts={contacts}
                            type="email"
                            optionValue={formData.activityType}
                          />
                        )}
                        {contacts.some(c => c.linkedinProfile) && (
                          <ContactIconPopover className="bg-gray-50"
                            icon={Linkedin}
                            contacts={contacts}
                            type="linkedin"
                            optionValue={formData.activityType}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Follow-up Date & Time (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          id="followUpDate"
                          type="date"
                          placeholder="Select date"
                          value={formData.followUpDate}
                          onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                          data-testid="input-follow-up-date"
                        />
                      </div>
                      <div>
                        <Input
                          id="followUpTime"
                          type="time"
                          placeholder="Select time"
                          value={formData.followUpTime}
                          onChange={(e) => setFormData({ ...formData, followUpTime: e.target.value })}
                          data-testid="input-follow-up-time"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add a follow-up date to schedule this task in your Scheduled Tasks pipeline
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this outreach activity..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    data-testid="textarea-notes"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createActivityMutation.isPending}
                    data-testid="button-save"
                  >
                    {createActivityMutation.isPending ? 'Saving...' : 'Save Activity'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Collection Section - Only for Pitching and Mandates stages */}
          {(leadStage === 'pitching' || leadStage === 'mandates') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Document Collection</h3>
                  <Badge variant="secondary">{documents.length}</Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDocumentForm(!showDocumentForm)}
                  data-testid="button-toggle-document-form"
                >
                  {showDocumentForm ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </>
                  )}
                </Button>
              </div>

              {/* Add Document Form */}
              {showDocumentForm && (
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base">Record Document Submission</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="documentName">Document Type</Label>
                        <Select
                          value={documentFormData.documentName}
                          onValueChange={(value) => setDocumentFormData({ ...documentFormData, documentName: value })}
                        >
                          <SelectTrigger id="documentName" data-testid="select-document-name">
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent>
                            {leadStage === 'pitching' && (
                              <>
                                <SelectItem value="PDM">PDM (Preliminary Due Diligence)</SelectItem>
                                <SelectItem value="MTS">MTS (Management Term Sheet)</SelectItem>
                              </>
                            )}
                            {leadStage === 'mandates' && (
                              <>
                                <SelectItem value="Letter of Engagement">Letter of Engagement</SelectItem>
                                <SelectItem value="Contract">Contract</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="uploadDate">Upload Date</Label>
                        <Input
                          id="uploadDate"
                          type="date"
                          value={documentFormData.uploadDate}
                          onChange={(e) => setDocumentFormData({ ...documentFormData, uploadDate: e.target.value })}
                          data-testid="input-upload-date"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="documentNotes">Notes</Label>
                      <Textarea
                        id="documentNotes"
                        placeholder="Add notes about this document submission..."
                        value={documentFormData.notes}
                        onChange={(e) => setDocumentFormData({ ...documentFormData, notes: e.target.value })}
                        rows={3}
                        data-testid="textarea-document-notes"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowDocumentForm(false)}
                        data-testid="button-cancel-document"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDocumentSubmit}
                        disabled={createDocumentMutation.isPending}
                        data-testid="button-save-document"
                      >
                        {createDocumentMutation.isPending ? 'Saving...' : 'Save Document'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Display Collected Documents */}
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents collected yet</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id} data-testid={`document-${doc.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{doc.documentName}</span>
                                <Badge variant="outline">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {doc.scheduledAt ? format(new Date(doc.scheduledAt), 'MMM dd, yyyy') : 'Date not set'}
                                </Badge>
                              </div>
                            </div>
                            {doc.notes && (
                              <p className="text-sm text-muted-foreground">{doc.notes}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scheduled Activities */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Scheduled Outreach</h3>
              <Badge variant="secondary">{scheduledActivities.length}</Badge>
            </div>
            
            {scheduledActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scheduled activities</p>
            ) : (
              <div className="space-y-2">
                {scheduledActivities.map((activity) => {
                  const Icon = getActivityTypeIcon(activity.activityType);
                  return (
                    <Card key={activity.id} data-testid={`activity-scheduled-${activity.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {getActivityTypeLabel(activity.activityType)}
                                </span>
                                <Badge variant="outline">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {activity.followUpDate ? format(new Date(activity.followUpDate), 'MMM dd, yyyy') : 'Not set'}
                                </Badge>
                              </div>
                            </div>
                            {activity.notes && (
                              <p className="text-sm text-muted-foreground">{activity.notes}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Activities */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Completed Outreach</h3>
              <Badge variant="secondary">{completedActivities.length}</Badge>
            </div>
            
            {completedActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed activities</p>
            ) : (
              <div className="space-y-2">
                {completedActivities.map((activity) => {
                  const Icon = getActivityTypeIcon(activity.activityType);
                  return (
                    <Card key={activity.id} data-testid={`activity-completed-${activity.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {getActivityTypeLabel(activity.activityType)}
                                </span>
                                <Badge variant="outline">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {activity.contactDate ? format(new Date(activity.contactDate), 'MMM dd, yyyy') : 'Not set'}
                                </Badge>
                              </div>
                            </div>
                            {activity.notes && (
                              <p className="text-sm text-muted-foreground">{activity.notes}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
