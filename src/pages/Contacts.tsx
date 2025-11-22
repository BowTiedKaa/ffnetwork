import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, TrendingUp, Pencil, Trash2, Mail, Briefcase, Archive, ArchiveRestore, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EditContactDialog } from "@/components/EditContactDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { format } from "date-fns";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().max(255, "Email must be less than 255 characters").email("Invalid email address").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company name must be less than 100 characters").optional(),
  role: z.string().trim().max(100, "Role must be less than 100 characters").optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
  warmth_level: z.enum(["warm", "cooling", "cold"]),
  contact_type: z.enum(["connector", "trailblazer", "reliable_recruiter", "unspecified"]),
});

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  company_id: string | null;
  role: string | null;
  warmth_level: string;
  last_contact_date: string | null;
  notes: string | null;
  contact_type: string;
  is_archived: boolean;
  archived_at: string | null;
  connector_influence_company_ids: string[] | null;
  recruiter_specialization: "industry_knowledge" | "interview_prep" | "offer_negotiation" | null;
}

interface Company {
  id: string;
  name: string;
}

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [contactTypeStep, setContactTypeStep] = useState(true);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveContactId, setArchiveContactId] = useState<string | null>(null);
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companySearchValue, setCompanySearchValue] = useState("");
  const [selectedContactForMessage, setSelectedContactForMessage] = useState<Contact | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    warmth_level: "cold",
    notes: "",
    contact_type: "unspecified" as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified",
    connector_influence_company_ids: [] as string[],
    recruiter_specialization: null as "industry_knowledge" | "interview_prep" | "offer_negotiation" | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, [showArchived]);

  const fetchContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", showArchived)
      .order("created_at", { ascending: false });

    if (data) {
      const typedContacts: Contact[] = data.map(contact => ({
        ...contact,
        contact_type: contact.contact_type as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified",
        recruiter_specialization: contact.recruiter_specialization as "industry_knowledge" | "interview_prep" | "offer_negotiation" | null,
      }));
      setContacts(typedContacts);
    }
    // Error silently handled - user will see empty state
  };

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (data) setCompanies(data);
  };

  const handleContactTypeSelect = (type: "connector" | "trailblazer" | "reliable_recruiter" | "unspecified") => {
    setFormData({ ...formData, contact_type: type });
    setContactTypeStep(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const validatedData = contactSchema.parse(formData);

      let companyId = null;

      if (validatedData.company) {
        // First, try to find an existing company (case-insensitive)
        let selectedCompany = companies.find(
          c => c.name.toLowerCase().trim() === validatedData.company!.toLowerCase().trim()
        );

        // If no match, create a new company
        if (!selectedCompany) {
          const { data: newCompany, error: companyError } = await supabase
            .from("companies")
            .insert({
              user_id: user.id,
              name: validatedData.company.trim(),
              priority: 0,
            })
            .select("id, name")
            .single();

          if (newCompany) {
            selectedCompany = newCompany;
            // Refresh companies list
            setCompanies([...companies, newCompany].sort((a, b) =>
              a.name.localeCompare(b.name)
            ));
          }
        }

        companyId = selectedCompany?.id || null;
      }

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        name: validatedData.name,
        email: validatedData.email || null,
        company: validatedData.company || null,
        company_id: companyId,
        role: validatedData.role || null,
        warmth_level: validatedData.warmth_level,
        notes: validatedData.notes || null,
        contact_type: validatedData.contact_type,
        connector_influence_company_ids: validatedData.contact_type === "connector" ? formData.connector_influence_company_ids : null,
        recruiter_specialization: validatedData.contact_type === "reliable_recruiter" ? formData.recruiter_specialization : null,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add contact",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Contact added!",
        description: "Successfully added to your network",
      });

      setIsOpen(false);
      setContactTypeStep(true);
      setFormData({ name: "", email: "", company: "", role: "", warmth_level: "cold", notes: "", contact_type: "unspecified", connector_influence_company_ids: [], recruiter_specialization: null });
      fetchContacts();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Delete related interactions
      const { error: interactionsError } = await supabase
        .from("interactions")
        .delete()
        .eq("contact_id", deleteContactId)
        .eq("user_id", user.id);

      if (interactionsError) {
        console.error("Error deleting interactions:", interactionsError);
      }

      // Delete related follow-ups
      const { error: followUpsError } = await supabase
        .from("follow_ups")
        .delete()
        .eq("contact_id", deleteContactId)
        .eq("user_id", user.id);

      if (followUpsError) {
        console.error("Error deleting follow-ups:", followUpsError);
      }

      // Delete the contact
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", deleteContactId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Contact deleted",
        description: "The contact has been removed from your list.",
      });

      setDeleteContactId(null);
      fetchContacts();
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const handleArchiveContact = async () => {
    if (!archiveContactId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const contactToArchive = contacts.find(c => c.id === archiveContactId);
    const isArchiving = !contactToArchive?.is_archived;

    try {
      const { error } = await supabase
        .from("contacts")
        .update({ 
          is_archived: isArchiving,
          archived_at: isArchiving ? new Date().toISOString() : null
        })
        .eq("id", archiveContactId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: isArchiving ? "Contact archived" : "Contact restored",
        description: isArchiving 
          ? "The contact has been archived and hidden from your main lists."
          : "The contact has been restored to your active contacts.",
      });

      setArchiveContactId(null);
      fetchContacts();
    } catch (error) {
      console.error("Failed to archive/restore contact:", error);
      toast({
        title: "Error",
        description: `Failed to ${isArchiving ? "archive" : "restore"} contact`,
        variant: "destructive",
      });
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setContactTypeStep(true);
      setFormData({ name: "", email: "", company: "", role: "", warmth_level: "cold", notes: "", contact_type: "unspecified", connector_influence_company_ids: [], recruiter_specialization: null });
    }
  };

  const getWarmthColor = (level: string) => {
    switch (level) {
      case "warm": return "bg-warmth-warm";
      case "cooling": return "bg-warmth-cooling";
      case "cold": return "bg-warmth-cold";
      default: return "bg-warmth-cold";
    }
  };

  const formatLastInteraction = (date: string | null) => {
    if (!date) return "No recent interaction";
    const lastDate = new Date(date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return "Today";
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff < 30) return `${daysDiff} days ago`;
    if (daysDiff < 60) return `${Math.floor(daysDiff / 7)} weeks ago`;
    return `${Math.floor(daysDiff / 30)} months ago`;
  };

  const getContactTypeInfo = (type: string) => {
    switch (type) {
      case "connector":
        return {
          icon: Users,
          label: "Connector",
          className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        };
      case "trailblazer":
        return {
          icon: TrendingUp,
          label: "Trailblazer",
          className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        };
      case "reliable_recruiter":
        return {
          icon: Briefcase,
          label: "Reliable Recruiter",
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        };
      case "unspecified":
        return {
          icon: Users,
          label: "Unspecified",
          className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        };
      default:
        return {
          icon: Users,
          label: "Unspecified",
          className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        };
    }
  };

  const getSuggestedActions = (contact: Contact) => {
    switch (contact.contact_type) {
      case "connector":
        return [
          { label: "Ask for intro", action: () => handleSendMessage(contact, "intro") },
          { label: "Warm-up message", action: () => handleSendMessage(contact, "warmup") },
        ];
      case "trailblazer":
        return [
          { label: "Ask about transition", action: () => handleSendMessage(contact, "transition") },
          { label: "Ask for advice", action: () => handleSendMessage(contact, "advice") },
        ];
      case "reliable_recruiter":
        return [
          { label: "How teams evaluate", action: () => handleSendMessage(contact, "evaluation") },
          { label: "Ask for feedback", action: () => handleSendMessage(contact, "feedback") },
        ];
      default:
        return [
          { label: "Reconnect", action: () => handleSendMessage(contact, "reconnect") },
        ];
    }
  };

  const handleSendMessage = (contact: Contact, _actionType: string) => {
    setSelectedContactForMessage(contact);
    setMessageDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Contacts</h1>
          <p className="text-muted-foreground">Manage your professional network</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm cursor-pointer">
              Show archived
            </Label>
          </div>
          <Dialog open={isOpen} onOpenChange={handleDialogChange}>
          <Button onClick={() => setIsOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {contactTypeStep ? "What type of contact are you adding?" : "Add New Contact"}
              </DialogTitle>
            </DialogHeader>
            
            {contactTypeStep ? (
              <div className="space-y-4 py-4">
                <RadioGroup onValueChange={(value) => handleContactTypeSelect(value as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified")}>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="connector" id="connector" />
                    <div className="flex-1">
                      <Label htmlFor="connector" className="cursor-pointer font-semibold">
                        Connector
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Senior people, ex-colleagues, or mentors who can open doors and do warm introductions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="trailblazer" id="trailblazer" />
                    <div className="flex-1">
                      <Label htmlFor="trailblazer" className="cursor-pointer font-semibold">
                        Trailblazer
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Someone with a government/public background who already transitioned into the kind of role I want.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="reliable_recruiter" id="reliable_recruiter" />
                    <div className="flex-1">
                      <Label htmlFor="reliable_recruiter" className="cursor-pointer font-semibold">
                        Reliable Recruiter
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recruiters who consistently share relevant roles, give honest feedback, and have a track record of actually placing people in good roles.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="unspecified" id="unspecified" />
                    <div className="flex-1">
                      <Label htmlFor="unspecified" className="cursor-pointer font-semibold">
                        Unspecified
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        A contact who's relevant but not yet categorized.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={companyPopoverOpen}
                      className="w-full justify-between"
                    >
                      {formData.company || "Select a company (optional)"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search or type a new company..." 
                        value={companySearchValue}
                        onValueChange={setCompanySearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <button
                            type="button"
                            className="w-full p-2 text-sm text-left hover:bg-accent rounded"
                            onClick={() => {
                              setFormData({ ...formData, company: companySearchValue });
                              setCompanyPopoverOpen(false);
                              setCompanySearchValue("");
                            }}
                          >
                            Create "{companySearchValue}" as a new company
                          </button>
                        </CommandEmpty>
                        <CommandGroup>
                          {companies
                            .filter(company => 
                              company.name.toLowerCase().includes(companySearchValue.toLowerCase())
                            )
                            .map((company) => (
                              <CommandItem
                                key={company.id}
                                value={company.name}
                                onSelect={(value) => {
                                  setFormData({ ...formData, company: value });
                                  setCompanyPopoverOpen(false);
                                  setCompanySearchValue("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.company === company.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {company.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Select or create a company so this contact appears as a path into that company.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warmth">Relationship Warmth</Label>
                <Select value={formData.warmth_level} onValueChange={(value) => setFormData({ ...formData, warmth_level: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warm">Warm - Recent contact (last 30 days)</SelectItem>
                    <SelectItem value="cooling">Cooling - Contact 31-60 days ago</SelectItem>
                    <SelectItem value="cold">Cold - No contact in 60+ days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {formData.contact_type === "connector" && (
                <div className="space-y-2">
                  <Label>Which companies does this connector have real influence with?</Label>
                  <div className="border rounded-md p-2 space-y-2 max-h-40 overflow-y-auto">
                    {companies.map((company) => (
                      <div key={company.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`company-${company.id}`}
                          checked={formData.connector_influence_company_ids.includes(company.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                connector_influence_company_ids: [...formData.connector_influence_company_ids, company.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                connector_influence_company_ids: formData.connector_influence_company_ids.filter(id => id !== company.id)
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`company-${company.id}`} className="cursor-pointer font-normal">
                          {company.name}
                        </Label>
                      </div>
                    ))}
                    {companies.length === 0 && (
                      <p className="text-sm text-muted-foreground">No companies available. Add a company first.</p>
                    )}
                  </div>
                </div>
              )}

              {formData.contact_type === "reliable_recruiter" && (
                <div className="space-y-2">
                  <Label htmlFor="recruiter_specialization">Recruiter specialization</Label>
                  <Select
                    value={formData.recruiter_specialization || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, recruiter_specialization: value as "industry_knowledge" | "interview_prep" | "offer_negotiation" })
                    }
                  >
                    <SelectTrigger id="recruiter_specialization">
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industry_knowledge">Industry knowledge</SelectItem>
                      <SelectItem value="interview_prep">Interview prep</SelectItem>
                      <SelectItem value="offer_negotiation">Offer negotiation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setContactTypeStep(true)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">Add Contact</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">Build your connectors and trailblazers</h2>
              <p className="text-muted-foreground mb-6">
                Add 3 connectors and 2 trailblazers. These five people form the core of your job search.
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 text-left max-w-3xl mx-auto">
              <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Connectors</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Senior people, former colleagues, mentors, trusted contacts — people who can provide warm introductions to hiring managers or recruiters at targeted companies.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Trailblazers</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  People with a government or public-sector background who have already transitioned into the types of roles you want.
                </p>
              </div>
            </div>

            <Button onClick={() => setIsOpen(true)} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Contacts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => {
            const contactTypeInfo = getContactTypeInfo(contact.contact_type);
            const ContactIcon = contactTypeInfo.icon;
            
            return (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 mb-2">
                        {contact.name}
                        {contact.is_archived && (
                          <Badge variant="secondary" className="ml-2">Archived</Badge>
                        )}
                        <Badge variant="secondary" className={contactTypeInfo.className}>
                          <ContactIcon className="h-3 w-3 mr-1" />
                          {contactTypeInfo.label}
                        </Badge>
                      </CardTitle>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getWarmthColor(contact.warmth_level)}`} />
                          <span className="text-xs capitalize text-muted-foreground">
                            {contact.warmth_level}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Last interaction: {formatLastInteraction(contact.last_contact_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditContactId(contact.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setArchiveContactId(contact.id)}
                        title={contact.is_archived ? "Restore contact" : "Archive contact"}
                      >
                        {contact.is_archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      {!contact.is_archived && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteContactId(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.company}</span>
                      {contact.role && <span className="text-muted-foreground">• {contact.role}</span>}
                    </div>
                  )}
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {contact.notes}
                    </p>
                  )}

                  {/* Suggested Actions */}
                  {!contact.is_archived && (
                    <div className="pt-3 border-t mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Suggested Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {getSuggestedActions(contact).map((action, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="outline"
                            onClick={action.action}
                            className="gap-1 h-7 text-xs"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Contact Dialog */}
      {editContactId && (
        <EditContactDialog
          open={!!editContactId}
          onOpenChange={(open) => !open && setEditContactId(null)}
          contactId={editContactId}
          onSuccess={() => {
            fetchContacts();
            setEditContactId(null);
          }}
        />
      )}

      {/* Archive Contact Confirmation Dialog */}
      <AlertDialog open={!!archiveContactId} onOpenChange={(open) => !open && setArchiveContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {contacts.find(c => c.id === archiveContactId)?.is_archived ? "Restore contact?" : "Archive contact?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {contacts.find(c => c.id === archiveContactId)?.is_archived
                ? "This contact will be restored to your active contacts and will appear in your main lists and daily actions."
                : "This contact will be hidden from your main lists and daily actions, but their history will be kept. You can restore them later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveContact}>
              {contacts.find(c => c.id === archiveContactId)?.is_archived ? "Restore contact" : "Archive contact"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Contact Confirmation Dialog */}
      <AlertDialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this contact and their interactions from your networking app. You can always add them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Message Dialog */}
      {selectedContactForMessage && (
        <SendMessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          contactName={selectedContactForMessage.name}
          contactEmail={selectedContactForMessage.email}
          companyName={selectedContactForMessage.company}
          contactType={selectedContactForMessage.contact_type as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified"}
          targetRole={selectedContactForMessage.role}
        />
      )}
    </div>
  );
};

export default Contacts;
