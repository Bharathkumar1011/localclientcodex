import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Loader2, Save, Check, ChevronsUpDown, Unlink, Building2, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function LinkInvestorsPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const leadId = Number(params.id || params.leadId);
  const [searchQuery, setSearchQuery] = useState("");
  
  // STATE: Map of Investor ID -> Set of Selected Contact IDs
  const [selections, setSelections] = useState<Map<number, Set<number>>>(new Map());

  if (isNaN(leadId) || leadId === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-xl font-semibold text-red-600">Invalid Lead ID</h2>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  // 1. Fetch ALL investors
  const { data: investors = [], isLoading: isLoadingInvestors } = useQuery<any[]>({
    queryKey: ["/api/investors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/investors?stage=all"); 
      return res.json();
    },
  });

  // 2. Fetch already linked investors
  const { data: linkedInvestors = [], isLoading: isLoadingLinked } = useQuery<any[]>({
    queryKey: ["/leads/linked-investors", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}/linked-investors`);
      return res.json();
    },
    enabled: !!leadId,
  });

  // --- NEW: SMART FILTERING LOGIC ---
  // Create a map of Investor ID -> Set of *already linked* Contact IDs
  const linkedMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    linkedInvestors.forEach((linkedInv: any) => {
      const contactIds = linkedInv.contacts?.map((c: any) => c.id) || [];
      map.set(linkedInv.id, new Set(contactIds));
    });
    return map;
  }, [linkedInvestors]);

  const availableInvestors = useMemo(() => {
    const available = investors.map((inv: any) => {
      const linkedContacts = linkedMap.get(inv.id);

      // Scenario 1: Not linked at all
      if (!linkedContacts) {
        return inv; 
      }

      // Scenario 2: Already linked. Check if they have remaining unlinked contacts.
      const allContacts = inv.contacts || [];
      
      // If investor has no contacts at all, and is linked, they are fully linked (hide them)
      if (allContacts.length === 0) return null;

      // Filter out contacts that are already linked
      const unlinkedContacts = allContacts.filter((c: any) => !linkedContacts.has(c.id));
      
      if (unlinkedContacts.length > 0) {
        // Return a cloned investor that ONLY shows the unlinked contacts in the dropdown
        return { ...inv, contacts: unlinkedContacts }; 
      }

      // Scenario 3: All POCs are already linked (hide them)
      return null; 
    }).filter(Boolean); // Remove nulls

    // Apply Search Query
    if (!searchQuery) return available;
    const q = searchQuery.toLowerCase();
    return available.filter((inv: any) => 
      inv.name.toLowerCase().includes(q) ||
      (inv.sector && inv.sector.toLowerCase().includes(q)) ||
      (inv.location && inv.location.toLowerCase().includes(q))
    );
  }, [investors, linkedMap, searchQuery]);

  // Toggle Investor Selection (Main Checkbox)
  const toggleInvestor = (investorId: number) => {
    const next = new Map(selections);
    if (next.has(investorId)) {
      next.delete(investorId);
    } else {
      next.set(investorId, new Set()); // Select investor with empty contacts initially
    }
    setSelections(next);
  };

  // Toggle Contact Selection (Dropdown Item)
  const toggleContact = (investorId: number, contactId: number) => {
    const next = new Map(selections);
    const currentContacts = next.get(investorId) || new Set();
    
    if (currentContacts.has(contactId)) {
      currentContacts.delete(contactId);
    } else {
      currentContacts.add(contactId);
    }
    
    next.set(investorId, currentContacts);
    setSelections(next);
  };

  // MUTATION: Link Investors
  const linkMutation = useMutation({
    mutationFn: async () => {
      const payload = Array.from(selections.entries()).map(([investorId, contactSet]) => ({
        investorId,
        contactIds: Array.from(contactSet),
      }));

      await apiRequest("POST", `/leads/${leadId}/link-investors`, {
        selections: payload, 
      });
    },
    onSuccess: () => {
      toast({
        title: "Investors Linked",
        description: `Successfully linked ${selections.size} investors.`,
      });
      setSelections(new Map()); // Clear selections after success
      queryClient.invalidateQueries({ queryKey: ["/leads/linked-investors", leadId] });
    }
  });

  // MUTATION: Unlink Investor
  const unlinkMutation = useMutation({
    mutationFn: async (investorId: number) => {
      await apiRequest("DELETE", `/investors/${investorId}/linked-leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/leads/linked-investors", leadId] });
      toast({ title: "Investor Unlinked", description: "Successfully removed connection." });
    }
  });

  const isLoading = isLoadingInvestors || isLoadingLinked;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Link Investors to Company</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage investor access and point-of-contacts for this deal.
          </p>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Available Investors */}
        <div className="border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm flex flex-col h-[700px]">
          
          <div className="p-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Available Investors</h3>
              <p className="text-xs text-muted-foreground">Select investors and specific POCs to add to this deal.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search investors..."
                  className="pl-9 bg-white dark:bg-neutral-950"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                onClick={() => linkMutation.mutate()}
                disabled={selections.size === 0 || linkMutation.isPending}
                className="whitespace-nowrap"
              >
                {linkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Link Selected ({selections.size})
              </Button>
            </div>
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Showing {availableInvestors.length} investors
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {availableInvestors.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 italic space-y-2">
                <p>No matching investors found or all fully linked.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableInvestors.map((inv: any) => {
                  const isSelected = selections.has(inv.id);
                  const contacts = inv.contacts || []; 
                  const selectedContactCount = selections.get(inv.id)?.size || 0;

                  return (
                    <div
                      key={inv.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-md border transition-colors ${
                        isSelected 
                          ? "bg-accent/10 border-primary/20" 
                          : "border-gray-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleInvestor(inv.id)}
                          />
                          <div className="flex-1">
                              <div className="flex items-center gap-2">
                                  <span className="font-semibold">{inv.name}</span>
                                  {inv.sector && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                      {inv.sector}
                                  </Badge>
                                  )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                  {inv.location || "Location not specified"}
                              </div>
                          </div>
                      </div>

                      {/* POC Dropdown */}
                      {isSelected && (
                        <div className="min-w-[250px]">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                size="sm"
                                className="w-full justify-between text-xs h-9 bg-background"
                              >
                                {selectedContactCount > 0
                                  ? `${selectedContactCount} POCs selected` 
                                  : "Select POCs (Optional)"}
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="end">
                              <Command>
                                <CommandInput placeholder="Search POC..." />
                                <CommandList>
                                  <CommandEmpty>No contacts found.</CommandEmpty>
                                  <CommandGroup>
                                    {contacts.length > 0 ? contacts.map((contact: any) => {
                                       const isContactSelected = selections.get(inv.id)?.has(contact.id);
                                       return (
                                        <CommandItem
                                            key={contact.id}
                                            value={contact.name + " " + contact.id} 
                                            onSelect={() => toggleContact(inv.id, contact.id)}
                                        >
                                            <div className="flex items-center gap-2 w-full cursor-pointer">
                                                <div className={`h-4 w-4 border rounded-sm flex items-center justify-center ${
                                                    isContactSelected 
                                                      ? "bg-primary border-primary text-primary-foreground" 
                                                      : "border-muted-foreground"
                                                  }`}>
                                                    {isContactSelected && <Check className="h-3 w-3" />}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-medium truncate">{contact.name}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                      {contact.designation || contact.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </CommandItem>
                                       )
                                    }) : (
                                      <div className="p-3 text-xs text-muted-foreground text-center">
                                        No unlinked POCs left for this investor.
                                      </div>
                                    )}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Linked Investors */}
        <div className="border border-indigo-200 dark:border-indigo-900/50 rounded-lg bg-indigo-50/10 dark:bg-indigo-950/10 shadow-sm flex flex-col h-[700px]">
          <div className="p-4 border-b border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 space-y-4">
             <div>
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Currently Linked
              </h3>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Investors actively engaged in this deal</p>
            </div>
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-[52px]">
              Total: {linkedInvestors.length} investors
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {linkedInvestors.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 italic">
                No investors are linked yet.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedInvestors.map((linked: any) => (
                  <div key={linked.id} className="flex items-start justify-between p-3 rounded-md border border-white dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 mt-0.5 bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {linked.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize mb-2">Stage: {linked.stage}</p>
                        
                        {/* Show Linked POCs */}
                        {linked.contacts && linked.contacts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {linked.contacts.map((c: any) => (
                              <Badge key={c.id} variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-1 font-normal">
                                <UserIcon className="w-3 h-3 text-muted-foreground" />
                                {c.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 flex-shrink-0 ml-2"
                      disabled={unlinkMutation.isPending}
                      onClick={() => {
                        if (confirm(`Are you sure you want to completely unlink ${linked.name}?`)) {
                           unlinkMutation.mutate(linked.id);
                        }
                      }}
                    >
                      <Unlink className="w-3 h-3 mr-1.5" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}