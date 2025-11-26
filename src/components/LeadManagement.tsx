import { useState, useMemo,  useEffect  } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Download,
  CheckSquare,
  XSquare,
  Upload,
  FileText,
  ArrowUpDown,
  X
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import LeadCard from "./LeadCard";
import POCManagement from "./POCManagement";
import OutreachTracker from "./OutreachTracker";
import AssignmentModal from "./AssignmentModal";
import { InterventionTracker } from "./InterventionTracker";
import { IndividualLeadForm } from "./IndividualLeadForm";
import EngagementGateDialog from "./EngagementGateDialog";
import { DocumentGateDialog } from "./DocumentGateDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Lead, Company, Contact, User } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


interface LeadWithDetails extends Lead {
  company: Company;
  contact?: Contact;
  assignedToUser?: { id: string; firstName: string | null; lastName: string | null; email: string | null; };
  ownerAnalystUser?: { id: string; firstName: string | null; lastName: string | null; email: string | null; };
  assignedInterns?: string[] | null;  // ✅ Add this line

}

interface LeadManagementProps {
  stage: 'universe' | 'qualified' | 'outreach' | 'pitching' | 'mandates' | 'rejected' | 'won' | 'lost';
  currentUser: User;
}

export default function LeadManagement({ stage, currentUser }: LeadManagementProps) {
  console.log('LeadManagement rendered for stage:', stage);
  console.log('currentUser:', currentUser);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("company-asc");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // 👈 ADD BACK
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterChannelPartner, setFilterChannelPartner] = useState<string>("all");

  // 👇 ADD BACK POC state
  const [showPOCManagement, setShowPOCManagement] = useState<{leadId: number; companyId: number; companyName: string} | null>(null);
  const [showOutreachTracker, setShowOutreachTracker] = useState<number | null>(null);
  const [showInterventionTracker, setShowInterventionTracker] = useState<{leadId: number; companyName: string} | null>(null);
  const [showEngagementGate, setShowEngagementGate] = useState<{leadId: number; companyId: number; companyName: string} | null>(null);
  const [showMandateConfirmation, setShowMandateConfirmation] = useState<{leadId: number; companyName: string} | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState<{leadId: number; company: Company;currentAssignedInterns?: string[];} | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignToUser, setBulkAssignToUser] = useState<string>("");
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploadResults, setCsvUploadResults] = useState<any>(null);
  const [showIndividualLeadForm, setShowIndividualLeadForm] = useState(false);
  
  // Fetch leads for this stage
  // Universe tab shows all leads across all stages
  // const { data: leads = [], isLoading, error } = useQuery({
  //   queryKey: stage === 'universe' ? ['/api/leads/all'] : [`/api/leads/stage/${stage}`],
  // });

