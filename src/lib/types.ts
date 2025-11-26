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

export interface Lead {
  id: number;
  organizationId: number;
  companyId: number;
  stage: 'universe' | 'qualified' | 'outreach' | 'pitching' | 'mandates' | 'won' | 'lost' | 'rejected';
  universeStatus?: 'open' | 'assigned';
  ownerAnalystId?: string;
  assignedTo?: string;
  assignedInterns?: string[];
  pipelineValue?: string;
  probability?: string;
  notes?: string;
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
}

export interface Intervention {
  id: number;
  organizationId: number;
  leadId: number;
  userId: string;
  type: 'linkedin_message' | 'call' | 'whatsapp' | 'email' | 'meeting' | 'document';
  scheduledAt: string;
  activityType?: string;  // ✅ add this line
  notes?: string;
  documentName?: string;
  createdAt?: string;
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