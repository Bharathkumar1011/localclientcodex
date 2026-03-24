// Local type definitions for frontend - independent of backend schema
// These types should match the API response structure, not the database schema

export interface User {
  id: string;
  organizationId?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: 'admin' | 'partner' | 'analyst' | 'intern';
  isSuspended?: boolean;
  managerId?: string;
  analystId?: string;
  createdAt?: string;
  updatedAt?: string;
  // Test role fields
  testRole?: string;
  hasSelectedTestRole?: boolean;
  effectiveRole?: string;
}


export interface Company {
  id: number;
  organizationId: number;
  name: string;
  normalizedName?: string;
  statusNextSteps?: string;
  remarksFromDinesh?: string;
  priority?: string;
  leadStatus?: string;
  sector?: string;
  subSector?: string;
  analystFocSfca?: string;
  bdFocSfca?: string;
  location?: string;
  foundedYear?: number;
  businessDescription?: string;
  products?: string;
  financialYear?: string;
  revenueInrCr?: string;
  ebitdaInrCr?: string;
  ebitdaMarginInrCr?: string;
  patInrCr?: string;
  chatgptSummaryReason?: string;
  chatgptProposedOffering?: string;
  driveLink?: string;
  collateral?: string;
  industry?: string;
  website?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  id: number;
  organizationId: number;
  companyId: number;
  name?: string;
  designation?: string;
  email?: string;
  phone?: string;
  linkedinProfile?: string;
  isPrimary: boolean;
  isComplete: boolean;
  createdAt?: string;
  updatedAt?: string;
  activityType?: string;
}



export interface EpnPartnerLite {
  id: number;
  name: string;
  bucket: "idfc" | "other_channel_partner" | "other_epn";
  category?: string | null;
  stage: "outreach" | "active" | "rainmaking";
}


export type EpnBucketFilterValue =
  | "all"
  | "idfc"
  | "other_channel_partner"
  | "other_epn";

export type EpnRelationshipStatus =
  | "yet_to_contact"
  | "positive"
  | "hold"
  | "no_response"
  | "rejected"
  | "dropped";


  export type EpnRelationshipStatusFilter = "all" | EpnRelationshipStatus;

export type EpnLeadStageFilter =
  | "all"
  | "outreach"
  | "pitching"
  | "mandates"
  | "hold"
  | "dropped"
  | "rejected";

export interface IdfcLeadTrackerRow {
  serialNumber: number;
  epnId: number;
  rmName: string;
  designation?: string | null;
  rmCity?: string | null;
  rmStage: "outreach" | "active" | "rainmaking";
  bucket: "idfc" | "other_channel_partner" | "other_epn";
  leadId: number;
  leadName: string;
  leadCity?: string | null;
  leadStage: Lead["stage"];
  relationshipStatus: EpnRelationshipStatus;
  linkRemarks?: string | null;
  linkedAt?: string | null;
}


export interface IdfcLeadTrackerFilters {
  serialNumber?: string;
  rmName?: string;
  designation?: string;
  rmCity?: string;
  rmStage?: string;
  bucket?: string;
  leadName?: string;
  leadCity?: string;
  leadStage?: string;
  relationshipStatus?: string;
  linkRemarks?: string;
  linkedAt?: string;
}

export interface IdfcLeadTrackerSelectedRow {
  epnId: number;
  leadId: number;
}


export interface IdfcRmSummaryRow {
  serialNumber: number;
  epnId: number;
  rmName: string;
  designation?: string | null;
  city?: string | null;
  rmStage: "outreach" | "active" | "rainmaking";
  totalLinkedLeads: number;
  activeLinkedLeads: number;
  outreachCount: number;
  pitchingCount: number;
  mandateCount: number;
}

export interface EpnLevelReportRow {
  serialNumber: number;
  epnId: number;
  rmName: string;
  bucket: "idfc" | "other_channel_partner" | "other_epn";
  rmStage: "outreach" | "active" | "rainmaking";
  rmDesignation?: string | null;
  rmCity?: string | null;
  rmPocName?: string | null;
  rmEmail?: string | null;
  rmPhone?: string | null;
  leadId: number;
  leadName: string;
  leadCity?: string | null;
  leadStage: Lead["stage"];
  leadPocName?: string | null;
  leadPocDesignation?: string | null;
  leadPocEmail?: string | null;
  leadPocPhone?: string | null;
  relationshipStatus: EpnRelationshipStatus;
  linkRemarks?: string | null;
  linkedAt?: string | null;
}


export interface Lead {
  id: number;
  organizationId: number;
  companyId: number;
  stage: 'universe' | 'qualified' | 'outreach' | 'pitching' | 'mandates' | 'hold' | 'dropped' | 'won' | 'lost' | 'rejected';
  universeStatus?: 'open' | 'assigned';
  ownerAnalystId?: string;
  assignedTo?: string;
  assignedInterns?: string[];
  pipelineValue?: string;
  probability?: string;
  notes?: string;
  leadSource?: string | null; // ✅ NEW FIELD (must match backend)
  leadTemperature?: "hot" | "warm" | "not_reached" | null; // null = Not set
  chatgptLink?: string | null; // ✅ ChatGPT / Drive URL

