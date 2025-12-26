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
// import LeadDetailsModal from "@/components/LeadDetailsModal";
import { RejectLeadDialog } from "./RejectLeadDialog";
import type { Lead, Company, Contact, User as UserType } from "@/lib/types";


interface LeadCardProps {
  lead: Lead;
  company: Company;
  contact?: Contact;
  currentUserName?: string; // Name of the current user (deprecated)
  assignedToName?: string; // Name of the assigned user (deprecated)
  assignedToUser?: Partial<UserType>; // Partial user object for assigned user (deprecated)
  assignedInternUsers?: Partial<UserType>[]; // Array of assigned interns
  ownerAnalystName?: string; // Name of the owner analyst
  currentUser: UserType; // Current user for role-based visibility
  stage: string; // Current stage to determine what to show
  onEdit?: (leadId: number) => void;
  onAssign?: (leadId: number) => void;
  onReassign?: (leadId: number) => void;
  onIntervention?: (leadId: number) => void;
  onMoveToOutreach?: (leadId: number) => void;
  onManageOutreach?: (leadId: number) => void;
  onMoveToPitching?: (leadId: number) => void;
  onMoveToMandates?: (leadId: number) => void;
  onReject?: () => void; // Callback when lead is rejected
  onViewDetails?: () => void;
}


