import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().max(255, "Email must be less than 255 characters").email("Invalid email address").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company name must be less than 100 characters").optional().or(z.literal("")),
  role: z.string().trim().max(100, "Role must be less than 100 characters").optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
  warmth_level: z.enum(["warm", "hot", "cold"]),
  contact_type: z.enum(["connector", "trailblazer", "reliable_recruiter", "unspecified"]),
});

interface Contact {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  company: string | null;
  company_id: string | null;
  linkedin_url: string | null;
  notes: string | null;
  warmth_level: string;
  last_contact_date: string | null;
  contact_type: "connector" | "trailblazer" | "reliable_recruiter" | "unspecified";
  connector_influence_company_ids: string[] | null;
  recruiter_specialization: "industry_knowledge" | "interview_prep" | "offer_negotiation" | null;
}

interface Company {
  id: string;
  name: string;
}

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onSuccess: () => void;
}

export const EditContactDialog = ({
  open,
  onOpenChange,
  contactId,
  onSuccess,
}: EditContactDialogProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companySearchValue, setCompanySearchValue] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    warmth_level: "cold" as "warm" | "hot" | "cold",
    notes: "",
    contact_type: "unspecified" as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified",
    connector_influence_company_ids: [] as string[],
    recruiter_specialization: null as "industry_knowledge" | "interview_prep" | "offer_negotiation" | null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchContact();
      fetchCompanies();
    }
  }, [open, contactId]);

  const fetchContact = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (data) {
      // Map legacy 'cooling' to 'hot' for database compatibility
      let warmth = data.warmth_level || "cold";
      if (warmth === "cooling") warmth = "hot";
      
      setFormData({
        name: data.name || "",
        email: data.email || "",
        company: data.company || "",
        role: data.role || "",
        warmth_level: warmth as "warm" | "hot" | "cold",
        notes: data.notes || "",
        contact_type: (data.contact_type || "unspecified") as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified",
        connector_influence_company_ids: data.connector_influence_company_ids || [],
        recruiter_specialization: (data.recruiter_specialization as "industry_knowledge" | "interview_prep" | "offer_negotiation") || null,
      });
    }
    setIsLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = contactSchema.parse(formData);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      const { error } = await supabase
        .from("contacts")
        .update({
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
        })
        .eq("id", contactId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Contact updated successfully",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Supabase contact update error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update contact",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete related interactions
      const { error: interactionsError } = await supabase
        .from("interactions")
        .delete()
        .eq("contact_id", contactId)
        .eq("user_id", user.id);

      if (interactionsError) {
        console.error("Error deleting interactions:", interactionsError);
      }

      // Delete related follow-ups
      const { error: followUpsError } = await supabase
        .from("follow_ups")
        .delete()
        .eq("contact_id", contactId)
        .eq("user_id", user.id);

      if (followUpsError) {
        console.error("Error deleting follow-ups:", followUpsError);
      }

      // Delete the contact
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Contact deleted",
        description: "The contact has been removed from your list.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
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
              Add or select a company so this contact shows up as a path into that company.
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
            <Label htmlFor="contact_type">Contact Type</Label>
            <Select
              value={formData.contact_type}
              onValueChange={(value: "connector" | "trailblazer" | "reliable_recruiter" | "unspecified") =>
                setFormData({ ...formData, contact_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connector">
                  <div className="flex flex-col">
                    <span className="font-medium">Connector</span>
                    <span className="text-xs text-muted-foreground">Senior people, ex-colleagues, or mentors who can open doors and do warm introductions.</span>
                  </div>
                </SelectItem>
                <SelectItem value="trailblazer">
                  <div className="flex flex-col">
                    <span className="font-medium">Trailblazer</span>
                    <span className="text-xs text-muted-foreground">Someone with a government/public background who already transitioned into the kind of role I want.</span>
                  </div>
                </SelectItem>
                <SelectItem value="reliable_recruiter">
                  <div className="flex flex-col">
                    <span className="font-medium">Reliable Recruiter</span>
                    <span className="text-xs text-muted-foreground">Recruiters who consistently share relevant roles, give honest feedback, and have a track record of actually placing people in good roles.</span>
                  </div>
                </SelectItem>
                <SelectItem value="unspecified">
                  <div className="flex flex-col">
                    <span className="font-medium">Unspecified</span>
                    <span className="text-xs text-muted-foreground">A contact who's relevant but not yet categorized.</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.contact_type === "connector" && (
            <div className="space-y-2">
              <Label>Which companies does this connector have real influence with?</Label>
              <div className="border rounded-md p-2 space-y-2 max-h-40 overflow-y-auto">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-company-${company.id}`}
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
                    <Label htmlFor={`edit-company-${company.id}`} className="cursor-pointer font-normal">
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
              <Label htmlFor="edit-recruiter-specialization">Recruiter specialization</Label>
              <Select
                value={formData.recruiter_specialization || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, recruiter_specialization: value as "industry_knowledge" | "interview_prep" | "offer_negotiation" })
                }
              >
                <SelectTrigger id="edit-recruiter-specialization">
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

          <div className="space-y-2">
            <Label htmlFor="warmth">Relationship Warmth</Label>
            <Select
              value={formData.warmth_level}
              onValueChange={(value: "warm" | "hot" | "cold") => setFormData({ ...formData, warmth_level: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
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

          <div className="flex gap-2 justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting || isDeleting}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove this contact and their interactions from your networking app. You can always add them again later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? "Deleting..." : "Delete contact"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