  pocCount: number;
  pocCompletionStatus: 'red' | 'amber' | 'green';
  defaultPocId?: number;
  backupPocId?: number;
  createdAt?: string;
  updatedAt?: string;
  stageUpdatedAt?: string;
  // Joined data
  company?: Company;
  contacts?: Contact[];
  assignedUser?: User;
  ownerAnalyst?: User;
    // ⭐ NEW FIELD (must match backend)
  createdByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  
}

export interface Intervention {
  id: number;
  organizationId: number;
  leadId: number;
  userId: string;
  type: 'linkedin_message' | 'call' | 'whatsapp' | 'email' | 'meeting' | 'document';
  meetingMode?: "online" | "inperson" | null; // ✅ ADD HERE
  scheduledAt: string;
  activityType?: string;  // ✅ add this line
  notes?: string;
  documentName?: string;
  createdAt?: string;
  status?: "pending" | "completed"; // <-- add this
  // Joined data
  user?: User;
  lead?: Lead;
}

export interface OutreachActivity {
  id: number;
  organizationId: number;
  leadId: number;
  userId: string;
  activityType: string;
  status: string;
  contactDate?: string;
  followUpDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: number;
  organizationId: number;
  leadId?: number;
  companyId?: number;
  userId: string;
  action: string;
  entityType: string;
  entityId?: number;
  oldValue?: string;
  newValue?: string;
  description?: string;
  createdAt?: string;
}

export interface Invitation {
  id: number;
  email: string;
  organizationId: number;
  role: 'analyst' | 'partner' | 'admin' | 'intern';
  inviteToken: string;
  expiresAt: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  analystId?: string;
  emailStatus?: string;
  emailSentAt?: string;
  emailError?: string;
  retryCount?: number;
  lastRetryAt?: string;
  createdAt?: string;
  acceptedAt?: string;
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  adminEmail: string;
  createdAt?: string;
  updatedAt?: string;
}

// Form data types
export interface ContactFormData {
  companyId: number;
  name: string;
  designation: string;
  email?: string;
  phone?: string;
  linkedinProfile: string;
  isPrimary?: boolean;
}

export interface IndividualLeadFormData {
  companyName: string;
  sector: string;
  assignedTo?: string;
  location?: string;
  businessDescription?: string;
  website?: string;
  revenueInrCr?: number;
  ebitdaInrCr?: number;
  patInrCr?: number;
}

export interface InterventionFormData {
  leadId: number;
  type: 'linkedin_message' | 'call' | 'whatsapp' | 'email' | 'meeting';
  scheduledAt: Date;
  notes: string;
  documentName?: string;
}

export interface InvitationFormData {
  email: string;
  role: 'analyst' | 'partner' | 'admin' | 'intern';
  managerId?: string;
  analystId?: string;
}

import { z } from "zod";

export const invitationFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['analyst', 'partner', 'admin', 'intern']),
  managerId: z.string().optional(),
  analystId: z.string().optional(),
});


// API Response types
export interface DashboardMetrics {
  totalLeads: number;
  leadsByStage: Record<string, number>;
  recentActivity: ActivityLog[];
  userRole: string;
  isPersonalized: boolean;
}

export interface UserAnalytics {
  totalUsers: number;
  usersByRole: Record<string, number>;
  activeUsers: number;
  recentInvitations: number;
}

// investor data
export interface Investor {
  id: number;
  organizationId: number;
  name: string;
  sector?: string | null;
  subSector?: string | null; // ✅ Added based on usage
  location?: string | null;
  website?: string | null;
  description?: string | null;
  investorType?: string | null; // ✅ Added for filtering
  stage: "outreach" | "warm" | "active" | "dealmaking";
  createdAt?: string;
  updatedAt?: string;
  primaryPoc?: InvestorContact;
  contacts?: InvestorContact[]; // ✅ Added this to hold the list of 30+ POCs
}

export interface InvestorContact {
  id: number;
  organizationId: number;
  investorId: number;
  name?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinProfile?: string | null;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}
// ✅ Add this to the bottom or near Investor types
export interface InvestorMetrics {
  totalInvestors: number; // Universe
  outreach: number;
  active: number;
  warm: number;
  dealmaking: number;
}


export interface InvestorEventItem {
  id: number;
  organizationId: number;
  title: string;
  url: string;
  source?: string | null;
  sourceType?: string | null;
  eventDate?: string | null;
  publishedAt?: string | null;
  city?: string | null;
  locationText?: string | null;
  organizer?: string | null;
  priorityScore?: number | null;
  isHyderabadPriority: boolean;
  matchedInvestorType?: string | null;
  matchedSectors?: string[] | null;
  matchedKeywords?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface InvestorEventsFeedResponse {
  hyderabadEvents: InvestorEventItem[];
  indiaEvents: InvestorEventItem[];
  lastUpdatedAt: string | null;
  staleAfterDays: number;
}



export interface EpnPartner {
  id: number;
  name: string;
  bucket: "idfc" | "other_channel_partner" | "other_epn";
  category?: string | null;
  stage: "outreach" | "active" | "rainmaking";
  createdAt?: string;
  updatedAt?: string;
}