// ✅ Automatically open OutreachTracker when URL has leadId (coming from Scheduled Tasks)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const leadId = params.get("leadId");

  if (leadId) {
    console.log("Detected leadId from URL:", leadId);
    setShowOutreachTracker(Number(leadId));
  }
}, []);


   // ✅ Fetch leads for this stage (typed & structured query key)
    const { data: leads = [], isLoading, error } = useQuery<LeadWithDetails[]>({
      queryKey:
        stage === "universe"
          ? ["leads", "stage", "all"]
          : ["leads", "stage", stage],
      queryFn: async () => {
        const endpoint =
          stage === "universe"
            ? "/leads/all"
            : `/leads/stage/${stage}`;
        const res = await apiRequest("GET", endpoint);
        return res.json();
      },
    });




  // Fetch all users for bulk assignment (partners/admins only)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/users'],
    enabled: ['partner', 'admin'].includes(currentUser.role),
    // enabled: showBulkAssignModal && ['partner', 'admin'].includes(currentUser.role),

  });

  // Bulk assign leads mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ leadIds, assignedTo }: { leadIds: number[]; assignedTo: string }) => {
      return apiRequest('POST', '/api/leads/bulk-assign', { leadIds, assignedTo });
    },
    onSuccess: (data: any) => {
      // Invalidate the correct query key based on stage
      queryClient.invalidateQueries({ queryKey: ['leads', stage === 'universe' ? 'all' : 'stage', stage] });
      queryClient.invalidateQueries({ queryKey: ['/users/analytics'] });
      toast({
        title: "Bulk Assignment Complete",
        description: data.message || 'Companies assigned successfully',
      });
      setShowBulkAssignModal(false);
      setSelectedLeads([]);
      setBulkAssignToUser("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign companies",
        variant: "destructive",
      });
    },
  });

  // CSV upload mutation
  const csvUploadMutation = useMutation({
    mutationFn: async (csvData: string) => {
      return apiRequest('POST', '/companies/csv-upload', { csvData });
    },
    // onSuccess: (data: any) => {
    //   // Invalidate the correct query key based on stage
    //   queryClient.invalidateQueries({ queryKey: ['leads', stage === 'universe' ? 'all' : 'stage', stage] });
    //   setCsvUploadResults(data.results);
    //   toast({
    //     title: "CSV Upload Complete",
    //     description: data.message || 'CSV processed successfully',
    //   });
    //   setCsvFile(null);
    // },
      onSuccess: async (data: any) => {
        try {
          const results = data.results || {};
          setCsvUploadResults(results);

          // ✅ Step 2: Notify that companies were created
          toast({
            title: "Companies Uploaded",
            description: `${results.successfulCompanies || 0} companies created successfully.`,
          });

          // ✅ Step 3: If the backend returned createdCompanyIds, create leads for them
          if (results.createdCompanyIds && results.createdCompanyIds.length > 0) {
            const leadResponse = await apiRequest('POST', '/leads/bulk-create', {
              companyIds: results.createdCompanyIds,
              ownerId: currentUser.id, // Make sure currentUser is defined in your component
            });

            // Parse the response (apiRequest likely returns Response, so get JSON)
            const leadData = await leadResponse.json();

            toast({
              title: "Leads Created",
              description: `${leadData.total || 0} new leads created successfully.`,
            });
          }

          // ✅ Step 4: Refresh the leads list in the UI
          queryClient.invalidateQueries({
            queryKey: ['leads', 'stage', stage],
          });
          queryClient.invalidateQueries({
            queryKey: ['/dashboard/metrics'],
          });

          setCsvFile(null);
        } catch (err: any) {
          console.error('Error after CSV upload:', err);
          toast({
            title: "Error",
            description: err.message || "Failed to create leads after upload",
            variant: "destructive",
          });
        }
      },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process CSV file",
        variant: "destructive",
      });
    },
  });

 
    // Fetch interns for displaying assigned intern names in LeadCard
  const { data: allInterns = [] } = useQuery<User[]>({
    queryKey: ['/users/interns'],
    queryFn: async () => {
      if (currentUser.role === 'analyst') {
        // Fetch analyst's assigned interns
        const response = await apiRequest('GET', `/api/analysts/${currentUser.id}/interns`);
        const data = await response.json();
        console.log('analyst', data);
        return data;
      } else if (['partner', 'admin'].includes(currentUser.role)) {
        // Fetch all interns in the organization
        const response = await apiRequest('GET', '/users');
        const allUsers = await response.json();
        console.log('partner/admin', allUsers);
        return allUsers.filter((u: User) => u.role === 'intern');
      }
      return [];
    },
    enabled: ['analyst', 'partner', 'admin'].includes(currentUser.role),
  });

  
    // // ✅ Corrected intern fetch logic
    // const { data: allInterns = [] } = useQuery<User[]>({
    //   queryKey: ['/api/users/interns'],
    //   enabled: ['analyst', 'partner', 'admin'].includes(currentUser.role),
    //   queryFn: async () => {
    //     if (currentUser.role === 'analyst') {
    //       // Analyst: fetch assigned interns
    //       const data = await apiRequest('GET', `/api/analysts/${currentUser.id}/interns`);
    //       console.log('analyst interns:', data);
    //       return data;
    //     }

    //     if (['partner', 'admin'].includes(currentUser.role)) {
    //       // Partner/Admin: fetch all interns in the organization
    //       const allUsers = await apiRequest('GET', '/api/users');
    //       console.log('partner/admin users:', allUsers);
    //       return allUsers.filter((u: User) => u.role === 'intern');
    //     }

    //     return [];
    //   },
    // });



  // Download CSV sample
  const handleDownloadSample = async () => {
    try {
      const response = await apiRequest('GET', '/companies/csv-sample');
      if (!response.ok) throw new Error('Failed to download sample');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'company_upload_sample.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Sample Downloaded",
        description: "CSV sample file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download sample file",
        variant: "destructive",
      });
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = () => {
    if (!csvFile) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      csvUploadMutation.mutate(csvData);
    };
    reader.readAsText(csvFile);
  };

  // Get unique sectors and assignees for filter options
  const uniqueSectors = useMemo(() => {
    const sectors = leads
      .map(lead => lead.company.sector)
      .filter((sector): sector is string => Boolean(sector));
    return Array.from(new Set(sectors)).sort();
  }, [leads]);
  const uniqueLocations = useMemo(() => {
    const locations = leads
      .map(lead => lead.company.location)
      .filter((location): location is string => Boolean(location));
    return Array.from(new Set(locations)).sort();
  }, [leads]);
  const uniqueAssignees = useMemo(() => {
    const assignees = leads
      .map(lead => lead.assignedToUser ? {
        id: lead.assignedToUser.id,
        name: `${lead.assignedToUser.firstName || ''} ${lead.assignedToUser.lastName || ''}`.trim() || lead.assignedToUser.email || ''
      } : null)
      .filter(Boolean) as { id: string; name: string }[];
    
    const uniqueMap = new Map(assignees.map(a => [a.id, a]));
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads]);

  // Apply filters and sorting
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(lead => {
        const companyMatch = lead.company.name.toLowerCase().includes(searchTerm.toLowerCase());
        const assigneeMatch = lead.assignedToUser ? 
          `${lead.assignedToUser.firstName || ''} ${lead.assignedToUser.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) :
          false;
        return companyMatch || assigneeMatch;
      });
    }

    // Apply sector filter
    if (filterSector !== "all") {
      result = result.filter(lead => lead.company.sector === filterSector);
    }

    // Apply assigned to filter
    if (filterAssignedTo !== "all") {
      if (filterAssignedTo === "unassigned") {
        result = result.filter(lead => !lead.assignedTo);
      } else {
        result = result.filter(lead => lead.assignedTo === filterAssignedTo);
      }
    }


    // Apply stage filter (for universe tab - filter by lead stage)
    if (stage === 'universe' && filterStage !== "all") {
      result = result.filter(lead => lead.stage === filterStage);
    }
    // Apply location filter (for universe tab)
    if (stage === 'universe' && filterLocation !== "all") {
      result = result.filter(lead => lead.company.location === filterLocation);
    }

    // Apply channel partner filter (for universe tab)
    if (stage === 'universe' && filterChannelPartner !== "all") {
      // Note: This is a placeholder — you'll need to add a `channelPartner` field to leads later
      // For now, we'll assume leads with activityType 'channel_partner' are channel partners
      const hasChannelPartnerActivity = (leadId: number) => {
        // We don't have activities here, so this is a UI-only filter for now
        return filterChannelPartner === "with_channel_partner" ? false : true;
      };
      // Since we can't filter properly without backend support, we'll skip actual filtering for now
      // Just keep the UI option visible
    }
    // Apply sorting
    const [sortField, sortOrder] = sortBy.split('-');
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'company':
          comparison = a.company.name.localeCompare(b.company.name);
          break;
        case 'sector':
          comparison = (a.company.sector || '').localeCompare(b.company.sector || '');
          break;
        case 'assignedTo':
          const aName = a.assignedToUser ? 
            `${a.assignedToUser.firstName || ''} ${a.assignedToUser.lastName || ''}`.trim() : 'Unassigned';
          const bName = b.assignedToUser ? 
            `${b.assignedToUser.firstName || ''} ${b.assignedToUser.lastName || ''}`.trim() : 'Unassigned';
          comparison = aName.localeCompare(bName);
          break;
        case 'revenue':
          const aRev = a.company.revenueInrCr ? parseFloat(String(a.company.revenueInrCr)) : 0;
          const bRev = b.company.revenueInrCr ? parseFloat(String(b.company.revenueInrCr)) : 0;
          comparison = aRev - bRev;
          break;
        case 'dateAdded':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'dateUpdated':
          comparison = new Date(a.stageUpdatedAt || 0).getTime() - new Date(b.stageUpdatedAt || 0).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });


    return result;
  }, [leads, searchTerm, filterSector, filterAssignedTo, filterStatus, filterStage, sortBy, stage]);

  

  const stageConfig = {
    universe: { 
      title: 'Universe', 
      description: 'Master list of all leads and prospects',
      action: 'Qualify Lead'
    },
    qualified: { 
      title: 'Qualified', 
      description: 'Leads with complete contact information ready for outreach',
      action: 'Start Outreach'
    },
    outreach: { 
      title: 'Outreach', 
      description: 'Active outreach and communication with prospects',
      action: 'Move to Pitching'
    },
    pitching: { 
      title: 'Pitching', 
      description: 'Active deal discussions and presentations',
      action: 'Move to Mandates'
    },
    mandates: { 
      title: 'Mandates', 
      description: 'Active mandates and contract management',
      action: 'Complete'
    },
    won: { 
      title: 'Won', 
      description: 'Successfully closed deals',
      action: 'Archive'
    },
    lost: { 
      title: 'Lost', 
      description: 'Deals that were not won',
      action: 'Archive'
    },
    rejected: { 
      title: 'Rejected', 
      description: 'Leads that did not progress or were declined',
      action: 'Archive'
    },
  };

  const config = stageConfig[stage];

  const handleEditLead = (leadId: number) => {
    console.log('Edit lead:', leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setShowPOCManagement({
        leadId,
        companyId: lead.company.id,
        companyName: lead.company.name
      });
    }
  };

  const handleAssignLead = (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setShowAssignmentModal({ leadId, company: lead.company });
    }
  };

  const handleReassignLead = (leadId: number) => {
    // For now, just open the same assignment modal - we'll add challenge later
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setShowAssignmentModal({ leadId, company: lead.company,currentAssignedInterns: lead.assignedInterns || []  // ✅ Pass current assignments
 });
    }
  };

  const handleBulkAssign = () => {
    if (selectedLeads.length > 0 && bulkAssignToUser) {
      bulkAssignMutation.mutate({ leadIds: selectedLeads, assignedTo: bulkAssignToUser });
    }
  };

  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredAndSortedLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleOutreachClick = (leadId: number) => {
    console.log('Open outreach tracker for:', leadId);
    setShowOutreachTracker(leadId);
  };

  const handleInterventionClick = (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setShowInterventionTracker({
        leadId,
        companyName: lead.company.name
      });
    }
  };

  // Move to Outreach mutation
  // const moveToOutreachMutation = useMutation({
  //   mutationFn: async (leadId: number) => {
  //     return apiRequest('PATCH', `/api/leads/${leadId}/stage`, { stage: 'outreach' });
  //   },
  //   onSuccess: () => {
  //     // Invalidate current stage (qualified), outreach stage, and dashboard
  //     queryClient.invalidateQueries({ queryKey: ['leads', 'stage', stage] });
  //     queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'outreach'] });
  //     queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
  //     toast({
  //       title: "Success",
  //       description: "Lead moved to Outreach stage",
  //     });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to move lead to outreach",
  //       variant: "destructive",
  //     });
  //   },
  // });

  // const handleMoveToOutreach = (leadId: number) => {
  //   const lead = leads.find(l => l.id === leadId);
  //   if (lead) {
  //     moveToOutreachMutation.mutate(leadId);
  //   }
  // };

    // Move to Outreach mutation — instant update
    const moveToOutreachMutation = useMutation({
      mutationFn: async (leadId: number) => {
        // Send request to backend
        return apiRequest("PATCH", `/leads/${leadId}/stage`, { stage: "outreach" });
      },

      // 👇 Optimistic UI: update immediately
      onMutate: async (leadId: number) => {
        await queryClient.cancelQueries({ queryKey: ["leads", "stage", stage] });

        // Snapshot current list
        const previous = queryClient.getQueryData<Lead[]>(["leads", "stage", stage]);

        // Optimistically mark this lead as outreach
        queryClient.setQueryData(["leads", "stage", stage], (old: any) =>
          old
            ? old.map((lead: Lead) =>
                lead.id === leadId ? { ...lead, stage: "outreach" } : lead
              )
            : []
        );

        return { previous };
      },

      // Roll back on error
      onError: (error: any, leadId, context) => {
        if (context?.previous) {
          queryClient.setQueryData(["leads", "stage", stage], context.previous);
        }
        toast({
          title: "Error",
          description: error.message || "Failed to move lead to outreach",
          variant: "destructive",
        });
      },

      // Sync with backend when done
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["leads", "stage", stage] });
        queryClient.invalidateQueries({ queryKey: ["leads", "stage", "outreach"] });
        queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });
      },

      onSuccess: () => {
        toast({
          title: "Success",
          description: "Lead moved to Outreach stage",
        });
      },
    });

    const handleMoveToOutreach = (leadId: number) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        moveToOutreachMutation.mutate(leadId);
      }
    };



  // // Move to Mandates mutation
  // const moveToMandatesMutation = useMutation({
  //   mutationFn: async (leadId: number) => {
  //     return apiRequest('PATCH', `/api/leads/${leadId}/stage`, { stage: 'mandates' });
  //   },
  //   onSuccess: () => {
  //     // Invalidate pitching and mandates stages, and dashboard
  //     queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'pitching'] });
  //     queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'mandates'] });
  //     queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
  //     toast({
  //       title: "Success",
  //       description: "Lead moved to Mandates stage",
  //     });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to move lead to mandates",
  //       variant: "destructive",
  //     });
  //   },
  // });

  // const handleMoveToPitching = (leadId: number) => {
  //   const lead = leads.find(l => l.id === leadId);
  //   if (lead) {
  //     setShowEngagementGate({
  //       leadId,
  //       companyId: lead.company.id,
  //       companyName: lead.company.name
  //     });
  //   }
  // };

  // const handleMoveToMandates = (leadId: number) => {
  //   const lead = leads.find(l => l.id === leadId);
  //   if (lead) {
  //     // Show confirmation dialog first
  //     setShowMandateConfirmation({
  //       leadId,
  //       companyName: lead.company.name
  //     });
  //   }
  // };

  // const confirmMoveToMandates = () => {
  //   if (showMandateConfirmation) {
  //     // Move lead to Mandates stage
  //     const leadId = showMandateConfirmation.leadId;
  //     setShowMandateConfirmation(null);
  //     moveToMandatesMutation.mutate(leadId);
  //   }
  // };


    // ✅ Move to Mandates mutation — instant update (no refresh needed)
    const moveToMandatesMutation = useMutation({
      mutationFn: async (leadId: number) => {
        return apiRequest("PATCH", `/leads/${leadId}/stage`, { stage: "mandates" });
      },

      onMutate: async (leadId: number) => {
        await queryClient.cancelQueries({ queryKey: ["leads", "stage", stage] });

        const previous = queryClient.getQueryData<Lead[]>(["leads", "stage", stage]);

        // Optimistically mark as moved to mandates
        queryClient.setQueryData(["leads", "stage", stage], (old: any) =>
          old
            ? old.map((lead: Lead) =>
                lead.id === leadId ? { ...lead, stage: "mandates" } : lead
              )
            : []
        );

        return { previous };
      },

      onError: (error: any, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(["leads", "stage", stage], context.previous);
        }
        toast({
          title: "Error",
          description: error.message || "Failed to move lead to mandates",
          variant: "destructive",
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["leads", "stage", "pitching"] });
        queryClient.invalidateQueries({ queryKey: ["leads", "stage", "mandates"] });
        queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });
      },

      onSuccess: () => {
        toast({
          title: "Success",
          description: "Lead moved to Mandates stage",
        });
      },
    });

    // ✅ Keep these handler functions (unchanged)
    const handleMoveToPitching = (leadId: number) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setShowEngagementGate({
          leadId,
          companyId: lead.company.id,
          companyName: lead.company.name,
        });
      }
    };

    const handleMoveToMandates = (leadId: number) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        // Show confirmation dialog first
        setShowMandateConfirmation({
          leadId,
          companyName: lead.company.name,
        });
      }
    };

    // ✅ Confirmation trigger still works as before
    const confirmMoveToMandates = () => {
      if (showMandateConfirmation) {
        const leadId = showMandateConfirmation.leadId;
        setShowMandateConfirmation(null);
        moveToMandatesMutation.mutate(leadId);
      }
    };






  if (showPOCManagement) {
    return (
      <div className="flex justify-center">
        <POCManagement
          companyId={showPOCManagement.companyId}
          companyName={showPOCManagement.companyName}
          startInEditMode={true}
          onClose={() => setShowPOCManagement(null)}
          onSave={() => {
            // Invalidate and refetch leads data to update POC status
            queryClient.invalidateQueries({ queryKey: ['leads', 'stage', stage] });
            queryClient.invalidateQueries({ queryKey: [`/contacts/company/${showPOCManagement.companyId}`] });
            // Also invalidate all stage queries to refresh other views
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                const key = query.queryKey;
                return Array.isArray(key) && key[0] === 'leads' && key[1] === 'stage';
              }
            });
            // Close the dialog after saving
            setShowPOCManagement(null);
          }}
        />
      </div>
    );
  }

  if (showOutreachTracker) {
    const lead = leads.find(l => l.id === showOutreachTracker);
    return (
      <OutreachTracker
        leadId={showOutreachTracker}
        companyId={lead?.companyId || 0}
        companyName={lead?.company.name || ''}
        leadStage={lead?.stage || 'outreach'}
        onClose={() => {
          setShowOutreachTracker(null);
          // Invalidate and refetch leads data
          queryClient.invalidateQueries({ queryKey: ['leads', 'stage', stage] });
        }}
        onViewPOC={() => {
          // Close OutreachTracker and open POCManagement
          const leadId = showOutreachTracker;
          const companyId = lead?.companyId || 0;
          const companyName = lead?.company.name || '';
          setShowOutreachTracker(null);
          setShowPOCManagement({ leadId, companyId, companyName });
        }}
      />
    );
  }

  if (showInterventionTracker) {
    return (
      <div className="flex justify-center">
        <InterventionTracker
          leadId={showInterventionTracker.leadId}
          companyName={showInterventionTracker.companyName}
          onClose={() => setShowInterventionTracker(null)}
        />
      </div>
    );
  }

  if (showAssignmentModal) {
    const lead = leads.find(l => l.id === showAssignmentModal.leadId);
    return (
      <div className="flex justify-center">
        <AssignmentModal
          lead={lead || null}
          company={showAssignmentModal.company}
          currentAssignedInterns={showAssignmentModal.currentAssignedInterns}  // ✅ Pass this
          isOpen={true}
          onClose={() => {
            setShowAssignmentModal(null);
            // Invalidate and refetch leads data after assignment changes
            queryClient.invalidateQueries({ queryKey: ['leads', 'stage', stage] });
          }}
          currentUser={currentUser}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid={`lead-management-${stage}`}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{config.title}</h2>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" data-testid={`count-${stage}`}>
              {filteredAndSortedLeads.length} leads
            </Badge>
            {stage === 'universe' && ['partner', 'admin','analyst'].includes(currentUser.role) && (
              <>
              {
                console.log('currentUser.role',currentUser.role)
              }
                <Button
                  onClick={() => setShowBulkAssignModal(true)}
                  disabled={selectedLeads.length === 0}
                  variant="outline"
                  size="sm"
                  data-testid="button-bulk-assign"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Assign Selected</span>
                  <span className="sm:hidden">Assign</span>
                  <span className="ml-1">({selectedLeads.length})</span>
                </Button>
                <Button
                  onClick={handleDownloadSample}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-csv-sample"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Download Sample CSV</span>
                  <span className="md:hidden">Sample CSV</span>
                </Button>
                <Button
                  onClick={() => setShowIndividualLeadForm(true)}
                  variant="default"
                  size="sm"
                  data-testid="button-add-individual-lead"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Individual Lead</span>
                  <span className="sm:hidden">Add Lead</span>
                </Button>
                <Button
                  onClick={() => setShowCsvUploadModal(true)}
                  variant="outline"
                  size="sm"
                  data-testid="button-upload-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Upload CSV</span>
                  <span className="sm:hidden">Upload</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search, Sort, and Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by company or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-leads"
              />
            </div>
            
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px] min-w-[140px]" data-testid="select-sort">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company-asc">Company (A-Z)</SelectItem>
                <SelectItem value="company-desc">Company (Z-A)</SelectItem>
                <SelectItem value="sector-asc">Sector (A-Z)</SelectItem>
                <SelectItem value="sector-desc">Sector (Z-A)</SelectItem>
                <SelectItem value="assignedTo-asc">Assignee (A-Z)</SelectItem>
                <SelectItem value="assignedTo-desc">Assignee (Z-A)</SelectItem>
                <SelectItem value="revenue-asc">Revenue (Low-High)</SelectItem>
                <SelectItem value="revenue-desc">Revenue (High-Low)</SelectItem>
                <SelectItem value="dateAdded-asc">Date Added (Old-New)</SelectItem>
                <SelectItem value="dateAdded-desc">Date Added (New-Old)</SelectItem>
                <SelectItem value="dateUpdated-asc">Last Updated (Old-New)</SelectItem>
                <SelectItem value="dateUpdated-desc">Last Updated (New-Old)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-2">
            {/* Sector Filter */}
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-full sm:w-auto min-w-[140px]" data-testid="select-filter-sector">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                <SelectItem value="all">All Sectors</SelectItem>
                {uniqueSectors.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assigned To Filter */}
            <Select value={filterAssignedTo} onValueChange={setFilterAssignedTo}>
              <SelectTrigger className="w-full sm:w-auto min-w-[140px]" data-testid="select-filter-assignee">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {uniqueAssignees.map(assignee => (
                  <SelectItem key={assignee.id} value={assignee.id}>{assignee.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Location Filter (Universe tab only) */}
            {stage === 'universe' && (
              <Select 
                value={filterLocation} 
                onValueChange={setFilterLocation}
                data-testid="select-filter-location"
              >
                <SelectTrigger className="w-full sm:w-auto min-w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-gray-50">
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          
            {/* Stage Filter (Universe tab only) */}
            {stage === 'universe' && (
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-full sm:w-auto min-w-[140px]" data-testid="select-filter-stage">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent className="bg-gray-50">
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="universe">Universe</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="pitching">Pitching</SelectItem>
                  <SelectItem value="mandates">Mandates</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}
             {/* Channel Partners Filter (Universe tab only) */}
            {stage === 'universe' && (
              <Select 
                value={filterChannelPartner} 
                onValueChange={setFilterChannelPartner}
                data-testid="select-filter-channel-partner"
              >
                <SelectTrigger className="w-full sm:w-auto min-w-[140px]">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Channel Partners" />
                </SelectTrigger>
                <SelectContent className="bg-gray-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="with_channel_partner">With Channel Partner</SelectItem>
                  <SelectItem value="without_channel_partner">Without Channel Partner</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Clear Filters Button */}
            {(filterSector !== "all" || filterAssignedTo !== "all" || filterStatus !== "all" || filterStage !== "all" || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterSector("all");
                  setFilterAssignedTo("all");
                  setFilterStatus("all");
                  setFilterStage("all");
                  setSearchTerm("");
                }}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load leads</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}
      
      {/* Leads Grid */}
      {!isLoading && !error && filteredAndSortedLeads.length > 0 ? (
        <div className="space-y-4">
          {/* Column Headers - Hidden on mobile */}
          <div className="hidden lg:grid grid-cols-12 gap-4 items-center border-b pb-2 text-sm font-medium text-muted-foreground">
            {stage === 'universe' && ['partner', 'admin'].includes(currentUser.role) && (
              <div className="col-span-1 flex items-center">
                <Checkbox
                  checked={selectedLeads.length === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </div>
            )}
            <div className={stage === 'universe' && ['partner', 'admin'].includes(currentUser.role) ? "col-span-4" : "col-span-4"}>Company</div>
            <div className={stage === 'universe' ? "col-span-3" : "col-span-3"}>Sector</div>
            {stage === 'universe' && (
              <div className="col-span-2">Owner</div>
            )}
            {stage === 'universe' && (
              <div className="col-span-2">Assigned To</div>
            )}
            {stage !== 'universe' && (
              <div className="col-span-3">Assigned To</div>
            )}
            {stage !== 'universe' && (
              <div className="col-span-2">Actions</div>
            )}
          </div>
          
          {/* Lead Cards */}
          <div className="space-y-2">
            {filteredAndSortedLeads.map((leadData) => (
            <div key={leadData.id} className="space-y-2">
              {stage === 'universe' && ['partner', 'admin'].includes(currentUser.role) ? (
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-1 flex items-center pt-4">
                    <Checkbox
                      checked={selectedLeads.includes(leadData.id)}
                      onCheckedChange={(checked) => handleSelectLead(leadData.id, checked as boolean)}
                      data-testid={`checkbox-lead-${leadData.id}`}
                    />
                  </div>
                  <div className="col-span-11">
                    <LeadCard
                      lead={leadData}
                      company={leadData.company}
                      contact={leadData.contact}
                      currentUserName= {currentUser.firstName}
                      assignedToName={leadData.assignedToUser ? 
                        `${leadData.assignedToUser.firstName || ''} ${leadData.assignedToUser.lastName || ''}`.trim() :
                        undefined
                      }
                      assignedToUser={leadData.assignedToUser}
                      assignedInternUsers={leadData.assignedInterns 
                        ? leadData.assignedInterns
                            .map((internId: string) => allInterns.find(i => i.id === internId))
                            .filter(Boolean) as User[]
                        : []
                      }
                      ownerAnalystName={`${currentUser.firstName} ${currentUser.lastName}`.trim()
                      }
                            currentUser={currentUser}
                      stage={stage}
                      onEdit={handleEditLead}
                      onAssign={handleAssignLead}
                      onReassign={handleReassignLead}
                      onIntervention={handleInterventionClick}
                      onMoveToOutreach={handleMoveToOutreach}
                      onManageOutreach={handleOutreachClick}
                      onMoveToPitching={handleMoveToPitching}
                      onMoveToMandates={handleMoveToMandates}
                    />
                  </div>
                </div>
              ) : (
                <LeadCard
                  lead={leadData}
                  company={leadData.company}
                  contact={leadData.contact}
                  assignedToName={leadData.assignedToUser ? 
                    `${leadData.assignedToUser.firstName || ''} ${leadData.assignedToUser.lastName || ''}`.trim() :
                    undefined
                  }
                  assignedToUser={leadData.assignedToUser}
                  assignedInternUsers={leadData.assignedInterns 
                    ? leadData.assignedInterns
                        .map((internId: string) => allInterns.find(i => i.id === internId))
                        .filter(Boolean) as User[]
                    : []
                  }
                  

                  ownerAnalystName={leadData.ownerAnalystUser ? 
                    `${leadData.ownerAnalystUser.firstName || ''} ${leadData.ownerAnalystUser.lastName || ''}`.trim() :
                    undefined
                  }

                  
                  currentUser={currentUser}
                  stage={stage}
                  onEdit={handleEditLead}
                  onAssign={handleAssignLead}
                  onReassign={handleReassignLead}
                  onIntervention={handleInterventionClick}
                  onMoveToOutreach={handleMoveToOutreach}
                  onManageOutreach={handleOutreachClick}
                  onMoveToPitching={handleMoveToPitching}
                  onMoveToMandates={handleMoveToMandates}
                />
              )}
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? "No leads match your search criteria." 
              : `No leads in ${config.title.toLowerCase()} stage yet.`
            }
          </p>
          {stage === 'universe' && (
            <Button 
              onClick={() => setShowIndividualLeadForm(true)}
              data-testid="button-add-first-lead"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Lead
            </Button>
          )}
        </div>
      )}

      {/* Bulk Assignment Dialog */}
      <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
        <DialogContent className="max-w-2xl" data-testid="dialog-bulk-assign">
          <DialogHeader>
            <DialogTitle>Bulk Assign Companies</DialogTitle>
            <DialogDescription>
              Assign {selectedLeads.length} selected companies to a team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={bulkAssignToUser} onValueChange={setBulkAssignToUser}>
                <SelectTrigger data-testid="select-bulk-assign-to">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.email
                      } ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Selected Companies ({selectedLeads.length})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedLeads.map(leadId => {
                  const lead = leads.find(l => l.id === leadId);
                  return lead ? (
                    <div key={leadId} className="text-sm flex items-center gap-2">
                      <CheckSquare className="h-3 w-3" />
                      {lead.company.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setSelectedLeads([]);
                  setBulkAssignToUser("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssign}
                disabled={!bulkAssignToUser || selectedLeads.length === 0 || bulkAssignMutation.isPending}
                data-testid="button-confirm-bulk-assign"
              >
                {bulkAssignMutation.isPending ? "Assigning..." : `Assign ${selectedLeads.length} Companies`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={showCsvUploadModal} onOpenChange={setShowCsvUploadModal}>
        <DialogContent className="max-w-3xl" data-testid="dialog-csv-upload">
          <DialogHeader>
            <DialogTitle>Upload Companies via CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import companies and their primary contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                data-testid="input-csv-file"
              />
              <p className="text-sm text-muted-foreground">
                Select a CSV file to upload. Need a template? 
                <Button 
                  variant="ghost" 
                  className="p-0 h-auto text-sm" 
                  onClick={handleDownloadSample}
                  data-testid="link-download-sample"
                >
                  Download sample CSV
                </Button>
              </p>
            </div>

            {csvUploadResults && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Upload Results</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Rows:</span> {csvUploadResults.totalRows}
                  </div>
                  <div>
                    <span className="font-medium">Companies Created:</span> {csvUploadResults.successfulCompanies}
                  </div>
                  <div>
                    <span className="font-medium">Contacts Created:</span> {csvUploadResults.successfulContacts}
                  </div>
                  <div>
                    <span className="font-medium">Errors:</span> {csvUploadResults.errors?.length || 0}
                  </div>
                </div>
                
                {csvUploadResults.errors && csvUploadResults.errors.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-destructive mb-2">Errors:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {csvUploadResults.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-destructive">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCsvUploadModal(false);
                  setCsvFile(null);
                  setCsvUploadResults(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCsvUpload}
                disabled={!csvFile || csvUploadMutation.isPending}
                data-testid="button-upload-csv"
              >
                {csvUploadMutation.isPending ? "Uploading..." : "Upload CSV"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Lead Form Dialog */}
      <Dialog open={showIndividualLeadForm} onOpenChange={setShowIndividualLeadForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-individual-lead-form">
          <IndividualLeadForm
          currentUser={currentUser}
            onSuccess={() => {
              setShowIndividualLeadForm(false);
              // Refresh the leads for this stage and related data
              queryClient.invalidateQueries({ queryKey: ['leads', 'stage', stage] });
              queryClient.invalidateQueries({ queryKey: ['/dashboard/metrics'] });
            }}
            onCancel={() => setShowIndividualLeadForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Engagement Gate Dialog - Required before moving to Pitching */}
      {showEngagementGate && (
        <EngagementGateDialog
          isOpen={!!showEngagementGate}
          leadId={showEngagementGate.leadId}
          companyId={showEngagementGate.companyId}
          companyName={showEngagementGate.companyName}
          onClose={() => setShowEngagementGate(null)}
          onSuccess={() => {
            setShowEngagementGate(null);
            // Refresh leads for both outreach and pitching stages
            queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'outreach'] });
            queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'pitching'] });
            queryClient.invalidateQueries({ queryKey: ['/dashboard/metrics'] });
          }}
        />
      )}

      {/* Mandate Confirmation Dialog */}
      {showMandateConfirmation && (
        <Dialog open={!!showMandateConfirmation} onOpenChange={(open) => !open && setShowMandateConfirmation(null)}>
          <DialogContent data-testid="dialog-mandate-confirmation">
            <DialogHeader>
              <DialogTitle>Confirm Mandate</DialogTitle>
              <DialogDescription>
                Are you sure you have received a mandate to proceed with <strong>{showMandateConfirmation.companyName}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ Please confirm that you have received a formal mandate from the client before proceeding to the Mandates stage. 
                  This indicates that the client has committed to working with your firm.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Before confirming, ensure:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• You have received a signed Letter of Engagement</li>
                  <li>• The client has formally committed to the engagement</li>
                  <li>• All terms and conditions have been agreed upon</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMandateConfirmation(null)}
                data-testid="button-cancel-mandate"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmMoveToMandates}
                data-testid="button-confirm-mandate"
              >
                Yes, I Have a Mandate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}