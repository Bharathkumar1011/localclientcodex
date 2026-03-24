import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Plus, Trash2, ExternalLink, User, UserCheck, UserX, Edit2, Mail, Phone, CheckCircle, AlertCircle } from "lucide-react";

interface Contact {
  id: number;
  companyId: number;
  name: string;
  designation: string;
  email?: string;
  phone?: string;
  linkedinProfile?: string;
  isPrimary: boolean;
  isComplete: boolean;
}

interface ContactFormData {
  name: string;
  designation: string;
  email: string;
  phone: string;
  linkedinProfile: string;
}

interface DeleteTarget {
  contactId: number;
  index: number;
  name: string;
}


interface POCManagementProps {
  companyId: number;
  companyName: string;
  onClose: () => void;
  onSave?: () => void;
  startInEditMode?: boolean;
}

const emptyContact: ContactFormData = {
  name: '',
  designation: '',
  email: '',
  phone: '',
  linkedinProfile: '',
};

const CONTACT_SLOT_COUNT = 3;

const normalizeContactSlots = (contacts: ContactFormData[] = []) => {
  return Array.from({ length: CONTACT_SLOT_COUNT }, (_, index) => ({
    ...emptyContact,
    ...(contacts[index] ?? {}),
  }));
};

const hasAnyContactValue = (contact?: Partial<ContactFormData>) => {
  if (!contact) return false;

  return [contact.name, contact.designation, contact.email, contact.phone, contact.linkedinProfile]
    .some((value) => !!value?.trim());
};

const hasMeaningfulDraft = (contacts: ContactFormData[] = []) => {
  return contacts.some((contact) => hasAnyContactValue(contact));
};


export default function POCManagement({ companyId, companyName, onClose, onSave, startInEditMode = false }: POCManagementProps) {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  // const [editingContacts, setEditingContacts] = useState<ContactFormData[]>([]);
  // Load any draft edits for this company from sessionStorage
const [editingContacts, setEditingContacts] = useState<ContactFormData[]>(() =>
  normalizeContactSlots()
);

const [hasInitializedFromServer, setHasInitializedFromServer] = useState(false);

  // Whenever user types, keep a draft in sessionStorage
useEffect(() => {
  if (!hasInitializedFromServer) return;

  const draftKey = `poc-edit-contacts-${companyId}`;

  if (hasMeaningfulDraft(editingContacts)) {
    sessionStorage.setItem(draftKey, JSON.stringify(editingContacts));
  } else {
    sessionStorage.removeItem(draftKey);
  }
}, [editingContacts, companyId, hasInitializedFromServer]);

  const [errors, setErrors] = useState<{[index: number]: Partial<Record<keyof ContactFormData, string>>}>({});
  
  // ✅ NEW: Track which individual contact is being edited
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // // ✅ Force-lock the popup after tab switch until user clicks Edit/Add again
  // const TABLOCK_KEY = `poc-tablocked-${companyId}`;

  // const [tabLocked, setTabLocked] = useState(() => {
  //   return sessionStorage.getItem(TABLOCK_KEY) === "1";
  // });

  // // if company changes while modal is open, re-read
  // useEffect(() => {
  //   setTabLocked(sessionStorage.getItem(`poc-tablocked-${companyId}`) === "1");
  // }, [companyId]);


  // // ✅ Lock editing when user switches browser tabs / window loses focus
  // useEffect(() => {
  //   const lockEditing = (reason: string) => {
  //     console.log("LOCK TRIGGERED", { reason, hidden: document.hidden });
  //     sessionStorage.setItem(TABLOCK_KEY, "1");
  //     setEditingIndex(null);
  //     setTabLocked(true);
  //   };

  //   const onBlur = () => lockEditing("blur");
  //   const onPageHide = () => lockEditing("pagehide");
  //   const onVisibilityChange = () => {
  //     if (document.hidden) lockEditing("visibilitychange");
  //   };

  //   window.addEventListener("blur", onBlur);
  //   window.addEventListener("pagehide", onPageHide);
  //   document.addEventListener("visibilitychange", onVisibilityChange);

  //   return () => {
  //     window.removeEventListener("blur", onBlur);
  //     window.removeEventListener("pagehide", onPageHide);
  //     document.removeEventListener("visibilitychange", onVisibilityChange);
  //   };
  // }, [companyId]); // ✅ IMPORTANT: depends on companyId




  // ✅ NEW: Track which contacts are saved (have database IDs)
  const [savedContactIds, setSavedContactIds] = useState<(number | null)[]>([null, null, null]);

  // ✅ NEW: Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteExistingContact(deleteTarget.contactId);
    if (ok) setDeleteTarget(null);
  };


  // Fetch existing contacts for the company
    const { data: contacts = [], isLoading } = useQuery<Contact[]>({
      queryKey: ['contacts', companyId],  // ✅ FIXED: Simple array format
      queryFn: async () => {
        console.log('🔍 Fetching contacts for companyId:', companyId);
        const response = await apiRequest('GET', `/contacts/company/${companyId}`);
        const data = await response.json();
        console.log('📦 Fetched contacts:', data);
        return data;
      },
      enabled: !!companyId,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false, // ✅ IMPORTANT: prevents reset when switching Chrome tabs
      refetchOnReconnect: false,   // ✅ optional but helps
      staleTime: 0,
    });

    // ✅ FIX: Always sync savedContactIds from DB contacts (prevents lock reset)
    useEffect(() => {
      console.log("MODE CHECK", { isEditMode, hasDraft: !!sessionStorage.getItem(`poc-edit-contacts-${companyId}`) });

      const ids: (number | null)[] = [null, null, null];

      contacts.slice(0, 3).forEach((c, i) => {
        ids[i] = c?.id ?? null;
      });

      setSavedContactIds(ids);
    }, [contacts, companyId]);

    // ✅ FIXED: Initialize contacts - removed isFormEmpty bug
