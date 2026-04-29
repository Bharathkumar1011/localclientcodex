import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import {
  Plus,
  Trash2,
  Mail,
  Phone,
  Linkedin,
  User,
  ChevronDown,
  Search,
  Save,
  X,
  Star,
} from "lucide-react";
import type { InvestorContact } from "@/lib/types";

interface InvestorPOCManagementProps {
  investorId: number;
  initialContacts?: InvestorContact[];
}

type EditableContact = Partial<InvestorContact>;
type ExpandedKey = number | "new" | null;

const toText = (value: unknown) => String(value || "").trim();

const toSafeUrl = (url?: string | null) => {
  const trimmed = toText(url);
  if (!trimmed) return "#";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const getContactCardClass = (isExpanded: boolean, isPrimary?: boolean) => {
  if (isExpanded) {
    return "border-blue-400/70 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-lg ring-1 ring-blue-100";
  }

  if (isPrimary) {
    return "border-amber-300/70 bg-gradient-to-r from-amber-50 via-white to-yellow-50 hover:border-amber-400 hover:shadow-md";
  }

  return "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70 hover:shadow-md";
};

const channelChipClass =
  "flex max-w-[260px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-[1.02]";

export default function InvestorPOCManagement({
  investorId,
  initialContacts,
}: InvestorPOCManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedKey, setExpandedKey] = useState<ExpandedKey>(null);
  const [draftContact, setDraftContact] = useState<EditableContact | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const {
    data: contacts = [],
    isLoading,
    isError,
  } = useQuery<InvestorContact[]>({
    queryKey: ["investor-contacts", investorId],
    queryFn: async () => {
      const res = await apiFetch(`/api/investors/${investorId}/contacts`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    initialData: initialContacts || [],
    enabled: Number.isFinite(investorId) && investorId > 0,
  });

  const cleanContactForSave = (contact: EditableContact): EditableContact => {
    const cleaned: EditableContact = {
      name: toText(contact.name),
      designation: toText(contact.designation) || "Investor",
      email: toText(contact.email) || null,
      phone: toText(contact.phone) || null,
      linkedinProfile: toText(contact.linkedinProfile) || null,
      isPrimary: Boolean(contact.isPrimary),
    };

    if (contact.id && Number(contact.id) > 0) {
      cleaned.id = Number(contact.id);
    }

    return cleaned;
  };

  const normalizeContactsBeforeSave = (list: EditableContact[]) => {
    const validContacts = list
      .map(cleanContactForSave)
      .filter((contact) => toText(contact.name).length > 0);

    if (validContacts.length === 0) return [];

    const selectedPrimaryIndex = validContacts.findIndex((contact) => contact.isPrimary);

    const orderedContacts =
      selectedPrimaryIndex > 0
        ? [
            validContacts[selectedPrimaryIndex],
            ...validContacts.filter((_, index) => index !== selectedPrimaryIndex),
          ]
        : validContacts;

    return orderedContacts.map((contact, index) => ({
      ...contact,
      isPrimary: index === 0,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (newContactsList: EditableContact[]) => {
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
      queryClient.invalidateQueries({ queryKey: ["investor", investorId] });
      queryClient.invalidateQueries({ queryKey: ["investors"] });

      toast({
        title: "Success",
        description: "Points of contact updated successfully",
      });

      setExpandedKey(null);
      setDraftContact(null);
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update points of contact",
        variant: "destructive",
      });
    },
  });

  const orderedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const primarySort = Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary));
      if (primarySort !== 0) return primarySort;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return orderedContacts;

    return orderedContacts.filter((contact) => {
      const searchableText = [
        contact.name,
        contact.designation,
        contact.email,
        contact.phone,
        contact.linkedinProfile,
      ]
        .map((value) => toText(value).toLowerCase())
        .join(" ");

      return searchableText.includes(query);
    });
  }, [orderedContacts, searchTerm]);

  const updateDraft = (updates: EditableContact) => {
    setDraftContact((prev) => ({
      ...(prev || {}),
      ...updates,
    }));
  };

  const startAdd = () => {
    setDeleteId(null);
    setExpandedKey("new");
    setDraftContact({
      name: "",
      designation: "",
      email: "",
      phone: "",
      linkedinProfile: "",
      isPrimary: contacts.length === 0,
    });
  };

  const toggleEdit = (contact: InvestorContact) => {
    setDeleteId(null);

    if (expandedKey === contact.id) {
      setExpandedKey(null);
      setDraftContact(null);
      return;
    }

    setExpandedKey(contact.id);
    setDraftContact({ ...contact });
  };

  const cancelEditing = () => {
    setExpandedKey(null);
    setDraftContact(null);
    setDeleteId(null);
  };

  const handleSaveDraft = () => {
    if (!draftContact) return;

    const cleanedDraft = cleanContactForSave(draftContact);

    if (!toText(cleanedDraft.name)) {
      toast({
        title: "Validation",
        description: "POC name is required",
        variant: "destructive",
      });
      return;
    }

    const currentList = contacts.map(cleanContactForSave);

    const nextList =
      expandedKey === "new"
        ? [...currentList, cleanedDraft]
        : currentList.map((contact) =>
            contact.id === cleanedDraft.id ? { ...contact, ...cleanedDraft } : contact
          );

    saveMutation.mutate(normalizeContactsBeforeSave(nextList));
  };

  const handleDelete = (contactId: number) => {
    const nextList = contacts
      .map(cleanContactForSave)
      .filter((contact) => contact.id !== contactId);

    saveMutation.mutate(normalizeContactsBeforeSave(nextList));
  };

  const ContactForm = ({ title }: { title: string }) => {
    const primaryChecked =
      Boolean(draftContact?.isPrimary) || (expandedKey === "new" && contacts.length === 0);

    return (
      <div className="border-t bg-gradient-to-r from-slate-50 via-white to-blue-50/60 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="text-xs text-muted-foreground">
              Update this contact inline. No popup required.
            </p>
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={cancelEditing}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={draftContact?.name || ""}
              onChange={(e) => updateDraft({ name: e.target.value })}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label>Designation</Label>
            <Input
              value={draftContact?.designation || ""}
              onChange={(e) => updateDraft({ designation: e.target.value })}
              placeholder="e.g. Partner / Founder / Investment Manager"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={draftContact?.email || ""}
              onChange={(e) => updateDraft({ email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={draftContact?.phone || ""}
              onChange={(e) => updateDraft({ phone: e.target.value })}
              placeholder="+91..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>LinkedIn Profile</Label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={draftContact?.linkedinProfile || ""}
                onChange={(e) => updateDraft({ linkedinProfile: e.target.value })}
                placeholder="linkedin.com/in/..."
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={primaryChecked}
              disabled={expandedKey === "new" && contacts.length === 0}
              onCheckedChange={(checked) => updateDraft({ isPrimary: checked === true })}
            />
            <span>Mark as primary POC</span>
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveDraft} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Contact"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading contacts...</div>;
  }

  if (isError) {
    return <div className="text-sm text-destructive">Failed to load contacts.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Points of Contact ({contacts.length})</h3>
          <p className="text-sm text-muted-foreground">
            Add, edit, search, and manage investor contacts inline.
          </p>
        </div>

      <Button
        type="button"
        onClick={startAdd}
        size="sm"
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm transition-all hover:scale-[1.02] hover:from-blue-700 hover:to-indigo-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add POC
      </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search POCs by name, email, phone, designation, LinkedIn..."
        />
      </div>

      {expandedKey === "new" && (
        <div className="overflow-hidden rounded-xl border border-blue-300/70 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-lg ring-1 ring-blue-100">
          <div className="flex items-center gap-3 border-b p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
            <User className="h-5 w-5 text-white" />
          </div>
            <div>
              <h4 className="font-semibold">New Point of Contact</h4>
              <p className="text-xs text-muted-foreground">
                Add contact details and save it to this investor.
              </p>
            </div>
          </div>

          <ContactForm title="Add New Contact" />
        </div>
      )}

      {contacts.length === 0 && expandedKey !== "new" ? (
        <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <h4 className="font-semibold">No points of contact added yet</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the first POC to keep investor communication organized.
          </p>
          <Button type="button" onClick={startAdd} className="mt-4" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add First POC
          </Button>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
          No POCs match your search.
        </div>
      ) : (
        <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
          {filteredContacts.map((contact) => {
            const isExpanded = expandedKey === contact.id;
            const isDeleteOpen = deleteId === contact.id;

            return (
              <div
                key={contact.id}
                className={`overflow-hidden rounded-xl border shadow-sm transition-all duration-200 ${getContactCardClass(
                  isExpanded,
                  contact.isPrimary
                )}`}
              >
                <div
                  className="cursor-pointer p-4 transition-all duration-200"
                  onClick={() => toggleEdit(contact)}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${
                      contact.isPrimary
                        ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600"
                    }`}
                  >
                    <User className="h-5 w-5 text-white" />
                  </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-semibold">
                            {contact.name || "Unnamed Contact"}
                          </h4>

                          {contact.isPrimary && (
                      <Badge className="gap-1 border border-amber-300 bg-amber-100 text-[11px] text-amber-800 hover:bg-amber-100">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        Primary
                      </Badge>
                          )}
                        </div>

                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {contact.designation || "No designation added"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {contact.email && (
                          <div
                            className={`${channelChipClass} bg-blue-100 text-blue-700 hover:bg-blue-200`}
                            title={contact.email}
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                          )}

                          {contact.phone && (
                          <div
                            className={`${channelChipClass} bg-emerald-100 text-emerald-700 hover:bg-emerald-200`}
                            title={contact.phone}
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                          )}

                          {contact.linkedinProfile && (
                            <a
                              href={toSafeUrl(contact.linkedinProfile)}
                              target="_blank"
                              rel="noreferrer"
                              className={`${channelChipClass} bg-sky-100 text-sky-700 hover:bg-sky-200`}
                              title={contact.linkedinProfile}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Linkedin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">LinkedIn</span>
                            </a>
                          )}

                          {!contact.email && !contact.phone && !contact.linkedinProfile && (
                            <span className="text-xs text-muted-foreground">
                              No contact channels added
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-full transition-all hover:bg-blue-100 hover:text-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEdit(contact);
                          }}
                        >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedKey(null);
                          setDraftContact(null);
                          setDeleteId(contact.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {isDeleteOpen && (
                  <div className="border-t bg-red-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">
                          Delete this point of contact?
                        </p>
                        <p className="text-xs text-red-600">
                          This will remove the contact from this investor.
                        </p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(contact.id)}
                          disabled={saveMutation.isPending}
                        >
                          {saveMutation.isPending ? "Deleting..." : "Yes, Delete"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && <ContactForm title="Edit Contact" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}