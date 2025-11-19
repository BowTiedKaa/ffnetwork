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
import { Plus, Building2, Target, Users } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

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
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    target_role: "",
    notes: "",
    priority: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
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

  const fetchCompanyContacts = async (companyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("company_id", companyId);

    if (data) setCompanyContacts(data);
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    fetchCompanyContacts(company.id);
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
        <div>
          <h1 className="text-3xl font-bold mb-2">Target Companies</h1>
          <p className="text-muted-foreground">Companies you want to work at</p>
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
              onClick={() => handleCompanyClick(company)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {company.name}
                  </CardTitle>
                  {getPriorityBadge(company.priority)}
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
                                        <Badge variant="outline" className="text-xs">
                                          {contact.contact_type}
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
    </div>
  );
};

export default Companies;