useEffect(() => {
  if (isLoading) return;

  const draftKey = `poc-edit-contacts-${companyId}`;
  const rawDraft = sessionStorage.getItem(draftKey);

  let draftContacts: ContactFormData[] = normalizeContactSlots();
  let shouldUseDraft = false;

  if (rawDraft) {
    try {
      draftContacts = normalizeContactSlots(JSON.parse(rawDraft));
      shouldUseDraft = hasMeaningfulDraft(draftContacts);
    } catch (error) {
      sessionStorage.removeItem(draftKey);
    }
  }

  console.log('[POCManagement] Initializing with contacts:', contacts);

  const newContacts: ContactFormData[] = normalizeContactSlots();
  const newSavedIds: (number | null)[] = [null, null, null];

  if (contacts.length > 0) {
    contacts.forEach((contact, index) => {
      if (index < CONTACT_SLOT_COUNT) {
        newContacts[index] = {
          name: contact.name || '',
          designation: contact.designation || '',
          email: contact.email || '',
          phone: contact.phone || '',
          linkedinProfile: contact.linkedinProfile || '',
        };
        newSavedIds[index] = contact.id;
      }
    });
  }

  setSavedContactIds(newSavedIds);

  if (shouldUseDraft) {
    setEditingContacts(draftContacts);
    setIsEditMode(true);
    setEditingIndex(0);
  } else {
    setEditingContacts(newContacts);
    setIsEditMode(contacts.length > 0 ? startInEditMode : true);
    setEditingIndex(contacts.length === 0 ? 0 : null);
  }

  setHasInitializedFromServer(true);

  console.log('[POCManagement] Initialized:', {
    contacts: shouldUseDraft ? draftContacts : newContacts,
    savedIds: newSavedIds,
    usedDraft: shouldUseDraft,
  });
}, [contacts, isLoading, companyId, startInEditMode]);

  const createContactMutation = useMutation({
    mutationFn: (contactData: any) => apiRequest('POST', '/contacts', contactData),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['contacts', companyId],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest('PUT', `/contacts/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['contacts', companyId],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/contacts/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['contacts', companyId],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
    },
  });

  const validateContact = (contact: ContactFormData, index: number): boolean => {
    const newErrors: Partial<Record<keyof ContactFormData, string>> = {};
    
    if (!contact.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!contact.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }
    
    // LinkedIn is OPTIONAL now
    if (contact.linkedinProfile.trim() && !contact.linkedinProfile.includes("linkedin.com")) {
      newErrors.linkedinProfile = "Please enter a valid LinkedIn URL";
    }

    
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, [index]: newErrors }));
      return false;
    } else {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return true;
    }
  };

const handleInputChange = (index: number, field: keyof ContactFormData, value: string) => {
  if (editingIndex !== index) return;

  setEditingContacts((prev) => {
    const next = normalizeContactSlots(prev);
    next[index] = { ...next[index], [field]: value };
    return next;
  });

  if (errors[index]?.[field]) {
    setErrors((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: undefined },
    }));
  }
};


  const addContact = () => {
    if (editingContacts.length < 3) {
      setEditingContacts(prev => [...prev, { ...emptyContact }]);
    }
  };

  const removeContact = (index: number) => {
    if (editingContacts.length > 1) {
      setEditingContacts(prev => prev.filter((_, i) => i !== index));
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

const deleteExistingContact = async (contactId: number): Promise<boolean> => {
  try {
    await deleteContactMutation.mutateAsync(contactId);

    // Clear any in-progress draft so the UI re-syncs cleanly from DB
    sessionStorage.removeItem(`poc-edit-contacts-${companyId}`);

    toast({
      title: "Contact Deleted",
      description: "Contact has been removed successfully",
    });
    return true;
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to delete contact",
      variant: "destructive",
    });
    return false;
  }
};


  // ✅ NEW: Save individual contact
  const handleSaveIndividualContact = async (index: number) => {
    const contact = editingContacts[index];
    const isValid = validateContact(contact, index);
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      const contactData = {
        companyId,
        name: contact.name.trim(),
        designation: contact.designation.trim(),
        email: contact.email?.trim() || null,
        phone: contact.phone?.trim() || null,
        linkedinProfile: contact.linkedinProfile.trim() || null,
        isPrimary: index === 0,
      };

      if (savedContactIds[index]) {
        await updateContactMutation.mutateAsync({
          id: savedContactIds[index]!,
          data: contactData
        });
      } else {
        await createContactMutation.mutateAsync(contactData);
      }

      await queryClient.refetchQueries({
        queryKey: ['contacts', companyId],
        type: 'active'
      });

      toast({
        title: "POC Saved",
        description: `Contact ${index + 1} saved successfully`,
      });

      setEditingIndex(null);
      onSave?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save contact",
        variant: "destructive",
      });
    }
  };

  // ✅ NEW: Cancel editing individual contact
const handleCancelEditContact = (index: number) => {
  const updatedContacts = normalizeContactSlots(editingContacts);

  if (savedContactIds[index] && contacts[index]) {
    updatedContacts[index] = {
      name: contacts[index].name || '',
      designation: contacts[index].designation || '',
      email: contacts[index].email || '',
      phone: contacts[index].phone || '',
      linkedinProfile: contacts[index].linkedinProfile || '',
    };
  } else {
    updatedContacts[index] = { ...emptyContact };
  }

  setEditingContacts(updatedContacts);

  setErrors((prev) => {
    const next = { ...prev };
    delete next[index];
    return next;
  });

  setEditingIndex(null);
};

  // ✅ NEW: Helper functions
  const isContactSaved = (index: number) => savedContactIds[index] !== null;
  const isContactEditing = (index: number) => editingIndex === index;
  const hasContactData = (index: number): boolean => {
    const contact = editingContacts[index];
    if (!contact) return false;

    return Boolean(
      contact.name?.trim() ||
      contact.designation?.trim() ||
      contact.linkedinProfile?.trim() ||
      contact.email?.trim() ||
      contact.phone?.trim()
    );
  };
  const handleSave = async () => {
    let allValid = true;
    for (let i = 0; i < editingContacts.length; i++) {
      const isValid = validateContact(editingContacts[i], i);
      if (!isValid) allValid = false;
    }
    
    if (!allValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }
    
    try {
      for (let i = 0; i < editingContacts.length; i++) {
        const contact = editingContacts[i];
        const existingContact = contacts[i];
        
        const contactData = {
          companyId,
          name: contact.name,
          designation: contact.designation,
          email: contact.email || null,
          phone: contact.phone || null,
          linkedinProfile: contact.linkedinProfile.trim() || null,
          isPrimary: i === 0,
        };
        
        if (existingContact) {
          await updateContactMutation.mutateAsync({
            id: existingContact.id,
            data: contactData
          });
        } else {
          await createContactMutation.mutateAsync(contactData);
        }
      }
      
      await queryClient.refetchQueries({
        queryKey: ['contacts', companyId],
        type: 'active'
      });
      
      toast({
        title: "POCs Updated",
        description: `${editingContacts.length} contact(s) saved for ${companyName}`,
      });
      // Clear draft after successful save
      sessionStorage.removeItem(`poc-edit-contacts-${companyId}`);
      
      setIsEditMode(false);
      onSave?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save contacts",
        variant: "destructive",
      });
    }
  };

const handleEditMode = () => {
  setEditingIndex(0);

  if (contacts.length > 0) {
    setEditingContacts(
      normalizeContactSlots(
        contacts.map((contact: Contact) => ({
          name: contact.name || "",
          designation: contact.designation || "",
          email: contact.email || "",
          phone: contact.phone || "",
          linkedinProfile: contact.linkedinProfile || "",
        }))
      )
    );
  } else {
    setEditingContacts(normalizeContactSlots());
  }

  setIsEditMode(true);
};


const handleCancelEdit = () => {
  sessionStorage.removeItem(`poc-edit-contacts-${companyId}`);
  setEditingIndex(null);

  if (contacts.length > 0) {
    setEditingContacts(
      normalizeContactSlots(
        contacts.map((contact: Contact) => ({
          name: contact.name || "",
          designation: contact.designation || "",
          email: contact.email || "",
          phone: contact.phone || "",
          linkedinProfile: contact.linkedinProfile || "",
        }))
      )
    );
    setIsEditMode(false);
  } else {
    setEditingContacts(normalizeContactSlots());
    onClose();
  }

  setErrors({});
};

    const getCompletionStatus = (contact: ContactFormData | Contact) => {
    const allFields = [contact.name, contact.designation, contact.linkedinProfile, contact.email, contact.phone];
    const requiredFields = [contact.name, contact.designation]; // LinkedIn not required
    const optionalFields = [contact.email, contact.phone];
    
    const filledCount = allFields.filter(field => field && field.trim() !== '').length;
    const requiredComplete = requiredFields.every(field => field && field.trim() !== '');
    const optionalComplete = optionalFields.filter(field => field && field.trim() !== '').length;
    
    if (filledCount === 0) return 'red';
    if (requiredComplete && optionalComplete >= 1) return 'green';
    return 'amber';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return <UserCheck className="h-4 w-4" />;
      case 'amber': return <User className="h-4 w-4" />;
      case 'red': return <UserX className="h-4 w-4" />;
      default: return <UserX className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
  switch (status) {
    case "green":
      return "Complete";
    case "amber":
      return "Partial";
    case "red":
      return "Incomplete";
    default:
      return "Incomplete";
  }
};

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'green': return 'default' as const;
      case 'amber': return 'secondary' as const;
      case 'red': return 'destructive' as const;
      default: return 'destructive' as const;
    }
  };

const getStatusPillClass = (status: string) => {
  switch (status) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const getCardClassName = ({
  isEditing,
  isSaved,
  hasData,
}: {
  isEditing: boolean;
  isSaved: boolean;
  hasData: boolean;
}) => {
  if (isEditing) return "border-primary/40 shadow-md ring-1 ring-primary/10";
  if (isSaved) return "border-emerald-200 bg-white shadow-sm";
  if (hasData) return "border-amber-200 bg-white shadow-sm";
  return "border-dashed border-slate-300 bg-slate-50/60 shadow-none";
};

  if (isLoading) {
    return <div className="p-6 text-center">Loading POC data...</div>;
  }

  // View Mode
// View Mode  // ✅ UPDATED: Edit Mode with locking
if (!isEditMode && contacts.length > 0) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">POC Directory</h3>
          <p className="text-sm text-muted-foreground">
            Structured contact cards for {companyName}. Click Edit to manage any card.
          </p>
        </div>

        <Button onClick={handleEditMode} size="sm" className="w-fit">
          <Edit2 className="mr-2 h-4 w-4" />
          Edit POCs
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {Array.from({ length: CONTACT_SLOT_COUNT }, (_, index) => {
          const contact = contacts[index];
          const hasSavedContact = !!contact;

          if (!hasSavedContact) {
            return (
              <Card
                key={`empty-view-${index}`}
                className="rounded-2xl border-dashed border-slate-300 bg-slate-50/70"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contact {index + 1}
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </CardTitle>

                    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium border-slate-200 bg-slate-100 text-slate-600">
                      Empty
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <UserX className="mb-3 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">No contact added yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add Contact {index + 1} when you have the details.
                  </p>
                </CardContent>
              </Card>
            );
          }

          const status = getCompletionStatus(contact);

          return (
            <Card key={contact.id} className="rounded-2xl border bg-white shadow-sm">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contact {index + 1}
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </CardTitle>

                    <div className="text-base font-semibold leading-tight">
                      {contact.name || "Unnamed Contact"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {contact.designation || "Designation not added"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusPillClass(
                      status
                    )}`}
                  >
                    {getStatusIcon(status)}
                    <span className="ml-1">{getStatusText(status)}</span>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-1 break-all text-sm font-medium">
                    {contact.email || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Phone
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {contact.phone || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        LinkedIn
                      </p>
                      <p className="mt-1 break-all text-sm font-medium">
                        {contact.linkedinProfile || "Not provided"}
                      </p>
                    </div>

                    {contact.linkedinProfile && (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => window.open(contact.linkedinProfile, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


  // ✅ UPDATED: Edit Mode with locking
// ✅ UPDATED: Edit Mode with locking
return (
  <div className="space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">POC Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage up to 3 points of contact for {companyName}. Each card saves independently.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          {savedContactIds.filter(Boolean).length}/{CONTACT_SLOT_COUNT} saved
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          Required: Name, Designation
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {Array.from({ length: CONTACT_SLOT_COUNT }, (_, index) => {
        const contact = editingContacts[index] ?? { ...emptyContact };
        const status = getCompletionStatus(contact);
        const isSaved = isContactSaved(index);
        const isEditing = isContactEditing(index);
        const isLocked = editingIndex !== index;
        const hasData = hasContactData(index);

        return (
          <Card
            key={index}
            className={`rounded-2xl transition-all ${getCardClassName({
              isEditing,
              isSaved,
              hasData,
            })}`}
          >
            <CardHeader className="space-y-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact {index + 1}
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-2">
                    {isSaved && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Saved
                      </span>
                    )}

                    {!isSaved && hasData && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                        <AlertCircle className="mr-1 h-3.5 w-3.5" />
                        Unsaved
                      </span>
                    )}

                    {!hasData && !isSaved && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        Empty Slot
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusPillClass(
                        status
                      )}`}
                    >
                      {getStatusIcon(status)}
                      <span className="ml-1">{getStatusText(status)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isLocked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingIndex(index)}
                      className="h-8"
                    >
                      <Edit2 className="mr-1 h-3.5 w-3.5" />
                      {isSaved || hasData ? "Edit" : "Add"}
                    </Button>
                  )}

                  {isEditing && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveIndividualContact(index)}
                        disabled={updateContactMutation.isPending || createContactMutation.isPending}
                        className="h-8"
                      >
                        <Save className="mr-1 h-3.5 w-3.5" />
                        Save
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelEditContact(index)}
                        className="h-8"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </>
                  )}

                  {contacts[index] && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setDeleteTarget({
                          contactId: contacts[index].id,
                          index,
                          name: contacts[index].name || `Contact ${index + 1}`,
                        })
                      }
                      data-testid={`button-delete-contact-${index}`}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {!isEditing && !isSaved && !hasData ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed bg-white/70 px-4 text-center">
                  <UserX className="mb-3 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    No details added for Contact {index + 1}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use Add to save name, designation, email, phone, and LinkedIn.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`contact-name-${index}`} className="text-xs font-medium">
                      Name *
                    </Label>
                    <Input
                      id={`contact-name-${index}`}
                      value={contact.name}
                      onChange={(e) => handleInputChange(index, "name", e.target.value)}
                      placeholder="Enter contact name"
                      disabled={isLocked}
                      className={`${errors[index]?.name ? "border-destructive" : ""} ${
                        isLocked ? "bg-slate-50 text-slate-600" : ""
                      }`}
                      data-testid={`input-name-${index}`}
                    />
                    {errors[index]?.name && (
                      <p className="text-xs text-destructive">{errors[index].name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contact-designation-${index}`} className="text-xs font-medium">
                      Designation *
                    </Label>
                    <Input
                      id={`contact-designation-${index}`}
                      value={contact.designation}
                      onChange={(e) => handleInputChange(index, "designation", e.target.value)}
                      placeholder="e.g. Founder, CEO, CFO"
                      disabled={isLocked}
                      className={`${errors[index]?.designation ? "border-destructive" : ""} ${
                        isLocked ? "bg-slate-50 text-slate-600" : ""
                      }`}
                      data-testid={`input-designation-${index}`}
                    />
                    {errors[index]?.designation && (
                      <p className="text-xs text-destructive">{errors[index].designation}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`contact-email-${index}`}
                      className="text-xs font-medium flex items-center gap-1"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </Label>
                    <Input
                      id={`contact-email-${index}`}
                      type="email"
                      value={contact.email}
                      onChange={(e) => handleInputChange(index, "email", e.target.value)}
                      placeholder="contact@company.com"
                      disabled={isLocked}
                      className={isLocked ? "bg-slate-50 text-slate-600" : ""}
                      data-testid={`input-email-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`contact-phone-${index}`}
                      className="text-xs font-medium flex items-center gap-1"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </Label>
                    <Input
                      id={`contact-phone-${index}`}
                      value={contact.phone}
                      onChange={(e) => handleInputChange(index, "phone", e.target.value)}
                      placeholder="+91 9876543210"
                      disabled={isLocked}
                      className={isLocked ? "bg-slate-50 text-slate-600" : ""}
                      data-testid={`input-phone-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contact-linkedin-${index}`} className="text-xs font-medium">
                      LinkedIn Profile
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`contact-linkedin-${index}`}
                        value={contact.linkedinProfile}
                        onChange={(e) => handleInputChange(index, "linkedinProfile", e.target.value)}
                        placeholder="https://linkedin.com/in/contact-name"
                        disabled={isLocked}
                        className={`flex-1 ${
                          errors[index]?.linkedinProfile ? "border-destructive" : ""
                        } ${isLocked ? "bg-slate-50 text-slate-600" : ""}`}
                        data-testid={`input-linkedin-${index}`}
                      />

                      {contact.linkedinProfile && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => window.open(contact.linkedinProfile, "_blank")}
                          data-testid={`button-linkedin-preview-${index}`}
                          className="shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {errors[index]?.linkedinProfile && (
                      <p className="text-xs text-destructive">
                        {errors[index].linkedinProfile}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>

    <AlertDialog
      open={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open) setDeleteTarget(null);
      }}
    >
      <AlertDialogContent className="bg-white dark:bg-slate-950 border shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {deleteTarget ? `Contact ${deleteTarget.index + 1}` : "contact"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget
              ? `This will permanently delete ${deleteTarget.name} from ${companyName}. This action cannot be undone.`
              : `This will permanently delete the contact. This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setDeleteTarget(null)}
            data-testid="cancel-delete-contact"
          >
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              await handleConfirmDelete();
            }}
            disabled={deleteContactMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid={
              deleteTarget
                ? `confirm-delete-contact-${deleteTarget.index}`
                : "confirm-delete-contact"
            }
          >
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
}
