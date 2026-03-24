import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Plus, Trash2, Edit2, Mail, Phone, Linkedin, User } from "lucide-react";
import type { InvestorContact } from "@/lib/types";

interface InvestorPOCManagementProps {
  investorId: number;
  initialContacts?: InvestorContact[];
}


export default function InvestorPOCManagement({ investorId, initialContacts }: InvestorPOCManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for Add/Edit Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<InvestorContact> | null>(null);
  
  // State for Delete Confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 1. Fetch Contacts
const { data: contacts = [], isLoading, isError } = useQuery<InvestorContact[]>({
  queryKey: ["investor-contacts", investorId],
  queryFn: async () => {
    const res = await apiFetch(`/api/investors/${investorId}/contacts`);
    if (!res.ok) throw new Error("Failed to fetch contacts");
    if (isError) {
  return <div className="text-sm text-destructive">Failed to load contacts.</div>;
}
    return res.json();
  },
  initialData: initialContacts || [],
  
});

  // 2. Mutation: Save All Contacts (The backend "Replace" route handles Add/Edit/Delete logic by replacing the list)
  const saveMutation = useMutation({
    mutationFn: async (newContactsList: any[]) => {
      const res = await apiFetch(`/api/investors/${investorId}/contacts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: newContactsList }),
      });
      if (!res.ok) throw new Error("Failed to save contacts");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-contacts", investorId] });
      toast({ title: "Success", description: "Contacts updated successfully" });
      setIsDialogOpen(false);
      setEditingContact(null);
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update contacts", variant: "destructive" });
    }
  });

  // Handlers
  const handleSave = () => {
    if (!editingContact?.name) {
      toast({ title: "Validation", description: "Name is required", variant: "destructive" });
      return;
    }

    let updatedList = [...contacts];

    if (editingContact.id && editingContact.id > 0) {
      // Edit existing
      updatedList = updatedList.map(c => c.id === editingContact.id ? { ...c, ...editingContact } as InvestorContact : c);
    } else {
      // Add new (Create a temp ID or let backend handle it. Since we send the whole list, backend creates new ones if no ID)
      updatedList.push(editingContact as InvestorContact);
    }

    saveMutation.mutate(updatedList);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    // Filter out the deleted ID
    const updatedList = contacts.filter(c => c.id !== deleteId);
    saveMutation.mutate(updatedList);
  };

  const openAddModal = () => {
    setEditingContact({
      name: "",
      designation: "",
      email: "",
      phone: "",
      linkedinProfile: "",
      isPrimary: contacts.length === 0 // Make primary if it's the first one
    });
    setIsDialogOpen(true);
  };

  const openEditModal = (contact: InvestorContact) => {
    setEditingContact({ ...contact });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading contacts...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Points of Contact ({contacts.length})</h3>
        <Button onClick={openAddModal} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Add POC
        </Button>
      </div>

      {/* List View - Optimized for 30+ items */}
      <div className="border rounded-md divide-y bg-white dark:bg-zinc-950">
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No contacts added yet.
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{contact.name}</span>
                    {contact.isPrimary && <Badge variant="secondary" className="text-[10px] h-5">Primary</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {contact.designation || "No Designation"}
                  </div>
                </div>

                {/* Quick Info Icons */}
                <div className="flex items-center gap-2 text-muted-foreground hidden sm:flex">
                  {contact.email && (
                    <div className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded" title={contact.email}>
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded" title={contact.phone}>
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(contact)}>
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteId(contact.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact?.id ? "Edit Contact" : "Add New Contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  value={editingContact?.name || ""} 
                  onChange={e => setEditingContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input 
                  value={editingContact?.designation || ""} 
                  onChange={e => setEditingContact(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Partner"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  value={editingContact?.email || ""} 
                  onChange={e => setEditingContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={editingContact?.phone || ""} 
                  onChange={e => setEditingContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>LinkedIn Profile</Label>
              <div className="relative">
                <Linkedin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  value={editingContact?.linkedinProfile || ""} 
                  onChange={e => setEditingContact(prev => ({ ...prev, linkedinProfile: e.target.value }))}
                  placeholder="linkedin.com/in/..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {saveMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}