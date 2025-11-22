import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Target, Users, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { format } from "date-fns";
import { EditCompanyDialog } from "@/components/EditCompanyDialog";
import { Switch } from "@/components/ui/switch";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(100, "Company name must be less than 100 characters"),
  industry: z.string().trim().max(100, "Industry must be less than 100 characters").optional(),
  target_role: z.string().trim().max(100, "Target role must be less than 100 characters").optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
  priority: z.number().min(0, "Priority must be at least 0").max(5, "Priority must be at most 5"),
});

interface Company {
  id: string;
  name: string;
  industry: string | null;
  target_role: string | null;
  notes: string | null;
  priority: number;
  is_archived: boolean;
  archived_at: string | null;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  contact_type: string;
  warmth_level: string | null;
  last_contact_date: string | null;
}

const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyContacts, setCompanyContacts] = useState<Contact[]>([]);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveCompanyId, setArchiveCompanyId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    target_role: "",
    notes: "",
    priority: 0,
  });
  const { toast } = useToast();

  const backfillCompanyIdsForCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, company")
      .eq("user_id", user.id)
      .is("company_id", null)
      .not("company", "is", null);

    if (contactsError || !contacts || contacts.length === 0) return;

    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", user.id);

    if (companiesError || !companies || companies.length === 0) return;

    const normalize = (name: string) => name.trim().toLowerCase();
    const companyMap = new Map<string, string>();

    for (const c of companies) {
      if (c.name) {
        companyMap.set(normalize(c.name), c.id);
      }
    }

    for (const contact of contacts) {
      if (!contact.company) continue;
      const key = normalize(contact.company);
      const companyId = companyMap.get(key);
      if (!companyId) continue;

      await supabase
        .from("contacts")
        .update({ company_id: companyId })
        .eq("id", contact.id)
        .eq("user_id", user.id);
    }
  };

  useEffect(() => {
    fetchCompanies();
    backfillCompanyIdsForCurrentUser(); // Backfill company_id for older contacts
  }, [showArchived]);

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", showArchived)
      .order("priority", { ascending: false });

    if (data) setCompanies(data);
    // Error silently handled - user will see empty state
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const validatedData = companySchema.parse(formData);

      const { error } = await supabase.from("companies").insert({
        user_id: user.id,
        name: validatedData.name,
        industry: validatedData.industry || null,
        target_role: validatedData.target_role || null,
        notes: validatedData.notes || null,
        priority: validatedData.priority,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add company",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Company added!",
        description: "Successfully added to your target list",
      });

      setIsOpen(false);
      setFormData({ name: "", industry: "", target_role: "", notes: "", priority: 0 });
      fetchCompanies();
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

  const fetchCompanyContacts = async (companyId: string, companyName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const normalize = (name: string) => name.trim().toLowerCase();
    const normalizedCompanyName = normalize(companyName);

    // 1. Contacts with matching company_id (exclude archived)
    const { data: byId, error: byIdError } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .eq("is_archived", false);

    if (byIdError) {
      console.error("Error fetching contacts by company_id", byIdError);
    }

    // 2. Contacts with null company_id but matching company name (case-insensitive, exclude archived)
    const { data: byName, error: byNameError } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .is("company_id", null)
      .not("company", "is", null)
      .eq("is_archived", false);

    if (byNameError) {
      console.error("Error fetching contacts by company name", byNameError);
    }

    const filteredByName = (byName || []).filter(contact =>
      contact.company && normalize(contact.company) === normalizedCompanyName
    );

    // 3. Merge and dedupe by id
    const mergedMap = new Map<string, Contact>();
    for (const c of byId || []) mergedMap.set(c.id, c);
    for (const c of filteredByName) mergedMap.set(c.id, c);

    setCompanyContacts(Array.from(mergedMap.values()));
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    fetchCompanyContacts(company.id, company.name);
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompanyId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // First, clear company references from contacts
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ company_id: null, company: null })
        .eq("company_id", deleteCompanyId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error clearing company from contacts:", updateError);
      }

      // Then delete the company
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", deleteCompanyId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Company deleted",
        description: "The company has been removed from your targets.",
      });

      setDeleteCompanyId(null);
      setSelectedCompany(null);
      setCompanyContacts([]);
      fetchCompanies();
    } catch (error) {
      console.error("Failed to delete company:", error);
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    }
  };

  const handleArchiveCompany = async () => {
    if (!archiveCompanyId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const companyToArchive = companies.find(c => c.id === archiveCompanyId);
    const isArchiving = !companyToArchive?.is_archived;

    try {
      const { error } = await supabase
        .from("companies")
        .update({ 
          is_archived: isArchiving,
          archived_at: isArchiving ? new Date().toISOString() : null
        })
        .eq("id", archiveCompanyId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: isArchiving ? "Company archived" : "Company restored",
        description: isArchiving
          ? "The company has been archived and hidden from your target list."
          : "The company has been restored to your active target list.",
      });

      setArchiveCompanyId(null);
      setSelectedCompany(null);
      setCompanyContacts([]);
      fetchCompanies();
    } catch (error) {
      console.error("Failed to archive/restore company:", error);
      toast({
        title: "Error",
        description: `Failed to ${isArchiving ? "archive" : "restore"} company`,
        variant: "destructive",
      });
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 3) return <Badge className="bg-red-500">High Priority</Badge>;
    if (priority >= 1) return <Badge className="bg-yellow-500">Medium Priority</Badge>;
    return <Badge variant="secondary">Low Priority</Badge>;
  };

  const getWarmthColor = (warmth: string | null) => {
    switch (warmth) {
      case "warm":
        return "bg-warmth-warm text-warmth-warm-foreground";
      case "cooling":
        return "bg-warmth-cooling text-warmth-cooling-foreground";
      case "cold":
        return "bg-warmth-cold text-warmth-cold-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const groupContactsByWarmth = () => {
    const groups = {
      warm: companyContacts.filter(c => c.warmth_level === "warm"),
      cooling: companyContacts.filter(c => c.warmth_level === "cooling"),
      cold: companyContacts.filter(c => c.warmth_level === "cold"),
    };
    return groups;
  };

  const formatLastInteraction = (date: string | null) => {
    if (!date) return "No interaction yet";
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Target Companies</h1>
          <p className="text-muted-foreground">Companies you want to work at</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived-companies"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived-companies" className="text-sm cursor-pointer">
              Show archived
            </Label>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Target Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_role">Target Role</Label>
                <Input
                  id="target_role"
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (0-5)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="5"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                />
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
              <Button type="submit" className="w-full">Add Company</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No target companies yet. Add companies you want to work at!</p>
            <Button onClick={() => setIsOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card 
              key={company.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader>
                  <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => handleCompanyClick(company)}>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {company.name}
                      {company.is_archived && (
                        <Badge variant="secondary" className="ml-2">Archived</Badge>
                      )}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(company.priority)}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCompanyId(company.id);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArchiveCompanyId(company.id);
                      }}
                      title={company.is_archived ? "Restore company" : "Archive company"}
                    >
                      {company.is_archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                    {!company.is_archived && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCompanyId(company.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.industry && (
                  <p className="text-sm text-muted-foreground">
                    Industry: {company.industry}
                  </p>
                )}
                {company.target_role && (
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-primary" />
                    {company.target_role}
                  </div>
                )}
                {company.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {company.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Company Detail Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedCompany && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {selectedCompany.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Company Details */}
                <div className="space-y-2">
                  {selectedCompany.industry && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Industry:</strong> {selectedCompany.industry}
                    </p>
                  )}
                  {selectedCompany.target_role && (
                    <p className="text-sm">
                      <strong>Target Role:</strong> {selectedCompany.target_role}
                    </p>
                  )}
                  {selectedCompany.notes && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {selectedCompany.notes}
                    </p>
                  )}
                  <div className="pt-2">
                    {getPriorityBadge(selectedCompany.priority)}
                  </div>
                </div>

                {/* Paths Into This Company */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Paths Into This Company
                  </h3>

                  {companyContacts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No contacts linked to this company yet. Add contacts with this company to see potential paths.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupContactsByWarmth()).map(([warmth, contacts]) => (
                        contacts.length > 0 && (
                          <div key={warmth}>
                            <h4 className="font-medium mb-3 capitalize flex items-center gap-2">
                              <Badge className={getWarmthColor(warmth)}>
                                {warmth}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                ({contacts.length})
                              </span>
                            </h4>
                            <div className="space-y-2">
                              {contacts.map((contact) => (
                                <Card key={contact.id} className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                       <div className="flex items-center gap-2">
                                         <p className="font-medium">{contact.name}</p>
                                         <Badge variant="outline" className={
                                           contact.contact_type === "connector"
                                             ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs"
                                             : contact.contact_type === "trailblazer"
                                             ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                                             : contact.contact_type === "reliable_recruiter"
                                             ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs"
                                             : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-xs"
                                         }>
                                           {contact.contact_type === "connector" && "Connector"}
                                           {contact.contact_type === "trailblazer" && "Trailblazer"}
                                           {contact.contact_type === "reliable_recruiter" && "Reliable Recruiter"}
                                           {contact.contact_type === "unspecified" && "Unspecified"}
                                           {!["connector", "trailblazer", "reliable_recruiter", "unspecified"].includes(contact.contact_type) && "Unspecified"}
                                         </Badge>
                                         <Badge className={`${getWarmthColor(contact.warmth_level)} text-xs`}>
                                           {contact.warmth_level || "unknown"}
                                         </Badge>
                                       </div>
                                      {contact.role && (
                                        <p className="text-sm text-muted-foreground">{contact.role}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground">
                                        Last interaction: {formatLastInteraction(contact.last_contact_date)}
                                      </p>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      {editCompanyId && (
        <EditCompanyDialog
          open={!!editCompanyId}
          onOpenChange={(open) => !open && setEditCompanyId(null)}
          companyId={editCompanyId}
          onSuccess={() => {
            fetchCompanies();
            setEditCompanyId(null);
          }}
        />
      )}

      {/* Archive Company Confirmation Dialog */}
      <AlertDialog open={!!archiveCompanyId} onOpenChange={(open) => !open && setArchiveCompanyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {companies.find(c => c.id === archiveCompanyId)?.is_archived ? "Restore company?" : "Archive company?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {companies.find(c => c.id === archiveCompanyId)?.is_archived
                ? "This company will be restored to your active target list and will appear in paths."
                : "This company will be hidden from your target list and paths. Contacts linked to it will remain in your contact list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveCompany}>
              {companies.find(c => c.id === archiveCompanyId)?.is_archived ? "Restore company" : "Archive company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Company Confirmation Dialog */}
      <AlertDialog open={!!deleteCompanyId} onOpenChange={(open) => !open && setDeleteCompanyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this company from your targets. Contacts linked to this company will stay in your contact list but will have their company cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Companies;