export default function LeadCard({ 
  lead, 
  company, 
  contact,
  currentUserName,
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
  onReject,
  onViewDetails  
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  // const [showLeadDetails, setShowLeadDetails] = useState(false);
  console.log("currentUserName", currentUser.firstName);


  // Derive contact completeness for color coding
  // Red: No contact details, Amber: Partial details, Green: Open (complete details)
  const getContactCompleteness = () => {
    if (!contact) return 'red'; // No contact details
    
    const requiredFields = [contact.name, contact.designation, contact.linkedinProfile, contact.phone, contact.email];
    const filledFields = requiredFields.filter(field => field && field.trim() !== '').length;
    
    if (filledFields === 0) return 'red'; // No details
    if (filledFields === requiredFields.length) return 'green'; // Complete details
    return 'amber'; // Partial details
  };
  
  const contactCompleteness = getContactCompleteness();
  
  // Get contact status badge variant based on contact completeness
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


  // Universe sub-state configuration for Open/Assigned indicators
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
    // if (contactCompleteness === 'red') {
    //   console.log('Opening contact details form');
    //   onEdit?.(lead.id);
    // }
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
    onReassign?.(lead.id);
  };


  const handleInterventionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Opening intervention tracker for: ${company.name}`);
    onIntervention?.(lead.id);
  };


  // Responsive card view
  return (
    <>
    <Card 
      className="hover-elevate"
      data-testid={`lead-card-${lead.id}`}
    >
      <CardHeader className="py-4">
        {/* Desktop Grid Layout (lg and up) */}
        <div className={`hidden lg:grid gap-4 items-center ${stage === 'universe' ? 'grid-cols-12' : 'grid-cols-12'}`}>
          {/* Company Name with POC Status - 4 columns (Universe and other stages) */}
          <div className="flex items-center gap-2 min-w-0 col-span-4">
            <button
              onClick={handleCompanyClick}
              className="text-base font-semibold hover:underline focus:outline-none focus:underline text-foreground truncate"
              data-testid={`button-company-${lead.id}`}
            >
              {company.name}
              <ExternalLink className="inline-block ml-2 h-3 w-3" />
            </button>
            <Badge 
              variant={getContactStatusBadgeVariant()}
              className="text-xs flex-shrink-0"
              data-testid={`badge-poc-status-${lead.id}`}
            >
              {getContactStatusText()}
            </Badge>
          </div>
          
          {/* Sector - 3 columns */}
          <div className="truncate col-span-3">
            <span className="text-sm text-muted-foreground">
              {company.sector || 'Not specified'}
            </span>
          </div>
          {/* Owner Analyst - only for Universe tab - 2 columns */}
          {stage === 'universe' && (
            <div className="col-span-2 truncate">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Owner:</span>
                <span className="text-sm font-medium">
                  {lead.createdByUser
                    ? `${lead.createdByUser.firstName || ''} ${lead.createdByUser.lastName || ''}`.trim() ||
                      lead.createdByUser.email
                    : 'Unassigned'}
                </span>
              </div>
            </div>
          )}

          
          {/* Assigned To - 2 columns (Universe) or 3 columns (other stages) */}
          <div className={stage === 'universe' ? 'col-span-2' : 'col-span-3'}>
            {(assignedToUser || (assignedInternUsers && assignedInternUsers.length > 0)) ? (
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap gap-1">
                  {assignedToUser && (
                    <Badge variant="secondary" className="text-xs">
                      {assignedToUser.firstName && assignedToUser.lastName 
                        ? `${assignedToUser.firstName} ${assignedToUser.lastName}` 
                        : assignedToUser.email || 'Unknown'}
                    </Badge>
                  )}
                  {assignedInternUsers && assignedInternUsers.map((intern, index) => (
                    <Badge key={intern?.id || index} variant="secondary" className="text-xs">
                      {intern?.firstName && intern?.lastName 
                        ? `${intern.firstName} ${intern.lastName}` 
                        : intern?.email || 'Unknown'}
                    </Badge>
                  ))}
                </div>
                {(['partner', 'admin', 'analyst'].includes(currentUser.role)) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReassignClick}
                    data-testid={`button-reassign-${lead.id}`}
                    className="h-5 text-xs px-2 w-fit"
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    Reassign
                  </Button>
                )}
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAssignClick}
                data-testid={`button-assign-${lead.id}`}
                className="h-6 text-xs"
              >
                <UserIcon className="h-3 w-3 mr-1" />
                Assign
              </Button>
            )}
          </div>
          
          {/* Reject Button for Universe - 1 column */}
          {stage === 'universe' && !['rejected', 'won', 'lost'].includes(lead.stage) && (
            <div className="col-span-1 flex justify-end">
              <Button 
                variant="destructive" 
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
          
          {/* Actions - 2 columns (non-Universe stages only) */}
          <div className={`${stage !== 'universe' ? 'col-span-2 flex justify-end gap-2' : 'hidden'}`}>
            {stage === 'qualified' && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  // Handle move to outreach
                  if (onMoveToOutreach) {
                    onMoveToOutreach(lead.id);
                  }
                }}
                data-testid={`button-move-outreach-${lead.id}`}
                className="h-6 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Move to Outreach
              </Button>
            )}
            {stage === 'outreach' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Handle manage outreach
                    if (onManageOutreach) {
                      onManageOutreach(lead.id);
                    }
                  }}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {stage === 'outreach' ? 'Manage Outreach' : 'Manage Pitching'}
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    // Handle move to pitching
                    if (onMoveToPitching) {
                      onMoveToPitching(lead.id);
                    }
                  }}
                  data-testid={`button-move-pitching-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Pitching
                </Button>
              </>
            )}
            {stage === 'pitching' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Handle manage outreach
                    if (onManageOutreach) {
                      onManageOutreach(lead.id);
                    }
                  }}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {stage === 'pitching' ? 'Manage Pitching' : 'Manage Outreach'}
                
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    // Handle move to mandates
                    if (onMoveToMandates) {
                      onMoveToMandates(lead.id);
                    }
                  }}
                  data-testid={`button-move-mandates-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Mandates
                </Button>
              </>
            )}
            {stage === 'mandates' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Handle manage outreach
                  if (onManageOutreach) {
                    onManageOutreach(lead.id);
                  }
                }}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="h-6 text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                Manage Outreach
              </Button>
            )}

              {/* 👇 New View Lead button */}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.();   // tells parent to open LeadDetailsModal
              }}
              className="h-6 text-xs"
            >
              View Lead
            </Button>

            
            {/* Reject Button - visible on all stages except rejected, won, lost */}
            {!['rejected', 'won', 'lost'].includes(lead.stage) && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setIsRejectDialogOpen(true)}
                data-testid={`button-reject-${lead.id}`}
                className="h-6 text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            )}
          </div>
        </div>


        {/* Mobile Stacked Layout (smaller than lg) */}
        <div className="lg:hidden space-y-3">
          {/* Company Name and POC Status */}
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={handleCompanyClick}
              className="text-base font-semibold hover:underline focus:outline-none focus:underline text-foreground flex-1 text-left"
              data-testid={`button-company-${lead.id}`}
            >
              {company.name}
              <ExternalLink className="inline-block ml-2 h-3 w-3" />
            </button>
            <Badge 
              variant={getContactStatusBadgeVariant()}
              className="text-xs flex-shrink-0"
              data-testid={`badge-poc-status-${lead.id}`}
            >
              {getContactStatusText()}
            </Badge>
          </div>


          {/* Sector and Status Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {company.sector || 'Not specified'}
            </span>
            {stage === 'universe' && (
              <Badge variant={stageConfig[lead.stage as keyof typeof stageConfig]?.color || 'secondary'} data-testid={`badge-lead-stage-mobile-${lead.id}`}>
                {stageConfig[lead.stage as keyof typeof stageConfig]?.label || lead.stage}
              </Badge>
            )}
          </div>


          {/* Owner Row - only for Universe tab */}
          {stage === 'universe' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Owner:</span>
              <span className="text-sm font-medium">
                {lead.createdByUser
                  ? `${lead.createdByUser.firstName || ''} ${lead.createdByUser.lastName || ''}`.trim() ||
                    lead.createdByUser.email
                  : 'Unassigned'}
              </span>
            </div>
          )}



          {/* Assigned To Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Assigned to:</span>
            {(assignedToUser || (assignedInternUsers && assignedInternUsers.length > 0)) ? (
              <>
                <div className="flex flex-wrap gap-1">
                  {assignedToUser && (
                    <Badge variant="secondary" className="text-xs">
                      {assignedToUser.firstName && assignedToUser.lastName 
                        ? `${assignedToUser.firstName} ${assignedToUser.lastName}` 
                        : assignedToUser.email || 'Unknown'}
                    </Badge>
                  )}
                  {assignedInternUsers && assignedInternUsers.map((intern, index) => (
                    <Badge key={intern?.id || index} variant="secondary" className="text-xs">
                      {intern?.firstName && intern?.lastName 
                        ? `${intern.firstName} ${intern.lastName}` 
                        : intern?.email || 'Unknown'}
                    </Badge>
                  ))}
                </div>
                {(['partner', 'admin', 'analyst'].includes(currentUser.role)) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReassignClick}
                    data-testid={`button-reassign-${lead.id}`}
                    className="h-6 text-xs px-2"
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    Reassign
                    
                  </Button>
                )}
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAssignClick}
                data-testid={`button-assign-${lead.id}`}
                className="h-6 text-xs"
              >
                <UserIcon className="h-3 w-3 mr-1" />
                Assign
              </Button>
            )}
          </div>


          {/* Action Buttons Row */}
          <div className="flex gap-2 flex-wrap">
            {stage === 'qualified' && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onMoveToOutreach && onMoveToOutreach(lead.id)}
                data-testid={`button-move-outreach-${lead.id}`}
                className="flex-1"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Move to Outreach
              </Button>
            )}
            {stage === 'outreach' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="flex-1"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Manage Outreach
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => onMoveToPitching && onMoveToPitching(lead.id)}
                  data-testid={`button-move-pitching-${lead.id}`}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Pitching
                </Button>
              </>
            )}
            {stage === 'pitching' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="flex-1"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Manage Outreach
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => onMoveToMandates && onMoveToMandates(lead.id)}
                  data-testid={`button-move-mandates-${lead.id}`}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Mandates
                </Button>
              </>
            )}
            {stage === 'mandates' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="flex-1"
              >
                <Users className="h-3 w-3 mr-1" />
                Manage Outreach
              </Button>
            )}
          </div>
        </div>
      </CardHeader>


      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">Company: {company.name}</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit?.(lead.id)}
                  data-testid={`button-edit-contacts-${lead.id}`}
                  className="h-7 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {contact?.name ? 'Edit Contacts' : 'Add Contact'}
                </Button>

                  <Button
                    variant="outline"
                    size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails?.();
                      }}
                    className="h-7 text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Lead
                  </Button>

              </div>
              
              <div className="space-y-3">
                <h5 className="font-medium text-sm text-muted-foreground">Contact Details</h5>
                {contact?.name ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{contact.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Designation:</span>
                      <p className="font-medium">{contact.designation}</p>
                    </div>
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
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">LinkedIn:</span>
                        <a 
                          href={contact.linkedinProfile} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-primary hover:underline"
                        >
                          {contact.linkedinProfile}
                        </a>
                      </div>
                    )}
                    
                    {/* Company level Drive Link and Collateral */}
                    {company.driveLink && (
                      <div>
                        <span className="text-muted-foreground">Drive Link:</span>
                        <a 
                          href={company.driveLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-primary hover:underline"
                        >
                          View Files
                        </a>
                      </div>
                    )}
                    {company.collateral && (
                      <div>
                        <span className="text-muted-foreground">Collateral:</span>
                        <a 
                          href={company.collateral} 
                          target="_blank" 
                          rel="noopenLeadDetailsModal er noreferrer"
                          className="block text-primary hover:underline"
                        >
                          View Collateral
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    Contact details not yet provided. Click the company name above to add them.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>

    {/* Reject Lead Dialog */}
    <RejectLeadDialog
      open={isRejectDialogOpen}
      onOpenChange={setIsRejectDialogOpen}
      leadId={lead.id}
      companyName={company.name}
      currentStage={lead.stage}
      onSuccess={() => {
        setIsRejectDialogOpen(false);
        onReject?.();
      }}
    />
    </>
  );
}
