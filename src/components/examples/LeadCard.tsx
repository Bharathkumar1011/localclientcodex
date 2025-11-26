import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  User as UserIcon,
  ExternalLink,
  Edit,
  CheckCircle,
  AlertCircle,
  UserX,
  Users,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChallengeReassignModal from "../ChallengeReassignModal";
import { RejectLeadDialog } from "../RejectLeadDialog";
import type { Lead, Company, Contact, User as UserType } from "@/lib/types";

interface LeadCardProps {
  lead: Lead;
  company: Company;
  assignedToName?: string;
  assignedToUser?: Partial<UserType>;
  assignedInternUsers?: Partial<UserType>[];
  ownerAnalystName?: string;
  currentUser: UserType;
  stage: string;
  onEdit?: (leadId: number) => void;
  onAssign?: (leadId: number) => void;
  onReassign?: (leadId: number) => void;
  onIntervention?: (leadId: number) => void;
  onMoveToOutreach?: (leadId: number) => void;
  onManageOutreach?: (leadId: number) => void;
  onMoveToPitching?: (leadId: number) => void;
  onMoveToMandates?: (leadId: number) => void;
  onReject?: () => void;
}

export default function LeadCard({
  lead,
  company,
  assignedToName,
  assignedToUser,
  assignedInternUsers,
  ownerAnalystName,
  currentUser,
  stage,
  onEdit,
  onAssign,
  onReassign,
  onIntervention,
  onMoveToOutreach,
  onManageOutreach,
  onMoveToPitching,
  onMoveToMandates,
  onReject
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // ✅ NEW: Fetch ALL contacts for this company
  const { data: contacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['contacts', company.id],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/company/${company.id}`);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    enabled: !!company.id,
  });

  // ✅ UPDATED: Check ALL contacts for completeness
  const getContactCompleteness = () => {
    if (!contacts || contacts.length === 0) return 'red';
    
    const hasCompleteContact = contacts.some((contact: Contact) => {
      const requiredFields = [
        contact.name,
        contact.designation,
        contact.linkedinProfile,
        contact.phone,
        contact.email
      ];
      return requiredFields.every(field => field && field.trim() !== '');
    });
    
    if (hasCompleteContact) return 'green';
    
    const hasPartialContact = contacts.some((contact: Contact) => {
      return contact.name || contact.designation || contact.linkedinProfile;
    });
    
    return hasPartialContact ? 'amber' : 'red';
  };

  const contactCompleteness = getContactCompleteness();

  const getContactStatusBadgeVariant = () => {
    switch (contactCompleteness) {
      case 'red': return 'destructive' as const;
      case 'amber': return 'warning' as const;
      case 'green': return 'default' as const;
      default: return 'destructive' as const;
    }
  };

  const getContactStatusText = () => {
    switch (contactCompleteness) {
      case 'red': return 'No Contact';
      case 'amber': return 'Partial';
      case 'green': return 'Open';
      default: return 'No Contact';
    }
  };

  const stageConfig = {
    universe: { label: 'Universe', color: 'secondary' },
    qualified: { label: 'Qualified', color: 'default' },
    outreach: { label: 'Outreach', color: 'default' },
    pitching: { label: 'Pitching', color: 'default' },
    mandates: { label: 'Mandates', color: 'default' },
    rejected: { label: 'Rejected', color: 'destructive' },
  } as const;

  const getUniverseSubStateConfig = () => {
    if (lead.stage !== 'universe') return null;
    const isAssigned = lead.assignedTo !== null;
    const universeStatus = (lead as any).universeStatus || (isAssigned ? 'assigned' : 'open');
    return {
      label: universeStatus === 'assigned' ? 'Assigned' : 'Open',
      color: universeStatus === 'assigned' ? 'default' : 'outline'
    };
  };

  const handleCompanyClick = () => {
    console.log(`Clicked on company: ${company.name}`);
    if (contactCompleteness === 'red') {
      console.log('Opening contact details form');
      onEdit?.(lead.id);
    }
    setIsExpanded(!isExpanded);
  };

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Assigning lead: ${company.name}`);
    onAssign?.(lead.id);
  };

  const handleReassignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Opening reassign modal for: ${company.name}`);
    setIsReassignModalOpen(true);
  };

  const handleInterventionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Opening intervention tracker for: ${company.name}`);
    onIntervention?.(lead.id);
  };

  return (
    <>
      {/* Desktop Grid Layout */}
      <div className="hidden lg:contents">
        <div className={stage === 'universe' ? 'col-span-4' : 'col-span-4'}>
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-accent font-medium"
            onClick={handleCompanyClick}
          >
            <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{company.name}</span>
          </Button>
          <Badge variant={getContactStatusBadgeVariant()} className="ml-2 text-xs">
            {getContactStatusText()}
          </Badge>
        </div>

        <div className="col-span-3 flex items-center px-3 text-sm">
          {company.sector || 'Not specified'}
        </div>

        {stage === 'universe' && (
          <div className="col-span-2 flex items-center px-3 text-sm">
            <span className="text-muted-foreground mr-1">Owner:</span>
            <span className="font-medium">{ownerAnalystName || 'Unassigned'}</span>
          </div>
        )}

        <div className={stage === 'universe' ? 'col-span-2' : 'col-span-3'}>
          {assignedInternUsers && assignedInternUsers.length > 0 ? (
            <div className="flex items-center gap-2 px-3">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">
                {assignedInternUsers.map((intern, index) => (
                  <span key={intern.id}>
                    {`${intern.firstName || ''} ${intern.lastName || ''}`.trim() || intern.email}
                    {index < assignedInternUsers.length - 1 && ', '}
                  </span>
                ))}
              </span>
              {(['partner', 'admin'].includes(currentUser.role)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReassignClick}
                  className="h-6 text-xs ml-auto"
                >
                  Reassign
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAssignClick}
              className="ml-3"
            >
              Assign
            </Button>
          )}
        </div>

        {stage === 'universe' && !['rejected', 'won', 'lost'].includes(lead.stage) && (
          <div className="col-span-1 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRejectDialogOpen(true)}
              data-testid={`button-reject-${lead.id}`}
              className="h-6 text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {stage === 'qualified' && (
          <div className="col-span-2 flex items-center justify-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onMoveToOutreach && onMoveToOutreach(lead.id)}
              data-testid={`button-move-outreach-${lead.id}`}
              className="h-6 text-xs"
            >
              Move to Outreach
            </Button>
          </div>
        )}

        {stage === 'outreach' && (
          <>
            <div className="col-span-1 flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="h-6 text-xs"
              >
                Manage Outreach
              </Button>
            </div>
            <div className="col-span-1 flex items-center justify-center">
              <Button
                variant="default"
                size="sm"
                onClick={() => onMoveToPitching && onMoveToPitching(lead.id)}
                data-testid={`button-move-pitching-${lead.id}`}
                className="h-6 text-xs"
              >
                Move to Pitching
              </Button>
            </div>
          </>
        )}

        {stage === 'pitching' && (
          <>
            <div className="col-span-1 flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="h-6 text-xs"
              >
                Manage Outreach
              </Button>
            </div>
            <div className="col-span-1 flex items-center justify-center">
              <Button
                variant="default"
                size="sm"
                onClick={() => onMoveToMandates && onMoveToMandates(lead.id)}
                data-testid={`button-move-mandates-${lead.id}`}
                className="h-6 text-xs"
              >
                Move to Mandates
              </Button>
            </div>
          </>
        )}

        {stage === 'mandates' && (
          <div className="col-span-2 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageOutreach && onManageOutreach(lead.id)}
              data-testid={`button-manage-outreach-${lead.id}`}
              className="h-6 text-xs"
            >
              Manage Outreach
            </Button>
          </div>
        )}

        {!['rejected', 'won', 'lost'].includes(lead.stage) && stage !== 'universe' && (
          <div className="col-span-1 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRejectDialogOpen(true)}
              data-testid={`button-reject-${lead.id}`}
              className="h-6 text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <Card className="lg:hidden mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="p-0 h-auto font-semibold text-left hover:bg-transparent"
              onClick={handleCompanyClick}
            >
              <Building2 className="h-4 w-4 mr-2" />
              {company.name}
            </Button>
            <Badge variant={getContactStatusBadgeVariant()} className="text-xs">
              {getContactStatusText()}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{company.sector || 'Not specified'}</span>
            {stage === 'universe' && (
              <Badge variant={stageConfig[lead.stage as keyof typeof stageConfig]?.color as any}>
                {stageConfig[lead.stage as keyof typeof stageConfig]?.label || lead.stage}
              </Badge>
            )}
          </div>

          {stage === 'universe' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Owner:</span>
              <span className="ml-2 font-medium">{ownerAnalystName || 'Unassigned'}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Assigned to:</span>
            {assignedToName ? (
              <>
                <span className="font-medium">{assignedToName}</span>
                {(['partner', 'admin'].includes(currentUser.role)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReassignClick}
                    className="h-6 text-xs"
                  >
                    Reassign
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAssignClick}
              >
                Assign
              </Button>
            )}
          </div>

          {stage === 'qualified' && (
            <Button
              variant="default"
              className="w-full"
              onClick={() => onMoveToOutreach && onMoveToOutreach(lead.id)}
              data-testid={`button-move-outreach-${lead.id}`}
            >
              Move to Outreach
            </Button>
          )}

          {stage === 'outreach' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="flex-1"
              >
                Manage Outreach
              </Button>
              <Button
                variant="default"
                onClick={() => onMoveToPitching && onMoveToPitching(lead.id)}
                data-testid={`button-move-pitching-${lead.id}`}
                className="flex-1"
              >
                Move to Pitching
              </Button>
            </div>
          )}

          {stage === 'pitching' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="flex-1"
              >
                Manage Outreach
              </Button>
              <Button
                variant="default"
                onClick={() => onMoveToMandates && onMoveToMandates(lead.id)}
                data-testid={`button-move-mandates-${lead.id}`}
                className="flex-1"
              >
                Move to Mandates
              </Button>
            </div>
          )}

          {stage === 'mandates' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onManageOutreach && onManageOutreach(lead.id)}
              data-testid={`button-manage-outreach-${lead.id}`}
            >
              Manage Outreach
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Expanded Section - Display ALL POCs */}
      {isExpanded && (
        <div className="col-span-full mt-2 animate-in slide-in-from-top-2">
          <Card className="border-l-4 border-l-primary/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold">Company: {company.name}</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(lead.id)}
                data-testid={`button-edit-contacts-${lead.id}`}
                className="h-7 text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                {contacts && contacts.length > 0 ? 'Edit Contacts' : 'Add Contact'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Point of Contact Details
                </h4>
                
                {contactsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading contacts...</p>
                ) : contacts && contacts.length > 0 ? (
                  <div className="space-y-3">
                    {contacts.map((contact: Contact, index: number) => {
                      const isComplete = contact.name && 
                        contact.designation && 
                        contact.linkedinProfile && 
                        contact.phone && 
                        contact.email;
                      
                      return (
                        <div 
                          key={contact.id} 
                          className="p-3 border rounded-lg bg-muted/30 space-y-2"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium flex items-center gap-2">
                              POC {index + 1}
                              {isComplete ? (
                                <Badge variant="default" className="h-5 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="h-5 text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Incomplete
                                </Badge>
                              )}
                            </h5>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {contact.name && (
                              <div>
                                <span className="text-muted-foreground">Name:</span>
                                <p className="font-medium">{contact.name}</p>
                              </div>
                            )}
                            {contact.designation && (
                              <div>
                                <span className="text-muted-foreground">Designation:</span>
                                <p className="font-medium">{contact.designation}</p>
                              </div>
                            )}
                            {contact.phone && (
                              <div>
                                <span className="text-muted-foreground">Phone:</span>
                                <p className="font-medium">{contact.phone}</p>
                              </div>
                            )}
                            {contact.email && (
                              <div>
                                <span className="text-muted-foreground">Email:</span>
                                <p className="font-medium">{contact.email}</p>
                              </div>
                            )}
                            {contact.linkedinProfile && (
                              <div className="col-span-full">
                                <span className="text-muted-foreground">LinkedIn:</span>
                                <a
                                  href={contact.linkedinProfile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1 ml-2"
                                >
                                  View Profile
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/20">
                    No contact details yet. Click "Add Contact" above to add POC information.
                  </p>
                )}
              </div>
              
              {(company.driveLink || company.collateral) && (
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-semibold mb-2">Company Documents</h4>
                  <div className="space-y-2">
                    {company.driveLink && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Drive Link:</span>
                        <a
                          href={company.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View Files
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {company.collateral && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Collateral:</span>
                        <a
                          href={company.collateral}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View Collateral
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ChallengeReassignModal
        lead={lead}
        company={company}
        currentAssignedUser={assignedToUser || null}
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        currentUser={currentUser}
      />

      <RejectLeadDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        leadId={lead.id}
        companyName={company.name}
        currentStage={lead.stage}
        onSuccess={() => {
          onReject?.();
        }}
      />
    </>
  );
}
