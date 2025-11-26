import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  linkedinProfile: string;
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

export default function POCManagement({ companyId, companyName, onClose, onSave, startInEditMode = false }: POCManagementProps) {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContacts, setEditingContacts] = useState<ContactFormData[]>([]);
  const [errors, setErrors] = useState<{[index: number]: Partial<Record<keyof ContactFormData, string>>}>({});
  
  // ✅ NEW: Track which individual contact is being edited
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // ✅ NEW: Track which contacts are saved (have database IDs)
  const [savedContactIds, setSavedContactIds] = useState<(number | null)[]>([null, null, null]);

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
      staleTime: 0,
    });


  // ✅ FIXED: Initialize contacts - removed isFormEmpty bug
  useEffect(() => {
    if (isLoading) return;

    console.log('[POCManagement] Initializing with contacts:', contacts);

    // Always reinitialize from database when modal opens
    const newContacts: ContactFormData[] = [
      { ...emptyContact },
      { ...emptyContact },
      { ...emptyContact }
    ];

    const newSavedIds: (number | null)[] = [null, null, null];

    // Load existing contacts from database
    if (contacts.length > 0) {
      contacts.forEach((contact, index) => {
        if (index < 3) {
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
      setIsEditMode(startInEditMode);
    } else {
      setIsEditMode(true);
    }

    setEditingContacts(newContacts);
    setSavedContactIds(newSavedIds);
    setEditingIndex(null);

    console.log('[POCManagement] Initialized:', { contacts: newContacts, savedIds: newSavedIds });
  }, [contacts.length, isLoading, companyId]);

  const createContactMutation = useMutation({
    mutationFn: (contactData: any) => apiRequest('POST', '/contacts', contactData),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [`/contacts/company/${companyId}`],
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
        queryKey: [`/contacts/company/${companyId}`],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/contacts/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [`/contacts/company/${companyId}`],
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
    
    if (!contact.linkedinProfile.trim()) {
      newErrors.linkedinProfile = 'LinkedIn profile is required';
    } else if (!contact.linkedinProfile.includes('linkedin.com')) {
      newErrors.linkedinProfile = 'Please enter a valid LinkedIn URL';
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
    setEditingContacts(prev => prev.map((contact, i) =>
      i === index ? { ...contact, [field]: value } : contact
    ));
    
    if (errors[index]?.[field]) {
      setErrors(prev => ({
        ...prev,
        [index]: { ...prev[index], [field]: undefined }
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

  const deleteExistingContact = async (contactId: number) => {
    try {
      await deleteContactMutation.mutateAsync(contactId);
      toast({
        title: "Contact Deleted",
        description: "Contact has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
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
        linkedinProfile: contact.linkedinProfile.trim(),
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
        queryKey: [`/contacts/company/${companyId}`],
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
    if (savedContactIds[index] && contacts[index]) {
      const updatedContacts = [...editingContacts];
      updatedContacts[index] = {
        name: contacts[index].name || '',
        designation: contacts[index].designation || '',
        email: contacts[index].email || '',
        phone: contacts[index].phone || '',
        linkedinProfile: contacts[index].linkedinProfile || '',
      };
      setEditingContacts(updatedContacts);
    }
    setEditingIndex(null);
  };

  // ✅ NEW: Helper functions
  const isContactSaved = (index: number) => savedContactIds[index] !== null;
  const isContactEditing = (index: number) => editingIndex === index;
  const hasContactData = (index: number) => {
    const contact = editingContacts[index];
    if (!contact) return false;
    return contact.name || contact.designation || contact.linkedinProfile || contact.email || contact.phone;
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
          linkedinProfile: contact.linkedinProfile,
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
        queryKey: [`/contacts/company/${companyId}`],
        type: 'active'
      });
      
      toast({
        title: "POCs Updated",
        description: `${editingContacts.length} contact(s) saved for ${companyName}`,
      });
      
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
    if (contacts.length > 0) {
      setEditingContacts(contacts.map((contact: Contact) => ({
        name: contact.name || '',
        designation: contact.designation || '',
        email: contact.email || '',
        phone: contact.phone || '',
        linkedinProfile: contact.linkedinProfile || '',
      })));
    }
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (contacts.length > 0) {
      setEditingContacts(contacts.map((contact: Contact) => ({
        name: contact.name || '',
        designation: contact.designation || '',
        email: contact.email || '',
        phone: contact.phone || '',
        linkedinProfile: contact.linkedinProfile || '',
      })));
      setIsEditMode(false);
    } else {
      onClose();
    }
    setErrors({});
  };

  const getCompletionStatus = (contact: ContactFormData | Contact) => {
    const allFields = [contact.name, contact.designation, contact.linkedinProfile, contact.email, contact.phone];
    const requiredFields = [contact.name, contact.designation, contact.linkedinProfile];
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'green': return 'default' as const;
      case 'amber': return 'secondary' as const;
      case 'red': return 'destructive' as const;
      default: return 'destructive' as const;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'green': return 'Complete';
      case 'amber': return 'Partial';
      case 'red': return 'Incomplete';
      default: return 'Incomplete';
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading POC data...</div>;
  }

  // View Mode
  if (!isEditMode && contacts.length > 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">POC Details - {companyName}</h3>
            <p className="text-sm text-muted-foreground">{contacts.length}/3 Contact{contacts.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={handleEditMode} size="sm">
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
        
        {contacts.map((contact, index) => {
          const status = getCompletionStatus(contact);
          return (
            <Card key={contact.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {contact.name}
                    {index === 0 && <Badge variant="outline" className="text-xs">Primary</Badge>}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                    {getStatusIcon(status)}
                    <span className="ml-1">{getStatusText(status)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Designation</span>
                  <p className="font-medium">{contact.designation}</p>
                </div>
                {contact.email && (
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <p className="font-medium">{contact.email}</p>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium">{contact.phone}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">LinkedIn Profile</span>
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
              </CardContent>
              {index < contacts.length - 1 && <Separator />}
            </Card>
          );
        })}
        
        <p className="text-xs text-muted-foreground text-center pt-2">
          Click "Edit" to modify contact details or add more POCs
        </p>
        
        <Button variant="outline" onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  // ✅ UPDATED: Edit Mode with locking
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold">POC Management - {companyName}</h3>
        <p className="text-sm text-muted-foreground">
          {editingContacts.length}/3 Contact{editingContacts.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Manage up to 3 points of contact for this company. Required fields: Name, Designation, LinkedIn
        </p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
        {editingContacts.map((contact, index) => {
          const status = getCompletionStatus(contact);
          const isSaved = isContactSaved(index);
          const isEditing = isContactEditing(index);
          const isLocked = isSaved && !isEditing;
          const hasData = hasContactData(index);

          return (
            <Card key={index} className={isSaved ? 'border-green-500/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact {index + 1}
                    {index === 0 && <Badge variant="outline" className="text-xs">Primary</Badge>}
                    {isSaved && (
                      <Badge variant="default" className="h-5 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Saved
                      </Badge>
                    )}
                    {!isSaved && hasData && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unsaved
                      </Badge>
                    )}
                  </CardTitle>
                  
                  <div className="flex gap-2">
                    {isLocked && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingIndex(index)}
                        className="h-7 text-xs"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    
                    {isEditing && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={() => handleSaveIndividualContact(index)}
                          disabled={updateContactMutation.isPending || createContactMutation.isPending}
                          className="h-7 text-xs"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelEditContact(index)}
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                    
                    {!isSaved && editingIndex === null && (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => setEditingIndex(index)}
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Details
                      </Button>
                    )}
                    
                    {contacts[index] && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteExistingContact(contacts[index].id)}
                        data-testid={`button-delete-contact-${index}`}
                        className="h-7 text-xs"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {editingContacts.length > 1 && !isSaved && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeContact(index)}
                        data-testid={`button-remove-contact-${index}`}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`contact-name-${index}`} className="text-xs flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Name *
                  </Label>
                  <Input
                    id={`contact-name-${index}`}
                    value={contact.name}
                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                    placeholder="Enter contact name"
                    disabled={isLocked}
                    className={`${errors[index]?.name ? 'border-destructive' : ''} ${isLocked ? 'bg-muted cursor-not-allowed' : ''}`}
                    data-testid={`input-name-${index}`}
                  />
                  {errors[index]?.name && (
                    <p className="text-xs text-destructive">{errors[index].name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`contact-designation-${index}`} className="text-xs">
                    Designation *
                  </Label>
                  <Input
                    id={`contact-designation-${index}`}
                    value={contact.designation}
                    onChange={(e) => handleInputChange(index, 'designation', e.target.value)}
                    placeholder="e.g. CFO, CEO, VP Finance"
                    disabled={isLocked}
                    className={`${errors[index]?.designation ? 'border-destructive' : ''} ${isLocked ? 'bg-muted cursor-not-allowed' : ''}`}
                    data-testid={`input-designation-${index}`}
                  />
                  {errors[index]?.designation && (
                    <p className="text-xs text-destructive">{errors[index].designation}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`contact-email-${index}`} className="text-xs flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    id={`contact-email-${index}`}
                    type="email"
                    value={contact.email}
                    onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                    placeholder="contact@company.com"
                    disabled={isLocked}
                    className={isLocked ? 'bg-muted cursor-not-allowed' : ''}
                    data-testid={`input-email-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`contact-phone-${index}`} className="text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input
                    id={`contact-phone-${index}`}
                    value={contact.phone}
                    onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                    placeholder="+91 9876543210"
                    disabled={isLocked}
                    className={isLocked ? 'bg-muted cursor-not-allowed' : ''}
                    data-testid={`input-phone-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`contact-linkedin-${index}`} className="text-xs">
                    LinkedIn Profile *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`contact-linkedin-${index}`}
                      value={contact.linkedinProfile}
                      onChange={(e) => handleInputChange(index, 'linkedinProfile', e.target.value)}
                      placeholder="https://linkedin.com/in/contact-name"
                      disabled={isLocked}
                      className={`flex-1 ${errors[index]?.linkedinProfile ? 'border-destructive' : ''} ${isLocked ? 'bg-muted cursor-not-allowed' : ''}`}
                      data-testid={`input-linkedin-${index}`}
                    />
                    {contact.linkedinProfile && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(contact.linkedinProfile, '_blank')}
                        data-testid={`button-linkedin-preview-${index}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {errors[index]?.linkedinProfile && (
                    <p className="text-xs text-destructive">{errors[index].linkedinProfile}</p>
                  )}
                </div>
              </CardContent>
              
              {index < editingContacts.length - 1 && <Separator />}
            </Card>
          );
        })}
      </div>

      {editingContacts.length < 3 && (
        <Button
          variant="outline"
          onClick={addContact}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact ({editingContacts.length}/3)
        </Button>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={createContactMutation.isPending || updateContactMutation.isPending}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Save All Contacts
        </Button>
      </div>
    </div>
  );
}
