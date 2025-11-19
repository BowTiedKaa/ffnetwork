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

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().max(255, "Email must be less than 255 characters").email("Invalid email address").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company name must be less than 100 characters").optional(),
  role: z.string().trim().max(100, "Role must be less than 100 characters").optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
  warmth_level: z.enum(["warm", "cooling", "cold"]),
  contact_type: z.enum(["connector", "trailblazer"]),
});

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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    warmth_level: "cold",
    notes: "",
    contact_type: "connector" as "connector" | "trailblazer",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      setFormData({
        name: data.name || "",
        email: data.email || "",
        company: data.company || "",
        role: data.role || "",
        warmth_level: (data.warmth_level || "cold") as "warm" | "cooling" | "cold",
        notes: data.notes || "",
        contact_type: (data.contact_type || "connector") as "connector" | "trailblazer",
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

      const selectedCompany = companies.find(
        c => c.name.toLowerCase() === validatedData.company?.toLowerCase()
      );

      const { error } = await supabase
        .from("contacts")
        .update({
          name: validatedData.name,
          email: validatedData.email || null,
          company: validatedData.company || null,
          company_id: selectedCompany?.id || null,
          role: validatedData.role || null,
          warmth_level: validatedData.warmth_level,
          notes: validatedData.notes || null,
          contact_type: validatedData.contact_type,
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
        toast({
          title: "Error",
          description: "Failed to update contact",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
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
            <Select 
              value={formData.company} 
              onValueChange={(value) => setFormData({ ...formData, company: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company (optional)" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.name}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              onValueChange={(value: "connector" | "trailblazer") =>
                setFormData({ ...formData, contact_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connector">Connector</SelectItem>
                <SelectItem value="trailblazer">Trailblazer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warmth">Relationship Warmth</Label>
            <Select
              value={formData.warmth_level}
              onValueChange={(value) => setFormData({ ...formData, warmth_level: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cooling">Cooling</SelectItem>
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

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
