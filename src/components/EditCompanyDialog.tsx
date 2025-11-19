import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(100, "Company name must be less than 100 characters"),
  industry: z.string().trim().max(100, "Industry must be less than 100 characters").optional(),
  target_role: z.string().trim().max(100, "Target role must be less than 100 characters").optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
  priority: z.number().min(0, "Priority must be at least 0").max(5, "Priority must be at most 5"),
});

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

export const EditCompanyDialog = ({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: EditCompanyDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    target_role: "",
    notes: "",
    priority: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCompany();
    }
  }, [open, companyId]);

  const fetchCompany = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (data) {
      setFormData({
        name: data.name || "",
        industry: data.industry || "",
        target_role: data.target_role || "",
        notes: data.notes || "",
        priority: data.priority || 0,
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = companySchema.parse(formData);

      const { error } = await supabase
        .from("companies")
        .update({
          name: validatedData.name,
          industry: validatedData.industry || null,
          target_role: validatedData.target_role || null,
          notes: validatedData.notes || null,
          priority: validatedData.priority,
        })
        .eq("id", companyId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Company updated successfully",
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
          description: "Failed to update company",
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
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
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
